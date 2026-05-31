"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Star,
  Minus,
  Plus,
  Heart,
  Share2,
  ShieldCheck,
  Truck,
  Clock,
  ChevronLeft,
  Loader2,
  MessageCircle,
  User,
  Send,
  Check,
} from "lucide-react";
import Header from "@/app/components/layout/Header";
import BottomNav from "@/app/components/layout/BottomNav";
import Footer from "@/app/components/layout/Footer";
import AddToCartButton from "@/app/components/product/AddToCartButton";
import BuyNowButton from "@/app/components/product/BuyNowButton";
import { products, allProducts, formatPrice, Product, NO_IMAGE_PLACEHOLDER, stripHtml, toSlug } from "@/lib/data";
import { getProductVariations, WCVariation } from "@/lib/woocommerce";
import { isFavorite, toggleFavorite, FavoriteItem } from "@/lib/favorites";

function mapWCProductToLocal(wcProduct: any): Product {
  const image = wcProduct.images?.[0]?.src || "";
  return {
    id: wcProduct.id,
    name: wcProduct.name,
    price: parseInt(wcProduct.price || "0"),
    originalPrice: parseInt(wcProduct.regular_price || "0"),
    image,
    images: wcProduct.images?.map((img: any) => img.src) || [],
    rating: parseFloat(wcProduct.average_rating || "0") || 5.0,
    sold: `${wcProduct.total_sales || 0}`,
    location: "Jakarta",
    discount: wcProduct.on_sale && wcProduct.regular_price > wcProduct.sale_price
      ? Math.round((1 - parseInt(wcProduct.sale_price) / parseInt(wcProduct.regular_price)) * 100)
      : undefined,
    categories: wcProduct.categories?.map((c: any) => c.slug) || [],
    attributes: wcProduct.attributes || [],
  };
}

interface VariationAttribute {
  name: string;
  option: string;
}

