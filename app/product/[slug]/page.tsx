import { allProducts } from "@/lib/data";
import ProductClient from "./ProductClient";

export function generateStaticParams() {
  const ids = [
    "1", "2", "3", "4", "5", "6",
    "101", "102", "103", "104", "105", "106", "107", "108", "109", "110", "111", "112",
    "201", "202", "203", "204", "205", "206", "207", "208", "209", "210", "211", "212",
  ];
  return ids.map((id) => ({ slug: id }));
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const id = Number(slug.split("-")[0]);
  const initialProduct = allProducts.find((p) => p.id === id);
  return <ProductClient id={id} initialProduct={initialProduct} />;
}
