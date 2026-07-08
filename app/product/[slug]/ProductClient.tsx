"use client";

import { useState, useEffect, useMemo } from "react";
import { useChat } from "@/lib/chat-context";
import { useAuth } from "@/app/components/layout/AuthProvider";
import LoginModal from "@/app/components/layout/LoginModal";
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
  CheckCircle,
  ChevronLeft,
  Loader2,
  MessageCircle,
  ShoppingCart,
  User,
  Send,
  X,
} from "lucide-react";
import Header from "@/app/components/layout/Header";
import BottomNav from "@/app/components/layout/BottomNav";
import Footer from "@/app/components/layout/Footer";
import AddToCartButton from "@/app/components/product/AddToCartButton";
import BuyNowButton from "@/app/components/product/BuyNowButton";
import { useCart } from "@/lib/cart-context";
import { useRouter, useSearchParams } from "next/navigation";
import { products, allProducts, formatPrice, Product, NO_IMAGE_PLACEHOLDER, stripHtml, toSlug } from "@/lib/data";
// Local product only — no WooCommerce

interface VariationAttribute {
  name: string;
  option: string;
}

export default function ProductClient({ id, initialProduct, initialVariations }: { id: number; initialProduct?: Product; initialVariations?: any[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [product, setProduct] = useState<Product | null>(initialProduct || null);
  const [loading, setLoading] = useState(!initialProduct);
  const [notFound, setNotFound] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const metaData = (product as any)?.meta_data || [];
  const minQuantity = parseInt(metaData.find((m: any) => m.key === '_min_quantity')?.value || '1') || 1;
  const [qty, setQty] = useState(minQuantity);

  // Sync qty when minQuantity changes (after API fetch)
  useEffect(() => {
    setQty((prev) => Math.max(prev, minQuantity));
  }, [minQuantity]);
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
  const [storeSettings, setStoreSettings] = useState<{ storeName: string; storeLogo: string } | null>(null);

  const { addItem, getItemCount } = useCart();
  // Variant pricing state
  const [variations, setVariations] = useState<any[]>(initialVariations || []);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});

  // Variation attributes from product (dynamic, not just size/color)
  const variationAttributes = useMemo(() => {
    if (!product?.attributes) return [] as { name: string; options: string[] }[];
    return product.attributes
      .filter((a: any) => a.variation && a.name && a.options?.length > 0)
      .map((a: any) => ({ name: a.name, options: a.options }));
  }, [product]);

  // Variant modal state
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<'cart' | 'buy'>('cart');

  // Check if all variant attributes are selected
  const allVariantsSelected = useMemo(() => {
    if (variationAttributes.length === 0) return true; // No variants
    return variationAttributes.every((attr) => selectedAttributes[attr.name]);
  }, [variationAttributes, selectedAttributes]);

  // Auto-preselect variation from query param (from checkout click)
  useEffect(() => {
    if (!searchParams || !product || variations.length === 0) return;
    const variationIdFromQuery = searchParams.get('variationId');
    const fromCheckout = searchParams.get('fromCheckout');
    if (variationIdFromQuery) {
      const matched = variations.find((v) => String(v.id) === variationIdFromQuery);
      if (matched && matched.attributes) {
        const attrs: Record<string, string> = {};
        matched.attributes.forEach((a: any) => {
          if (a.name && a.option) attrs[a.name] = a.option;
        });
        setSelectedAttributes(attrs);
      }
      // Auto-open variant modal with pre-selected variant
      if (isVariable && variationAttributes.length > 0) {
        setPendingAction('cart');
        setShowVariantModal(true);
      }
    } else if (fromCheckout === '1' && isVariable && variationAttributes.length > 0) {
      // Came from checkout with no variationId -> auto-open modal
      setPendingAction('cart');
      setShowVariantModal(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, product, variations]);

  // Main component add-to-cart (for modal use)
  
  const doAddToCart = () => {
    if (!product) return;
    addItem({
      productId: product.id,
      name: product.name,
      price: effectivePrice,
      originalPrice: effectiveOriginalPrice,
      image: matchedVariation?.image || product.image || '',
      quantity: qty,
      sku: effectiveSku,
      stock: effectiveStock,
      variationId: matchedVariation?.id,
      variationInfo,
      weight: productWeight,
      height: productHeight,
      length: productLength,
      width: productWidth,
      isPreorder: isPreorder,
      preorderDays: preorderDays,
      minQuantity: minQuantity,
    });
  };

  // NOTE: No auto-select — user must pick variant manually

  // Find matching variation
  const matchedVariation = useMemo(() => {
    if (variations.length === 0) return null;
    const selectedCount = Object.keys(selectedAttributes).length;
    if (selectedCount === 0) return null;
    return variations.find((v) => {
      const vAttrs = v.attributes || [];
      if (vAttrs.length === 0) return false;
      return vAttrs.every((a: any) => selectedAttributes[a.name] === a.option);
    }) || null;
  }, [variations, selectedAttributes]);

  // When variant is selected, scroll to its image
  useEffect(() => {
    if (!matchedVariation?.image) return;
    const idx = images.indexOf(matchedVariation.image);
    if (idx >= 0) setSelectedImage(idx);
  }, [matchedVariation?.image]);

  // Effective price
  const effectivePrice = matchedVariation
    ? parseInt(matchedVariation.sale_price || matchedVariation.price || "0") || parseInt(matchedVariation.regular_price || "0")
    : product?.price || 0;
  const effectiveOriginalPrice = matchedVariation
    ? parseInt(matchedVariation.regular_price || "0") || effectivePrice
    : product?.originalPrice || 0;
  const effectiveSku = matchedVariation?.sku || '';
  const effectiveStock = matchedVariation?.stock_quantity ?? null;
  const isVariable = product?.type === 'variable';
  const isPreorder = (product as any)?.isPreorder;
  const preorderDays = (product as any)?.preorderDays || 7;

  // Build variationInfo string from selected attributes
  const variationInfo = useMemo(() => {
    const entries = Object.entries(selectedAttributes);
    if (entries.length === 0) return '';
    return entries.map(([k, v]) => `${k}: ${v}`).join(', ');
  }, [selectedAttributes]);

  // Product dimensions/weight for shipping
  const productWeight = product?.weight || 500;
  const productHeight = product?.height || 10;
  const productLength = product?.length || 20;
  const productWidth = product?.width || 15;

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

  // Handlers for Chat, Wishlist, Share
  const [isWishlisted, setIsWishlisted] = useState(false);

  useEffect(() => {
    // Check if product is already wishlisted
    try {
      const favs = JSON.parse(localStorage.getItem('ragamguna-favorites') || '[]');
      setIsWishlisted(favs.includes(product?.id));
    } catch {}
  }, [product?.id]);

  const { openChat } = useChat();
  const { user } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);

  const handleChat = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    if (window.innerWidth < 1024) {
      const params = new URLSearchParams();
      if (product?.id) params.set('productId', String(product.id));
      if (product?.name) params.set('productName', product.name);
      if (product?.image) params.set('productImage', product.image);
      if (product?.price) params.set('productPrice', String(product.price));
      router.push(`/chat?${params.toString()}`);
    } else if (product) {
      openChat(product.id, product.name);
    }
  };

  const handleWishlist = () => {
    if (!product) return;
    let favs: number[];
    try {
      favs = JSON.parse(localStorage.getItem('ragamguna-favorites') || '[]');
    } catch {
      favs = [];
    }
    const idx = favs.indexOf(product.id);
    if (idx >= 0) {
      favs.splice(idx, 1);
    } else {
      favs.push(product.id);
    }
    localStorage.setItem('ragamguna-favorites', JSON.stringify(favs));
    setIsWishlisted(!isWishlisted);
  };

  const handleShare = async () => {
    const url = window.location.href;
    const title = product?.name || 'Produk RagamGuna';
    if (navigator.share) {
      try {
        await navigator.share({ title, url, text: `Cek produk ini: ${title}` });
      } catch {}
    } else {
      // Fallback: copy link
      try {
        await navigator.clipboard.writeText(url);
        alert('Link produk berhasil disalin!');
      } catch {}
    }
  };

  useEffect(() => {
    if (initialProduct) {
      setProduct(initialProduct);
      setLoading(false);
    }
    // Fetch from local API
    async function load() {
      if (initialProduct) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/products/${id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.product) {
            setProduct(data.product);
            if (data.variations) {
              setVariations(data.variations);
            }
          } else {
            setNotFound(true);
          }
          setLoading(false);
          return;
        }
      } catch { /* fall through */ }

      setNotFound(true);
      setLoading(false);
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

  // Load store settings for store logo
  useEffect(() => {
    async function loadStoreSettings() {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          setStoreSettings({ storeName: data.storeName || 'RagamGuna Official Store', storeLogo: data.storeLogo || '' });
        }
      } catch { /* ignore */ }
    }
    loadStoreSettings();
  }, []);

  if (loading) {
    return (
      <>
        <div className="hidden lg:block">
        <Header />
      </div>
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
        <Header />
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

              // Image logic: show ALL images (non-variant + variant)
              const fallbackImg = NO_IMAGE_PLACEHOLDER;
              const nonVariantImages = product.images && product.images.length > 0
                ? product.images
                : product.image ? [product.image] : [];
              const allVariantImages = isVariable
                ? variations.filter((v: any) => v.image).map((v: any) => v.image)
                : [];
              const images = [...new Set([...nonVariantImages, ...allVariantImages])];
              if (images.length === 0) images.push(fallbackImg);

  return (
    <>
      <div className="hidden lg:block">
        <Header />
      </div>
      <main className="flex-1 bg-shopee-gray pb-28 lg:pb-0">
        <div className="max-w-[1200px] mx-auto px-0 lg:px-4 py-0 lg:py-4">
          {/* Breadcrumb */}
          <div className="hidden lg:flex items-center gap-1 text-xs text-shopee-text-secondary mb-3 px-1">
            <Link href="/" className="hover:text-shopee-orange">Beranda</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="hover:text-shopee-orange cursor-pointer">{product.categories?.[0] ? (product.categories[0].charAt(0).toUpperCase() + product.categories[0].slice(1)).replace(/-/g, " ") : "Semua Kategori"}</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-shopee-text line-clamp-1 max-w-[300px]">{product.name}</span>
          </div>

          {/* Mobile: floating back + cart buttons (no sticky header) */}
          <div className="lg:hidden absolute top-3 left-3 z-30">
            <Link href="/" className="w-9 h-9 rounded-full bg-black/30 flex items-center justify-center">
              <ChevronLeft className="w-5 h-5 text-white" />
            </Link>
          </div>
          <div className="lg:hidden absolute top-3 right-3 z-30 flex items-center gap-2">
            <button onClick={handleShare} className="w-9 h-9 rounded-full bg-black/30 flex items-center justify-center">
              <Share2 className="w-5 h-5 text-white" />
            </button>
            <Link href="/cart" className="w-9 h-9 rounded-full bg-black/30 flex items-center justify-center relative">
              <ShoppingCart className="w-5 h-5 text-white" />
              {getItemCount() > 0 && (
                <span className="absolute -top-1 -right-1 bg-shopee-orange text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white">
                  {getItemCount() > 99 ? '99+' : getItemCount()}
                </span>
              )}
            </Link>
          </div>

          <div className="bg-white rounded-sm">
            <div className="flex flex-col lg:flex-row gap-0 lg:gap-6 p-0 lg:p-4">
              {/* Images */}
              <div className="lg:w-[450px] flex-shrink-0">
                <div className="aspect-square bg-shopee-gray relative overflow-hidden">
                  <div
                    className="flex h-full transition-transform duration-300 ease-out"
                    style={{ transform: `translateX(-${selectedImage * 100}%)` }}
                    onTouchStart={(e) => {
                      const startX = e.touches[0].clientX;
                      const handleTouchEnd = (ev: TouchEvent) => {
                        const endX = ev.changedTouches[0].clientX;
                        const diff = startX - endX;
                        if (Math.abs(diff) > 50) {
                          if (diff > 0 && selectedImage < images.length - 1) {
                            setSelectedImage((prev) => prev + 1);
                          } else if (diff < 0 && selectedImage > 0) {
                            setSelectedImage((prev) => prev - 1);
                          }
                        }
                        window.removeEventListener("touchend", handleTouchEnd);
                      };
                      window.addEventListener("touchend", handleTouchEnd, { once: true });
                    }}
                  >
                    {images.map((img, idx) => (
                      <img
                        key={idx}
                        src={img || fallbackImg}
                        alt={product.name}
                        className="w-full h-full object-cover flex-shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = NO_IMAGE_PLACEHOLDER;
                        }}
                      />
                    ))}
                  </div>
                  {product.discount && (
                    <div className="absolute top-3 left-3 bg-shopee-orange text-white text-xs font-bold px-2 py-1 rounded-sm">
                      {product.discount}% OFF
                    </div>
                  )}
                  {/* Image dots indicator */}
                  {images.length > 1 && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/30 px-2 py-1 rounded-full">
                      {images.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedImage(idx)}
                          className={`w-2 h-2 rounded-full transition-colors ${
                            selectedImage === idx ? "bg-shopee-orange" : "bg-white/70"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <div className="hidden lg:flex items-center justify-between mt-4 px-1">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-shopee-text-secondary">Bagikan:</span>
                    <button className="flex items-center gap-1 text-xs text-shopee-text hover:text-shopee-orange">
                      <Heart className="w-4 h-4" /> Favorit
                    </button>
                    <button className="flex items-center gap-1 text-xs text-shopee-text hover:text-shopee-orange">
                      <Share2 className="w-4 h-4" /> Share
                    </button>
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 px-3 lg:px-0 py-3 lg:py-0">
                {/* === MOBILE LAYOUT === */}
                <div className="lg:hidden">
                  {/* Price + Like + Sold */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl text-shopee-orange font-medium">
                        {formatPrice(effectivePrice)}
                      </span>
                      {effectiveOriginalPrice > effectivePrice && (
                        <span className="text-sm text-shopee-text-secondary line-through">
                          {formatPrice(effectiveOriginalPrice)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-shopee-text-secondary">{product.sold} terjual</span>
                      <button className="flex items-center gap-1 text-xs text-shopee-text-secondary hover:text-red-500 transition-colors">
                        <Heart className="w-4 h-4" />
                        <span>Suka</span>
                      </button>
                    </div>
                  </div>
                  {/* Discount badges */}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {effectiveOriginalPrice > effectivePrice && (
                      <span className="bg-shopee-orange text-white text-xs px-1.5 py-0.5 rounded-sm">
                        {Math.round((1 - effectivePrice / effectiveOriginalPrice) * 100)}% OFF
                      </span>
                    )}
                    {(() => {
                      const valid = coupons.filter((c) => typeof c.amount === 'number' && !isNaN(c.amount));
                      if (valid.length === 0) {
                        return <span className="bg-shopee-orange-light text-shopee-orange text-[11px] px-2 py-0.5 rounded-sm">Diskon Menarik</span>;
                      }
                      return valid.slice(0, 2).map((c) => (
                        <span
                          key={c.id}
                          className="bg-shopee-orange-light text-shopee-orange text-[11px] px-2 py-0.5 rounded-sm"
                        >
                          {c.discount_type === 'percent'
                            ? `${c.amount}% OFF`
                            : `Diskon ${formatPrice(c.amount)}`}
                        </span>
                      ));
                    })()}
                  </div>
                  {/* Name + Rating (rating right-aligned) */}
                  <div className="flex items-start justify-between mt-2">
                    <h1 className="text-base text-shopee-text leading-snug flex-1 pr-2">{product.name}</h1>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-shopee-orange text-sm font-medium">{product.rating.toFixed(1)}</span>
                      <Star className="w-3.5 h-3.5 text-shopee-yellow fill-shopee-yellow" />
                    </div>
                  </div>
                </div>

                {/* === DESKTOP LAYOUT (unchanged) === */}
                <div className="hidden lg:block">
                  <div className="flex items-start gap-2">
                    {product.badge && (
                      <span className="bg-shopee-green text-white text-[10px] px-1.5 py-0.5 rounded-sm flex-shrink-0 mt-0.5">
                        {product.badge}
                      </span>
                    )}
                    <h1 className="text-base lg:text-xl text-shopee-text leading-snug">{product.name}</h1>
                  </div>

                  <div className="flex items-center gap-3 mt-2 text-sm">
                    <div className="flex items-center gap-1">
                      <span className="text-shopee-orange underline">{product.rating.toFixed(1)}</span>
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${i < Math.round(product.rating) ? "text-shopee-yellow fill-shopee-yellow" : "text-shopee-border"}`}
                          />
                        ))}
                      </div>
                    </div>
                    <span className="text-shopee-border">|</span>
                    <span className="text-shopee-text-secondary">{product.sold} Terjual</span>
                  </div>

                  {/* Price */}
                  <div className="mt-3 bg-shopee-gray/50 p-3 rounded-sm">
                    <div className="flex items-baseline gap-3">
                      <span className="text-2xl lg:text-3xl text-shopee-orange font-medium">
                        {formatPrice(effectivePrice)}
                      </span>
                      {effectiveOriginalPrice > effectivePrice && (
                        <span className="text-sm text-shopee-text-secondary line-through">
                          {formatPrice(effectiveOriginalPrice)}
                        </span>
                      )}
                      {effectiveOriginalPrice > effectivePrice && (
                        <span className="bg-shopee-orange text-white text-xs px-1.5 py-0.5 rounded-sm">
                          {Math.round((1 - effectivePrice / effectiveOriginalPrice) * 100)}% OFF
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {(() => {
                        const valid = coupons.filter((c) => typeof c.amount === 'number' && !isNaN(c.amount));
                        if (valid.length === 0) {
                          return <span className="bg-shopee-orange-light text-shopee-orange text-[11px] px-2 py-0.5 rounded-sm">Diskon Menarik</span>;
                        }
                        return valid.slice(0, 2).map((c) => (
                          <span
                            key={c.id}
                            className="bg-shopee-orange-light text-shopee-orange text-[11px] px-2 py-0.5 rounded-sm"
                          >
                            {c.discount_type === 'percent'
                              ? `${c.amount}% OFF`
                              : `Diskon ${formatPrice(c.amount)}`}
                          </span>
                        ));
                      })()}
                    </div>
                  </div>
                </div>

                {/* Variants */}
                <div className="mt-4 space-y-3">
                  {/* Dynamic variation attribute pickers */}
                  {isVariable && variationAttributes.map((attr: { name: string; options: string[] }) => (
                    <div key={attr.name}>
                      <span className="text-sm text-shopee-text-secondary block mb-2">
                        Varian: {selectedAttributes[attr.name] || '-'}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {attr.options.map((opt: string) => (
                          <button
                            key={opt}
                            onClick={() => {
                              setSelectedAttributes((prev) => {
                                const next = { ...prev };
                                if (next[attr.name] === opt) {
                                  delete next[attr.name];
                                } else {
                                  next[attr.name] = opt;
                                }
                                return next;
                              });
                            }}
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
                            onClick={() => setSelectedAttributes((prev) => { const next = { ...prev }; const key = colorAttr?.name || 'Warna'; if (next[key] === c) { delete next[key]; } else { next[key] = c; } return next; })}
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
                            onClick={() => setSelectedAttributes((prev) => { const next = { ...prev }; const key = sizeAttr?.name || 'Ukuran'; if (next[key] === s) { delete next[key]; } else { next[key] = s; } return next; })}
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
                        onClick={() => setQty(Math.max(minQuantity, qty - 1))}
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

                {/* Mobile Trust Badges */}
                <div className="lg:hidden flex items-center justify-between mt-4 py-3 border-t border-shopee-border">
                  <div className="flex items-center gap-1.5 text-[11px] text-shopee-text-secondary">
                    <ShieldCheck className="w-3.5 h-3.5 text-shopee-green" />
                    100% Ori
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-shopee-text-secondary">
                    <Truck className="w-3.5 h-3.5 text-shopee-green" />
                    Pengiriman Cepat
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-shopee-text-secondary">
                    <Clock className="w-3.5 h-3.5 text-shopee-green" />
                    15 Hari Retur
                  </div>
                </div>

                {/* Pre-order status badge */}
                {isPreorder && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                      <Clock className="w-3 h-3" />
                      Pre-Order {preorderDays} Hari
                    </span>
                  </div>
                )}

                {/* Actions Desktop */}
                <div className="hidden lg:flex items-center gap-3 mt-6">
                  {isVariable && !allVariantsSelected ? (
                    <button
                      onClick={() => { setPendingAction('cart'); setShowVariantModal(true); }}
                      className="flex items-center justify-center gap-2 h-12 border-2 border-shopee-orange text-shopee-orange bg-shopee-orange-light rounded-sm transition-colors flex-1 whitespace-nowrap font-medium hover:bg-shopee-orange/10"
                    >
                      Masukkan Keranjang
                    </button>
                  ) : (
                    <AddToCartButton
                      productId={product.id}
                      name={product.name}
                      price={effectivePrice}
                      originalPrice={effectiveOriginalPrice}
                      image={matchedVariation?.image || product.image}
                      sku={effectiveSku}
                      stock={effectiveStock}
                      quantity={qty}
                      variationId={matchedVariation?.id}
                      variationInfo={variationInfo}
                      weight={productWeight}
                      height={productHeight}
                      length={productLength}
                      width={productWidth}
                      isPreorder={!!isPreorder}
                      preorderDays={preorderDays}
                      minQuantity={minQuantity}
                      className="flex-1 whitespace-nowrap"
                    />
                  )}
                  {/* Desktop: Beli Sekarang - check variant first */}
                  {isVariable && !allVariantsSelected ? (
                    <button
                      onClick={() => { setPendingAction('buy'); setShowVariantModal(true); }}
                      className="flex items-center justify-center gap-2 h-12 bg-shopee-orange hover:bg-[#d35400] text-white font-medium rounded-sm transition-colors flex-1 whitespace-nowrap"
                    >
                      Beli Sekarang
                    </button>
                  ) : (
                    <BuyNowButton
                      productId={product.id}
                      name={product.name}
                      price={effectivePrice}
                      originalPrice={effectiveOriginalPrice}
                      image={matchedVariation?.image || product.image}
                      sku={effectiveSku}
                      stock={effectiveStock}
                      quantity={qty}
                      variationId={matchedVariation?.id}
                      variationInfo={variationInfo}
                      weight={productWeight}
                      height={productHeight}
                      length={productLength}
                      width={productWidth}
                      isPreorder={!!isPreorder}
                      preorderDays={preorderDays}
                      minQuantity={minQuantity}
                      className="flex-1 whitespace-nowrap"
                    />
                  )}
                </div>

                {/* Desktop CTAs: Chat, Wishlist, Share */}
                <div className="hidden lg:flex items-center gap-3 mt-3">
                  <button
                    onClick={handleChat}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-shopee-border rounded-sm text-sm text-shopee-text hover:border-green-400 hover:text-green-600 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Chat
                  </button>
                  <button
                    onClick={handleWishlist}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border rounded-sm text-sm transition-colors ${
                      isWishlisted
                        ? 'border-red-300 text-red-500 bg-red-50'
                        : 'border-shopee-border text-shopee-text hover:border-red-300 hover:text-red-500'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-red-500' : ''}`} />
                    {isWishlisted ? 'Tersimpan' : 'Wishlist'}
                  </button>
                  <button
                    onClick={handleShare}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-shopee-border rounded-sm text-sm text-shopee-text hover:border-shopee-orange hover:text-shopee-orange transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                </div>

                {/* Guarantees */}
                <div className="hidden lg:grid grid-cols-3 gap-3 mt-6 p-3 border border-shopee-border rounded-sm">
                  <div className="flex items-center gap-2 text-xs text-shopee-text-secondary">
                    <ShieldCheck className="w-4 h-4 text-shopee-green" />
                    100% Ori
                  </div>

                  <div className="flex items-center gap-2 text-xs text-shopee-text-secondary">
                    <CheckCircle className="w-4 h-4 text-shopee-green" />
                    Bisa COD
                  </div>

                  <div className="flex items-center gap-2 text-xs text-shopee-text-secondary">
                    <Truck className="w-4 h-4 text-shopee-green" />
                    Pengiriman Cepat
                  </div>
                </div>
              </div>
            </div>

            {/* Shop Info */}
            <div className="border-t border-shopee-border p-3 lg:p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-shopee-gray border border-shopee-border overflow-hidden">
                    {storeSettings?.storeLogo ? (
                      <img src={storeSettings.storeLogo} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <img src={product.image || NO_IMAGE_PLACEHOLDER} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-shopee-text">{storeSettings?.storeName || 'RagamGuna Official Store'}</p>
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
                {["deskripsi", "ulasan", "chat"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      if (tab === "chat") {
                        if (!user) {
                          setShowLoginModal(true);
                          return;
                        }
                        if (window.innerWidth < 1024) {
                          router.push("/chat");
                        } else {
                          openChat(product?.id, product?.name);
                        }
                      } else {
                        setActiveTab(tab);
                      }
                    }}
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
                  <div className="space-y-3 text-sm text-shopee-text whitespace-pre-line">
                    <p>
                      {product.description || product.name}
                    </p>
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
                                {activeTab === "chat" && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-[#00A19B]/10 flex items-center justify-center mx-auto mb-4">
                      <MessageCircle className="w-8 h-8 text-[#00A19B]" />
                    </div>
                    <p className="text-base font-medium text-shopee-text mb-2">Chat dengan Penjual</p>
                    <p className="text-sm text-shopee-text-secondary mb-6 max-w-xs mx-auto">
                      Punya pertanyaan tentang produk ini? Langsung chat penjual!
                    </p>
                    <button
                      onClick={handleChat}
                      className="px-6 py-3 bg-[#00A19B] text-white text-sm font-medium rounded-lg hover:bg-[#008B85] transition-colors inline-flex items-center gap-2"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Chat Sekarang
                    </button>
                  </div>
                )}              </div>
            </div>
          </div>
        </div>

        {/* Lainnya dari Toko Ini */}
        {(relatedLoading || relatedProducts.length > 0) && (
          <div className="mt-3 lg:mt-4">
            <div className="bg-white lg:rounded-sm p-3 lg:p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm font-medium text-shopee-text">Lainnya dari Toko Ini</h2>
                  <p className="text-[11px] text-shopee-text-secondary">{storeSettings?.storeName || 'RagamGuna Official Store'}</p>
                </div>
                <Link href="/shop" className="text-xs text-shopee-orange hover:underline flex items-center gap-0.5">
                  Lihat Semua <ChevronRight className="w-3 h-3" />
                </Link>
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
        )}
      </main>

      {/* Mobile Sticky Actions — 3 columns: Chat | AddToCart | BuyWithVoucher */}
      <MobileStickyBar
        productId={product.id}
        productName={product.name}
        effectivePrice={effectivePrice}
        effectiveOriginalPrice={effectiveOriginalPrice}
        productImage={matchedVariation?.image || product.image}
        effectiveSku={effectiveSku}
        effectiveStock={effectiveStock}
        qty={qty}
        matchedVariationId={matchedVariation?.id}
        variationInfo={variationInfo}
        productWeight={productWeight}
        productHeight={productHeight}
        productLength={productLength}
        productWidth={productWidth}
        handleChat={handleChat}
        variationAttributes={variationAttributes}
        selectedAttributes={selectedAttributes}
        onShowVariantModal={(action) => { setPendingAction(action); setShowVariantModal(true); }}
      />

      <div className="hidden lg:block">
        <Footer />
      </div>
      <BottomNav />

      {/* Login Modal */}
      {showLoginModal && (
        <LoginModal open={showLoginModal} onClose={() => setShowLoginModal(false)} />
      )}

      {/* Variant Selection Modal */}
      {showVariantModal && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowVariantModal(false)} />
          <div className="relative bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-xl max-h-[80vh] flex flex-col animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Pilih Varian</h3>
              <button onClick={() => setShowVariantModal(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Product Preview */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
              <div className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                <img src={matchedVariation?.image || product?.image || ''} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-shopee-orange">
                  {effectivePrice > 0 ? `Rp ${effectivePrice.toLocaleString('id-ID')}` : 'Gratis'}
                </p>
                {effectiveOriginalPrice > effectivePrice && (
                  <p className="text-xs text-gray-400 line-through">
                    Rp {effectiveOriginalPrice.toLocaleString('id-ID')}
                  </p>
                )}
              </div>
            </div>

            {/* Variant Options */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {variationAttributes.map((attr) => (
                <div key={attr.name}>
                  <p className="text-sm font-medium text-gray-900 mb-2">
                    Pilih {attr.name}: <span className="text-shopee-orange">{selectedAttributes[attr.name] || '-'}</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {attr.options.map((opt: string) => (
                      <button
                        key={opt}
                        onClick={() => {
                          setSelectedAttributes((prev) => ({ ...prev, [attr.name]: opt }));
                        }}
                        className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
                          selectedAttributes[attr.name] === opt
                            ? 'border-shopee-orange bg-shopee-orange text-white font-medium'
                            : 'border-gray-200 text-gray-700 hover:border-shopee-orange'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Confirm Button */}
            <div className="p-4 border-t border-gray-100">
              <button
                onClick={() => {
                  setShowVariantModal(false);
                  if (pendingAction === 'buy') {
                    doAddToCart();
                    const selectedKey = `${product.id}-${matchedVariation?.id || 0}`;
                    localStorage.setItem("ragamguna-checkout-selected", JSON.stringify([selectedKey]));
                    router.push("/checkout");
                  } else {
                    doAddToCart();
                  }
                }}
                disabled={!allVariantsSelected}
                className="w-full py-3 bg-[#EE4D2D] text-white font-semibold rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Beli Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ===== Mobile Sticky Bar Component =====
interface MobileStickyBarProps {
  productId: number;
  productName: string;
  effectivePrice: number;
  effectiveOriginalPrice: number;
  productImage: string;
  effectiveSku: string;
  effectiveStock: number | null;
  qty: number;
  matchedVariationId?: number;
  variationInfo: string;
  productWeight: number;
  productHeight: number;
  productLength: number;
  productWidth: number;
  handleChat: () => void;
  variationAttributes: { name: string; options: string[] }[];
  selectedAttributes: Record<string, string>;
  onShowVariantModal: (action: 'cart' | 'buy') => void;
}

function MobileStickyBar({
  productId,
  productName,
  effectivePrice,
  effectiveOriginalPrice,
  productImage,
  effectiveSku,
  effectiveStock,
  qty,
  matchedVariationId,
  variationInfo,
  productWeight,
  variationAttributes,
  selectedAttributes,
  onShowVariantModal,
  productHeight,
  productLength,
  productWidth,
  handleChat,
}: MobileStickyBarProps) {
  const { addItem, getItemCount } = useCart();
  const router = useRouter();
  const [buyLoading, setBuyLoading] = useState(false);

  const allVariantsSelected = variationAttributes.length === 0 || 
    variationAttributes.every((attr) => selectedAttributes[attr.name]);

  const handleAddToCart = () => {
    if (!allVariantsSelected) {
      onShowVariantModal('cart');
      return;
    }
    addItem({
      productId,
      name: productName,
      price: effectivePrice,
      originalPrice: effectiveOriginalPrice,
      image: productImage,
      quantity: qty,
      sku: effectiveSku,
      stock: effectiveStock,
      variationId: matchedVariationId,
      variationInfo,
      weight: productWeight,
      height: productHeight,
      length: productLength,
      width: productWidth,
    });
  };

  const handleBuyWithVoucher = () => {
    if (!allVariantsSelected) {
      onShowVariantModal('buy');
      return;
    }
    setBuyLoading(true);
    handleAddToCart();
    const selectedKey = `${productId}-${matchedVariationId || 0}`;
    localStorage.setItem("ragamguna-checkout-selected", JSON.stringify([selectedKey]));
    router.push("/checkout");
  };

  return (
    <div className="lg:hidden fixed bottom-14 left-0 right-0 z-[60] flex items-stretch h-14">
      {/* Chat Sekarang */}
      <button
        onClick={handleChat}
        className="flex flex-col items-center justify-center gap-0.5 flex-1 bg-[#00A19B] text-white active:bg-[#008B85] transition-colors border-l border-white/30 min-w-0"
      >
        <MessageCircle className="w-5 h-5" />
        <span className="text-[10px] font-semibold leading-tight">Chat Sekarang</span>
      </button>

      {/* Masukkan Keranjang */}
      <button
        onClick={handleAddToCart}
        className="flex flex-col items-center justify-center gap-0.5 flex-1 bg-[#00A19B] text-white active:bg-[#008B85] transition-colors border-l border-white/30 min-w-0"
      >
        <ShoppingCart className="w-5 h-5" />
        <span className="text-[10px] font-semibold leading-tight">Masukkan Keranjang</span>
      </button>

      {/* Beli Dengan Voucher */}
      <button
        onClick={handleBuyWithVoucher}
        disabled={buyLoading}
        className="flex flex-col items-center justify-center flex-1 bg-[#EE4D2D] text-white active:bg-[#D63F21] transition-colors disabled:opacity-70"
      >
        {buyLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <span className="text-[10px] font-semibold leading-tight">Beli Dengan Voucher</span>
            <span className="text-sm font-bold leading-tight">Rp {effectivePrice.toLocaleString('id-ID')}</span>
          </>
        )}
      </button>
    </div>
  );
}
