'use client';

import { useState } from 'react';
import { X, Upload, Package } from 'lucide-react';

interface ReturnItem {
  orderItemId?: number | null;
  productId: number;
  productName: string;
  image?: string;
  price: number;
  maxQuantity: number;
  quantity: number;
}

interface ReturnFormModalProps {
  orderId: number;
  customerId?: number | null;
  items: ReturnItem[];
  onClose: () => void;
  onSuccess: () => void;
}

const REASONS = [
  { value: 'wrong_item', label: 'Barang tidak sesuai (salah barang)' },
  { value: 'missing_item', label: 'Barang kurang' },
  { value: 'damaged', label: 'Barang rusak/pecah' },
  { value: 'defective', label: 'Barang cacat/tidak berfungsi' },
  { value: 'not_as_described', label: 'Tidak sesuai deskripsi' },
  { value: 'other', label: 'Alasan lainnya' },
];

export default function ReturnFormModal({ orderId, customerId, items, onClose, onSuccess }: ReturnFormModalProps) {
  const [reason, setReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [selectedItems, setSelectedItems] = useState<ReturnItem[]>(
    items.map((item) => ({ ...item, quantity: item.maxQuantity }))
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleQuantityChange = (productId: number, qty: number) => {
    setSelectedItems((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? { ...item, quantity: Math.max(0, Math.min(qty, item.maxQuantity)) }
          : item
      )
    );
  };

  const selectedForReturn = selectedItems.filter((i) => i.quantity > 0);
  const totalRefund = selectedForReturn.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const handleSubmit = async () => {
    const finalReason = reason === 'other' ? otherReason.trim() : REASONS.find((r) => r.value === reason)?.label || '';
    if (!finalReason) {
      setError('Silakan pilih alasan retur');
      return;
    }
    if (finalReason.length < 5) {
      setError('Alasan retur terlalu singkat, minimal 5 karakter');
      return;
    }
    if (selectedForReturn.length === 0) {
      setError('Pilih minimal satu produk untuk diretur');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          customerId,
          reason: finalReason,
          unboxingVideoUrl: videoUrl.trim() || undefined,
          items: selectedForReturn.map((item) => ({
            orderItemId: item.orderItemId || null,
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            price: item.price,
          })),
        }),
      });

      if (res.ok) {
        onSuccess();
      } else {
        const data = await res.json();
        setError(data.error || 'Gagal mengajukan retur');
      }
    } catch (err: any) {
      setError('Terjadi kesalahan: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-lg max-h-[90vh] overflow-y-auto z-10 shadow-xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <h3 className="text-lg font-semibold text-gray-900">Ajukan Retur</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Alasan Retur <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {REASONS.map((r) => (
                <label
                  key={r.value}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    reason === r.value
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-4 h-4 text-orange-500"
                  />
                  <span className="text-sm text-gray-700">{r.label}</span>
                </label>
              ))}
            </div>
            {reason === 'other' && (
              <textarea
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
                placeholder="Jelaskan alasan retur..."
                className="mt-2 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                rows={3}
              />
            )}
          </div>

          {/* Unboxing Video */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Video Unboxing (URL)
            </label>
            <div className="relative">
              <Upload className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=... atau link video"
                className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Upload video unboxing ke YouTube/Google Drive, lalu tempel link-nya di sini
            </p>
          </div>

          {/* Items Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Produk yang Diretur <span className="text-red-500">*</span>
            </label>
            <div className="space-y-3">
              {selectedItems.map((item) => (
                <div
                  key={item.productId}
                  className={`p-3 rounded-lg border transition-colors ${
                    item.quantity > 0 ? 'border-orange-300 bg-orange-50/50' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
                      {item.image ? (
                        <img src={item.image} alt={item.productName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 line-clamp-1">{item.productName}</p>
                      <p className="text-xs text-gray-500">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(item.price)} × maks {item.maxQuantity}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleQuantityChange(item.productId, item.quantity - 1)}
                        disabled={item.quantity <= 0}
                        className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <button
                        onClick={() => handleQuantityChange(item.productId, item.quantity + 1)}
                        disabled={item.quantity >= item.maxQuantity}
                        className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Refund Summary */}
          {selectedForReturn.length > 0 && (
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Estimasi Refund</span>
                <span className="text-base font-bold text-orange-600">
                  {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalRefund)}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {selectedForReturn.length} produk, {selectedForReturn.reduce((s, i) => s + i.quantity, 0)} item
              </p>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-3 bg-orange-500 text-white text-sm font-semibold rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Mengirim...' : 'Kirim Ajuan Retur'}
          </button>
        </div>
      </div>
    </div>
  );
}
