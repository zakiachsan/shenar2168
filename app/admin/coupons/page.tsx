'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Search,
  Trash2,
  X,
  Check,
  Loader2,
  TicketPercent,
  Tag,
  ShoppingBag,
  Percent,
  Banknote,
} from 'lucide-react';
import NumberInput from '@/app/components/ui/NumberInput';

interface Product {
  id: number;
  name: string;
  regular_price: string;
  images?: { src: string }[];
}

interface Coupon {
  id: number;
  code: string;
  discount_type: string;
  amount: string;
  minimum_amount: string;
  maximum_amount: string;
  product_ids: number[];
  usage_count: number;
  usage_limit: number | null;
  date_expires: string | null;
}

const COUPON_TYPES = [
  { value: 'cart', label: 'Potongan saat Checkout' },
  { value: 'product', label: 'Potongan per Produk' },
];

const DISCOUNT_MODES = [
  { value: 'fixed', label: 'Nominal Tetap' },
  { value: 'percent', label: 'Persentase' },
];

function formatCurrency(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return 'Rp0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function getCouponTypeLabel(discountType: string, productIds: number[]): string {
  if (discountType === 'fixed_product') return 'Per Produk';
  if (discountType === 'fixed_cart') return 'Checkout';
  if (discountType === 'percent' && productIds?.length > 0) return 'Per Produk';
  return 'Checkout';
}

