import { allProducts } from "@/lib/data";
import ProductClient from "./ProductClient";

const WC_URL = process.env.WC_URL || "https://api.shenar2168.com";
const CK = process.env.WC_CONSUMER_KEY || "ck_0037912ea33eab6d8c692d89a3e05da1848220e4";
const CS = process.env.WC_CONSUMER_SECRET || "cs_7a3e75a2f15707384215b3c87872ed881494024a";
const BASIC_AUTH = "Basic " + Buffer.from(CK + ":" + CS).toString("base64");

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const id = Number(slug.split("-")[0]);

  let initialProduct: any = null;
  try {
    const res = await fetch(WC_URL + "/wp-json/wc/v3/products/" + id, {
      headers: { Authorization: BASIC_AUTH, Accept: "application/json" },
      next: { revalidate: 60 },
    });
    if (res.ok) {
      const wc = await res.json();
      initialProduct = {
        id: wc.id,
        name: wc.name,
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
    }
  } catch { /* fall through to static */ }

  if (!initialProduct) {
    initialProduct = allProducts.find((p) => p.id === id) || null;
  }

  return <ProductClient id={id} initialProduct={initialProduct || undefined} />;
}
