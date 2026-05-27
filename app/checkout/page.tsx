"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  MapPin,
  Truck,
  Tag,
  ShieldCheck,
  Navigation,
} from "lucide-react";
import Header from "@/app/components/layout/Header";
import BottomNav from "@/app/components/layout/BottomNav";
import Footer from "@/app/components/layout/Footer";
import { useCart } from "@/lib/cart-context";
import { formatPrice, NO_IMAGE_PLACEHOLDER } from "@/lib/data";
import MapPicker from "@/app/components/MapPicker";
import { useAuth } from "@/app/components/layout/AuthProvider";
import LoginModal from "@/app/components/layout/LoginModal";

interface ShippingRate {
  courier_code: string;
  courier_service_name: string;
  duration: string;
  price: number;
  service_type?: string;
}

function inferShippingType(rate: ShippingRate): "regular" | "instant" | "same_day" | "next_day" {
  const svc = (rate.service_type || "").toLowerCase();
  const name = (rate.courier_service_name || "").toLowerCase();
  const code = (rate.courier_code || "").toLowerCase();
  if (svc === "instant" || name.includes("instant")) return "instant";
  if (svc === "sameday" || name.includes("sameday") || name.includes("same_day") || name.includes("same-day")) return "same_day";
  if (svc === "overnight" || name.includes("next_day") || name.includes("nextday") || name.includes("next day")) return "next_day";
  if (code === "gojek" || code === "grab") return "instant"; // fallback for motorbike couriers
  return "regular";
}

const SHIPPING_TYPE_LABELS: Record<string, { label: string; desc: string }> = {
  regular: { label: "Reguler", desc: "2-4 hari" },
  instant: { label: "Instant", desc: "1-3 jam" },
  same_day: { label: "Same Day", desc: "Hari ini" },
  next_day: { label: "Next Day", desc: "1-2 hari" },
};

const courierServiceLabels: Record<string, string> = {
  reg: "Reguler",
  ez: "EZ",
  next_day: "Next Day",
  standard: "Standard",
  best: "BEST",
  yes: "YES",
  oke: "OKE",
};

interface AddressData {
  name: string;
  phone: string;
  fullAddress: string;
  note: string;
  postalCode: string;
}



