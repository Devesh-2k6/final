import json
import httpx
import base64
import math
from datetime import datetime, timedelta
from config import settings

GEMINI_API_KEY = settings.GEMINI_API_KEY or ""

def get_smart_fallback_description(name: str) -> str:
    """Generates a high-quality copy template based on product keywords."""
    name_lower = name.lower()
    
    if any(k in name_lower for k in ["bread", "cake", "cookie", "pastry", "croissant", "bun", "bakery"]):
        return f"Freshly baked {name}! Deliciously soft, perfect for breakfast or a sweet snack. Save it today!"
    elif any(k in name_lower for k in ["milk", "cheese", "yogurt", "butter", "paneer", "cream", "dairy"]):
        return f"Rich, high-quality {name}. Keep it chilled and enjoy it fresh. Great deal, save it from going to waste!"
    elif any(k in name_lower for k in ["apple", "banana", "berry", "tomato", "salad", "vegetable", "fruit", "produce"]):
        return f"Fresh organic {name}, packed with vitamins. Perfect for smoothies, salads, or cooking today!"
    elif any(k in name_lower for k in ["chicken", "meat", "beef", "pork", "fish", "egg"]):
        return f"Premium quality {name}. Perfect for preparing a delicious and protein-packed meal tonight!"
    elif any(k in name_lower for k in ["juice", "soda", "coffee", "tea", "drink", "beverage"]):
        return f"Refreshing {name}! Keep it cold and enjoy a delicious drink at an unbeatable price."
    elif any(k in name_lower for k in ["rice", "pasta", "flour", "oil", "sauce", "pantry"]):
        return f"Stock up on {name}! High-quality pantry essential, ready to use for your next meal prep."
    
    return f"Delicious {name}, in perfect condition and ready for consumption. Save food, save money!"

