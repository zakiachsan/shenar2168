'use client';

import { useState, useEffect, use } from 'react';
import {
  ArrowLeft,
  Save,
  Trash2,
  X,
  Loader2,
  Tag,
  Check,
} from 'lucide-react';
import Link from 'next/link';
import NumberInput from '@/app/components/ui/NumberInput';

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
  enabled: boolean;
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

export default function EditCouponPage({ searchParams }: { searchParams: Promise<{ id: string }> }) {
  const { id } = use(searchParams);
  const couponId = Number(id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Form state
  const [code, setCode] = useState('');
  const [couponType, setCouponType] = useState<'cart' | 'product'>('cart');
  const [discountMode, setDiscountMode] = useState<'fixed' | 'percent'>('fixed');
  const [amount, setAmount] = useState('');
  const [minPurchase, setMinPurchase] = useState('');
  const [maxDiscount, setMaxDiscount] = useState('');
  const [dateExpires, setDateExpires] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    loadCoupon();
  }, [couponId]);

  const loadCoupon = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/coupons');
      if (res.ok) {
        const data = await res.json();
        const coupons = Array.isArray(data.coupons) ? data.coupons : [];
        const coupon = coupons.find((c: Coupon) => c.id === couponId);
        if (!coupon) {
          setError('Kupon tidak ditemukan');
          return;
        }
        populateForm(coupon);
      }
    } catch (err) {
      setError('Gagal memuat kupon');
    } finally {
      setLoading(false);
    }
  };

  const populateForm = (coupon: Coupon) => {
    setCode(coupon.code || '');
    setAmount(coupon.amount || '');
    setMinPurchase(coupon.minimum_amount || '');
    setMaxDiscount(coupon.maximum_amount || '');
    setUsageLimit(coupon.usage_limit ? String(coupon.usage_limit) : '');
    setEnabled(coupon.enabled !== false);

    // Map discount_type
    if (coupon.discount_type === 'percent') {
      setDiscountMode('percent');
    } else {
      setDiscountMode('fixed');
    }

    // Map coupon type (cart vs product)
    if (coupon.product_ids && coupon.product_ids.length > 0) {
      setCouponType('product');
    } else {
      setCouponType('cart');
    }

    // Date
    if (coupon.date_expires) {
      const d = new Date(coupon.date_expires);
      setDateExpires(d.toISOString().split('T')[0]);
    } else {
      setDateExpires('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      let discount_type = 'fixed_cart';
      if (couponType === 'cart' && discountMode === 'percent') discount_type = 'percent';
      else if (couponType === 'product' && discountMode === 'fixed') discount_type = 'fixed_product';
      else if (couponType === 'product' && discountMode === 'percent') discount_type = 'percent';

      const payload: any = {
        id: couponId,
        code: code.toUpperCase().trim(),
        discount_type,
        amount: String(amount || '0'),
        enabled,
      };

      if (minPurchase) payload.minimum_amount = String(minPurchase);
      if (maxDiscount && discountMode === 'percent') payload.maximum_amount = String(maxDiscount);
      if (dateExpires) payload.date_expires = dateExpires;
      if (usageLimit) payload.usage_limit = Number(usageLimit);

      const res = await fetch('/api/admin/coupons', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Gagal menyimpan kupon');
        setSaving(false);
        return;
      }

      window.location.href = '/admin/coupons?saved=1';
      setSaving(false);
    } catch (err: any) {
      setError('Terjadi kesalahan: ' + err.message);
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/admin/coupons?id=${couponId}`, { method: 'DELETE' });
      if (res.ok) {
        window.location.href = '/admin/coupons';
      }
    } catch (err) {
      setError('Gagal menghapus kupon');
    }
    setDeleteConfirm(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="inline-flex items-center gap-2 text-sm text-gray-400">
          <div className="animate-spin w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full" />
          Memuat kupon...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/coupons"
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Edit Kupon</h1>
          <p className="text-sm text-gray-500 mt-1">Ubah detail kupon {code}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDeleteConfirm(true)}
            className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
            title="Hapus kupon"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-600">
          {success}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        {/* Status Toggle */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div>
            <p className="text-sm font-medium text-gray-900">Status Kupon</p>
            <p className="text-xs text-gray-500">Aktifkan atau nonaktifkan kupon</p>
          </div>
          <button
            type="button"
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              enabled ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

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
        </div>

        {/* Maksimal Potongan */}
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

        {/* Actions */}
        <div className="flex gap-3 pt-3">
          <Link
            href="/admin/coupons"
            className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors text-center"
          >
            Batal
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
          >
            {saving ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Simpan Perubahan
              </>
            )}
          </button>
        </div>
      </form>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setDeleteConfirm(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Hapus Kupon?</h3>
            <p className="text-sm text-gray-500 mb-6">
              Kupon <strong>{code}</strong> akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
