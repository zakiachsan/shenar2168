import Header from "@/app/components/layout/Header";
import CategoryNav from "@/app/components/layout/CategoryNav";
import BottomNav from "@/app/components/layout/BottomNav";
import Footer from "@/app/components/layout/Footer";
import HeroBanner from "@/app/components/home/HeroBanner";
import CategoryGrid from "@/app/components/home/CategoryGrid";
import HomeShowcase from "@/app/components/home/HomeShowcase";
import ProductGrid from "@/app/components/home/ProductGrid";

export default function Home() {
  return (
    <>
      <Header />
      <CategoryNav />

      <main className="flex-1">
        <HeroBanner />
        <CategoryGrid />
        <HomeShowcase />
        <ProductGrid />
      </main>

      <Footer />
      <BottomNav />
    </>
  );
}