async def optimize_product_details(
    name: str, 
    mfg_date_str: str, 
    expiry_date_str: str, 
    original_price: float, 
    quantity: int
) -> dict:
    """
    Optimizes product copy and discount recommendation using Gemini API, 
    falling back to local heuristics if the API key is not present or calls fail.
    """
    # Calculate expiry days left
    try:
        expiry_date = datetime.fromisoformat(expiry_date_str.replace("Z", "+00:00")).replace(tzinfo=None)
    except Exception:
        try:
            expiry_date = datetime.strptime(expiry_date_str, "%Y-%m-%d")
        except Exception:
            expiry_date = datetime.now()
            
    days_left = (expiry_date.date() - datetime.now().date()).days
    
    # Determine discount tier & percent
    if days_left <= 3:
        suggested_tier = "high"
        suggested_percent = 50
    elif days_left <= 7:
        suggested_tier = "medium"
        suggested_percent = 25
    else:
        suggested_tier = "low"
        suggested_percent = 10
        
    # Attempt to use Gemini API if key is present
    if GEMINI_API_KEY:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
            prompt = (
                f"You are an expert food copywriter and deal optimizer for 'ExpiryGo', a food rescue app.\n"
                f"Generate an appetizing, short food description (strictly under 100 characters) for:\n"
                f"- Product: {name}\n"
                f"- Expiry Date: {expiry_date_str}\n"
                f"- Original Price: {original_price}\n"
                f"- Available Quantity: {quantity}\n\n"
                f"Return ONLY a raw JSON object matching this structure (no markdown wrapper, no other text):\n"
                f"{{\n"
                f'  "suggested_description": "Enticing 100-character description of the product"\n'
                f"}}"
            )
            
            headers = {"Content-Type": "application/json"}
            payload = {
                "contents": [{
                    "parts": [{"text": prompt}]
                }]
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(url, headers=headers, json=payload, timeout=8.0)
                if response.status_code == 200:
                    res_data = response.json()
                    text_out = res_data["candidates"][0]["content"]["parts"][0]["text"].strip()
                    
                    # Clean up markdown if model wrapped it in ```json ... ```
                    if text_out.startswith("```"):
                        lines = text_out.splitlines()
                        # remove first and last lines
                        text_out = "\n".join(lines[1:-1]) if lines[-1].startswith("```") else "\n".join(lines[1:])
                        
                    parsed = json.loads(text_out)
                    if "suggested_description" in parsed:
                        return {
                            "suggested_description": parsed["suggested_description"],
                            "suggested_discount_tier": suggested_tier,
                            "suggested_discount_percent": suggested_percent,
                            "confidence_score": 0.95
                        }
        except Exception as e:
            print(f"⚠️ Gemini API optimization failed, falling back to heuristics: {e}")

    # Fallback response
    description = get_smart_fallback_description(name)
    return {
        "suggested_description": description,
        "suggested_discount_tier": suggested_tier,
        "suggested_discount_percent": suggested_percent,
        "confidence_score": 0.80
    }

GOOGLE_MAPS_PLATFORM_KEY = settings.GOOGLE_MAPS_PLATFORM_KEY or ""

async def scan_date_label_vision(file_bytes: bytes) -> dict:
    """
    Scans the uploaded image bytes of a packaging label for Manufacturing and Expiry dates
    using Google Cloud Vision API.
    """
    if not GOOGLE_MAPS_PLATFORM_KEY:
        print("⚠️ GOOGLE_MAPS_PLATFORM_KEY is missing. Falling back to default date mock.")
        return {
            "manufacturing_date": (datetime.now() - timedelta(days=2)).strftime("%Y-%m-%d"),
            "expiry_date": (datetime.now() + timedelta(days=5)).strftime("%Y-%m-%d"),
            "confidence_score": 0.50,
            "detected_text": "AI vision scanner simulated fallback (No API Key)"
        }
        
    try:
        # 1. Base64 encode the image bytes
        content = base64.b64encode(file_bytes).decode("utf-8")
        
        # 2. Prepare payload for Google Cloud Vision API
        url = f"https://vision.googleapis.com/v1/images:annotate?key={GOOGLE_MAPS_PLATFORM_KEY}"
        payload = {
            "requests": [
                {
                    "image": {"content": content},
                    "features": [{"type": "TEXT_DETECTION"}]
                }
            ]
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, timeout=15.0)
            if response.status_code == 200:
                res_data = response.json()
                annotations = res_data.get("responses", [{}])[0].get("fullTextAnnotation", {})
                detected_text = annotations.get("text", "")
                
                # Use Gemini to extract dates from the raw text
                return await extract_dates_from_text(detected_text)
            else:
                print(f"⚠️ Google Vision API failed with status {response.status_code}: {response.text}")
    except Exception as e:
        print(f"⚠️ Google Vision API exception: {e}")
        
    return {
        "manufacturing_date": (datetime.now() - timedelta(days=2)).strftime("%Y-%m-%d"),
        "expiry_date": (datetime.now() + timedelta(days=5)).strftime("%Y-%m-%d"),
        "confidence_score": 0.60,
        "detected_text": "Heuristic fallback due to error"
    }

async def extract_dates_from_text(text: str) -> dict:
    """Uses Gemini to parse raw OCR text into structured dates."""
    if not text:
        return {"manufacturing_date": None, "expiry_date": None, "confidence_score": 0, "detected_text": ""}

    # Use the same key for Gemini if it's the same Google project
    api_key = settings.GEMINI_API_KEY or settings.GOOGLE_MAPS_PLATFORM_KEY

    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
        prompt = (
            f"From the following OCR text of a food product label, extract the Manufacturing Date (MFG) "
            f"and the Expiry Date (EXP/Best Before). Format them as YYYY-MM-DD.\n\n"
            f"Text: \"{text}\"\n\n"
            f"Return ONLY a raw JSON object (no markdown): \n"
            f"{{\"manufacturing_date\": \"YYYY-MM-DD or null\", \"expiry_date\": \"YYYY-MM-DD or null\", \"confidence_score\": 0.9}}"
        )

        payload = {"contents": [{"parts": [{"text": prompt}]}]}
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, timeout=10.0)
            if response.status_code == 200:
                res_json = response.json()
                text_out = res_json["candidates"][0]["content"]["parts"][0]["text"].strip()
                # Clean markdown if present
                if "```" in text_out:
                    text_out = text_out.split("```json")[-1].split("```")[0].strip()
                parsed = json.loads(text_out)
                return {**parsed, "detected_text": text[:500]}
    except Exception:
        pass

    return {"manufacturing_date": None, "expiry_date": None, "confidence_score": 0.3, "detected_text": text[:500]}

