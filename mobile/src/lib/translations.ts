export type LanguageCode = "en" | "hi" | "ta" | "te" | "kn";

export interface LanguageMeta {
  code: LanguageCode;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageMeta[] = [
  { code: "en", name: "English", nativeName: "English", flag: "🇬🇧" },
  { code: "hi", name: "Hindi", nativeName: "हिंदी", flag: "🇮🇳" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்", flag: "🇮🇳" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు", flag: "🇮🇳" },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ", flag: "🇮🇳" },
];

export const TRANSLATIONS: Record<LanguageCode, Record<string, string>> = {
  en: {
    // Brand & Header
    "brand.name": "ExpiryGo",
    "brand.subtitle": "Grab it before it's gone",
    
    // Bottom Tabs
    "tabs.deals": "Deals",
    "tabs.explore": "Explore",
    "tabs.pickups": "Cart / Pickups",
    "tabs.profile": "Profile",
    "tabs.shop_hub": "Store AI Hub",
    "tabs.shop_orders": "Orders",
    "tabs.shop_products": "Inventory",
    "tabs.shop_settings": "Settings",

    // Roles & Switches
    "role.shopper": "Shopper",
    "role.store_mode": "Store Mode",
    "role.switch_to_store": "Switch to Store Mode",
    "role.switch_to_shopper": "Switch to Shopper Mode",

    // Deals Feed
    "deals.search_placeholder": "Search near-expiry deals or dishes...",
    "deals.recipe_mode": "Recipe Mode (Zero-Waste)",
    "deals.filter_all": "All Deals",
    "deals.expiring_today": "Expiring Today",
    "deals.expiring_soon": "Expiring Soon",
    "deals.urgent": "Urgent Clearance",
    "deals.hours_left": "{hours}h left",
    "deals.days_left": "{days}d left",
    "deals.stock_left": "{qty} in stock",
    "deals.discount_badge": "{pct}% OFF",
    "deals.rescue_now": "Rescue Deal",
    "deals.view_details": "View Details",
    "deals.empty_title": "No surplus deals found",
    "deals.empty_desc": "Check back soon as local shops list new expiring batches!",

    // Categories
    "category.ALL": "All Items",
    "category.BAKERY": "Bakery",
    "category.DAIRY": "Dairy",
    "category.PRODUCE": "Produce",
    "category.MEAT": "Meat",
    "category.PANTRY": "Pantry",
    "category.PREPARED_FOOD": "Prepared Food",
    "category.OTHER": "Other",

    // Zero-Waste Recipe Chef
    "recipe.chef_title": "AI Zero-Waste Chef",
    "recipe.chef_subtitle": "Combines expiring items into delicious home recipes",
    "recipe.generate_btn": "Generate Recipe with AI",
    "recipe.generating": "Creating Zero-Waste Recipe...",
    "recipe.prep_time": "Prep Time",
    "recipe.cook_time": "Cook Time",
    "recipe.difficulty": "Difficulty",
    "recipe.ingredients": "Required Ingredients",
    "recipe.instructions": "Step-by-Step Instructions",

    // Cart & Checkout
    "checkout.title": "Confirm & Rescue",
    "checkout.store_pickup": "Store Counter Pickup (Free)",
    "checkout.pickup_pin_info": "You will receive a 6-digit PIN to show the shopkeeper.",
    "checkout.home_delivery": "Home Delivery",
    "checkout.delivery_info": "Delivered to your home address",
    "checkout.your_pin": "Your 6-Digit Pickup PIN",
    "checkout.show_pin_instruction": "Show this 6-digit PIN or QR code to the store counter upon pickup.",
    "checkout.total_amount": "Total Amount",
    "checkout.money_saved": "Money Saved",
    "checkout.co2_saved": "CO₂ Emissions Prevented",
    "checkout.confirm_btn": "Confirm Order",

    // Store AI Hub
    "shop.ai_hub": "Store AI Hub",
    "shop.spoilage_radar": "AI Spoilage Risk Radar",
    "shop.total_revenue": "Total Surplus Revenue",
    "shop.items_saved": "Rescued Inventory",
    "shop.risk_items": "At-Risk Items (<24h)",
    "shop.add_deal": "Add Surplus Deal",
    "shop.verify_pickup": "Verify Pickup PIN",
    "shop.enter_pin": "Enter Customer's 6-Digit PIN",
    "shop.validate_pin": "Verify & Release Item",

    // Common
    "common.loading": "Loading...",
    "common.save": "Save",
    "common.close": "Close",
    "common.success": "Success",
    "common.error": "Error",
    "common.select_language": "Select App Language",
  },
  hi: {
    // Brand & Header
    "brand.name": "ExpiryGo",
    "brand.subtitle": "खत्म होने से पहले बचाएं",
    
    // Bottom Tabs
    "tabs.deals": "सौदे",
    "tabs.explore": "खोजें",
    "tabs.pickups": "कार्ट / पिकअप",
    "tabs.profile": "प्रोफ़ाइल",
    "tabs.shop_hub": "स्टोर AI हब",
    "tabs.shop_orders": "ऑर्डर",
    "tabs.shop_products": "इन्वेंट्री",
    "tabs.shop_settings": "सेटिंग्स",

    // Roles & Switches
    "role.shopper": "ग्राहक",
    "role.store_mode": "दुकानदार",
    "role.switch_to_store": "दुकानदार मोड में बदलें",
    "role.switch_to_shopper": "ग्राहक मोड में बदलें",

    // Deals Feed
    "deals.search_placeholder": "सस्ते सौदे या व्यंजन खोजें...",
    "deals.recipe_mode": "रेसिपी मोड (शून्य बर्बादी)",
    "deals.filter_all": "सभी सौदे",
    "deals.expiring_today": "आज समाप्त हो रहा है",
    "deals.expiring_soon": "जल्द समाप्त हो रहा है",
    "deals.urgent": "तत्काल क्लीयरेंस",
    "deals.hours_left": "{hours} घंटे शेष",
    "deals.days_left": "{days} दिन शेष",
    "deals.stock_left": "{qty} उपलब्ध",
    "deals.discount_badge": "{pct}% छूट",
    "deals.rescue_now": "सौदा बचाएं",
    "deals.view_details": "विवरण देखें",
    "deals.empty_title": "कोई सौदा नहीं मिला",
    "deals.empty_desc": "स्थानीय दुकानें जल्द ही नए बैच सूचीबद्ध करेंगी!",

    // Categories
    "category.ALL": "सभी वस्तुएं",
    "category.BAKERY": "बेकरी",
    "category.DAIRY": "डेयरी",
    "category.PRODUCE": "फल और सब्जियां",
    "category.MEAT": "मांस",
    "category.PANTRY": "किराना",
    "category.PREPARED_FOOD": "तैयार भोजन",
    "category.OTHER": "अन्य",

    // Zero-Waste Recipe Chef
    "recipe.chef_title": "एआई शून्य-बर्बादी शेफ",
    "recipe.chef_subtitle": "समाप्ति के करीब की वस्तुओं से स्वादिष्ट भोजन बनाएं",
    "recipe.generate_btn": "एआई से रेसिपी बनाएं",
    "recipe.generating": "रेसिपी तैयार की जा रही है...",
    "recipe.prep_time": "तैयारी समय",
    "recipe.cook_time": "पकाने का समय",
    "recipe.difficulty": "कठिनाई",
    "recipe.ingredients": "आवश्यक सामग्री",
    "recipe.instructions": "बनाने की विधि",

    // Cart & Checkout
    "checkout.title": "पुष्टि करें और बचाएं",
    "checkout.store_pickup": "दुकान से पिकअप (मुफ्त)",
    "checkout.pickup_pin_info": "आपको दुकानदार को दिखाने के लिए 6-अंकों का पिन मिलेगा।",
    "checkout.home_delivery": "होम डिलीवरी",
    "checkout.delivery_info": "सीधे आपके घर पर पहुँचाया जाएगा",
    "checkout.your_pin": "आपका 6-अंकीय पिकअप पिन",
    "checkout.show_pin_instruction": "पिकअप के समय काउंटर पर यह 6-अंकीय पिन या क्यूआर कोड दिखाएं।",
    "checkout.total_amount": "कुल राशि",
    "checkout.money_saved": "बचत",
    "checkout.co2_saved": "CO₂ उत्सर्जन रोका गया",
    "checkout.confirm_btn": "ऑर्डर की पुष्टि करें",

    // Store AI Hub
    "shop.ai_hub": "स्टोर AI हब",
    "shop.spoilage_radar": "खराब होने का जोखिम रडार",
    "shop.total_revenue": "कुल अधिशेष राजस्व",
    "shop.items_saved": "बचाई गई वस्तुएं",
    "shop.risk_items": "जोखिम वाले आइटम (<24 घंटे)",
    "shop.add_deal": "नया सौदा जोड़ें",
    "shop.verify_pin": "पिकअप पिन सत्यापित करें",
    "shop.enter_pin": "ग्राहक का 6-अंकीय पिन दर्ज करें",
    "shop.validate_pin": "सत्यापित करें और आइटम दें",

    // Common
    "common.loading": "लोड हो रहा है...",
    "common.save": "सहेजें",
    "common.close": "बंद करें",
    "common.success": "सफल",
    "common.error": "त्रुटि",
    "common.select_language": "ऐप भाषा चुनें",
  },
  ta: {
    // Brand & Header
    "brand.name": "ExpiryGo",
    "brand.subtitle": "முடிவதற்குள் சேமியுங்கள்",
    
    // Bottom Tabs
    "tabs.deals": "சலுகைகள்",
    "tabs.explore": "ஆராய்க",
    "tabs.pickups": "கார்ட் / பிக்கப்",
    "tabs.profile": "சுயவிவரம்",
    "tabs.shop_hub": "கடை AI மையம்",
    "tabs.shop_orders": "ஆர்டர்கள்",
    "tabs.shop_products": "சரக்குகள்",
    "tabs.shop_settings": "அமைப்புகள்",

    // Roles & Switches
    "role.shopper": "வாடிக்கையாளர்",
    "role.store_mode": "கடை முறை",
    "role.switch_to_store": "கடை முறைக்கு மாறுக",
    "role.switch_to_shopper": "வாடிக்கையாளர் முறைக்கு மாறுக",

    // Deals Feed
    "deals.search_placeholder": "சலுகைகள் அல்லது உணவுகளைத் தேடுங்கள்...",
    "deals.recipe_mode": "சமையல் முறை (வீணாகாத உணவு)",
    "deals.filter_all": "அனைத்து சலுகைகள்",
    "deals.expiring_today": "இன்று முடிவடைகிறது",
    "deals.expiring_soon": "விரைவில் முடிகிறது",
    "deals.urgent": "அவசர விற்பனை",
    "deals.hours_left": "{hours} மணிநேரம்",
    "deals.days_left": "{days} நாட்கள்",
    "deals.stock_left": "{qty} இருப்பு",
    "deals.discount_badge": "{pct}% தள்ளுபடி",
    "deals.rescue_now": "உணவை சேமி",
    "deals.view_details": "விவரங்களை காண்க",
    "deals.empty_title": "சலுகைகள் ஏதுமில்லை",
    "deals.empty_desc": "உள்ளூர் கடைகள் விரைவில் புதிய பொருட்களை பட்டியலிடும்!",

    // Categories
    "category.ALL": "அனைத்து பொருட்கள்",
    "category.BAKERY": "பேக்கரி",
    "category.DAIRY": "பால் பொருட்கள்",
    "category.PRODUCE": "காய்கறி & பழங்கள்",
    "category.MEAT": "இறைச்சி",
    "category.PANTRY": "மளிகை",
    "category.PREPARED_FOOD": "தயாரிக்கப்பட்ட உணவு",
    "category.OTHER": "மற்றவை",

    // Zero-Waste Recipe Chef
    "recipe.chef_title": "AI சமையல் வழிகாட்டி",
    "recipe.chef_subtitle": "சுவையான உணவை சமைக்க காலாவதிக்கு முந்தைய பொருட்களை சேர்க்கவும்",
    "recipe.generate_btn": "AI மூலம் செய்முறை உருவாக்கு",
    "recipe.generating": "செய்முறை தயாராகிறது...",
    "recipe.prep_time": "தயாரிப்பு நேரம்",
    "recipe.cook_time": "சமைக்கும் நேரம்",
    "recipe.difficulty": "சிரமம்",
    "recipe.ingredients": "தேவையான பொருட்கள்",
    "recipe.instructions": "செய்முறை படிகள்",

    // Cart & Checkout
    "checkout.title": "உறுதிசெய்து சேமிக்கவும்",
    "checkout.store_pickup": "கடையில் பிக்கப் (இலவசம்)",
    "checkout.pickup_pin_info": "கடைக்காரரிடம் காட்ட 6 இலக்க PIN பெறுவீர்கள்.",
    "checkout.home_delivery": "வீட்டு டெலிவரி",
    "checkout.delivery_info": "உங்கள் வீட்டு வாசலுக்கு வழங்கப்படும்",
    "checkout.your_pin": "உங்கள் 6 இலக்க பிக்கப் PIN",
    "checkout.show_pin_instruction": "பொருளைப் பெறும்போது இந்த 6 இலக்க PIN எண்ணைக் காட்டவும்.",
    "checkout.total_amount": "மொத்த தொகை",
    "checkout.money_saved": "சேமித்த பணம்",
    "checkout.co2_saved": "தடுக்கப்பட்ட CO₂ வாயு",
    "checkout.confirm_btn": "ஆர்டரை உறுதி செய்",

    // Store AI Hub
    "shop.ai_hub": "கடை AI மையம்",
    "shop.spoilage_radar": "ஆபத்து கண்காணிப்பு",
    "shop.total_revenue": "மொத்த வருவாய்",
    "shop.items_saved": "மீட்கப்பட்ட பொருட்கள்",
    "shop.risk_items": "அபாயத்தில் உள்ளவை (<24 மணி)",
    "shop.add_deal": "புதிய சலுகை சேர்",
    "shop.verify_pin": "பிக்கப் PIN சரிபார்",
    "shop.enter_pin": "வாடிக்கையாளரின் 6-இலக்க PIN ஐ உள்ளிடவும்",
    "shop.validate_pin": "சரிபார்த்து பொருளைக் கொடுங்கள்",

    // Common
    "common.loading": "ஏற்றுகிறது...",
    "common.save": "சேமி",
    "common.close": "மூடுக",
    "common.success": "வெற்றி",
    "common.error": "பிழை",
    "common.select_language": "மொழியைத் தேர்வு செய்க",
  },
  te: {
    // Brand & Header
    "brand.name": "ExpiryGo",
    "brand.subtitle": "ముగిసేలోపే పొందండి",
    
    // Bottom Tabs
    "tabs.deals": "డీల్స్",
    "tabs.explore": "అన్వేషించండి",
    "tabs.pickups": "కార్ట్ / పికప్",
    "tabs.profile": "ప్రొఫైల్",
    "tabs.shop_hub": "స్టోర్ AI హబ్",
    "tabs.shop_orders": "ఆర్డర్లు",
    "tabs.shop_products": "ఇన్వెంటరీ",
    "tabs.shop_settings": "సెట్టింగ్‌లు",

    // Roles & Switches
    "role.shopper": "కొనుగోలుదారు",
    "role.store_mode": "దుకాణం మోడ్",
    "role.switch_to_store": "దుకాణం మోడ్‌కు మారండి",
    "role.switch_to_shopper": "కొనుగోలుదారు మోడ్‌కు మారండి",

    // Deals Feed
    "deals.search_placeholder": "సమీప డీల్స్ లేదా వంటకాలను శోధించండి...",
    "deals.recipe_mode": "వంటకాల మోడ్ (వృధా రహితం)",
    "deals.filter_all": "అన్ని డీల్స్",
    "deals.expiring_today": "ఈరోజే ముగుస్తుంది",
    "deals.expiring_soon": "త్వరలో ముగుస్తుంది",
    "deals.urgent": "అత్యవసర క్లియరెన్స్",
    "deals.hours_left": "{hours} గంటలు",
    "deals.days_left": "{days} రోజులు",
    "deals.stock_left": "{qty} అందుబాటులో ఉంది",
    "deals.discount_badge": "{pct}% తగ్గింపు",
    "deals.rescue_now": "డీల్ ఆదా చేయండి",
    "deals.view_details": "వివరాలు చూడండి",
    "deals.empty_title": "డీల్స్ ఏవీ కనుగొనబడలేదు",
    "deals.empty_desc": "స్థానిక దుకాణాలు త్వరలో కొత్త వస్తువులను జాబితా చేస్తాయి!",

    // Categories
    "category.ALL": "అన్ని వస్తువులు",
    "category.BAKERY": "బేకరీ",
    "category.DAIRY": "పాల ఉత్పత్తులు",
    "category.PRODUCE": "పండ్లు & కూరగాయలు",
    "category.MEAT": "మాంసం",
    "category.PANTRY": "కిరాణా",
    "category.PREPARED_FOOD": "సిద్ధం చేసిన ఆహారం",
    "category.OTHER": "ఇతర",

    // Zero-Waste Recipe Chef
    "recipe.chef_title": "AI వంటకాల నిపుణుడు",
    "recipe.chef_subtitle": "గడువు ముగియనున్న వస్తువులను రుచికరమైన వంటకాలుగా మార్చండి",
    "recipe.generate_btn": "AI తో రెసిపీ సృష్టించండి",
    "recipe.generating": "రెసిపీ సిద్ధమవుతోంది...",
    "recipe.prep_time": "తయారీ సమయం",
    "recipe.cook_time": "వంట సమయం",
    "recipe.difficulty": "కష్టం",
    "recipe.ingredients": "కావలసిన పదార్థాలు",
    "recipe.instructions": "తయారీ విధానం",

    // Cart & Checkout
    "checkout.title": "ధృవీకరించి ఆదా చేయండి",
    "checkout.store_pickup": "దుకాణం పికప్ (ఉచితం)",
    "checkout.pickup_pin_info": "దుకాణదారుడికి చూపించడానికి మీకు 6 అంకెల పిన్ లభిస్తుంది.",
    "checkout.home_delivery": "హోమ్ డెలివరీ",
    "checkout.delivery_info": "మీ ఇంటి వద్దకే డెలివరీ చేయబడుతుంది",
    "checkout.your_pin": "మీ 6-అంకెల పికప్ PIN",
    "checkout.show_pin_instruction": "పికప్ సమయంలో ఈ 6 అంకెల పిన్ లేదా QR కోడ్‌ను చూపించండి.",
    "checkout.total_amount": "మొత్తం ధర",
    "checkout.money_saved": "ఆదా చేసిన డబ్బు",
    "checkout.co2_saved": "నివారించబడిన CO₂ ఉద్గారాలు",
    "checkout.confirm_btn": "ఆర్డర్ నిర్ధారించండి",

    // Store AI Hub
    "shop.ai_hub": "స్టోర్ AI హబ్",
    "shop.spoilage_radar": "పాడయ్యే ప్రమాదం రడార్",
    "shop.total_revenue": "మొత్తం ఆదాయం",
    "shop.items_saved": "రక్షించబడిన వస్తువులు",
    "shop.risk_items": "ప్రమాదంలో ఉన్నవి (<24 గం)",
    "shop.add_deal": "కొత్త డీల్ జోడించండి",
    "shop.verify_pin": "పికప్ పిన్ ధృవీకరించండి",
    "shop.enter_pin": "కస్టమర్ 6-అంకెల పిన్ నమోదు చేయండి",
    "shop.validate_pin": "ధృవీకరించి వస్తువును ఇవ్వండి",

    // Common
    "common.loading": "లోడ్ అవుతోంది...",
    "common.save": "సేవ్",
    "common.close": "మూసివేయి",
    "common.success": "విజయం",
    "common.error": "లోపం",
    "common.select_language": "భాషను ఎంచుకోండి",
  },
  kn: {
    // Brand & Header
    "brand.name": "ExpiryGo",
    "brand.subtitle": "ಮುಗಿಯುವ ಮುನ್ನ ಉಳಿಸಿ",
    
    // Bottom Tabs
    "tabs.deals": "ಆಫರ್‌ಗಳು",
    "tabs.explore": "ಹುಡುಕಿ",
    "tabs.pickups": "ಕಾರ್ಟ್ / ಪಿಕಪ್",
    "tabs.profile": "ಪ್ರೊಫೈಲ್",
    "tabs.shop_hub": "ಅಂಗಡಿ AI ಹಬ್",
    "tabs.shop_orders": "ಆರ್ಡರ್‌ಗಳು",
    "tabs.shop_products": "ದಾಸ್ತಾನು",
    "tabs.shop_settings": "ಸೆಟ್ಟಿಂಗ್‌ಗಳು",

    // Roles & Switches
    "role.shopper": "ಗ್ರಾಹಕ",
    "role.store_mode": "ಅಂಗಡಿ ಮೋಡ್",
    "role.switch_to_store": "ಅಂಗಡಿ ಮೋಡ್‌ಗೆ ಬದಲಾಯಿಸಿ",
    "role.switch_to_shopper": "ಗ್ರಾಹಕರ ಮೋಡ್‌ಗೆ ಬದಲಾಯಿಸಿ",

    // Deals Feed
    "deals.search_placeholder": "ಆಫರ್‌ಗಳು ಅಥವಾ ಆಹಾರ ಪದಾರ್ಥ ಹುಡುಕಿ...",
    "deals.recipe_mode": "ರೆಸಿಪಿ ಮೋಡ್ (ಶೂನ್ಯ ವ್ಯರ್ಥ)",
    "deals.filter_all": "ಎಲ್ಲಾ ಆಫರ್‌ಗಳು",
    "deals.expiring_today": "ಇಂದೇ ಮುಕ್ತಾಯ",
    "deals.expiring_soon": "ಶೀಘ್ರದಲ್ಲೇ ಮುಕ್ತಾಯ",
    "deals.urgent": "ತುರ್ತು ಕ್ಲಿಯರೆನ್ಸ್",
    "deals.hours_left": "{hours} ಗಂಟೆಗಳು",
    "deals.days_left": "{days} ದಿನಗಳು",
    "deals.stock_left": "{qty} ದಾಸ್ತಾನು",
    "deals.discount_badge": "{pct}% ರಿಯಾಯಿತಿ",
    "deals.rescue_now": "ಆಹಾರ ಉಳಿಸಿ",
    "deals.view_details": "ವಿವರ ನೋಡಿ",
    "deals.empty_title": "ಯಾವುದೇ ಆಫರ್‌ಗಳು ಕಂಡುಬಂದಿಲ್ಲ",
    "deals.empty_desc": "ಸ್ಥಳೀಯ ಅಂಗಡಿಗಳು ಶೀಘ್ರದಲ್ಲೇ ಹೊಸ ವಸ್ತುಗಳನ್ನು ಪಟ್ಟಿ ಮಾಡುತ್ತವೆ!",

    // Categories
    "category.ALL": "ಎಲ್ಲಾ ವಸ್ತುಗಳು",
    "category.BAKERY": "ಬೇಕರಿ",
    "category.DAIRY": "ಹಾಲು ಉತ್ಪನ್ನಗಳು",
    "category.PRODUCE": "ಹಣ್ಣು & ತರಕಾರಿಗಳು",
    "category.MEAT": "ಮಾಂಸ",
    "category.PANTRY": "ದಿನಸಿ",
    "category.PREPARED_FOOD": "ಸಿದ್ಧ ಆಹಾರ",
    "category.OTHER": "ಇತರೆ",

    // Zero-Waste Recipe Chef
    "recipe.chef_title": "AI ಅಡುಗೆ ತಜ್ಞ",
    "recipe.chef_subtitle": "ಅವಧಿ ಮುಗಿಯಲಿರುವ ವಸ್ತುಗಳಿಂದ ರುಚಿಕರವಾದ ಅಡುಗೆ ತಯಾರಿಸಿ",
    "recipe.generate_btn": "AI ಯೊಂದಿಗೆ ರೆಸಿಪಿ ರಚಿಸಿ",
    "recipe.generating": "ರೆಸಿಪಿ ತಯಾರಾಗುತ್ತಿದೆ...",
    "recipe.prep_time": "ಸಿದ್ಧತೆ ಸಮಯ",
    "recipe.cook_time": "ಅಡುಗೆ ಸಮಯ",
    "recipe.difficulty": "ಕಷ್ಟದ ಮಟ್ಟ",
    "recipe.ingredients": "ಬೇಕಾಗುವ ಸಾಮಗ್ರಿಗಳು",
    "recipe.instructions": "ತಯಾರಿಸುವ ವಿಧಾನ",

    // Cart & Checkout
    "checkout.title": "ಖಚಿತಪಡಿಸಿ & ಉಳಿಸಿ",
    "checkout.store_pickup": "ಅಂಗಡಿಯಿಂದ ಪಿಕಪ್ (ಉಚಿತ)",
    "checkout.pickup_pin_info": "ಅಂಗಡಿಯವರಿಗೆ ತೋರಿಸಲು 6 ಅಂಕಿಯ ಪಿನ್ ನೀಡಲಾಗುತ್ತದೆ.",
    "checkout.home_delivery": "ಮನೆ ಬಾಗಿಲಿಗೆ ಡೆಲಿವರಿ",
    "checkout.delivery_info": "ನೇರವಾಗಿ ನಿಮ್ಮ ಮನೆಗೆ ತಲುಪಿಸಲಾಗುವುದು",
    "checkout.your_pin": "ನಿಮ್ಮ 6-ಅಂಕಿಯ ಪಿಕಪ್ PIN",
    "checkout.show_pin_instruction": "ಪಿಕಪ್ ಸಮಯದಲ್ಲಿ ಈ 6 ಅಂಕಿಯ ಪಿನ್ ಅಥವಾ QR ಕೋಡ್ ತೋರಿಸಿ.",
    "checkout.total_amount": "ಒಟ್ಟು ಮೊತ್ತ",
    "checkout.money_saved": "ಉಳಿತಾಯವಾದ ಹಣ",
    "checkout.co2_saved": "ತಡೆಗಟ್ಟಲಾದ CO₂",
    "checkout.confirm_btn": "ಆರ್ಡರ್ ಖಚಿತಪಡಿಸಿ",

    // Store AI Hub
    "shop.ai_hub": "ಅಂಗಡಿ AI ಹಬ್",
    "shop.spoilage_radar": "ಹಾಳಾಗುವ ಅಪಾಯ ರೇಡಾರ್",
    "shop.total_revenue": "ಒಟ್ಟು ಆದಾಯ",
    "shop.items_saved": "ಉಳಿಸಿದ ವಸ್ತುಗಳು",
    "shop.risk_items": "ಅಪಾಯದಲ್ಲಿರುವ ವಸ್ತುಗಳು (<24 ಗಂಟೆ)",
    "shop.add_deal": "ಹೊಸ ಆಫರ್ ಸೇರಿಸಿ",
    "shop.verify_pin": "ಪಿಕಪ್ ಪಿನ್ ಪರಿಶೀಲಿಸಿ",
    "shop.enter_pin": "ಗ್ರಾಹಕರ 6-ಅಂಕಿಯ ಪಿನ್ ನಮೂದಿಸಿ",
    "shop.validate_pin": "ಪರಿಶೀಲಿಸಿ ವಸ್ತು ನೀಡಿ",

    // Common
    "common.loading": "ಲೋಡ್ ಆಗುತ್ತಿದೆ...",
    "common.save": "ಉಳಿಸಿ",
    "common.close": "ಮುಚ್ಚಿ",
    "common.success": "ಯಶಸ್ಸು",
    "common.error": "ದೋಷ",
    "common.select_language": "ಅಪ್ಲಿಕೇಶನ್ ಭಾಷೆ ಆಯ್ಕೆಮಾಡಿ",
  },
};
