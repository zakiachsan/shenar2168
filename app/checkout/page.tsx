"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  MapPin,
  Truck,
  Tag,
  ShieldCheck,
  Navigation,
  Coins,
  Check,
  BookUser,
} from "lucide-react";
import Header from "@/app/components/layout/Header";
import BottomNav from "@/app/components/layout/BottomNav";
import Footer from "@/app/components/layout/Footer";
import { useCart } from "@/lib/cart-context";
import { formatPrice, NO_IMAGE_PLACEHOLDER, toSlug } from "@/lib/data";
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
  const [orderNote, setOrderNote] = useState("");
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
  const [showAddressList, setShowAddressList] = useState(false);
  const [addressBook, setAddressBook] = useState<any[]>([]);

  // Coins state
  const [coinsBalance, setCoinsBalance] = useState(0);
  const [coinsEarnInfo, setCoinsEarnInfo] = useState<{ amount: number; caption: string } | null>(null);
  const [useCoins, setUseCoins] = useState(false);
  const [coinsToUse, setCoinsToUse] = useState(0);
  const [coinsLoading, setCoinsLoading] = useState(false);

  const { user, openLogin, closeLogin, loginOpen, updateProfile } = useAuth();

  // Track whether localStorage address has been loaded on mount
  const localLoaded = useRef(false);



  // Auto-resume checkout after login
  useEffect(() => {
    if (user && pendingCheckout && address && checkoutItems.length > 0) {
      setPendingCheckout(false);
      handleCheckout();
    }
  }, [user]);

  // Load address book from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("ragamguna-address-book");
      if (raw) {
        const book = JSON.parse(raw);
        if (Array.isArray(book)) setAddressBook(book);
      }
    } catch {
      // ignore
    }
  }, []);

  // Select address from address book
  const selectAddressFromBook = (addr: any) => {
    const newAddress = {
      name: addr.name || "",
      phone: addr.phone || "",
      fullAddress: addr.fullAddress || "",
      note: addr.note || "",
      postalCode: addr.postalCode || "",
    };
    setAddress(newAddress);
    setFormName(addr.name || "");
    setFormPhone(addr.phone || "");
    setFormAddress(addr.fullAddress || "");
    setFormNote(addr.note || "");
    setFormPostalCode(addr.postalCode || "");
    if (addr.lat && addr.lng) {
      setMapLatLng({ lat: addr.lat, lng: addr.lng });
      localStorage.setItem("ragamguna-checkout-latlng", JSON.stringify({ lat: addr.lat, lng: addr.lng }));
    }
    if (typeof window !== "undefined") {
      localStorage.setItem("ragamguna-checkout-address", JSON.stringify(newAddress));
    }
    setShowAddressList(false);
    setIsEditingAddress(false);
  };

  // Load address + latlng from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const rawAddr = localStorage.getItem("ragamguna-checkout-address");
      if (rawAddr) {
        const parsed = JSON.parse(rawAddr);
        setAddress(parsed);
        if (parsed.postalCode) setMapPostalCode(parsed.postalCode);
      }
      const rawLatLng = localStorage.getItem("ragamguna-checkout-latlng");
      if (rawLatLng) {
        const parsed = JSON.parse(rawLatLng);
        setMapLatLng(parsed);
      }
    } catch {
      // ignore
    }
    localLoaded.current = true;
  }, []);

  // Load address from server if logged in and no local address
  useEffect(() => {
    if (!localLoaded.current || address || !user?.phone) return;
    fetch(`/api/profile/save-address?phone=${encodeURIComponent(user.phone)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.address?.fullAddress) {
          const serverAddr = {
            name: data.address.name || '',
            phone: user.phone || '',
            fullAddress: data.address.fullAddress || '',
            note: data.address.note || '',
            postalCode: data.address.postalCode || '',
          };
          setAddress(serverAddr);
          if (serverAddr.postalCode) setMapPostalCode(serverAddr.postalCode);
          localStorage.setItem("ragamguna-checkout-address", JSON.stringify(serverAddr));
        }
      })
      .catch(() => {});
  }, [user?.phone]);

  // Auto-fill address from address book if checkout address is empty
  useEffect(() => {
    if (!localLoaded.current || address) return; // already have address
    if (typeof window === "undefined") return;
    try {
      const rawBook = localStorage.getItem("ragamguna-address-book");
      if (rawBook) {
        const book = JSON.parse(rawBook);
        if (Array.isArray(book) && book.length > 0) {
          const defaultAddr = book.find((a: any) => a.isDefault) || book[0];
          const autoAddress = {
            name: defaultAddr.name || "",
            phone: defaultAddr.phone || "",
            fullAddress: defaultAddr.fullAddress || "",
            note: defaultAddr.note || "",
            postalCode: defaultAddr.postalCode || "",
          };
          setAddress(autoAddress);
          if (autoAddress.postalCode) setMapPostalCode(autoAddress.postalCode);
          if (defaultAddr.lat && defaultAddr.lng) {
            setMapLatLng({ lat: defaultAddr.lat, lng: defaultAddr.lng });
          }
          return;
        }
      }
    } catch {
      // ignore
    }
    // Fallback: auto-fill from logged-in user profile
    if (!user) return;
    const fullAddr = user.address || "";
    const postalMatch = fullAddr.match(/\b(\d{5})\b/);
    const autoAddress = {
      name: user.name || "",
      phone: user.phone || "",
      fullAddress: fullAddr,
      note: "",
      postalCode: postalMatch ? postalMatch[1] : "",
    };
    setAddress(autoAddress);
    if (autoAddress.postalCode) setMapPostalCode(autoAddress.postalCode);
  }, [user]);

  // Read selected items from localStorage (set by cart page or buy-now)
  const [selectedKeys, setSelectedKeys] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem("ragamguna-checkout-selected");
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
        // Don't auto-select — user must explicitly choose
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

  // Fetch user coins balance & points config
  useEffect(() => {
    if (!user?.phone) return;
    const phone = user.phone;
    let cancelled = false;
    async function load() {
      try {
        setCoinsLoading(true);
        const [statsRes, settingsRes] = await Promise.all([
          fetch(`/api/user-stats?phone=${encodeURIComponent(phone)}`),
          fetch("/api/settings"),
        ]);
        const [statsData, settingsData] = await Promise.all([
          statsRes.json(),
          settingsRes.json(),
        ]);
        if (!cancelled) {
          setCoinsBalance(statsData.coins || 0);
          if (settingsData.points?.enabled) {
            const earned = settingsData.points.type === 'percent'
              ? Math.floor(subtotal * (settingsData.points.value / 100))
              : settingsData.points.value;
            setCoinsEarnInfo({
              amount: earned,
              caption: settingsData.points.caption || 'Dapatkan cashback dari pembelian ini',
            });
          } else {
            setCoinsEarnInfo(null);
          }
        }
      } catch {
        if (!cancelled) setCoinsBalance(0);
      } finally {
        if (!cancelled) setCoinsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user?.phone, subtotal]);
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
  const coinsDiscount = useCoins ? Math.min(coinsToUse, Math.max(0, subtotal - voucherDiscount)) : 0;
  const total = subtotal + shipping - voucherDiscount - coinsDiscount;

  // Form validation for disabling the submit button
  const isCheckoutValid = (() => {
    if (!address) return false;
    if (!address.name.trim()) return false;
    if (!address.phone.trim()) return false;
    if (!address.fullAddress.trim()) return false;
    if (!(address.postalCode || formPostalCode || mapPostalCode)) return false;
    if (!selectedShipping) return false;
    return true;
  })();

  const applyVoucher = async () => {
    if (!voucher.trim()) return;
    setVoucherError("");
    setVoucherLoading(true);
    try {
      // Server-side validation: checks min_order, expiry, usage_limit
      const res = await fetch(
        `/api/coupons?code=${encodeURIComponent(voucher.trim())}&total=${subtotal}`
      );
      if (!res.ok) throw new Error("Gagal memvalidasi voucher");
      const data = await res.json();
      if (!data.valid) {
        setVoucherError(data.message || "Kode voucher tidak valid.");
        setAppliedCoupon(null);
      } else {
        // Also fetch coupon details for display
        const listRes = await fetch("/api/coupons");
        const listData = await listRes.json();
        const coupons = Array.isArray(listData.coupons) ? listData.coupons : [];
        const found = coupons.find(
          (c: any) => c.code.toUpperCase() === voucher.trim().toUpperCase()
        );
        if (found) {
          setAppliedCoupon(found);
        } else {
          // Fallback: build minimal coupon object from validation response
          setAppliedCoupon({
            code: voucher.trim().toUpperCase(),
            discount_type: data.discount > 0 && data.discount < subtotal ? "percent" : "fixed_cart",
            amount: String(data.discount),
          });
        }
      }
    } catch {
      setVoucherError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setVoucherLoading(false);
    }
  };

  const handleCheckout = async () => {
    // Validate all fields
    if (!address) {
      setError("Harap isi alamat pengiriman terlebih dahulu.");
      return;
    }

    if (!address.name.trim()) {
      setError("Nama lengkap wajib diisi.");
      return;
    }

    if (!address.phone.trim()) {
      setError("Nomor telepon wajib diisi.");
      return;
    }

    if (!address.fullAddress.trim()) {
      setError("Alamat lengkap wajib diisi.");
      return;
    }

    if (!(address.postalCode || formPostalCode || mapPostalCode)) {
      setError("Kode pos wajib diisi. Pilih titik lokasi di peta terlebih dahulu.");
      return;
    }

    if (!selectedShipping) {
      setError("Pilih jasa pengiriman terlebih dahulu.");
      return;
    }

    if (checkoutItems.length === 0) {
      setError("Keranjang belanjamu masih kosong.");
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
          coins_used: coinsDiscount > 0 ? coinsDiscount : 0,
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
            last_name: address.name.split(" ").slice(1).join(" ") || '',
            phone: address.phone,
            email: `${address.phone}@ragamguna.id`,
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
          payment_method: "doku_checkout",
          customer_note: orderNote,
          coupon_code: appliedCoupon?.code || undefined,
          shipping_courier: selectedShipping ? selectedShipping.split("|")[0] : undefined,
          shipping_service: selectedShipping ? selectedShipping.split("|")[1] : undefined,
          shipping_cost: shipping,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Gagal membuat pesanan");
      }

      // Save address to server database for future checkouts
      if (user?.phone) {
        fetch('/api/profile/save-address', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: user.phone,
            name: address.name,
            fullAddress: address.fullAddress,
            postalCode: address.postalCode || '',
            note: address.note || '',
          }),
        }).catch(() => {});
        // Also update AuthProvider so profile page reflects changes
        updateProfile({ name: address.name, phone: address.phone, address: address.fullAddress });
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
        total: subtotal + shipping - voucherDiscount - coinsDiscount,
        date: new Date().toISOString(),
        shipping: selectedShipping,
        shippingCost: shipping,
        shippingCourier: selectedRate
          ? `${selectedRate.courier_code.toUpperCase()} ${courierServiceLabels[selectedRate.courier_service_name] || selectedRate.courier_service_name}`
          : undefined,
        voucherDiscount: voucherDiscount,
        coinsDiscount: coinsDiscount,
        couponCode: appliedCoupon?.code || undefined,
        trackingId: data.shipping?.tracking_id,
        waybillId: data.shipping?.waybill_id,
        biteshipStatus: data.shipping?.status,
      };
      const existingOrders = JSON.parse(localStorage.getItem("ragamguna-orders") || "[]");
      existingOrders.unshift(orderRecord);
      localStorage.setItem("ragamguna-orders", JSON.stringify(existingOrders));

      // Save address to address book
      try {
        const rawBook = localStorage.getItem("ragamguna-address-book");
        const book = rawBook ? JSON.parse(rawBook) : [];
        const exists = book.some((a: any) =>
          a.fullAddress === address.fullAddress && a.phone === address.phone
        );
        if (!exists) {
          const newId = book.length > 0 ? Math.max(...book.map((a: any) => a.id)) + 1 : 1;
          book.push({
            id: newId,
            name: address.name,
            phone: address.phone,
            fullAddress: address.fullAddress,
            note: address.note || "",
            postalCode: address.postalCode || "",
            lat: mapLatLng?.lat,
            lng: mapLatLng?.lng,
            isDefault: book.length === 0,
          });
          localStorage.setItem("ragamguna-address-book", JSON.stringify(book));
        }
      } catch {
        // ignore
      }

      // Call DOKU checkout API to get payment URL BEFORE clearing cart
      try {
        const dokuRes = await fetch("/api/doku/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order_id: data.order.id }),
        });
        const dokuData = await dokuRes.json();
        // Clear cart directly in localStorage (skip React state to avoid flash)
        try { localStorage.setItem("shenar2168-cart", "[]"); } catch {}
        localStorage.removeItem("ragamguna-checkout-selected");
        if (dokuData.checkout_url) {
          window.location.href = dokuData.checkout_url;
        } else {
          window.location.href = `/order-confirmed?code=${data.order.orderCode}`;
        }
      } catch {
        try { localStorage.setItem("shenar2168-cart", "[]"); } catch {}
        localStorage.removeItem("ragamguna-checkout-selected");
        window.location.href = `/order-confirmed?code=${data.order.orderCode}`;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAddress = () => {
    if (!formName.trim()) {
      alert("Nama lengkap wajib diisi.");
      return;
    }
    if (!formPhone.trim()) {
      alert("Nomor telepon wajib diisi.");
      return;
    }
    if (!formAddress.trim()) {
      alert("Alamat lengkap wajib diisi.");
      return;
    }
    // Auto-extract postal code from address text if not set via map
    let pc = formPostalCode || mapPostalCode;
    if (!pc) {
      const postalMatch = formAddress.match(/\b(\d{5})\b/);
      if (postalMatch) {
        pc = postalMatch[1];
        setMapPostalCode(pc);
      }
    }
    if (!pc) {
      alert("Kode pos wajib diisi. Masukkan kode pos di alamat atau pilih titik lokasi di peta.");
      return;
    }
    const newAddress = { name: formName, phone: formPhone, fullAddress: formAddress, note: formNote, postalCode: pc };
    setAddress(newAddress);
    setIsEditingAddress(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("ragamguna-checkout-address", JSON.stringify(newAddress));
      if (mapLatLng) {
        localStorage.setItem("ragamguna-checkout-latlng", JSON.stringify(mapLatLng));
      }
    }
    // Update AuthProvider so profile shows the latest data
    if (user?.phone) {
      updateProfile({ name: formName, phone: formPhone, address: formAddress });
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
      localStorage.setItem("ragamguna-checkout-latlng", JSON.stringify(newLatLng));
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
                      <label className="block text-xs text-shopee-text-secondary mb-1">Nama Lengkap <span className="text-red-500">*</span></label>
                      <input
                        required
                        type="text"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="Contoh: Budi Santoso"
                        className="w-full border border-shopee-border rounded-sm px-3 py-2 text-sm outline-none focus:border-shopee-orange text-shopee-text"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-shopee-text-secondary mb-1">Nomor Telepon <span className="text-red-500">*</span></label>
                      <div className="flex items-center border border-shopee-border rounded-sm overflow-hidden focus-within:border-shopee-orange">
                        <span className="px-3 py-2 bg-shopee-gray text-sm text-shopee-text border-r border-shopee-border">+62</span>
                        <input
                          required
                          type="tel"
                          value={formPhone}
                          onChange={(e) => setFormPhone(e.target.value)}
                          placeholder="812-3456-7890"
                          className="flex-1 px-3 py-2 text-sm outline-none text-shopee-text"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-shopee-text-secondary mb-1">Pilih Titik Lokasi <span className="text-red-500">*</span></label>
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
                      <label className="block text-xs text-shopee-text-secondary mb-1">Alamat Lengkap <span className="text-red-500">*</span></label>
                      <textarea
                        required
                        value={formAddress}
                        onChange={(e) => {
                        setFormAddress(e.target.value);
                        // Auto-extract 5-digit postal code from address text
                        const match = e.target.value.match(/\b(\d{5})\b/);
                        if (match && !formPostalCode && !mapPostalCode) {
                          setMapPostalCode(match[1]);
                        }
                      }}
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
                    {/* Address book CTA */}
                    {addressBook.length > 0 && (
                      <div className="pt-1 border-t border-shopee-border">
                        <button
                          onClick={() => setShowAddressList(true)}
                          className="w-full flex items-center justify-center gap-2 py-2 text-xs text-shopee-orange hover:bg-shopee-orange-light/30 rounded-sm transition-colors"
                        >
                          <BookUser className="w-3.5 h-3.5" />
                          Pilih dari Daftar Alamat
                        </button>
                      </div>
                    )}
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
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={startEditAddress}
                        className="text-xs text-shopee-orange border border-shopee-orange px-3 py-1 rounded-sm hover:bg-shopee-orange-light"
                      >
                        Ubah Alamat
                      </button>
                      {addressBook.length > 0 && (
                        <button
                          onClick={() => setShowAddressList(true)}
                          className="text-xs text-shopee-orange border border-shopee-orange px-3 py-1 rounded-sm hover:bg-shopee-orange-light flex items-center gap-1"
                        >
                          <BookUser className="w-3 h-3" />
                          Pilih Alamat Lain
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Address Book Modal */}
                {showAddressList && (
                  <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setShowAddressList(false)} />
                    {/* Sheet */}
                    <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col max-h-[85vh] lg:max-h-[80vh] bg-white lg:relative lg:inset-auto lg:max-w-lg lg:rounded-sm lg:z-50">
                      {/* Handle bar (mobile) */}
                      <div className="lg:hidden flex justify-center pt-2 pb-1">
                        <div className="w-8 h-1 bg-gray-300 rounded-full" />
                      </div>
                      {/* Header */}
                      <div className="flex-shrink-0 border-b border-shopee-border px-4 py-3 flex items-center justify-between">
                        <h3 className="text-sm font-medium text-shopee-text">Pilih Alamat Pengiriman</h3>
                        <button onClick={() => setShowAddressList(false)} className="text-shopee-text-secondary hover:text-shopee-text p-1 text-xl leading-none">
                          ✕
                        </button>
                      </div>
                      {/* List */}
                      <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-2 space-y-2 min-h-0">
                        {addressBook.map((addr) => {
                          const isSelected = address?.fullAddress === addr.fullAddress && address?.phone === addr.phone;
                          return (
                            <button
                              key={addr.id}
                              onClick={() => selectAddressFromBook(addr)}
                              className={`w-full text-left p-3 border rounded-sm transition-colors ${
                                isSelected
                                  ? "border-shopee-orange bg-shopee-orange-light/30"
                                  : "border-shopee-border hover:border-shopee-orange/50"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-shopee-text">{addr.name}</span>
                                    <span className="text-xs text-shopee-text-secondary">{addr.phone}</span>
                                    {addr.isDefault && (
                                      <span className="text-[10px] text-shopee-orange border border-shopee-orange px-1 py-0.5 rounded-sm flex-shrink-0">
                                        Utama
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-shopee-text-secondary mt-0.5 line-clamp-2">{addr.fullAddress}</p>
                                  {addr.postalCode && (
                                    <p className="text-[10px] text-shopee-text-secondary mt-0.5">Kode Pos: {addr.postalCode}</p>
                                  )}
                                </div>
                                {isSelected && (
                                  <Check className="w-5 h-5 text-shopee-orange flex-shrink-0 mt-0.5" />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      <div className="sticky bottom-0 bg-white border-t border-shopee-border px-4 py-2">
                        <Link
                          href="/profile/address"
                          className="block text-center text-xs text-shopee-orange py-2 hover:underline"
                        >
                          + Tambah Alamat Baru
                        </Link>
                      </div>
                    </div>
                  </>
                )}

              </div>

              {/* Products grouped by shop */}
              {Object.entries(
                checkoutItems.reduce((groups, item) => {
                  const shop = item.shopName || "RagamGuna Official";
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
                      <Link
                        key={`${item.productId}-${item.variationId || 0}`}
                        href={`/product/${item.productId}-${toSlug(item.name)}?fromCheckout=1${item.variationId ? `&variationId=${item.variationId}` : ''}`}
                        className="flex gap-3 group"
                      >
                        <div className="w-16 h-16 flex-shrink-0 bg-shopee-gray rounded-sm overflow-hidden">
                          <img src={item.image || NO_IMAGE_PLACEHOLDER} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm text-shopee-text line-clamp-2 group-hover:text-shopee-orange transition-colors">{item.name}</h4>
                          {item.isPreorder && (
                            <p className="text-xs text-purple-600 font-medium mt-0.5">Pre-Order (estimasi {item.preorderDays || 7} hari)</p>
                          )}
                          {item.variationInfo && (
                            <p className="text-xs text-blue-600 mt-0.5">{item.variationInfo}</p>
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
                      </Link>
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

              {/* Pesan untuk Penjual */}
              <div className="bg-white px-3 lg:px-4 py-3 lg:rounded-sm">
                <div className="flex items-center gap-2 text-shopee-text mb-1">
                  <span className="text-sm font-medium">Pesan untuk Penjual</span>
                  <span className="text-[10px] text-shopee-text-secondary">(opsional)</span>
                </div>
                <textarea
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  placeholder="Contoh: Tolong dicek kondisi barang sebelum dikirim"
                  rows={3}
                  maxLength={500}
                  className="w-full border border-shopee-border rounded-sm px-3 py-2 text-sm outline-none focus:border-shopee-orange text-shopee-text resize-none"
                />
                <p className="text-[10px] text-shopee-text-secondary text-right mt-0.5">{orderNote.length}/500</p>
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

              {/* Coins */}
              {user && (
                <div className="bg-white px-3 lg:px-4 py-3 lg:rounded-sm">
                  <div className="flex items-center gap-2 text-shopee-text mb-3">
                    <Coins className="w-4 h-4 text-shopee-orange" />
                    <span className="text-sm font-medium">Koin Saya</span>
                  </div>

                  {coinsLoading ? (
                    <p className="text-xs text-shopee-text-secondary py-2">Memuat koin...</p>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-shopee-text-secondary">Saldo Koin</span>
                        <span className="text-sm font-medium text-shopee-text">{coinsBalance.toLocaleString("id-ID")} <Coins className="w-3.5 h-3.5 inline text-shopee-orange" /></span>
                      </div>

                      {coinsEarnInfo && coinsEarnInfo.amount > 0 && (
                        <div className="bg-green-50 border border-green-200 rounded-sm px-3 py-2 mb-3">
                          <p className="text-xs text-green-700 flex items-center gap-1">
                            <Coins className="w-3.5 h-3.5" />
                            Dapatkan <strong>+{coinsEarnInfo.amount.toLocaleString("id-ID")} koin</strong> dari pesanan ini
                          </p>
                        </div>
                      )}

                      {coinsBalance > 0 && (
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={useCoins}
                              onChange={(e) => {
                                setUseCoins(e.target.checked);
                                if (!e.target.checked) setCoinsToUse(0);
                              }}
                              className="w-4 h-4 accent-shopee-orange rounded"
                            />
                            <span className="text-xs text-shopee-text">Gunakan Koin sebagai diskon</span>
                          </label>

                          {useCoins && (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={0}
                                max={Math.min(coinsBalance, subtotal)}
                                value={coinsToUse}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  setCoinsToUse(Math.min(val, coinsBalance, subtotal));
                                }}
                                className="flex-1 border border-shopee-border rounded-sm px-3 py-2 text-sm outline-none focus:border-shopee-orange"
                                placeholder="Jumlah koin"
                              />
                              <button
                                onClick={() => setCoinsToUse(Math.min(coinsBalance, subtotal))}
                                className="px-3 py-2 text-xs text-shopee-orange border border-shopee-orange rounded-sm hover:bg-shopee-orange-light/50 transition-colors"
                              >
                                Maksimal
                              </button>
                            </div>
                          )}
                          {useCoins && coinsToUse > 0 && (
                            <p className="text-xs text-shopee-text-secondary">
                              Potongan: <span className="text-red-500 font-medium">-Rp {coinsToUse.toLocaleString("id-ID")}</span>
                            </p>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

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
                  {coinsDiscount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-shopee-text-secondary">Potongan Koin</span>
                      <span className="text-red-500">-{formatPrice(coinsDiscount)}</span>
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
                  {coinsDiscount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-shopee-text-secondary">Potongan Koin</span>
                      <span className="text-red-500">-{formatPrice(coinsDiscount)}</span>
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
                  disabled={isSubmitting || checkoutItems.length === 0 || !isCheckoutValid}
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
          disabled={isSubmitting || checkoutItems.length === 0 || !isCheckoutValid}
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