function getDiscountModeLabel(discountType: string): string {
  if (discountType === 'percent' || discountType === 'fixed_percent') return 'Persentase';
  return 'Nominal';
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Form state
  const [code, setCode] = useState('');
  const [couponType, setCouponType] = useState<'cart' | 'product'>('cart');
  const [discountMode, setDiscountMode] = useState<'fixed' | 'percent'>('fixed');
  const [amount, setAmount] = useState('');
  const [minPurchase, setMinPurchase] = useState('');
  const [maxDiscount, setMaxDiscount] = useState('');
  const [dateExpires, setDateExpires] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [productSearch, setProductSearch] = useState('');

  useEffect(() => {
    loadCoupons();
    loadProducts();
  }, []);

  const loadCoupons = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      params.set('per_page', '50');
      const res = await fetch(`/api/admin/coupons?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCoupons(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load coupons:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const res = await fetch('/api/admin/products?per_page=100&status=publish');
      if (res.ok) {
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadCoupons();
  };

  const openAdd = () => {
    setCode('');
    setCouponType('cart');
    setDiscountMode('fixed');
    setAmount('');
    setMinPurchase('');
    setMaxDiscount('');
    setDateExpires('');
    setUsageLimit('');
    setSelectedProducts([]);
    setProductSearch('');
    setError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      // Map to WooCommerce discount_type
      let discount_type = 'fixed_cart';
      if (couponType === 'cart' && discountMode === 'percent') discount_type = 'percent';
      else if (couponType === 'product' && discountMode === 'fixed') discount_type = 'fixed_product';
      else if (couponType === 'product' && discountMode === 'percent') discount_type = 'percent_product';

      const payload: any = {
        code: code.toUpperCase().trim(),
        discount_type,
        amount: String(amount || '0'),
      };

      if (minPurchase) payload.minimum_amount = String(minPurchase);
      if (maxDiscount && discountMode === 'percent') payload.maximum_amount = String(maxDiscount);
      if (dateExpires) payload.date_expires = dateExpires;
      if (usageLimit) payload.usage_limit = Number(usageLimit);
      if (couponType === 'product' && selectedProducts.length > 0) {
        payload.product_ids = selectedProducts;
      }

      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Gagal membuat kupon');
        setSaving(false);
        return;
      }

      closeModal();
      loadCoupons();
    } catch (err: any) {
      setError('Terjadi kesalahan: ' + err.message);
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/coupons?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCoupons((prev) => prev.filter((c) => c.id !== id));
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
    setDeleteConfirm(null);
  };

  const formatDiscount = (coupon: Coupon): string => {
    const isPercent = coupon.discount_type === 'percent';
    if (isPercent) {
      return `${coupon.amount}%`;
    }
    return formatCurrency(coupon.amount);
  };

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products.slice(0, 20);
    const q = productSearch.toLowerCase();
    return products
      .filter((p) => p.name.toLowerCase().includes(q))
      .slice(0, 20);
  }, [products, productSearch]);

  const toggleProduct = (id: number) => {
    setSelectedProducts((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kupon & Voucher</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola kupon diskon toko</p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Buat Kupon
        </button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kupon..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 bg-white"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
        >
          Cari
        </button>
      </form>

      {/* Coupons Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-5 py-3.5">Kode</th>
                <th className="px-5 py-3.5">Tipe</th>
                <th className="px-5 py-3.5">Mode</th>
                <th className="px-5 py-3.5">Nilai</th>
                <th className="px-5 py-3.5">Min. Belanja</th>
                <th className="px-5 py-3.5">Maks. Diskon</th>
                <th className="px-5 py-3.5">Penggunaan</th>
                <th className="px-5 py-3.5">Kadaluarsa</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center">
                    <div className="inline-flex items-center gap-2 text-sm text-gray-400">
                      <div className="animate-spin w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full" />
                      Memuat kupon...
                    </div>
                  </td>
                </tr>
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center">
                    <TicketPercent className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-400">Belum ada kupon</p>
                    <button
                      onClick={openAdd}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Buat kupon pertama
                    </button>
                  </td>
                </tr>
              ) : (
                coupons.map((coupon) => (
                  <tr key={coupon.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                          <Tag className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{coupon.code}</p>
                          <p className="text-xs text-gray-400">ID: {coupon.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                        {getCouponTypeLabel(coupon.discount_type, coupon.product_ids)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                        {coupon.discount_type === 'percent' || coupon.discount_type === 'fixed_percent' ? (
                          <Percent className="w-3 h-3" />
                        ) : (
                          <Banknote className="w-3 h-3" />
                        )}
                        {getDiscountModeLabel(coupon.discount_type)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-medium text-gray-900">{formatDiscount(coupon)}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm text-gray-700">
                        {coupon.minimum_amount ? formatCurrency(coupon.minimum_amount) : '-'}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm text-gray-700">
                        {coupon.maximum_amount ? formatCurrency(coupon.maximum_amount) : '-'}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm text-gray-700">
                        {coupon.usage_count ?? 0}
                        {coupon.usage_limit ? ` / ${coupon.usage_limit}` : ' kali'}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm text-gray-600">
                        {coupon.date_expires
                          ? new Date(coupon.date_expires).toLocaleDateString('id-ID')
                          : '-'}
                      </p>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {deleteConfirm === coupon.id ? (
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(coupon.id)}
                            className="px-2.5 py-1.5 bg-red-50 text-red-600 rounded text-xs font-medium hover:bg-red-100"
                          >
                            Hapus
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="px-2.5 py-1.5 bg-gray-100 text-gray-600 rounded text-xs font-medium hover:bg-gray-200"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(coupon.id)}
                          className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={closeModal} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Buat Kupon Baru</h2>
              <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              {/* Kode Kupon */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Kode Kupon <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                  placeholder="CONTOH-KUPON"
                  required
                />
              </div>

              {/* Tipe Diskon */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipe Diskon</label>
                <div className="grid grid-cols-2 gap-2">
                  {COUPON_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setCouponType(t.value as 'cart' | 'product')}
                      className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-colors text-left ${
                        couponType === t.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mode Diskon */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Mode Diskon</label>
                <div className="grid grid-cols-2 gap-2">
                  {DISCOUNT_MODES.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setDiscountMode(m.value as 'fixed' | 'percent')}
                      className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-colors text-left ${
                        discountMode === m.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nilai */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {discountMode === 'percent' ? 'Persentase Diskon' : 'Nominal Diskon'}{' '}
                  <span className="text-red-500">*</span>
                </label>
                <NumberInput
                  value={amount}
                  onChange={setAmount}
                  placeholder={discountMode === 'percent' ? '10' : '50000'}
                  min={0}
                  suffix={discountMode === 'percent' ? '%' : 'Rp'}
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  {discountMode === 'percent'
                    ? 'Masukkan angka persentase (contoh: 10 untuk 10%)'
                    : 'Masukkan jumlah potongan dalam Rupiah'}
                </p>
              </div>

              {/* Maksimal Potongan (hanya persentase) */}
              {discountMode === 'percent' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Maksimal Potongan
                  </label>
                  <NumberInput
                    value={maxDiscount}
                    onChange={setMaxDiscount}
                    placeholder="Kosongkan untuk tidak dibatasi"
                    min={0}
                    suffix="Rp"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Batas maksimal diskon yang bisa didapat meski persentasenya besar
                  </p>
                </div>
              )}

              {/* Minimum Pembelian */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Minimum Pembelian
                </label>
                <NumberInput
                  value={minPurchase}
                  onChange={setMinPurchase}
                  placeholder="Kosongkan untuk tanpa minimum"
                  min={0}
                  suffix="Rp"
                />
              </div>

              {/* Product Picker (hanya per produk) */}
              {couponType === 'product' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Produk Eligible <span className="text-red-500">*</span>
                  </label>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="p-2 border-b border-gray-100 bg-gray-50">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input
                          type="text"
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          placeholder="Cari produk..."
                          className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto p-2 space-y-1">
                      {filteredProducts.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-3">Produk tidak ditemukan</p>
                      ) : (
                        filteredProducts.map((product) => {
                          const selected = selectedProducts.includes(product.id);
                          return (
                            <button
                              key={product.id}
                              type="button"
                              onClick={() => toggleProduct(product.id)}
                              className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-left text-sm transition-colors ${
                                selected
                                  ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                  : 'hover:bg-gray-50 text-gray-700 border border-transparent'
                              }`}
                            >
                              <div
                                className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                                  selected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                                }`}
                              >
                                {selected && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <div className="w-8 h-8 rounded bg-gray-100 flex-shrink-0 overflow-hidden">
                                {product.images?.[0]?.src ? (
                                  <img
                                    src={product.images[0].src}
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <ShoppingBag className="w-4 h-4 text-gray-400 m-1.5" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="truncate font-medium">{product.name}</p>
                                <p className="text-xs text-gray-400">
                                  {formatCurrency(product.regular_price || '0')}
                                </p>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                    {selectedProducts.length > 0 && (
                      <div className="px-3 py-2 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
                        {selectedProducts.length} produk dipilih
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tanggal Kadaluarsa */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Tanggal Kadaluarsa
                </label>
                <input
                  type="date"
                  value={dateExpires}
                  onChange={(e) => setDateExpires(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Batas Penggunaan */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Batas Penggunaan
                </label>
                <NumberInput
                  value={usageLimit}
                  onChange={setUsageLimit}
                  placeholder="Kosongkan untuk tidak terbatas"
                  min={1}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving || (couponType === 'product' && selectedProducts.length === 0)}
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  {saving ? 'Menyimpan...' : 'Buat Kupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
