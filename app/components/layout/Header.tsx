"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, ShoppingCart, X, Home, Grid3X3, ShoppingBag, User, HelpCircle, Loader2, TrendingUp, MessageCircle } from "lucide-react";
import LoginModal from "./LoginModal";
import { useAuth } from "./AuthProvider";
import { useChat } from "@/lib/chat-context";
import { useCart } from "@/lib/cart-context";
import { formatPrice, NO_IMAGE_PLACEHOLDER, toSlug } from "@/lib/data";

const categories = [
  { name: "Elektronik", href: "/category/elektronik" },
  { name: "Komputer", href: "/category/komputer" },
  { name: "Handphone", href: "/category/handphone" },
  { name: "Pakaian Pria", href: "/category/pakaian-pria" },
  { name: "Pakaian Wanita", href: "/category/pakaian-wanita" },
  { name: "Kecantikan", href: "/category/kecantikan" },
  { name: "Rumah Tangga", href: "/category/rumah-tangga" },
  { name: "Tas & Sepatu", href: "/category/tas-sepatu" },
  { name: "Olahraga", href: "/category/olahraga" },
  { name: "Makanan", href: "/category/makanan" },
];

export default function Header({ sticky = true }: { sticky?: boolean }) {
  const router = useRouter();
  const { user } = useAuth();
  const { openChat } = useChat();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { getItemCount } = useCart();
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [popularSearches, setPopularSearches] = useState<string[]>([]);
  const cartCount = getItemCount();
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChatClick = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    if (window.innerWidth < 1024) {
      router.push("/chat");
    } else {
      openChat();
    }
  };

  const handleSearch = (query?: string) => {
    const q = query || searchValue.trim();
    if (q) {
      // Log the search query
      fetch("/api/search/popular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      }).catch(() => {});
      router.push(`/search?q=${encodeURIComponent(q)}`);
      setSearchFocused(false);
      setSearchResults([]);
    }
  };

  // Debounce search: fetch products after 2s of idle typing
  useEffect(() => {
    if (searchTimer.current) {
      clearTimeout(searchTimer.current);
      searchTimer.current = null;
    }
    const trimmed = searchValue.trim();
    if (!trimmed) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(trimmed)}&per_page=8`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.products || []);
        } else {
          setSearchResults([]);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 2000);
    searchTimer.current = timer;
    return () => {
      clearTimeout(timer);
      searchTimer.current = null;
    };
  }, [searchValue]);

  // Fetch popular searches on mount
  useEffect(() => {
    fetch("/api/search/popular")
      .then((res) => res.json())
      .then((data) => {
        if (data.searches && data.searches.length > 0) {
          setPopularSearches(data.searches.map((s: any) => s.query));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <header className={`bg-white ${sticky ? 'sticky top-0' : ''} z-50 shadow-sm`}>
      {/* Desktop Header */}
      <div className="hidden lg:block">
        <div className="max-w-[1200px] mx-auto px-4 py-4 flex items-start gap-6">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0 cursor-pointer">
            <svg width="160" height="40" viewBox="0 0 160 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <text x="0" y="28" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="22" fill="#2D96F6">
                SHENAR2168
              </text>
              <text x="0" y="38" fontFamily="Arial, sans-serif" fontWeight="400" fontSize="8" fill="#757575" letterSpacing="2">
                MARKETPLACE
              </text>
            </svg>
          </Link>

          {/* Search Bar */}
          <div className="flex-1 max-w-[800px] relative">
            <div className="flex items-center border-2 border-shopee-orange bg-white rounded-sm">
              <div className="flex-1 flex items-center px-3 relative">
                <input
                  type="text"
                  placeholder="Cari produk lokal..."
                  className="w-full py-2.5 outline-none text-sm text-shopee-text placeholder:text-[#757575]/60"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSearch();
                  }}
                />
              </div>
              <button
                className="bg-shopee-orange hover:opacity-90 text-white px-6 py-2.5 transition-colors"
                onClick={() => handleSearch()}
              >
                <Search className="w-5 h-5" />
              </button>
            </div>

            {/* Search Suggestions */}
            {searchFocused && (
              <div className="absolute top-full left-0 right-0 bg-white shadow-lg border border-shopee-border mt-1 z-50 rounded-sm max-h-[420px] overflow-y-auto">
                {!searchValue.trim() ? (
                  <div className="p-2">
                    <p className="text-xs text-shopee-text-secondary px-2 py-1">Pencarian Populer</p>
                    {(popularSearches.length > 0 ? popularSearches : ["kaos polos", "sepatu sneakers", "headphone bluetooth", "powerbank", "jam tangan", "hoodie", "tas ransel"]).map((s) => (
                      <button
                        key={s}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleSearch(s)}
                        className="w-full text-left px-2 py-1.5 hover:bg-shopee-orange-light cursor-pointer text-sm text-shopee-text rounded flex items-center gap-2"
                      >
                        <Search className="w-3.5 h-3.5 text-shopee-text-secondary flex-shrink-0" />
                        <span className="truncate">{s}</span>
                      </button>
                    ))}
                  </div>
                ) : searchLoading ? (
                  <div className="p-4 flex items-center justify-center gap-2 text-shopee-text-secondary">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-xs">Mencari produk...</span>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="p-2">
                    <p className="text-xs text-shopee-text-secondary px-2 py-1">Rekomendasi Produk</p>
                    {searchResults.map((p) => (
                      <Link
                        key={p.id}
                        href={`/product/${p.id}-${toSlug(p.name)}`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setSearchFocused(false)}
                        className="flex items-center gap-3 px-2 py-2 hover:bg-shopee-orange-light rounded cursor-pointer"
                      >
                        <div className="w-10 h-10 bg-shopee-gray rounded-sm overflow-hidden flex-shrink-0">
                          <img src={p.image || NO_IMAGE_PLACEHOLDER} alt={p.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-shopee-text truncate">{p.name}</p>
                          <p className="text-xs text-shopee-orange font-medium">{formatPrice(p.price)}</p>
                        </div>
                      </Link>
                    ))}
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSearch()}
                      className="w-full text-center py-2 text-xs text-shopee-orange hover:underline mt-1"
                    >
                      Lihat semua hasil untuk &quot;{searchValue.trim()}&quot;
                    </button>
                  </div>
                ) : (
                  <div className="p-6 text-center">
                    <Search className="w-8 h-8 mx-auto text-shopee-text-secondary mb-2" />
                    <p className="text-sm text-shopee-text-secondary">Produk yang kamu cari tidak ditemukan</p>
                    <p className="text-xs text-shopee-text-secondary mt-0.5">Coba kata kunci lain</p>
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSearch()}
                      className="mt-2 text-xs text-shopee-orange hover:underline"
                    >
                      Cari &quot;{searchValue.trim()}&quot; di halaman pencarian
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Quick Tags */}
            <div className="flex items-center gap-3 mt-1 text-xs text-[#757575]/80">
              {(popularSearches.length > 0 ? popularSearches.slice(0, 5) : ["kaos polos", "sepatu sneakers", "kemeja pria", "tas ransel", "hoodie"]).map((s) => (
                <Link
                  key={s}
                  href={`/search?q=${encodeURIComponent(s)}`}
                  className="hover:text-shopee-orange cursor-pointer"
                >
                  {s}
                </Link>
              ))}
            </div>
          </div>

          {/* Chat Button */}
            <button
              onClick={handleChatClick}
              className="relative hover:opacity-80 transition-opacity mt-1.5"
              title="Chat Penjual"
            >
              <MessageCircle className="w-7 h-7 text-shopee-orange" />
            </button>

          {/* Cart Icon */}
          <Link href="/cart" className="relative hover:opacity-80 transition-opacity mt-1.5">
            <ShoppingCart className="w-7 h-7 text-shopee-orange" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-white text-shopee-orange text-[10px] font-bold w-4 h-4 rounded-full border border-shopee-orange flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden bg-shopee-orange px-3 py-2.5 flex items-center gap-3">
        <button className="text-white p-1" onClick={() => setMenuOpen(true)} aria-label="Menu">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        </button>
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Cari produk..."
            className="w-full py-2 px-3 pr-10 rounded-sm bg-white/95 text-sm text-shopee-text outline-none placeholder:text-[#757575]"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
          />
          <button
            className="absolute right-2.5 top-1/2 -translate-y-1/2"
            onClick={() => handleSearch()}
          >
            <Search className="w-4 h-4 text-shopee-text-secondary" />
          </button>

          {/* Mobile Search Suggestions */}
          {searchFocused && (
            <div className="absolute top-full left-0 right-0 bg-white shadow-lg border border-shopee-border mt-1 z-50 rounded-sm max-h-[420px] overflow-y-auto">
              {!searchValue.trim() ? (
                <div className="p-2">
                  <p className="text-xs text-shopee-text-secondary px-2 py-1">Pencarian Populer</p>
                  {(popularSearches.length > 0 ? popularSearches : ["kaos polos", "sepatu sneakers", "headphone bluetooth", "powerbank", "jam tangan", "hoodie", "tas ransel"]).map((s) => (
                    <button
                      key={s}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSearch(s)}
                      className="w-full text-left px-2 py-1.5 hover:bg-shopee-orange-light cursor-pointer text-sm text-shopee-text rounded flex items-center gap-2"
                    >
                      <Search className="w-3.5 h-3.5 text-shopee-text-secondary flex-shrink-0" />
                      <span className="truncate">{s}</span>
                    </button>
                  ))}
                </div>
              ) : searchLoading ? (
                <div className="p-4 flex items-center justify-center gap-2 text-shopee-text-secondary">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-xs">Mencari produk...</span>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="p-2">
                  <p className="text-xs text-shopee-text-secondary px-2 py-1">Rekomendasi Produk</p>
                  {searchResults.map((p) => (
                    <Link
                      key={p.id}
                      href={`/product/${p.id}-${toSlug(p.name)}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setSearchFocused(false)}
                      className="flex items-center gap-3 px-2 py-2 hover:bg-shopee-orange-light rounded cursor-pointer"
                    >
                      <div className="w-10 h-10 bg-shopee-gray rounded-sm overflow-hidden flex-shrink-0">
                        <img src={p.image || NO_IMAGE_PLACEHOLDER} alt={p.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-shopee-text truncate">{p.name}</p>
                        <p className="text-xs text-shopee-orange font-medium">{formatPrice(p.price)}</p>
                      </div>
                    </Link>
                  ))}
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSearch()}
                    className="w-full text-center py-2 text-xs text-shopee-orange hover:underline mt-1"
                  >
                    Lihat semua hasil untuk &quot;{searchValue.trim()}&quot;
                  </button>
                </div>
              ) : (
                <div className="p-6 text-center">
                  <Search className="w-8 h-8 mx-auto text-shopee-text-secondary mb-2" />
                  <p className="text-sm text-shopee-text-secondary">Produk yang kamu cari tidak ditemukan</p>
                  <p className="text-xs text-shopee-text-secondary mt-0.5">Coba kata kunci lain</p>
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSearch()}
                    className="mt-2 text-xs text-shopee-orange hover:underline"
                  >
                    Cari &quot;{searchValue.trim()}&quot; di halaman pencarian
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <Link href="/cart" className="relative text-white p-1">
          <ShoppingCart className="w-6 h-6" />
          {cartCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-white text-shopee-orange text-[9px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </Link>
      </div>

      {/* Mobile Menu Drawer */}
      {menuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-[70]"
            onClick={() => setMenuOpen(false)}
          />
          {/* Drawer Panel */}
          <div className="lg:hidden fixed top-0 left-0 bottom-0 w-[280px] bg-white z-[80] shadow-xl flex flex-col">
            {/* Drawer Header */}
            <div className="bg-shopee-orange px-4 py-3 flex items-center justify-between">
              <span className="text-white font-medium text-sm">Menu</span>
              <button onClick={() => setMenuOpen(false)} className="text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-4 gap-0 border-b border-shopee-border">
              <Link href="/" onClick={() => setMenuOpen(false)} className="flex flex-col items-center gap-1 py-3 hover:bg-shopee-gray transition-colors">
                <Home className="w-5 h-5 text-shopee-orange" />
                <span className="text-[10px] text-shopee-text">Beranda</span>
              </Link>
              <Link href="/cart" onClick={() => setMenuOpen(false)} className="flex flex-col items-center gap-1 py-3 hover:bg-shopee-gray transition-colors">
                <ShoppingBag className="w-5 h-5 text-shopee-orange" />
                <span className="text-[10px] text-shopee-text">Keranjang</span>
              </Link>
              <Link href="/search?q=flash+sale" onClick={() => setMenuOpen(false)} className="flex flex-col items-center gap-1 py-3 hover:bg-shopee-gray transition-colors">
                <Grid3X3 className="w-5 h-5 text-shopee-orange" />
                <span className="text-[10px] text-shopee-text">Flash Sale</span>
              </Link>
              <button className="flex flex-col items-center gap-1 py-3 hover:bg-shopee-gray transition-colors">
                <User className="w-5 h-5 text-shopee-orange" />
                <span className="text-[10px] text-shopee-text">Saya</span>
              </button>
            </div>

            {/* Categories */}
            <div className="flex-1 overflow-y-auto">
              <p className="px-4 py-2 text-xs font-medium text-shopee-text-secondary bg-shopee-gray">KATEGORI</p>
              {categories.map((cat) => (
                <Link
                  key={cat.name}
                  href={cat.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-between px-4 py-3 border-b border-shopee-border/50 hover:bg-shopee-gray transition-colors"
                >
                  <span className="text-sm text-shopee-text">{cat.name}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-shopee-text-secondary">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </Link>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t border-shopee-border p-3">
              <button className="flex items-center gap-2 text-xs text-shopee-text-secondary hover:text-shopee-orange transition-colors">
                <HelpCircle className="w-4 h-4" />
                Bantuan &amp; Panduan
              </button>
            </div>
          </div>
        </>
      )}
      {showLoginModal && (
        <LoginModal open={showLoginModal} onClose={() => setShowLoginModal(false)} />
      )}
    </header>
  );
}