export default function ProductClient({ id, initialProduct }: { id: number; initialProduct?: Product }) {
  const [product, setProduct] = useState<Product | null>(initialProduct || null);
  const [loading, setLoading] = useState(!initialProduct);
  const [notFound, setNotFound] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [qty, setQty] = useState(1);
  const [activeTab, setActiveTab] = useState("deskripsi");
  const [discussions, setDiscussions] = useState<any[]>([]);
  const [discussionsLoading, setDiscussionsLoading] = useState(false);
  const [askedBy, setAskedBy] = useState("");
  const [question, setQuestion] = useState("");
  const [questionSubmitting, setQuestionSubmitting] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // Variant pricing state
  const [wcProductRaw, setWcProductRaw] = useState<any>(null);
  const [variations, setVariations] = useState<WCVariation[]>([]);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});

  // Variation attributes from product (dynamic, not just size/color)
  const variationAttributes = useMemo(() => {
    if (!wcProductRaw?.attributes) return [] as { name: string; options: string[] }[];
    return wcProductRaw.attributes
      .filter((a: any) => a.variation && a.name && a.options?.length > 0)
      .map((a: any) => ({ name: a.name, options: a.options }));
  }, [wcProductRaw]);

  // Auto-select first option for each variation attribute
  useEffect(() => {
    if (variationAttributes.length === 0) return;
    setSelectedAttributes((prev) => {
      const next = { ...prev };
      for (const attr of variationAttributes) {
        if (!next[attr.name] && attr.options.length > 0) {
          next[attr.name] = attr.options[0];
        }
      }
      return next;
    });
  }, [variationAttributes.map((a: any) => a.name + ':' + a.options.join(',')).join('|')]);

  // Find matching variation
  const matchedVariation = useMemo(() => {
    if (variations.length === 0) return null;
    const selectedCount = Object.keys(selectedAttributes).length;
    if (selectedCount === 0) return null;
    return variations.find((v) => {
      const vAttrs = v.attributes || [];
      if (vAttrs.length === 0) return false;
      return vAttrs.every((a) => selectedAttributes[a.name] === a.option);
    }) || null;
  }, [variations, selectedAttributes]);

  // Effective price
  const effectivePrice = matchedVariation
    ? parseInt(matchedVariation.sale_price || matchedVariation.price || "0") || parseInt(matchedVariation.regular_price || "0")
    : product?.price || 0;
  const effectiveOriginalPrice = matchedVariation
    ? parseInt(matchedVariation.regular_price || "0") || effectivePrice
    : product?.originalPrice || 0;
  const effectiveSku = matchedVariation?.sku || '';
  const effectiveStock = matchedVariation?.stock_quantity ?? null;
  const isVariable = wcProductRaw?.type === 'variable';

  // Product dimensions/weight for shipping (from WooCommerce or fallback)
  const productWeight = matchedVariation?.weight
    ? parseFloat(matchedVariation.weight) * 1000
    : wcProductRaw?.weight
    ? parseFloat(wcProductRaw.weight) * 1000
    : undefined;
  const productHeight = matchedVariation?.dimensions?.height
    ? parseFloat(matchedVariation.dimensions.height)
    : wcProductRaw?.dimensions?.height
    ? parseFloat(wcProductRaw.dimensions.height)
    : undefined;
  const productLength = matchedVariation?.dimensions?.length
    ? parseFloat(matchedVariation.dimensions.length)
    : wcProductRaw?.dimensions?.length
    ? parseFloat(wcProductRaw.dimensions.length)
    : undefined;
  const productWidth = matchedVariation?.dimensions?.width
    ? parseFloat(matchedVariation.dimensions.width)
    : wcProductRaw?.dimensions?.width
    ? parseFloat(wcProductRaw.dimensions.width)
    : undefined;

  const sizeAttr = product?.attributes?.find(
    (a: any) =>
      a.name?.toLowerCase() === "ukuran" || a.name?.toLowerCase() === "size"
  );
  const colorAttr = product?.attributes?.find(
    (a: any) =>
      a.name?.toLowerCase() === "warna" || a.name?.toLowerCase() === "color"
  );
  const sizes = sizeAttr?.options || [];
  const colors = colorAttr?.options || [];

  useEffect(() => {
    if (product) {
      setFavorited(isFavorite(product.id));
    }
  }, [product?.id]);

  useEffect(() => {
    if (initialProduct) {
      setProduct(initialProduct);
      setLoading(false);
    }
    // Try WC API first, fall back to static data
    async function load() {
      try {
        const res = await fetch(`/api/wc/products/${id}`);
        if (res.ok) {
          const wcProduct = await res.json();
          setWcProductRaw(wcProduct);
          setProduct(mapWCProductToLocal(wcProduct));

          // Load variations if variable product
          if (wcProduct.type === 'variable') {
            try {
              const varRes = await fetch(`/api/wc/products/${id}/variations?per_page=100`);
              if (varRes.ok) {
                const varData = await varRes.json();
                if (Array.isArray(varData)) {
                  setVariations(varData);
                }
              }
            } catch (e) {
              console.error('Failed to load variations:', e);
            }
          }

          if (!initialProduct) setLoading(false);
          return;
        }
      } catch { /* fall through to static */ }

      if (!initialProduct) {
        // Fall back to static products
        const found = allProducts.find((p) => p.id === id);
        if (found) {
          setProduct(found);
        } else {
          setNotFound(true);
        }
        setLoading(false);
      }
    }
    load();

    // Load active coupons
    async function loadCoupons() {
      try {
        const res = await fetch('/api/coupons');
        if (res.ok) {
          const data = await res.json();
          setCoupons(Array.isArray(data.coupons) ? data.coupons : []);
        }
      } catch (e) {
        console.error('Failed to load coupons:', e);
      }
    }
    loadCoupons();
  }, [id, initialProduct]);

  useEffect(() => {
    if (!product) return;
    const pid = product.id;
    async function loadDiscussions() {
      setDiscussionsLoading(true);
      try {
        const res = await fetch(`/api/discussions?productId=${pid}`);
        if (res.ok) {
          const data = await res.json();
          setDiscussions(Array.isArray(data.discussions) ? data.discussions : []);
        }
      } catch (err) {
        console.error("Failed to load discussions:", err);
      } finally {
        setDiscussionsLoading(false);
      }
    }
    loadDiscussions();
  }, [product?.id]);

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !askedBy.trim() || !question.trim()) return;
    setQuestionSubmitting(true);
    try {
      const res = await fetch("/api/discussions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          question: question.trim(),
          askedBy: askedBy.trim(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setDiscussions((prev) => [data.discussion, ...prev]);
        setAskedBy("");
        setQuestion("");
      }
    } catch (err) {
      console.error("Failed to submit question:", err);
    } finally {
      setQuestionSubmitting(false);
    }
  };

  useEffect(() => {
    if (!product) return;
    const pid = product.id;
    async function loadReviews() {
      setReviewsLoading(true);
      try {
        const res = await fetch(`/api/reviews?productId=${pid}`);
        if (res.ok) {
          const data = await res.json();
          setReviews(Array.isArray(data) ? data : []);
        } else {
          setReviews([]);
        }
      } catch {
        setReviews([]);
      } finally {
        setReviewsLoading(false);
      }
    }
    loadReviews();
  }, [product?.id]);

  useEffect(() => {
    async function loadRelated() {
      setRelatedLoading(true);
      try {
        const res = await fetch('/api/products?per_page=12');
        if (res.ok) {
          const data = await res.json();
          const items = (data.products || []).filter((p: any) => p.id !== id).slice(0, 10);
          setRelatedProducts(items);
        }
      } catch {
        const fallback = allProducts.filter((p) => p.id !== id).slice(0, 10);
        setRelatedProducts(fallback);
      } finally {
        setRelatedLoading(false);
      }
    }
    loadRelated();
  }, [id]);

  if (loading) {
    return (
      <>
        <Header sticky={false} />
        <main className="flex-1 bg-shopee-gray pb-36 lg:pb-8">
          <div className="max-w-[1200px] mx-auto px-4 py-16 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-shopee-orange mx-auto mb-3" />
              <p className="text-shopee-text-secondary">Memuat produk...</p>
            </div>
          </div>
        </main>
        <BottomNav />
      </>
    );
  }

  if (notFound || !product) {
    return (
      <>
        <Header sticky={false} />
        <main className="flex-1 bg-shopee-gray pb-36 lg:pb-8">
          <div className="max-w-[1200px] mx-auto px-4 py-16 text-center">
            <p className="text-lg text-shopee-text-secondary mb-2">Produk tidak ditemukan</p>
            <Link href="/" className="inline-block px-6 py-2 bg-shopee-orange text-white text-sm rounded-sm hover:bg-[#1A7BD4]">
              Kembali ke Beranda
            </Link>
          </div>
        </main>
        <BottomNav />
      </>
    );
  }

              const images = product.images && product.images.length > 0
                ? product.images
                : [product.image];
  const fallbackImg = NO_IMAGE_PLACEHOLDER;

  return (
    <>
      <Header sticky={false} />
      <main className="flex-1 bg-shopee-gray pb-28 lg:pb-0">
        <div className="max-w-[1200px] mx-auto px-0 lg:px-4 py-0 lg:py-4">
          <div className="bg-white rounded-sm">
            <div className="flex flex-col lg:flex-row gap-0 lg:gap-6 p-0 lg:p-4">
              {/* Images */}
              <div className="lg:w-[450px] flex-shrink-0">
                {/* Horizontal scrolling image carousel */}
                <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide scroll-smooth">
                  {images.map((img, idx) => (
                    <div
                      key={idx}
                      className="snap-start flex-shrink-0 w-full aspect-[4/3] lg:aspect-square bg-shopee-gray relative"
                    >
                      <img
                        src={img || fallbackImg}
                        alt={`${product.name} - ${idx + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = NO_IMAGE_PLACEHOLDER;
                        }}
                      />
                      {idx === 0 && product.discount && (
                        <div className="absolute top-3 left-3 bg-shopee-orange text-white text-xs font-bold px-2 py-1 rounded-sm">
                          {product.discount}% OFF
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Image pagination dots */}
                {images.length > 1 && (
                  <div className="flex items-center justify-center gap-1.5 mt-2">
                    {images.map((_, idx) => (
                      <div
                        key={idx}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          selectedImage === idx ? "bg-shopee-orange" : "bg-shopee-border"
                        }`}
                      />
                    ))}
                  </div>
                )}

                {/* Desktop: share/fav row */}
                <div className="hidden lg:flex items-center justify-between mt-4 px-1">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-shopee-text-secondary">Bagikan:</span>
                    <button
                      onClick={() => {
                        if (!product) return;
                        const now = toggleFavorite({
                          id: product.id,
                          name: product.name,
                          price: effectivePrice,
                          image: product.image,
                        });
                        setFavorited(now);
                      }}
                      className={`flex items-center gap-1 text-xs transition-colors ${
                        favorited ? "text-red-500 hover:text-red-600" : "text-shopee-text hover:text-shopee-orange"
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${favorited ? "fill-red-500" : ""}`} /> {favorited ? "Favorit" : "Favorit"}
                    </button>
                    <button
                      onClick={async () => {
                        const url = window.location.href;
                        const shareData = {
                          title: product?.name || "Shenar2168",
                          text: `Lihat ${product?.name} di Shenar2168`,
                          url,
                        };
                        try {
                          if (navigator.share) {
                            await navigator.share(shareData);
                          } else if (navigator.clipboard) {
                            await navigator.clipboard.writeText(url);
                            setShareCopied(true);
                            setTimeout(() => setShareCopied(false), 2000);
                          } else {
                            const textarea = document.createElement("textarea");
                            textarea.value = url;
                            document.body.appendChild(textarea);
                            textarea.select();
                            document.execCommand("copy");
                            document.body.removeChild(textarea);
                            setShareCopied(true);
                            setTimeout(() => setShareCopied(false), 2000);
                          }
                        } catch {
                          // user cancelled share
                        }
                      }}
                      className="flex items-center gap-1 text-xs text-shopee-text hover:text-shopee-orange transition-colors"
                    >
                      {shareCopied ? (
                        <>
                          <Check className="w-4 h-4 text-green-500" /> Tersalin
                        </>
                      ) : (
                        <>
                          <Share2 className="w-4 h-4" /> Share
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 px-3 lg:px-0 py-3 lg:py-0">
                {/* Price row — price left, sold+like right (horizontal) */}
                <div className="flex items-start justify-between">
                  <div className="flex flex-col">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl lg:text-3xl text-shopee-orange font-medium">
                        {formatPrice(effectivePrice)}
                      </span>
                      {effectiveOriginalPrice > effectivePrice && (
                        <span className="text-sm text-shopee-text-secondary line-through">
                          {formatPrice(effectiveOriginalPrice)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {effectiveOriginalPrice > effectivePrice && (
                        <span className="bg-shopee-orange text-white text-xs px-1.5 py-0.5 rounded-sm">
                          {Math.round((1 - effectivePrice / effectiveOriginalPrice) * 100)}% OFF
                        </span>
                      )}
                      {coupons.slice(0, 2).map((c) => (
                        <span
                          key={c.id}
                          className="bg-shopee-orange-light text-shopee-orange text-[11px] px-2 py-0.5 rounded-sm"
                        >
                          {c.discount_type === 'percent'
                            ? `${c.amount}% OFF`
                            : `Diskon ${formatPrice(c.amount)}`}
                        </span>
                      ))}
                      {coupons.length === 0 && (
                        <span className="bg-shopee-orange-light text-shopee-orange text-[11px] px-2 py-0.5 rounded-sm">
                          Diskon Menarik
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-shopee-text-secondary">
                    <span>{product.sold} Terjual</span>
                    <button
                      onClick={() => {
                        if (!product) return;
                        const now = toggleFavorite({
                          id: product.id,
                          name: product.name,
                          price: effectivePrice,
                          image: product.image,
                        });
                        setFavorited(now);
                      }}
                      className={`flex items-center gap-0.5 transition-colors ${
                        favorited ? "text-red-500" : "text-shopee-text-secondary hover:text-red-500"
                      }`}
                      aria-label={favorited ? "Hapus dari favorit" : "Tambah ke favorit"}
                    >
                      <Heart className={`w-3.5 h-3.5 ${favorited ? "fill-red-500" : ""}`} />
                      {favorited ? "Disukai" : "Suka"}
                    </button>
                  </div>
                </div>

                {/* Product name + rating (right-aligned) */}
                <div className="mt-3 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    {product.badge && (
                      <span className="bg-shopee-green text-white text-[10px] px-1.5 py-0.5 rounded-sm flex-shrink-0 mt-0.5">
                        {product.badge}
                      </span>
                    )}
                    <h1 className="text-base lg:text-xl text-shopee-text leading-snug">{product.name}</h1>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 text-sm">
                    <span className="text-shopee-orange underline">{product.rating}</span>
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < Math.floor(product.rating)
                              ? "text-shopee-yellow fill-shopee-yellow"
                              : "text-shopee-border"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Variants */}
                <div className="mt-4 space-y-3">
                  {/* Dynamic variation attribute pickers */}
                  {isVariable && variationAttributes.map((attr: { name: string; options: string[] }) => (
                    <div key={attr.name}>
                      <span className="text-sm text-shopee-text-secondary block mb-2">
                        {attr.name}: {selectedAttributes[attr.name] || '-'}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {attr.options.map((opt: string) => (
                          <button
                            key={opt}
                            onClick={() =>
                              setSelectedAttributes((prev) => ({ ...prev, [attr.name]: opt }))
                            }
                            className={`px-3 py-1.5 text-xs border rounded-sm transition-all duration-150 ${
                              selectedAttributes[attr.name] === opt
                                ? "border-shopee-orange text-shopee-orange bg-shopee-orange-light font-medium ring-1 ring-shopee-orange/30 shadow-sm"
                                : "border-shopee-border text-shopee-text-secondary hover:border-shopee-orange/40 hover:text-shopee-text"
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Legacy size/color pickers for non-variable products */}
                  {!isVariable && colors.length > 0 && (
                    <div>
                      <span className="text-sm text-shopee-text-secondary block mb-2">Varian: {selectedAttributes['Warna'] || selectedAttributes['Color'] || colors[0]}</span>
                      <div className="flex flex-wrap gap-2">
                        {colors.map((c: string) => (
                          <button
                            key={c}
                            onClick={() => setSelectedAttributes((prev) => ({ ...prev, [colorAttr?.name || 'Warna']: c }))}
                            className={`px-3 py-1.5 text-xs border rounded-sm transition-all duration-150 ${
                              (selectedAttributes[colorAttr?.name || 'Warna'] || colors[0]) === c
                                ? "border-shopee-orange text-shopee-orange bg-shopee-orange-light font-medium ring-1 ring-shopee-orange/30 shadow-sm"
                                : "border-shopee-border text-shopee-text-secondary hover:border-shopee-orange/40 hover:text-shopee-text"
                            }`}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {!isVariable && sizes.length > 0 && (
                    <div>
                      <span className="text-sm text-shopee-text-secondary block mb-2">Ukuran: {selectedAttributes['Ukuran'] || selectedAttributes['Size'] || sizes[0]}</span>
                      <div className="flex flex-wrap gap-2">
                        {sizes.map((s: string) => (
                          <button
                            key={s}
                            onClick={() => setSelectedAttributes((prev) => ({ ...prev, [sizeAttr?.name || 'Ukuran']: s }))}
                            className={`w-10 h-8 text-xs border rounded-sm transition-all duration-150 flex items-center justify-center ${
                              (selectedAttributes[sizeAttr?.name || 'Ukuran'] || sizes[0]) === s
                                ? "border-shopee-orange text-shopee-orange bg-shopee-orange-light font-medium ring-1 ring-shopee-orange/30 shadow-sm"
                                : "border-shopee-border text-shopee-text-secondary hover:border-shopee-orange/40 hover:text-shopee-text"
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <span className="text-sm text-shopee-text-secondary block mb-2">Kuantitas</span>
                    <div className="flex items-center gap-0">
                      <button
                        onClick={() => setQty(Math.max(1, qty - 1))}
                        className="w-8 h-8 border border-shopee-border flex items-center justify-center hover:bg-shopee-gray transition-colors rounded-l-sm"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-12 h-8 border-t border-b border-shopee-border flex items-center justify-center text-sm">
                        {qty}
                      </span>
                      <button
                        onClick={() => setQty(qty + 1)}
                        className="w-8 h-8 border border-shopee-border flex items-center justify-center hover:bg-shopee-gray transition-colors rounded-r-sm"
                        disabled={effectiveStock !== null && effectiveStock !== undefined && qty >= effectiveStock}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <span className="ml-3 text-xs text-shopee-text-secondary">
                        {effectiveStock !== null && effectiveStock !== undefined
                          ? `Tersedia ${effectiveStock} stok`
                          : 'Tersedia 150 stok'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions Desktop */}
                <div className="hidden lg:flex items-center gap-3 mt-6">
                  <AddToCartButton
                    productId={product.id}
                    name={product.name}
                    price={effectivePrice}
                    originalPrice={effectiveOriginalPrice}
                    image={product.image}
                    sku={effectiveSku}
                    stock={effectiveStock}
                    quantity={qty}
                    variationId={matchedVariation?.id}
                    weight={productWeight}
                    height={productHeight}
                    length={productLength}
                    width={productWidth}
                    className="flex-1 whitespace-nowrap"
                  />
                  <BuyNowButton
                    productId={product.id}
                    name={product.name}
                    price={effectivePrice}
                    originalPrice={effectiveOriginalPrice}
                    image={product.image}
                    sku={effectiveSku}
                    stock={effectiveStock}
                    quantity={qty}
                    variationId={matchedVariation?.id}
                    weight={productWeight}
                    height={productHeight}
                    length={productLength}
                    width={productWidth}
                    className="flex-1 whitespace-nowrap"
                  />
                </div>

                {/* Guarantees — mobile & desktop */}
                <div className="flex items-center justify-between mt-4 p-3 border border-shopee-border rounded-sm">
                  <div className="flex items-center gap-1.5 text-[11px] text-shopee-text-secondary">
                    <ShieldCheck className="w-3.5 h-3.5 text-shopee-green flex-shrink-0" />
                    <span>100% Ori</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-shopee-text-secondary">
                    <Truck className="w-3.5 h-3.5 text-shopee-green flex-shrink-0" />
                    <span>Pengiriman Cepat</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-shopee-text-secondary">
                    <Clock className="w-3.5 h-3.5 text-shopee-green flex-shrink-0" />
                    <span>15 Hari Retur</span>
                  </div>
                </div>

                {isVariable && matchedVariation && (
                  <p className="text-xs text-shopee-text-secondary mt-2">
                    Varian: {matchedVariation.attributes.map((a) => `${a.name}: ${a.option}`).join(', ')}
                    {effectiveStock !== null && effectiveStock !== undefined && (
                      <span className="ml-2">&middot; Stok: {effectiveStock}</span>
                    )}
                  </p>
                )}
              </div>
            </div>

            {/* Shop Info */}
            <div className="border-t border-shopee-border p-3 lg:p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-shopee-gray border border-shopee-border overflow-hidden">
                    <img src={product.image || NO_IMAGE_PLACEHOLDER} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-shopee-text">Shenar2168 Official Store</p>
                    <p className="text-xs text-shopee-text-secondary">Aktif 5 menit lalu</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link href="/shop" className="px-3 py-1.5 border border-shopee-orange text-xs text-shopee-orange rounded-sm hover:bg-shopee-orange-light">
                    Kunjungi
                  </Link>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-t border-shopee-border">
              <div className="flex items-center gap-0 sticky top-[41px] lg:top-0 bg-white z-30 border-b border-shopee-border">
                {["deskripsi", "ulasan", "diskusi"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-3 text-sm capitalize transition-colors relative ${
                      activeTab === tab
                        ? "text-shopee-orange font-medium"
                        : "text-shopee-text-secondary hover:text-shopee-text"
                    }`}
                  >
                    {tab === "deskripsi" ? "Deskripsi Produk" : tab === "ulasan" ? `Ulasan (${reviews.length})` : `Diskusi (${discussions.length})`}
                    {activeTab === tab && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-shopee-orange" />}
                  </button>
                ))}
              </div>
              <div className="p-3 lg:p-6 min-h-[200px]">
                {activeTab === "deskripsi" && (
                  <div className="space-y-3 text-sm text-shopee-text">
                    <p>
                      {product.name} dengan kualitas premium terbaik. Produk original dan bergaransi resmi.
                    </p>
                    <p>
                      <strong>Spesifikasi:</strong>
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-shopee-text-secondary">
                      <li>Material berkualitas tinggi</li>
                      <li>Design modern dan ergonomis</li>
                      <li>Tersedia dalam berbagai varian warna dan ukuran</li>
                      <li>Garansi resmi 1 tahun</li>
                      <li>Free packing bubble wrap + kardus</li>
                    </ul>
                  </div>
                )}
                {activeTab === "ulasan" && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <span className="text-3xl font-medium text-shopee-orange">
                          {reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : product.rating.toFixed(1)}
                        </span>
                        <div className="flex justify-center mt-1">
                          {[...Array(5)].map((_, i) => {
                            const avg = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : product.rating;
                            return (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < Math.round(avg)
                                    ? "text-shopee-yellow fill-shopee-yellow"
                                    : "text-shopee-border"
                                }`}
                              />
                            );
                          })}
                        </div>
                        <p className="text-xs text-shopee-text-secondary mt-1">{reviews.length} Ulasan</p>
                      </div>
                      <div className="flex-1 space-y-1.5">
                        {[5, 4, 3, 2, 1].map((star) => {
                          const count = reviews.filter((r) => r.rating === star).length;
                          const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                          return (
                            <div key={star} className="flex items-center gap-2">
                              <span className="text-xs text-shopee-text w-3">{star}</span>
                              <Star className="w-3 h-3 text-shopee-yellow fill-shopee-yellow" />
                              <div className="flex-1 h-2 bg-shopee-gray rounded-full overflow-hidden">
                                <div className="h-full bg-shopee-yellow rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-[10px] text-shopee-text-secondary w-6 text-right">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {reviewsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-shopee-orange" />
                      </div>
                    ) : reviews.length === 0 ? (
                      <div className="text-sm text-shopee-text-secondary text-center py-8">
                        Belum ada ulasan untuk produk ini. Jadi yang pertama!
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {reviews.map((r) => (
                          <div key={r.id} className="bg-white rounded-sm border border-shopee-border/50 p-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-shopee-orange text-white text-xs font-bold flex items-center justify-center">
                                {r.reviewer?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "?"}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-shopee-text">{r.reviewer}</p>
                                <div className="flex items-center gap-1">
                                  {[...Array(5)].map((_, i) => (
                                    <Star key={i} className={`w-3 h-3 ${i < r.rating ? "text-shopee-yellow fill-shopee-yellow" : "text-shopee-border"}`} />
                                  ))}
                                  <span className="text-[10px] text-shopee-text-secondary ml-1">
                                    {new Date(r.date_created).toLocaleDateString("id-ID")}
                                  </span>
                                </div>
                              </div>
                              {r.verified && (
                                <span className="text-[10px] bg-shopee-green text-white px-1.5 py-0.5 rounded-sm">Terverifikasi</span>
                              )}
                            </div>
                            <p className="text-sm text-shopee-text mt-2">{stripHtml(r.review)}</p>
                            {r.images && r.images.length > 0 && (
                              <div className="flex gap-2 mt-2 flex-wrap">
                                {r.images.map((img: string, idx: number) => (
                                  <a key={idx} href={img} target="_blank" rel="noopener noreferrer" className="block w-16 h-16 rounded-sm border border-shopee-border overflow-hidden flex-shrink-0">
                                    <img src={img} alt="" className="w-full h-full object-cover" />
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="bg-shopee-gray rounded-sm p-3 text-center">
                      <p className="text-xs text-shopee-text-secondary">
                        Ulasan hanya dapat diberikan setelah pesanan selesai.
                      </p>
                      <Link href="/profile/orders" className="text-xs text-shopee-orange font-medium hover:underline mt-1 inline-block">
                        Lihat Pesanan Saya
                      </Link>
                    </div>
                  </div>
                )}
                {activeTab === "diskusi" && (
                  <div className="space-y-4">
                    {discussionsLoading ? (
                      <div className="text-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-shopee-orange mx-auto mb-2" />
                        <p className="text-sm text-shopee-text-secondary">Memuat diskusi...</p>
                      </div>
                    ) : discussions.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageCircle className="w-10 h-10 text-shopee-border mx-auto mb-2" />
                        <p className="text-sm text-shopee-text-secondary">
                          Belum ada diskusi. Jadilah yang pertama bertanya!
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {discussions.map((d) => (
                          <div
                            key={d.id}
                            className="border border-shopee-border rounded-sm p-3 lg:p-4 bg-white"
                          >
                            <div className="flex items-start gap-2">
                              <div className="w-7 h-7 rounded-full bg-shopee-gray flex items-center justify-center flex-shrink-0">
                                <User className="w-3.5 h-3.5 text-shopee-text-secondary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-medium text-shopee-text">
                                    {d.askedBy}
                                  </span>
                                  <span className="text-[11px] text-shopee-text-secondary">
                                    {new Date(d.askedAt).toLocaleDateString("id-ID", {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                    })}
                                  </span>
                                </div>
                                <p className="text-sm text-shopee-text leading-relaxed">
                                  {d.question}
                                </p>
                                {d.status === "answered" ? (
                                  <div className="mt-2 bg-shopee-orange-light/50 rounded-sm p-2.5 border border-shopee-orange/10">
                                    <div className="flex items-center gap-1.5 mb-1">
                                      <span className="bg-shopee-orange text-white text-[10px] px-1.5 py-0.5 rounded-sm font-medium">
                                        Dijawab Penjual
                                      </span>
                                      {d.answeredAt && (
                                        <span className="text-[11px] text-shopee-text-secondary">
                                          {new Date(d.answeredAt).toLocaleDateString("id-ID", {
                                            day: "numeric",
                                            month: "short",
                                            year: "numeric",
                                          })}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-sm text-shopee-text">{d.answer}</p>
                                  </div>
                                ) : (
                                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-shopee-text-secondary">
                                    <Clock className="w-3 h-3" />
                                    Menunggu jawaban penjual
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Ask Question Form */}
                    <div className="border-t border-shopee-border pt-4 mt-4">
                      <h3 className="text-sm font-medium text-shopee-text mb-3">
                        Tanya Produk
                      </h3>
                      <form onSubmit={handleAskQuestion} className="space-y-3">
                        <div>
                          <input
                            type="text"
                            placeholder="Nama Anda"
                            value={askedBy}
                            onChange={(e) => setAskedBy(e.target.value)}
                            required
                            className="w-full text-sm border border-shopee-border rounded-sm px-3 py-2 focus:outline-none focus:border-shopee-orange focus:ring-1 focus:ring-shopee-orange/20"
                          />
                        </div>
                        <div>
                          <textarea
                            placeholder="Apa yang ingin Anda tanyakan tentang produk ini?"
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            required
                            rows={3}
                            className="w-full text-sm border border-shopee-border rounded-sm px-3 py-2 focus:outline-none focus:border-shopee-orange focus:ring-1 focus:ring-shopee-orange/20 resize-none"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={questionSubmitting || !askedBy.trim() || !question.trim()}
                          className="w-full sm:w-auto px-4 py-2 bg-shopee-orange text-white text-sm font-medium rounded-sm hover:bg-[#d35400] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {questionSubmitting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                          Kirim Pertanyaan
                        </button>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Lainnya dari Toko Ini */}
        <div className="mt-3 lg:mt-4">
          <div className="bg-white lg:rounded-sm p-3 lg:p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-medium text-shopee-text">Lainnya dari Toko Ini</h2>
                <p className="text-[11px] text-shopee-text-secondary">Shenar2168 Official Store</p>
              </div>
              <a href="https://ragamguna.com/shop" target="_blank" rel="noopener noreferrer" className="text-xs text-shopee-orange hover:underline flex items-center gap-0.5">
                Lihat Semua <ChevronRight className="w-3 h-3" />
              </a>
            </div>

              <div className="relative group">
                {/* Carousel track */}
                <div
                  id="related-carousel"
                  className="flex gap-2.5 overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory pb-1"
                >
                  {relatedLoading
                    ? Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="snap-start flex-shrink-0 w-[140px] sm:w-[160px] lg:w-[180px]">
                          <div className="border border-shopee-border/30 rounded-sm overflow-hidden bg-white">
                            <div className="w-full aspect-square bg-shopee-gray animate-pulse" />
                            <div className="p-2 space-y-1.5">
                              <div className="h-3 bg-shopee-gray rounded animate-pulse w-full" />
                              <div className="h-3 bg-shopee-gray rounded animate-pulse w-3/4" />
                              <div className="h-3.5 bg-shopee-gray rounded animate-pulse w-1/2" />
                            </div>
                          </div>
                        </div>
                      ))
                    : relatedProducts.map((p) => (
                        <Link
                          key={p.id}
                          href={`/product/${p.id}-${toSlug(p.name)}`}
                          className="snap-start flex-shrink-0 w-[140px] sm:w-[160px] lg:w-[180px] block"
                        >
                          <div className="border border-shopee-border/50 rounded-sm overflow-hidden hover:shadow-md hover:border-shopee-orange/30 transition-all bg-white">
                            <div className="relative w-full aspect-square bg-shopee-gray">
                              <img
                                src={p.image || NO_IMAGE_PLACEHOLDER}
                                alt={p.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                              {p.discount && p.discount > 0 && (
                                <span className="absolute top-1 left-1 bg-shopee-orange text-white text-[10px] font-medium px-1.5 py-0.5 rounded-sm">
                                  -{p.discount}%
                                </span>
                              )}
                            </div>
                            <div className="p-2">
                              <p className="text-xs text-shopee-text line-clamp-2 leading-[1.4] min-h-[2.8em]">{p.name}</p>
                              <p className="text-sm text-shopee-orange font-medium mt-1">{formatPrice(p.price)}</p>
                              <div className="flex items-center gap-1 mt-0.5">
                                <Star className="w-3 h-3 text-shopee-yellow fill-shopee-yellow" />
                                <span className="text-[10px] text-shopee-text-secondary">{p.rating.toFixed(1)}</span>
                                <span className="text-[10px] text-shopee-text-secondary">| {p.sold}</span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                </div>
              </div>
            </div>
          </div>
      </main>

      {/* Mobile Sticky Actions */}
      <div className="lg:hidden fixed bottom-14 left-0 right-0 bg-white border-t border-shopee-border z-[60] flex items-center h-14">
        <AddToCartButton
          productId={product.id}
          name={product.name}
          price={effectivePrice}
          originalPrice={effectiveOriginalPrice}
          image={product.image}
          sku={effectiveSku}
          stock={effectiveStock}
          quantity={qty}
          variationId={matchedVariation?.id}
          weight={productWeight}
          height={productHeight}
          length={productLength}
          width={productWidth}
          variant="default"
          className="flex-1 h-full border-0 rounded-none text-xs whitespace-nowrap"
        />
        <BuyNowButton
          productId={product.id}
          name={product.name}
          price={effectivePrice}
          originalPrice={effectiveOriginalPrice}
          image={product.image}
          sku={effectiveSku}
          stock={effectiveStock}
          quantity={qty}
          variationId={matchedVariation?.id}
          weight={productWeight}
          height={productHeight}
          length={productLength}
          width={productWidth}
          className="flex-1 h-full rounded-none text-sm whitespace-nowrap"
        />
      </div>

      <div className="hidden lg:block">
        <Footer />
      </div>
      <BottomNav />
    </>
  );
}