export default function CheckoutPage() {
  const { items, removeItem, clearCart } = useCart();
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [selectedShipping, setSelectedShipping] = useState<string>("");
  const [selectedShippingType, setSelectedShippingType] = useState<string>("regular");

  const [voucher, setVoucher] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [voucherError, setVoucherError] = useState("");
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [address, setAddress] = useState<AddressData | null>(null);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formNote, setFormNote] = useState("");
  const [formPostalCode, setFormPostalCode] = useState("");
  const [mapLatLng, setMapLatLng] = useState<{ lat: number; lng: number } | null>(null);
  const [mapPostalCode, setMapPostalCode] = useState("");
  const [pendingCheckout, setPendingCheckout] = useState(false);

  const { user, openLogin, closeLogin, loginOpen } = useAuth();

  // Auto-resume checkout after login
  useEffect(() => {
    if (user && pendingCheckout && address && checkoutItems.length > 0) {
      setPendingCheckout(false);
      handleCheckout();
    }
  }, [user]);

  // Load address + latlng from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const rawAddr = localStorage.getItem("shenar2168-checkout-address");
      if (rawAddr) {
        const parsed = JSON.parse(rawAddr);
        setAddress(parsed);
        if (parsed.postalCode) setMapPostalCode(parsed.postalCode);
      }
      const rawLatLng = localStorage.getItem("shenar2168-checkout-latlng");
      if (rawLatLng) {
        const parsed = JSON.parse(rawLatLng);
        setMapLatLng(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  // Read selected items from localStorage (set by cart page or buy-now)
  const [selectedKeys, setSelectedKeys] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem("shenar2168-checkout-selected");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const checkoutItems = selectedKeys.length > 0
    ? items.filter((item) => selectedKeys.includes(`${item.productId}-${item.variationId || 0}`))
    : items;

  const effectivePostalCode = address?.postalCode || formPostalCode || mapPostalCode;

  // Fetch Biteship rates when postal code or checkout items change
  useEffect(() => {
    async function fetchRates() {
      if (!effectivePostalCode || checkoutItems.length === 0) {
        setShippingRates([]);
        setSelectedShipping("");
        return;
      }
      setShippingLoading(true);
      setShippingError(null);
      try {
        const res = await fetch("/api/biteship/rates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            destination_postal_code: effectivePostalCode,
            items: checkoutItems.map((item) => ({
              name: item.name,
              value: item.price,
              weight: item.weight || 500, // fallback 500g
              quantity: item.quantity,
              height: item.height,
              length: item.length,
              width: item.width,
            })),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Gagal mengambil ongkir");
        }
        const rates: ShippingRate[] = (data.pricing || []).map((r: any) => ({
          courier_code: r.courier_code,
          courier_service_name: r.courier_service_name,
          duration: r.duration,
          price: r.price,
          service_type: r.service_type,
        }));
        setShippingRates(rates);
        if (rates.length > 0 && !selectedShipping) {
          setSelectedShipping(`${rates[0].courier_code}|${rates[0].courier_service_name}`);
        }
      } catch (err) {
        setShippingError(err instanceof Error ? err.message : "Terjadi kesalahan");
        setShippingRates([]);
      } finally {
        setShippingLoading(false);
      }
    }
    fetchRates();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectivePostalCode, items, selectedKeys]);

  // Group shipping rates by inferred type
  const ratesByType = shippingRates.reduce((groups, rate) => {
    const type = inferShippingType(rate);
    if (!groups[type]) groups[type] = [];
    groups[type].push(rate);
    return groups;
  }, {} as Record<string, ShippingRate[]>);

  const availableTypes = Object.keys(ratesByType).sort((a, b) => {
    const order = ["instant", "same_day", "next_day", "regular"];
    return order.indexOf(a) - order.indexOf(b);
  });

  const filteredRates = ratesByType[selectedShippingType] || [];

  // Auto-select first available type when rates change
  useEffect(() => {
    if (availableTypes.length > 0 && !availableTypes.includes(selectedShippingType)) {
      setSelectedShippingType(availableTypes[0]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableTypes.join(",")]);

  // Redirect to home if checkout is empty
  if (checkoutItems.length === 0) {
    return (
      <>
        <Header />
        <main className="flex-1 bg-shopee-gray pb-36 lg:pb-8">
          <div className="max-w-[1200px] mx-auto px-0 lg:px-4 py-8">
            <div className="bg-white py-16 text-center rounded-sm">
              <p className="text-shopee-text-secondary text-lg mb-2">Keranjang belanjamu masih kosong</p>
              <p className="text-shopee-text-secondary text-sm mb-4">Tambahkan produk dulu ya sebelum checkout</p>
              <Link href="/" className="inline-block px-6 py-2 bg-shopee-orange text-white text-sm rounded-sm hover:bg-[#1A7BD4]">
                Mulai Belanja
              </Link>
            </div>
          </div>
        </main>
        <BottomNav />
      </>
    );
  }

  // Calculate totals from checkout items only
  const subtotal = checkoutItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const originalSubtotal = checkoutItems.reduce(
    (sum, item) => sum + (item.originalPrice || item.price) * item.quantity, 0
  );
  const productDiscount = originalSubtotal - subtotal;
  const selectedRate = shippingRates.find(
    (s) => `${s.courier_code}|${s.courier_service_name}` === selectedShipping
  );
  const shipping = selectedRate?.price || 0;

  let voucherDiscount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discount_type === "percent") {
      voucherDiscount = Math.floor(subtotal * (parseFloat(appliedCoupon.amount) / 100));
    } else {
      voucherDiscount = Math.floor(parseFloat(appliedCoupon.amount) || 0);
    }
  }
  const total = subtotal + shipping - voucherDiscount;

  const applyVoucher = async () => {
    if (!voucher.trim()) return;
    setVoucherError("");
    setVoucherLoading(true);
    try {
      const res = await fetch("/api/coupons");
      if (!res.ok) throw new Error("Gagal memuat voucher");
      const data = await res.json();
      const coupons = Array.isArray(data.coupons) ? data.coupons : [];
      const found = coupons.find(
        (c: any) => c.code.toUpperCase() === voucher.trim().toUpperCase()
      );
      if (!found) {
        setVoucherError("Kode voucher tidak ditemukan atau sudah tidak berlaku.");
        setAppliedCoupon(null);
      } else {
        setAppliedCoupon(found);
      }
    } catch {
      setVoucherError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setVoucherLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!address) {
      alert("Harap isi alamat pengiriman terlebih dahulu.");
      return;
    }

    if (checkoutItems.length === 0) {
      alert("Keranjang belanjamu masih kosong.");
      return;
    }

    // If not logged in, show login modal and queue checkout
    if (!user) {
      setPendingCheckout(true);
      openLogin();
      return;
    }

    setPendingCheckout(false);
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: checkoutItems.map((item) => ({
            productId: item.productId,
            name: item.name,
            quantity: item.quantity,
            variationId: item.variationId,
            price: item.price,
            weight: item.weight,
            height: item.height,
            length: item.length,
            width: item.width,
          })),
          billing: {
            first_name: address.name.split(" ")[0],
            last_name: address.name.split(" ").slice(1).join(" ") || address.name.split(" ")[0],
            phone: address.phone,
            email: `${address.phone}@placeholder.com`,
            address_1: address.fullAddress,
            city: "Jakarta",
            state: "Jakarta",
            postcode: address.postalCode || "12345",
            country: "ID",
          },
          shipping: {
            first_name: address.name.split(" ")[0],
            last_name: address.name.split(" ").slice(1).join(" ") || address.name.split(" ")[0],
            address_1: address.fullAddress,
            city: "Jakarta",
            state: "Jakarta",
            postcode: address.postalCode || "12345",
            country: "ID",
          },
          payment_method: "midtrans",
          customer_note: address.note,
          coupon_code: appliedCoupon?.code || undefined,
          shipping_courier: selectedShipping ? selectedShipping.split("|")[0] : undefined,
          shipping_service: selectedShipping ? selectedShipping.split("|")[1] : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Gagal membuat pesanan");
      }

      // Success - save order to localStorage, remove checked-out items, then redirect
      const orderCode = `RG${Math.floor(10000 + Math.random() * 90000)}`;
      const orderRecord = {
        id: String(data.order.id),
        orderCode,
        status: "pending" as const,
        items: checkoutItems.map((item) => ({
          productId: item.productId,
          name: item.name,
          image: item.image,
          price: item.price,
          originalPrice: item.originalPrice || item.price,
          quantity: item.quantity,
          variationId: item.variationId,
        })),
        subtotal,
        originalSubtotal,
        productDiscount,
        total: total,
        date: new Date().toISOString(),
        shipping: selectedShipping,
        shippingCost: shipping,
        shippingCourier: selectedRate
          ? `${selectedRate.courier_code.toUpperCase()} ${courierServiceLabels[selectedRate.courier_service_name] || selectedRate.courier_service_name}`
          : undefined,
        voucherDiscount: voucherDiscount,
        couponCode: appliedCoupon?.code || undefined,
        trackingId: data.shipping?.tracking_id,
        waybillId: data.shipping?.waybill_id,
        biteshipStatus: data.shipping?.status,
      };
      const existingOrders = JSON.parse(localStorage.getItem("shenar2168-orders") || "[]");
      existingOrders.unshift(orderRecord);
      localStorage.setItem("shenar2168-orders", JSON.stringify(existingOrders));

      checkoutItems.forEach((item) => {
        removeItem(item.productId, item.variationId);
      });
      localStorage.removeItem("shenar2168-checkout-selected");
      if (data.midtrans_redirect_url) { window.location.href = data.midtrans_redirect_url; } else { window.location.href = `/order-confirmed?id=${data.order.id}`; }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAddress = () => {
    if (!formName.trim() || !formPhone.trim() || !formAddress.trim()) {
      alert("Harap isi nama, nomor telepon, dan alamat.");
      return;
    }
    const newAddress = { name: formName, phone: formPhone, fullAddress: formAddress, note: formNote, postalCode: formPostalCode || mapPostalCode };
    setAddress(newAddress);
    setIsEditingAddress(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("shenar2168-checkout-address", JSON.stringify(newAddress));
      if (mapLatLng) {
        localStorage.setItem("shenar2168-checkout-latlng", JSON.stringify(mapLatLng));
      }
    }
  };

  const startEditAddress = () => {
    if (address) {
      setFormName(address.name);
      setFormPhone(address.phone);
      setFormAddress(address.fullAddress);
      setFormNote(address.note);
      setFormPostalCode(address.postalCode || "");
    } else {
      setFormName("");
      setFormPhone("");
      setFormAddress("");
      setFormNote("");
      setFormPostalCode("");
    }
    setIsEditingAddress(true);
  };

  const handleMapSelect = (addr: string, lat: number, lng: number, postalCode: string) => {
    setFormAddress(addr);
    setFormPostalCode(postalCode);
    setMapPostalCode(postalCode);
    const newLatLng = { lat, lng };
    setMapLatLng(newLatLng);
    setShowMapPicker(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("shenar2168-checkout-latlng", JSON.stringify(newLatLng));
    }
    // Also update address so shipping rates can be fetched immediately
    setAddress((prev) =>
      prev ? { ...prev, fullAddress: addr, postalCode } : null
    );
  };

  return (
    <>
      <Header />
      <main className="flex-1 bg-shopee-gray pb-36 lg:pb-8">
        <div className="max-w-[1200px] mx-auto px-0 lg:px-4 py-0 lg:py-4">
          {/* Mobile Header */}
          <div className="lg:hidden flex items-center gap-2 px-3 py-2.5 bg-white sticky top-0 z-40 border-b border-shopee-border">
            <Link href="/cart" className="p-1">
              <ChevronLeft className="w-5 h-5 text-shopee-text" />
            </Link>
            <span className="text-base font-medium text-shopee-text">Checkout</span>
          </div>

          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 space-y-3">
              {/* Address */}
              <div className="bg-white px-3 lg:px-4 py-3 lg:rounded-sm">
                <div className="flex items-center gap-2 text-shopee-orange mb-2">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm font-medium">Alamat Pengiriman</span>
                </div>

                {isEditingAddress || !address ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-shopee-text-secondary mb-1">Nama Lengkap</label>
                      <input
                        type="text"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="Contoh: Budi Santoso"
                        className="w-full border border-shopee-border rounded-sm px-3 py-2 text-sm outline-none focus:border-shopee-orange text-shopee-text"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-shopee-text-secondary mb-1">Nomor Telepon</label>
                      <div className="flex items-center border border-shopee-border rounded-sm overflow-hidden focus-within:border-shopee-orange">
                        <span className="px-3 py-2 bg-shopee-gray text-sm text-shopee-text border-r border-shopee-border">+62</span>
                        <input
                          type="tel"
                          value={formPhone}
                          onChange={(e) => setFormPhone(e.target.value)}
                          placeholder="812-3456-7890"
                          className="flex-1 px-3 py-2 text-sm outline-none text-shopee-text"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-shopee-text-secondary mb-1">Pilih Titik Lokasi</label>
                      <button
                        type="button"
                        onClick={() => setShowMapPicker(true)}
                        className="w-full flex items-center gap-2 border border-shopee-border rounded-sm px-3 py-2.5 text-sm text-shopee-text bg-white hover:border-shopee-orange hover:text-shopee-orange transition-colors"
                      >
                        <Navigation className="w-4 h-4 text-shopee-text-secondary" />
                        {mapLatLng
                          ? `${mapLatLng.lat.toFixed(5)}, ${mapLatLng.lng.toFixed(5)}`
                          : formAddress
                            ? "Ubah Titik Lokasi"
                            : "Pilih Titik Lokasi"}
                      </button>
                    </div>
                    <div>
                      <label className="block text-xs text-shopee-text-secondary mb-1">Kode Pos</label>
                      <input
                        type="text"
                        value={formPostalCode || mapPostalCode}
                        readOnly
                        placeholder="Otomatis dari peta"
                        className="w-full border border-shopee-border rounded-sm px-3 py-2 text-sm outline-none text-shopee-text bg-shopee-gray/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-shopee-text-secondary mb-1">Alamat Lengkap</label>
                      <textarea
                        value={formAddress}
                        onChange={(e) => setFormAddress(e.target.value)}
                        placeholder="Jl. Nama Jalan No. XX, RT/RW, Kelurahan, Kecamatan, Kota, Provinsi"
                        rows={3}
                        className="w-full border border-shopee-border rounded-sm px-3 py-2 text-sm outline-none focus:border-shopee-orange text-shopee-text resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-shopee-text-secondary mb-1">Catatan Alamat (opsional)</label>
                      <input
                        type="text"
                        value={formNote}
                        onChange={(e) => setFormNote(e.target.value)}
                        placeholder="Contoh: Rumah cat hijau, dekat warung pak slamet"
                        className="w-full border border-shopee-border rounded-sm px-3 py-2 text-sm outline-none focus:border-shopee-orange text-shopee-text"
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      {address && (
                        <button
                          onClick={() => setIsEditingAddress(false)}
                          className="flex-1 h-9 border border-shopee-border text-shopee-text text-sm rounded-sm hover:bg-shopee-gray transition-colors"
                        >
                          Batal
                        </button>
                      )}
                      <button
                        onClick={handleSaveAddress}
                        className="flex-1 h-9 bg-shopee-orange hover:bg-[#1A7BD4] text-white text-sm font-medium rounded-sm transition-colors"
                      >
                        Simpan Alamat
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="pl-6">
                    <p className="text-sm font-medium text-shopee-text">{address.name} ({address.phone})</p>
                    <p className="text-sm text-shopee-text-secondary mt-0.5">{address.fullAddress}</p>
                    {address.postalCode && (
                      <p className="text-xs text-shopee-text-secondary mt-0.5">Kode Pos: {address.postalCode}</p>
                    )}
                    {address.note && (
                      <p className="text-xs text-shopee-text-secondary mt-1 italic">Catatan: {address.note}</p>
                    )}
                    <button
                      onClick={startEditAddress}
                      className="mt-2 text-xs text-shopee-orange border border-shopee-orange px-3 py-1 rounded-sm hover:bg-shopee-orange-light"
                    >
                      Ubah Alamat
                    </button>
                  </div>
                )}
              </div>

              {/* Products grouped by shop */}
              {Object.entries(
                checkoutItems.reduce((groups, item) => {
                  const shop = item.shopName || "Shenar2168 Official";
                  if (!groups[shop]) groups[shop] = [];
                  groups[shop].push(item);
                  return groups;
                }, {} as Record<string, typeof checkoutItems>)
              ).map(([shopName, items]) => (
                <div key={shopName} className="bg-white px-3 lg:px-4 py-3 lg:rounded-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-medium text-shopee-text">{shopName}</span>
                    <span className="text-[10px] bg-shopee-orange-light text-shopee-orange px-1.5 py-0.5 rounded-sm">
                      Official
                    </span>
                  </div>
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div key={`${item.productId}-${item.variationId || 0}`} className="flex gap-3">
                        <div className="w-16 h-16 flex-shrink-0 bg-shopee-gray rounded-sm overflow-hidden">
                          <img src={item.image || NO_IMAGE_PLACEHOLDER} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm text-shopee-text line-clamp-2">{item.name}</h4>
                          {item.variationId && (
                            <p className="text-xs text-blue-600 mt-0.5">Varian #{item.variationId}</p>
                          )}
                          <div className="flex items-center justify-between mt-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm text-shopee-orange font-medium">{formatPrice(item.price)}</span>
                              {item.originalPrice > item.price && (
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-shopee-text-secondary line-through">{formatPrice(item.originalPrice)}</span>
                                  <span className="text-[10px] text-shopee-orange font-medium">-{Math.round((1 - item.price / item.originalPrice) * 100)}%</span>
                                </div>
                              )}
                            </div>
                            <span className="text-xs text-shopee-text-secondary">x{item.quantity}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Shipping */}
              <div className="bg-white px-3 lg:px-4 py-3 lg:rounded-sm">
                <div className="flex items-center gap-2 text-shopee-text mb-3">
                  <Truck className="w-4 h-4 text-shopee-orange" />
                  <span className="text-sm font-medium">Pilihan Pengiriman</span>
                  {address?.postalCode && (
                    <span className="text-[10px] text-shopee-text-secondary ml-auto">
                      ke {address.postalCode}
                    </span>
                  )}
                </div>

                {!effectivePostalCode && (
                  <p className="text-xs text-shopee-text-secondary py-2">
                    Pilih lokasi di peta untuk melihat ongkir.
                  </p>
                )}

                {shippingLoading && (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center justify-between p-3 border border-shopee-border rounded-sm animate-pulse">
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 bg-shopee-gray rounded-full" />
                          <div>
                            <div className="h-3.5 bg-shopee-gray rounded w-24" />
                            <div className="h-3 bg-shopee-gray rounded w-16 mt-1" />
                          </div>
                        </div>
                        <div className="h-3.5 bg-shopee-gray rounded w-16" />
                      </div>
                    ))}
                  </div>
                )}

                {shippingError && (
                  <div className="p-3 border border-red-200 bg-red-50 rounded-sm">
                    <p className="text-xs text-red-600">{shippingError}</p>
                    <button
                      onClick={() => {
                        // trigger re-fetch by toggling a dummy state or re-running effect
                        // simplest: force effect by temporarily clearing postalCode then restoring
                        const pc = address?.postalCode;
                        if (pc) {
                          setAddress((prev) => prev ? { ...prev, postalCode: "" } : prev);
                          setTimeout(() => {
                            setAddress((prev) => prev ? { ...prev, postalCode: pc } : prev);
                          }, 50);
                        }
                      }}
                      className="mt-1 text-xs text-shopee-orange hover:underline"
                    >
                      Coba lagi
                    </button>
                  </div>
                )}

                {!shippingLoading && !shippingError && shippingRates.length > 0 && (
                  <>
                    {/* Shipping Type Tabs */}
                    {availableTypes.length > 1 && (
                      <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
                        {availableTypes.map((t) => {
                          const info = SHIPPING_TYPE_LABELS[t] || { label: t, desc: "" };
                          return (
                            <button
                              key={t}
                              onClick={() => setSelectedShippingType(t)}
                              className={`flex-shrink-0 px-3 py-1.5 rounded-sm text-xs font-medium border transition-colors ${
                                selectedShippingType === t
                                  ? "border-shopee-orange bg-shopee-orange-light text-shopee-orange"
                                  : "border-shopee-border text-shopee-text-secondary hover:border-shopee-orange/50"
                              }`}
                            >
                              <span className="block">{info.label}</span>
                              <span className="block text-[10px] font-normal opacity-70">{info.desc}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <div className="space-y-2">
                      {filteredRates.map((rate) => {
                      const key = `${rate.courier_code}|${rate.courier_service_name}`;
                      return (
                        <label
                          key={key}
                          className={`flex items-center justify-between p-3 border rounded-sm cursor-pointer transition-colors ${
                            selectedShipping === key
                              ? "border-shopee-orange bg-shopee-orange-light/50"
                              : "border-shopee-border hover:border-shopee-orange/50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="shipping"
                              value={key}
                              checked={selectedShipping === key}
                              onChange={() => setSelectedShipping(key)}
                              className="w-4 h-4 accent-shopee-orange"
                            />
                            <div>
                              <p className="text-sm text-shopee-text">
                                {rate.courier_code.toUpperCase()} {courierServiceLabels[rate.courier_service_name] || rate.courier_service_name}
                              </p>
                              <p className="text-xs text-shopee-text-secondary">
                                Estimasi {rate.duration}{rate.duration.includes("jam") ? "" : " hari"}
                              </p>
                            </div>
                          </div>
                          <span className="text-sm text-shopee-text font-medium">
                            {formatPrice(rate.price)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </>
                )}

                {!shippingLoading && !shippingError && effectivePostalCode && shippingRates.length === 0 && (
                  <p className="text-xs text-shopee-text-secondary py-2">
                    Tidak ada layanan pengiriman tersedia untuk kode pos ini.
                  </p>
                )}
              </div>

              {/* Voucher */}
              <div className="bg-white px-3 lg:px-4 py-3 lg:rounded-sm">
                <div className="flex items-center gap-2 text-shopee-text mb-3">
                  <Tag className="w-4 h-4 text-shopee-orange" />
                  <span className="text-sm font-medium">Voucher</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Masukkan kode voucher"
                    value={voucher}
                    onChange={(e) => {
                      setVoucher(e.target.value);
                      setVoucherError("");
                    }}
                    className="flex-1 border border-shopee-border rounded-sm px-3 py-2 text-sm outline-none focus:border-shopee-orange"
                  />
                  <button
                    onClick={applyVoucher}
                    disabled={voucherLoading || !voucher.trim()}
                    className="px-4 py-2 bg-shopee-orange text-white text-sm rounded-sm hover:bg-[#1A7BD4] transition-colors disabled:opacity-60"
                  >
                    {voucherLoading ? "..." : "Pakai"}
                  </button>
                </div>
                {voucherError && (
                  <p className="text-xs text-red-500 mt-2">{voucherError}</p>
                )}
                {appliedCoupon && (
                  <div className="mt-2 flex items-center gap-2 bg-shopee-orange-light/50 border border-shopee-orange/20 rounded-sm px-3 py-2">
                    <Tag className="w-3.5 h-3.5 text-shopee-orange" />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-shopee-text">{appliedCoupon.code}</p>
                      <p className="text-[10px] text-shopee-text-secondary">
                        {appliedCoupon.discount_type === "percent"
                          ? `${appliedCoupon.amount}% OFF`
                          : `Diskon Rp${formatPrice(appliedCoupon.amount)}`}
                      </p>
                    </div>
                    <button
                      onClick={() => { setAppliedCoupon(null); setVoucher(""); }}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      Hapus
                    </button>
                  </div>
                )}
              </div>

              {/* Payment Summary */}
              <div className="bg-white px-3 lg:px-4 py-3 lg:rounded-sm">
                <h3 className="text-sm font-medium text-shopee-text mb-3">Ringkasan Pembayaran</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-shopee-text-secondary">
                    <span>Total Harga ({checkoutItems.reduce((s, i) => s + i.quantity, 0)} barang)</span>
                    <span>{formatPrice(originalSubtotal)}</span>
                  </div>
                  <div className="flex justify-between text-shopee-text-secondary">
                    <span>Biaya Pengiriman</span>
                    <span>{formatPrice(shipping)}</span>
                  </div>
                  {productDiscount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-shopee-text-secondary">Diskon Produk</span>
                      <span className="text-red-500">-{formatPrice(productDiscount)}</span>
                    </div>
                  )}
                  {voucherDiscount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-shopee-text-secondary">Potongan Voucher</span>
                      <span className="text-red-500">-{formatPrice(voucherDiscount)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Desktop Summary */}
            <div className="hidden lg:block w-[360px]">
              <div className="bg-white rounded-sm p-4 sticky top-[120px] space-y-4">
                <h3 className="text-sm font-medium text-shopee-text">Ringkasan Pesanan</h3>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-shopee-text-secondary">
                    <span>Total Harga ({checkoutItems.reduce((s, i) => s + i.quantity, 0)} barang)</span>
                    <span>{formatPrice(originalSubtotal)}</span>
                  </div>
                  <div className="flex justify-between text-shopee-text-secondary">
                    <span>Biaya Pengiriman</span>
                    <span>{formatPrice(shipping)}</span>
                  </div>
                  {productDiscount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-shopee-text-secondary">Diskon Produk</span>
                      <span className="text-red-500">-{formatPrice(productDiscount)}</span>
                    </div>
                  )}
                  {voucherDiscount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-shopee-text-secondary">Potongan Voucher</span>
                      <span className="text-red-500">-{formatPrice(voucherDiscount)}</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-shopee-border pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-shopee-text">Total Pembayaran</span>
                    <span className="text-xl text-shopee-orange font-medium">{formatPrice(total)}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-xs text-shopee-text-secondary">
                  <ShieldCheck className="w-4 h-4 text-shopee-green flex-shrink-0 mt-0.5" />
                  <span>
                    Dengan melanjutkan, kamu menyetujui Syarat & Ketentuan dan Kebijakan Privasi kami.
                  </span>
                </div>

                {error && (
                  <p className="text-xs text-red-500 bg-red-50 p-2 rounded-sm">{error}</p>
                )}

                <button
                  onClick={handleCheckout}
                  disabled={isSubmitting || checkoutItems.length === 0}
                  className="w-full h-11 bg-shopee-orange hover:bg-[#1A7BD4] text-white font-medium rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Memproses..." : `Buat Pesanan`}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Sticky Summary */}
      <div className="lg:hidden fixed bottom-14 left-0 right-0 bg-white border-t border-shopee-border z-[60] px-3 py-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-shopee-text-secondary">Total Pembayaran</span>
          <span className="text-lg text-shopee-orange font-medium">{formatPrice(total)}</span>
        </div>
        {error && (
          <p className="text-xs text-red-500 mb-2">{error}</p>
        )}
        <button
          onClick={handleCheckout}
          disabled={isSubmitting || checkoutItems.length === 0}
          className="w-full h-10 bg-shopee-orange hover:bg-[#1A7BD4] text-white text-sm font-medium rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Memproses..." : "Buat Pesanan"}
        </button>
      </div>

      <div className="hidden lg:block">
        <Footer />
      </div>
      <BottomNav />

      {/* Map Picker Modal */}
      {showMapPicker && (
        <MapPicker
          onSelect={handleMapSelect}
          onClose={() => setShowMapPicker(false)}
        />
      )}

      {/* Login Modal */}
      <LoginModal open={loginOpen} onClose={closeLogin} />
    </>
  );
}