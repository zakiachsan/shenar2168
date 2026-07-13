import { allProducts } from "@/lib/data";
import ProductClient from "./ProductClient";
import { Suspense } from "react";

const WC_URL = process.env.WC_URL || "https://api.shenar2168.com";
const CK = process.env.WC_CONSUMER_KEY || "ck_8bd45ea98b4427b58766b0ebbe0f6d38d5a10be1";
const CS = process.env.WC_CONSUMER_SECRET || "cs_0fd2aadf0208f9584a11ee914ed92fdf7b4a0e64";
const BASIC_AUTH = "Basic " + Buffer.from(CK + ":" + CS).toString("base64");

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const id = Number(slug.split("-")[0]);

  let initialProduct: any = null;
  let initialVariations: any[] = [];
  try {
    const res = await fetch(WC_URL + "/wp-json/wc/v3/products/" + id, {
      headers: { Authorization: BASIC_AUTH, Accept: "application/json" },
      next: { revalidate: 0 },
    });
    if (res.ok) {
      const wc = await res.json();
      initialProduct = {
        id: wc.id,
        name: wc.name,
        type: wc.type,
        price: parseInt(wc.price || "0"),
        originalPrice: parseInt(wc.regular_price || "0"),
        image: wc.images && wc.images[0] ? wc.images[0].src : "",
        images: wc.images ? wc.images.map(function(i: any) { return i.src; }) : [],
        rating: parseFloat(wc.average_rating || "0") || 5.0,
        sold: String(wc.total_sales || 0),
        location: "Jakarta",
        discount: wc.on_sale ? Math.round((1 - parseInt(wc.sale_price || wc.price) / parseInt(wc.regular_price)) * 100) : undefined,
        categories: wc.categories ? wc.categories.map(function(c: any) { return c.slug; }) : [],
        attributes: wc.attributes || [],
        description: wc.description || "",
        shortDescription: wc.short_description || "",
      };
      // Fetch variations for variable products
      if (wc.type === "variable" && wc.variations?.length > 0) {
        try {
          const varRes = await fetch(WC_URL + "/wp-json/wc/v3/products/" + id + "/variations", {
            headers: { Authorization: BASIC_AUTH, Accept: "application/json" },
            next: { revalidate: 0 },
          });
          if (varRes.ok) {
            initialVariations = await varRes.json();
          }
        } catch { /* variations not critical */ }
      }
    }
  } catch { /* fall through to static */ }

  if (!initialProduct) {
    initialProduct = allProducts.find((p) => p.id === id) || null;
  }

  return (
    <Suspense fallback={null}>
      <ProductClient id={id} initialProduct={initialProduct || undefined} initialVariations={initialVariations} />
    </Suspense>
  );
}

