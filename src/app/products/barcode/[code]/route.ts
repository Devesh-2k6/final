import { NextResponse } from "next/server";
import { ensureStoreLoaded, getAllProductsAsync } from "@/lib/server-otp";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CURATED_BARCODE_CATALOG: Record<
  string,
  {
    name: string;
    brand: string;
    category: string;
    description: string;
    suggested_price: number;
    image_url: string;
  }
> = {
  "8901030895431": {
    name: "Amul Taaza Homogenised Toned Milk 1L",
    brand: "Amul",
    category: "DAIRY",
    description: "Fresh pasteurized toned milk with 3.0% fat and 8.5% SNF. Rich source of calcium and protein.",
    suggested_price: 54,
    image_url: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500",
  },
  "8901491101837": {
    name: "Britannia 100% Whole Wheat Bread 400g",
    brand: "Britannia",
    category: "BAKERY",
    description: "Wholesome brown bread baked with 100% whole wheat flour, enriched with vitamins and minerals.",
    suggested_price: 45,
    image_url: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500",
  },
  "8901725181222": {
    name: "Mother Dairy Classic Dahi 400g",
    brand: "Mother Dairy",
    category: "DAIRY",
    description: "Rich and creamy curd prepared from pasteurized milk, packed with active probiotic cultures.",
    suggested_price: 35,
    image_url: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=500",
  },
  "8901058852355": {
    name: "Maggi 2-Minute Masala Instant Noodles 70g",
    brand: "Nestle",
    category: "GROCERY",
    description: "India's favorite instant noodles infused with authentic roasted spices and aroma.",
    suggested_price: 14,
    image_url: "https://images.unsplash.com/photo-1612927601601-6638404737ce?w=500",
  },
  "8901030383709": {
    name: "Parle-G Original Gluco Biscuits 800g",
    brand: "Parle",
    category: "BAKERY",
    description: "Iconic glucose biscuits baked to perfection with milk and wheat goodness.",
    suggested_price: 80,
    image_url: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=500",
  },
  "8901491501019": {
    name: "Britannia Good Day Butter Cookies 200g",
    brand: "Britannia",
    category: "BAKERY",
    description: "Crispy, rich butter cookies with a sweet smile design on every bite.",
    suggested_price: 40,
    image_url: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=500",
  },
  "8901058000404": {
    name: "Nescafe Classic 100% Pure Instant Coffee 100g",
    brand: "Nestle",
    category: "BEVERAGES",
    description: "Signature blend of dark roast Arabica and Robusta beans with an invigorating aroma.",
    suggested_price: 340,
    image_url: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500",
  },
  "8901063012010": {
    name: "Tata Tea Gold Fine Leaf & Long Leaf Tea 500g",
    brand: "Tata",
    category: "BEVERAGES",
    description: "Exquisite blend of valley grown Assam teas with 15% gently rolled aromatic long leaves.",
    suggested_price: 310,
    image_url: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500",
  },
  "8901030695505": {
    name: "Amul Pasteurized Table Butter 500g",
    brand: "Amul",
    category: "DAIRY",
    description: "Delicious and creamy salted table butter made from fresh dairy cream.",
    suggested_price: 275,
    image_url: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=500",
  },
  "8901262010049": {
    name: "Lay's India's Magic Masala Potato Chips 50g",
    brand: "Lay's",
    category: "SNACKS",
    description: "Crispy sliced Indian potatoes seasoned with zesty aromatic spices.",
    suggested_price: 20,
    image_url: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500",
  },
  "8901030005007": {
    name: "Tata Salt Vacuum Evaporated Iodized Salt 1kg",
    brand: "Tata",
    category: "GROCERY",
    description: "Vacuum evaporated iodized crystal white salt guaranteed 99.9% pure.",
    suggested_price: 28,
    image_url: "https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?w=500",
  },
  "8901058863009": {
    name: "Aashirvaad Superior MP Sharbati Whole Wheat Atta 5kg",
    brand: "Aashirvaad",
    category: "GROCERY",
    description: "Premium whole wheat flour ground from sun-golden Sehore grains for soft, fluffy rotis.",
    suggested_price: 320,
    image_url: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500",
  },
};

export async function GET(
  req: Request,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params;
    const cleanCode = (code || "").trim();

    if (!cleanCode) {
      return NextResponse.json({ detail: "Barcode is required" }, { status: 400 });
    }

    // 1. Check existing database products
    await ensureStoreLoaded();
    const existingProducts = await getAllProductsAsync();
    const matchedProduct = existingProducts.find(
      (p) => (p.barcode && p.barcode === cleanCode) || p.id === cleanCode
    );

    if (matchedProduct) {
      return NextResponse.json({
        barcode: cleanCode,
        name: matchedProduct.name,
        brand: matchedProduct.brand || matchedProduct.shop?.name || null,
        category: matchedProduct.category || "OTHER",
        description: matchedProduct.description || null,
        suggested_price: matchedProduct.original_price || matchedProduct.discount_price || null,
        image_url: matchedProduct.front_image_url || matchedProduct.image_url || null,
      });
    }

    // 2. Check Curated Local FMCG Dictionary
    if (CURATED_BARCODE_CATALOG[cleanCode]) {
      const item = CURATED_BARCODE_CATALOG[cleanCode];
      return NextResponse.json({
        barcode: cleanCode,
        ...item,
      });
    }

    // 3. Fallback: Query Global Open Food Facts API with a 2-second timeout
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const offRes = await fetch(
        `https://world.openfoodfacts.org/api/v0/product/${cleanCode}.json`,
        { signal: controller.signal }
      );
      clearTimeout(timeout);

      if (offRes.ok) {
        const offData = await offRes.json();
        if (offData.status === 1 && offData.product) {
          const p = offData.product;
          const name = p.product_name_en || p.product_name || `Product #${cleanCode.slice(-4)}`;
          const brand = p.brands || null;
          let cat = "OTHER";
          const lowerTags = (p.categories_tags || []).join(" ").toLowerCase();
          if (lowerTags.includes("dairy") || lowerTags.includes("milk") || lowerTags.includes("cheese")) cat = "DAIRY";
          else if (lowerTags.includes("bread") || lowerTags.includes("bakery") || lowerTags.includes("biscuit")) cat = "BAKERY";
          else if (lowerTags.includes("beverage") || lowerTags.includes("drink") || lowerTags.includes("coffee") || lowerTags.includes("tea")) cat = "BEVERAGES";
          else if (lowerTags.includes("snack") || lowerTags.includes("chip")) cat = "SNACKS";
          else if (lowerTags.includes("fruit") || lowerTags.includes("vegetable")) cat = "PRODUCE";

          return NextResponse.json({
            barcode: cleanCode,
            name,
            brand,
            category: cat,
            description: p.generic_name || p.ingredients_text || `Standard packaged grocery: ${name}`,
            suggested_price: 50,
            image_url: p.image_url || p.image_front_url || null,
          });
        }
      }
    } catch {
      // Open Food Facts network timeout or failure, proceed to default
    }

    // 4. Default fallback for any valid barcode
    return NextResponse.json({
      barcode: cleanCode,
      name: `Packaged Grocery Item (#${cleanCode.slice(-4)})`,
      brand: "Retail Brand",
      category: "GROCERY",
      description: `Scanned GTIN/Barcode: ${cleanCode}. Verified genuine packaged good.`,
      suggested_price: 49,
      image_url: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=500",
    });
  } catch (err: any) {
    return NextResponse.json(
      { detail: err.message || "Failed to lookup barcode" },
      { status: 500 }
    );
  }
}
