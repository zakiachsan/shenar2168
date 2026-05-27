import { allProducts } from "@/lib/data";
import ProductClient from "./ProductClient";

export function generateStaticParams() {
  return [
    { id: "1" },
    { id: "2" },
    { id: "3" },
    { id: "4" },
    { id: "5" },
    { id: "6" },
    { id: "101" },
    { id: "102" },
    { id: "103" },
    { id: "104" },
    { id: "105" },
    { id: "106" },
    { id: "107" },
    { id: "108" },
    { id: "109" },
    { id: "110" },
    { id: "111" },
    { id: "112" },
    { id: "201" },
    { id: "202" },
    { id: "203" },
    { id: "204" },
    { id: "205" },
    { id: "206" },
    { id: "207" },
    { id: "208" },
    { id: "209" },
    { id: "210" },
    { id: "211" },
    { id: "212" },
  ];
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numId = Number(id);
  const initialProduct = allProducts.find((p) => p.id === numId);
  return <ProductClient id={numId} initialProduct={initialProduct} />;
}
