"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronDown, Minus, Plus, Trash2, Truck, ChevronRight, ShoppingCart, X, Loader2 } from "lucide-react";
import Header from "@/app/components/layout/Header";
import BottomNav from "@/app/components/layout/BottomNav";
import Footer from "@/app/components/layout/Footer";
import { useCart } from "@/lib/cart-context";
import { formatPrice, NO_IMAGE_PLACEHOLDER, toSlug } from "@/lib/data";


export default function CartPage() {
  const { items, removeItem, updateQuantity, clearCart, getItemCount, getSubtotal, updateItem } = useCart();
    // Variant change modal state
  const [variantModalItem, setVariantModalItem] = useState<{ productId: number; variationId?: number; name: string; image: string; price: number } | null>(null);
  const [variations, setVariations] = useState<any[]>([]);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [variationAttributes, setVariationAttributes] = useState<{ name: string; options: string[] }[]>([]);
  const [variantLoading, setVariantLoading] = useState(false);

  const [selected, setSelected] = useState<string[]>([]);
  
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

  const allVariantsSelected = useMemo(() => {
    if (variationAttributes.length === 0) return true;
    return variationAttributes.every((attr) => selectedAttributes[attr.name]);
  }, [variationAttributes, selectedAttributes]);
  const [loading, setLoading] = useState(true);

  // Generate unique key for cart item
  const itemKey = (item: { productId: number; variationId?: number }) =>
    `${item.productId}-${item.variationId || 0}`;

  const router = useRouter();

  const openVariantModal = async (item: any) => {
    setVariantLoading(true);
    setVariantModalItem(item);
    try {
      const res = await fetch(`/api/products/${item.productId}`);
      if (res.ok) {
        const data = await res.json();
        const prod = data.product;
        const vars = data.variations || [];
        setVariations(vars);
        
        const vAttrs = (prod.attributes || [])
          .filter((a: any) => a.variation && a.name && a.options?.length > 0)
          .map((a: any) => ({ name: a.name, options: a.options }));
        setVariationAttributes(vAttrs);
        
        if (item.variationId && vars.length > 0) {
          const currentVariant = vars.find((v: any) => String(v.id) === String(item.variationId));
          if (currentVariant?.attributes) {
            const attrs: Record<string, string> = {};
            currentVariant.attributes.forEach((a: any) => {
              if (a.name && a.option) attrs[a.name] = a.option;
            });
            setSelectedAttributes(attrs);
          } else {
            setSelectedAttributes({});
          }
        } else {
          setSelectedAttributes({});
        }
      }
    } catch {
      // ignore
    } finally {
      setVariantLoading(false);
    }
  };

  const handleVariantConfirm = () => {
    if (!variantModalItem || !matchedVariation) return;
    const newPrice = parseInt(matchedVariation.sale_price || matchedVariation.price || "0") || parseInt(matchedVariation.regular_price || "0");
    const newOriginalPrice = parseInt(matchedVariation.regular_price || "0") || newPrice;
    
    const entries = Object.entries(selectedAttributes);
    const newVariationInfo = entries.length > 0
      ? entries.map(([, v]) => v).join(', ')
      : '';
    
    updateItem(variantModalItem.productId, variantModalItem.variationId, {
      variationId: matchedVariation.id,
      variationInfo: newVariationInfo,
      price: newPrice || variantModalItem.price,
      originalPrice: newOriginalPrice || variantModalItem.price,
      image: matchedVariation.image || variantModalItem.image,
      sku: matchedVariation.sku || '',
      stock: matchedVariation.stock_quantity ?? null,
    });
    
    setVariantModalItem(null);
    setVariations([]);
    setSelectedAttributes({});
    setVariationAttributes([]);
  };

  const goToCheckout = useCallback(() => {
    if (selected.length === 0) return;
    localStorage.setItem("shenar2168-checkout-selected", JSON.stringify(selected));
    router.push("/checkout");
  }, [selected, router]);

  // Select all items by default
  useEffect(() => {
    setSelected(items.map(itemKey));
    setLoading(false);
  }, [items]);

  // Safety timeout: if items never load (stale state), force unload loading after 3s
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  const toggleSelect = (productId: number, variationId?: number) => {
    const key = `${productId}-${variationId || 0}`;
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]
    );
  };

  const toggleSelectAll = () => {
    if (selected.length === items.length) {
      setSelected([]);
    } else {
      setSelected(items.map(itemKey));
    }
  };

  const selectedItems = items.filter((item) => selected.includes(itemKey(item)));
  const totalItems = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalOriginal = selectedItems.reduce((sum, item) => sum + item.originalPrice * item.quantity, 0);

  // Group by "shop" (for now, all from one shop since it's single-store)
  const shop = "Shenar2168 Official";
  const groupedItems = items;

  if (loading) {
    return (
      <>
        <Header />
        <main className="flex-1 bg-shopee-gray pb-32 lg:pb-8">
          <div className="flex items-center justify-center py-20">
            <p className="text-shopee-text-secondary">Memuat keranjang...</p>
          </div>
        </main>
        <BottomNav />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="flex-1 bg-shopee-gray pb-32 lg:pb-8">
        <div className="max-w-[1200px] mx-auto px-0 lg:px-4 py-0 lg:py-4">
          {/* Mobile Header */}
          <div className="lg:hidden flex items-center gap-2 px-3 py-2.5 bg-white sticky top-0 z-40 border-b border-shopee-border">
            <Link href="/" className="p-1">
              <ChevronLeft className="w-5 h-5 text-shopee-text" />
            </Link>
            <span className="text-base font-medium text-shopee-text">Keranjang Belanja</span>
          </div>

          <div className="flex flex-col lg:flex-row gap-4">
            {/* Cart Items */}
            <div className="flex-1">
              {/* Select All Bar */}
              {items.length > 0 && (
                <div className="bg-white px-3 lg:px-4 py-3 flex items-center gap-3 sticky top-0 lg:top-[120px] z-30 border-b border-shopee-border">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selected.length === items.length && items.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 accent-shopee-orange rounded border-shopee-border"
                    />
                    <span className="text-sm text-shopee-text">
                      Pilih Semua ({items.length} Produk)
                    </span>
                  </label>
                </div>
              )}

              {items.length > 0 ? (
                <div className="bg-white mt-2 lg:mt-3 border-b border-shopee-border lg:border-0 lg:rounded-sm overflow-hidden">
                  {/* Shop Header */}
                  <div className="px-3 lg:px-4 py-2.5 flex items-center gap-2 border-b border-shopee-border/50">
                    <span className="text-xs font-medium text-shopee-text">{shop}</span>
                    <span className="text-[10px] bg-shopee-orange-light text-shopee-orange px-1.5 py-0.5 rounded-sm">
                      Official
                    </span>
                  </div>

                  {/* Items */}
                  <div className="divide-y divide-shopee-border/50">
                    {groupedItems.map((item) => (
                      <div key={itemKey(item)} className="px-3 lg:px-4 py-3 flex gap-3">
                        <input
                          type="checkbox"
                          checked={selected.includes(itemKey(item))}
                          onChange={() => toggleSelect(item.productId, item.variationId)}
                          className="w-4 h-4 accent-shopee-orange mt-6 lg:mt-8 flex-shrink-0"
                        />
                        <Link
                          href={`/product/${item.productId}-${toSlug(item.name)}?fromCheckout=1${item.variationId ? `&variationId=${item.variationId}` : ''}`}
                          className="block w-20 h-20 lg:w-24 lg:h-24 flex-shrink-0"
                        >
                          <div className="w-full h-full bg-shopee-gray rounded-sm overflow-hidden">
                            <img src={item.image || NO_IMAGE_PLACEHOLDER} alt={item.name} className="w-full h-full object-cover" />
                          </div>
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/product/${item.productId}-${toSlug(item.name)}?fromCheckout=1${item.variationId ? `&variationId=${item.variationId}` : ''}`}
                            className="group"
                          >
                            <h4 className="text-sm text-shopee-text line-clamp-2 group-hover:text-shopee-orange transition-colors">{item.name}</h4>
                          </Link>
                          {item.sku && (
                            <p className="text-xs text-shopee-text-secondary mt-0.5">SKU: {item.sku}</p>
                          )}
                          {item.isPreorder && (
                            <p className="text-xs text-blue-600 mt-0.5">Pre-Order {item.preorderDays || 7} Hari</p>
                          )}
                          {item.variationId && item.variantLabel && (
                            <button
                              onClick={ (e) => { e.preventDefault(); openVariantModal(item); } }
                              className="flex items-center gap-1 mt-0.5 text-xs text-shopee-text border border-shopee-border rounded-sm px-2 py-1 hover:border-shopee-orange transition-colors"
                            >
                              {item.variantLabel}
                              <ChevronDown className="w-3.5 h-3.5 text-shopee-text-secondary" />
                            </button>
                          )}
                          <div className="flex items-end justify-between mt-2">
                            <div>
                              <p className="text-shopee-orange font-medium text-sm">
                                {formatPrice(item.price)}
                              </p>
                              {item.originalPrice > item.price && (
                                <div className="flex items-center gap-1">
                                  <p className="text-[11px] text-shopee-text-secondary line-through">
                                    {formatPrice(item.originalPrice)}
                                  </p>
                                  <span className="text-[10px] text-shopee-orange font-medium">
                                    -{Math.round((1 - item.price / item.originalPrice) * 100)}%
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-0">
                              {item.quantity <= (item.minQuantity ?? 1) ? (
                                <button
                                  onClick={() => removeItem(item.productId, item.variationId)}
                                  className="w-7 h-7 border border-shopee-border flex items-center justify-center rounded-l-sm text-shopee-text-secondary hover:text-red-500 hover:border-red-300 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => updateQuantity(item.productId, item.quantity - 1, item.variationId)}
                                  className="w-7 h-7 border border-shopee-border flex items-center justify-center rounded-l-sm"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                              )}
                              <span className="w-8 h-7 border-t border-b border-shopee-border flex items-center justify-center text-xs">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.productId, item.quantity + 1, item.variationId)}
                                className="w-7 h-7 border border-shopee-border flex items-center justify-center rounded-r-sm"
                                disabled={item.stock !== null && item.stock !== undefined && item.quantity >= item.stock}
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-sm py-16 text-center mt-2">
                  <ShoppingCart className="w-12 h-12 mx-auto text-shopee-text-secondary mb-3" />
                  <p className="text-shopee-text-secondary text-sm mb-1">Keranjang Belanjamu Masih Kosong</p>
                  <p className="text-shopee-text-secondary text-xs mb-4">Yuk, mulai belanja kebutuhanmu sekarang!</p>
                  <Link href="/" className="inline-block px-6 py-2 bg-shopee-orange text-white text-sm rounded-sm hover:bg-[#1A7BD4]">
                    Mulai Belanja
                  </Link>
                </div>
              )}
            </div>

            {/* Summary Desktop */}
            {items.length > 0 && (
              <div className="hidden lg:block w-[320px]">
                <div className="bg-white rounded-sm p-4 sticky top-[120px]">
                  <h3 className="text-sm font-medium text-shopee-text mb-3">Ringkasan Belanja</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-shopee-text-secondary">
                      <span>Total Harga ({totalItems} barang)</span>
                      <span>{formatPrice(totalOriginal)}</span>
                    </div>
                    {totalOriginal > totalPrice && (
                      <div className="flex justify-between text-shopee-text-secondary">
                        <span>Total Diskon</span>
                        <span className="text-shopee-orange">-{formatPrice(totalOriginal - totalPrice)}</span>
                      </div>
                    )}
                    <div className="border-t border-shopee-border pt-2 flex justify-between items-center">
                      <span className="text-shopee-text font-medium">Total Harga</span>
                      <span className="text-xl text-shopee-orange font-medium">{formatPrice(totalPrice)}</span>
                    </div>
                  </div>
                  <button
                    onClick={goToCheckout}
                    className={`mt-4 w-full h-11 rounded-sm font-medium flex items-center justify-center transition-colors ${
                      selected.length > 0
                        ? "bg-shopee-orange hover:bg-[#1A7BD4] text-white"
                        : "bg-shopee-border text-shopee-text-secondary cursor-not-allowed"
                    }`}
                  >
                    Checkout ({totalItems})
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Mobile Sticky Summary */}
      {items.length > 0 && (
        <div className="lg:hidden fixed bottom-14 left-0 right-0 bg-white border-t border-shopee-border z-[60] px-3 py-2 flex items-center justify-between">
          <div>
            <p className="text-xs text-shopee-text-secondary">Total ({totalItems} Produk)</p>
            <p className="text-lg text-shopee-orange font-medium">{formatPrice(totalPrice)}</p>
          </div>
          <button
            onClick={goToCheckout}
            className={`px-6 py-2.5 rounded-sm text-sm font-medium transition-colors ${
              selected.length > 0 ? "bg-shopee-orange text-white" : "bg-shopee-border text-shopee-text-secondary"
            }`}
          >
            Checkout
          </button>
        </div>
      )}

      {variantModalItem && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setVariantModalItem(null); setVariations([]); setSelectedAttributes({}); }} />
          <div className="relative bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-xl max-h-[80vh] flex flex-col animate-slide-up">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Pilih Varian</h3>
              <button onClick={() => { setVariantModalItem(null); setVariations([]); setSelectedAttributes({}); }} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
              <div className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                <img src={matchedVariation?.image || variantModalItem.image || ''} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-shopee-orange">
                  {formatPrice(matchedVariation ? (parseInt(matchedVariation.sale_price || matchedVariation.price || "0") || parseInt(matchedVariation.regular_price || "0")) : variantModalItem.price)}
                </p>
              </div>
            </div>
            {variantLoading ? (
              <div className="flex-1 flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-shopee-orange" />
              </div>
            ) : (
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
                          onClick={() => setSelectedAttributes((prev) => ({ ...prev, [attr.name]: opt }))}
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
            )}
            {!variantLoading && (
              <div className="p-4 border-t border-gray-100">
                <button
                  onClick={handleVariantConfirm}
                  disabled={!allVariantsSelected}
                  className="w-full py-3 bg-[#EE4D2D] text-white font-semibold rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {allVariantsSelected ? 'Simpan' : 'Pilih Varian'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="hidden lg:block">
        <Footer />
      </div>
      <BottomNav />
    </>
  );
}