async def parse_semantic_search(q: str) -> dict:
    """
    Parses a natural language query using the Gemini API to extract search parameters,
    falling back to local heuristics if the API key is not configured or calls fail.
    """
    default_res = {
        "keywords": [q],
        "categories": [],
        "max_price": None,
        "min_discount_pct": None,
        "expiry_urgency": None
    }
    
    if not q:
        return default_res
        
    if GEMINI_API_KEY:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
            prompt = (
                f"You are an expert NLP search engine for 'ExpiryGo', a near-expiry food rescue app.\n"
                f"Analyze the user's natural language search query and extract structured query parameters:\n"
                f"Query: '{q}'\n\n"
                f"The available product categories are strictly: BAKERY, DAIRY, PRODUCE, MEAT, PANTRY, PREPARED_FOOD, OTHER.\n"
                f"For the 'expiry_urgency' field, use 'today' (under 24h), 'tomorrow' (under 48h), or 'week' (under 7 days).\n\n"
                f"Return ONLY a raw JSON object matching this structure (no markdown wrapper, no other text):\n"
                f"{{\n"
                f'  "keywords": ["list", "of", "noun", "keywords", "to", "search", "like", "bread", "chicken"],\n'
                f'  "categories": ["list of matching Category strings if explicitly matched or implied, empty if not"],\n'
                f'  "max_price": null or float number budget limit,\n'
                f'  "min_discount_pct": null or float percentage (e.g. 50.0 for 50% off),\n'
                f'  "expiry_urgency": null or "today" or "tomorrow" or "week"\n'
                f"}}"
            )
            
            headers = {"Content-Type": "application/json"}
            payload = {
                "contents": [{
                    "parts": [{"text": prompt}]
                }]
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(url, headers=headers, json=payload, timeout=8.0)
                if response.status_code == 200:
                    res_data = response.json()
                    text_out = res_data["candidates"][0]["content"]["parts"][0]["text"].strip()
                    
                    if text_out.startswith("```"):
                        lines = text_out.splitlines()
                        text_out = "\n".join(lines[1:-1]) if lines[-1].startswith("```") else "\n".join(lines[1:])
                        
                    parsed = json.loads(text_out)
                    return {
                        "keywords": parsed.get("keywords") or [q],
                        "categories": parsed.get("categories") or [],
                        "max_price": parsed.get("max_price"),
                        "min_discount_pct": parsed.get("min_discount_pct"),
                        "expiry_urgency": parsed.get("expiry_urgency")
                    }
        except Exception as e:
            print(f"⚠️ Gemini semantic search parse failed: {e}")
            
    # Local heuristics fallback
    q_lower = q.lower()
    keywords = [w.strip() for w in q_lower.split() if len(w.strip()) > 2]
    if not keywords:
        keywords = [q_lower]
        
    categories = []
    if any(w in q_lower for w in ["bread", "cake", "cookie", "pastry", "bakery", "croissant"]):
        categories.append("BAKERY")
    if any(w in q_lower for w in ["milk", "cheese", "butter", "paneer", "yogurt", "dairy"]):
        categories.append("DAIRY")
    if any(w in q_lower for w in ["apple", "banana", "fruit", "salad", "vegetable", "tomato", "produce"]):
        categories.append("PRODUCE")
    if any(w in q_lower for w in ["chicken", "meat", "beef", "pork", "egg", "fish"]):
        categories.append("MEAT")
    if any(w in q_lower for w in ["rice", "pasta", "flour", "oil", "sauce", "pantry"]):
        categories.append("PANTRY")
    if any(w in q_lower for w in ["prepared", "ready", "meal", "cooked", "breakfast", "dinner", "lunch"]):
        categories.append("PREPARED_FOOD")
        
    # Extract max price (e.g. "under 150", "below 200", "budget 100")
    max_price = None
    import re
    price_match = re.search(r'(?:under|below|budget|less than|rs|inr|₹)\s*(\d+)', q_lower)
    if price_match:
        max_price = float(price_match.group(1))
        
    # Extract discount (e.g. "50% off", "30 percent discount")
    min_discount_pct = None
    discount_match = re.search(r'(\d+)\s*(?:%|percent)\s*(?:off|discount)?', q_lower)
    if discount_match:
        min_discount_pct = float(discount_match.group(1))
        
    expiry_urgency = None
    if any(w in q_lower for w in ["today", "tonight", "urgent", "now"]):
        expiry_urgency = "today"
    elif any(w in q_lower for w in ["tomorrow", "next day"]):
        expiry_urgency = "tomorrow"
    elif any(w in q_lower for w in ["week", "few days"]):
        expiry_urgency = "week"
        
    return {
        "keywords": keywords,
        "categories": categories,
        "max_price": max_price,
        "min_discount_pct": min_discount_pct,
        "expiry_urgency": expiry_urgency
    }

async def get_recipe_ingredients(recipe_name: str) -> dict:
    """
    Retrieves required ingredients for a dish using Gemini,
    falling back to local recipe configurations if key is not configured or calls fail.
    """
    default_res = {
        "recipe_name": recipe_name,
        "ingredients": [recipe_name]
    }
    
    if not recipe_name:
        return default_res
        
    if GEMINI_API_KEY:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
            prompt = (
                f"Identify the standard primary cooking ingredients needed for this recipe/dish: '{recipe_name}'\n"
                f"Return ONLY a raw JSON object matching this structure (no markdown wrapper, no other text):\n"
                f"{{\n"
                f'  "recipe_name": "Formatted Recipe Name",\n'
                f'  "ingredients": ["ingredient1", "ingredient2", "ingredient3", "ingredient4"]\n'
                f"}}"
            )
            
            headers = {"Content-Type": "application/json"}
            payload = {
                "contents": [{
                    "parts": [{"text": prompt}]
                }]
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(url, headers=headers, json=payload, timeout=8.0)
                if response.status_code == 200:
                    res_data = response.json()
                    text_out = res_data["candidates"][0]["content"]["parts"][0]["text"].strip()
                    
                    if text_out.startswith("```"):
                        lines = text_out.splitlines()
                        text_out = "\n".join(lines[1:-1]) if lines[-1].startswith("```") else "\n".join(lines[1:])
                        
                    parsed = json.loads(text_out)
                    return {
                        "recipe_name": parsed.get("recipe_name") or recipe_name,
                        "ingredients": parsed.get("ingredients") or [recipe_name]
                    }
        except Exception as e:
            print(f"⚠️ Gemini recipe ingredients failed: {e}")
            
    # Local recipe mappings
    recipe_map = {
        "pasta": ["pasta", "tomato", "sauce", "garlic", "cheese"],
        "pizza": ["cheese", "bread", "tomato", "sauce", "onion", "bell pepper"],
        "salad": ["salad", "tomato", "cucumber", "onion", "apple", "banana", "fruit", "lettuce"],
        "cake": ["cake", "egg", "flour", "sugar", "butter", "milk"],
        "sandwich": ["bread", "cheese", "tomato", "butter"],
        "curry": ["paneer", "chicken", "onion", "tomato", "oil", "cream"]
    }
    
    r_lower = recipe_name.lower()
    for key, ingredients in recipe_map.items():
        if key in r_lower:
            return {
                "recipe_name": recipe_name.title(),
                "ingredients": ingredients
            }
            
    return {
        "recipe_name": recipe_name.title(),
        "ingredients": [w.strip() for w in r_lower.split() if len(w.strip()) > 2]
    }


async def generate_recipe_from_deals(products: list[dict]) -> dict:
    """
    Generates a recipe using Gemini API based on a list of product ingredients,
    falling back to local templates if the API key is missing or fails.
    """
    product_names = [p["name"] for p in products]
    product_desc = ", ".join(f"{p['name']} ({p['category']})" for p in products)
    
    # Heuristic fallback recipe initialization
    fallback_recipe = {
        "recipe_name": "Rescued Surplus Bowl",
        "description": "A delicious, easy-to-make dish created to make the best use of your saved near-expiry ingredients.",
        "prep_time": "10 mins",
        "cook_time": "15 mins",
        "difficulty": "Easy",
        "ingredients": [
            {"name": name, "is_deal": True, "quantity": "As available"} for name in product_names
        ] + [
            {"name": "Salt & Pepper", "is_deal": False, "quantity": "to taste"},
            {"name": "Cooking Oil / Butter", "is_deal": False, "quantity": "1-2 tbsp"}
        ],
        "instructions": [
            {"step_number": 1, "instruction": f"Prep all of your main ingredients: {', '.join(product_names)}."},
            {"step_number": 2, "instruction": "Heat oil or butter in a pan over medium heat."},
            {"step_number": 3, "instruction": "Add the ingredients and cook until golden brown and cooked through."},
            {"step_number": 4, "instruction": "Season with salt, pepper, and your favorite spices. Serve hot!"}
        ],
        "waste_saved_summary": f"Successfully rescued {len(products)} grocery items, preventing food waste and offsetting CO2 emissions!"
    }

    # Dynamic fallback naming
    categories = [p["category"].upper() for p in products]
    if "BAKERY" in categories and "DAIRY" in categories:
        fallback_recipe["recipe_name"] = "Rescued French Toast & Butter Pudding"
        fallback_recipe["description"] = "A sweet, comforting dessert/breakfast skillet utilizing surplus bakery and dairy products."
        fallback_recipe["instructions"][2]["instruction"] = "Whisk the dairy ingredients (milk/cream) with any egg or sugar you have, dip the bakery items, and sear in a pan."
    elif "MEAT" in categories or "PREPARED_FOOD" in categories:
        fallback_recipe["recipe_name"] = "Surplus Savory Protein Skillet"
        fallback_recipe["description"] = "A hearty and filling protein bowl using your saved meat or prepared ingredients."
    elif "PRODUCE" in categories:
        fallback_recipe["recipe_name"] = "Garden Harvest Waste-Free Stir Fry"
        fallback_recipe["description"] = "A healthy, quick-cooking vegetable stir fry that highlights your rescued fresh produce."

    if GEMINI_API_KEY:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
            prompt = (
                f"You are a master chef specializing in zero-waste cooking for 'ExpiryGo'.\n"
                f"Create a creative and appetizing recipe using these near-expiry items:\n"
                f"{product_desc}\n\n"
                f"You may assume the user has standard pantry staples (water, salt, pepper, cooking oil, basic spices, butter).\n"
                f"Highlight which ingredients are the rescued deals ('is_deal': true) vs pantry staples ('is_deal': false).\n\n"
                f"Return ONLY a raw JSON object matching this structure (no markdown wrapper, no other text):\n"
                f"{{\n"
                f'  "recipe_name": "Name of the Recipe",\n'
                f'  "description": "Short appetizing description of the dish",\n'
                f'  "prep_time": "Prep time (e.g., 10 mins)",\n'
                f'  "cook_time": "Cook time (e.g., 20 mins)",\n'
                f'  "difficulty": "Easy" or "Medium" or "Hard",\n'
                f'  "ingredients": [\n'
                f'    {{"name": "Ingredient Name", "is_deal": true, "quantity": "e.g., 2 slices or 200ml"}}\n'
                f'  ],\n'
                f'  "instructions": [\n'
                f'    {{"step_number": 1, "instruction": "Step 1 text"}}\n'
                f'  ],\n'
                f'  "waste_saved_summary": "Inspirational message about how this recipe saves food waste and offsets greenhouse gases"\n'
                f"}}"
            )
            
            headers = {"Content-Type": "application/json"}
            payload = {
                "contents": [{
                    "parts": [{"text": prompt}]
                }]
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(url, headers=headers, json=payload, timeout=12.0)
                if response.status_code == 200:
                    res_data = response.json()
                    text_out = res_data["candidates"][0]["content"]["parts"][0]["text"].strip()
                    
                    if text_out.startswith("```"):
                        lines = text_out.splitlines()
                        text_out = "\n".join(lines[1:-1]) if lines[-1].startswith("```") else "\n".join(lines[1:])
                        
                    parsed = json.loads(text_out)
                    return parsed
        except Exception as e:
            print(f"⚠️ Gemini recipe generator failed: {e}")
            
    return fallback_recipe

