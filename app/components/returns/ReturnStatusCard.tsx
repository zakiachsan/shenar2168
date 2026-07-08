'use client';

import { useState } from 'react';
import { RotateCcw, Truck, PackageCheck, CheckCircle, XCircle, Clock, ArrowRight } from 'lucide-react';

interface ReturnData {
  id: number;
  orderId: number;
  reason: string;
  unboxingVideoUrl: string | null;
  returnTrackingNumber: string | null;
  returnCourier: string | null;
  refundAmount: number;
  status: 'requested' | 'shipped' | 'received' | 'completed' | 'rejected';
  adminNotes: string | null;
  items: { productName: string; quantity: number; price: number }[];
  createdAt: string;
  updatedAt: string;
}

interface ReturnStatusCardProps {
  returnData: ReturnData | null;
  onRefresh: () => void;
  orderId: number;
}

const STATUS_CONFIG: Record<string, { icon: any; label: string; color: string; bg: string }> = {
  requested: { icon: RotateCcw, label: 'Retur Diajukan', color: 'text-orange-600', bg: 'bg-orange-50' },
  shipped: { icon: Truck, label: 'Barang Dikirim Balik', color: 'text-blue-600', bg: 'bg-blue-50' },
  received: { icon: PackageCheck, label: 'Barang Diterima Penjual', color: 'text-indigo-600', bg: 'bg-indigo-50' },
  completed: { icon: CheckCircle, label: 'Retur Selesai', color: 'text-green-600', bg: 'bg-green-50' },
  rejected: { icon: XCircle, label: 'Retur Ditolak', color: 'text-gray-500', bg: 'bg-gray-100' },
};

export default function ReturnStatusCard({ returnData, onRefresh, orderId }: ReturnStatusCardProps) {
  const [showTrackingForm, setShowTrackingForm] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [courier, setCourier] = useState('');
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  if (!returnData) return null;

  const config = STATUS_CONFIG[returnData.status] || STATUS_CONFIG.requested;
  const Icon = config.icon;

  const handleSubmitTracking = async () => {
    if (!trackingNumber.trim()) {
      setError('Nomor resi diperlukan');
      return;
    }
    if (!courier.trim()) {
      setError('Nama ekspedisi diperlukan');
      return;
    }
    setUpdating(true);
    setError('');
    try {
      const res = await fetch(`/api/returns/${returnData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnTrackingNumber: trackingNumber.trim(),
          returnCourier: courier.trim(),
        }),
      });
      if (res.ok) {
        setShowTrackingForm(false);
        onRefresh();
      } else {
        const data = await res.json();
        setError(data.error || 'Gagal mengupdate resi');
      }
    } catch (err: any) {
      setError('Terjadi kesalahan: ' + err.message);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="bg-white lg:rounded-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
          <Icon className={`w-4 h-4 ${config.color}`} />
          Status Retur
        </h3>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${config.bg} ${config.color}`}>
          {config.label}
        </span>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-1">
        {['requested', 'shipped', 'received', 'completed'].map((step, idx) => {
          const stepConfig = STATUS_CONFIG[step];
          const StepIcon = stepConfig.icon;
          const isActive = returnData.status === step;
          const isDone =
            ['requested', 'shipped', 'received', 'completed'].indexOf(returnData.status) >
            ['requested', 'shipped', 'received', 'completed'].indexOf(step);

          return (
            <div key={step} className="flex-1 flex items-center">
              <div className={`flex flex-col items-center gap-1 ${isActive || isDone ? '' : 'opacity-40'}`}>
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center ${
                    isActive
                      ? 'bg-orange-500 text-white'
                      : isDone
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  <StepIcon className="w-3.5 h-3.5" />
                </div>
                <span className="text-[9px] text-gray-500 text-center leading-tight">{stepConfig.label}</span>
              </div>
              {idx < 3 && (
                <div className={`flex-1 h-0.5 mx-0.5 ${isDone ? 'bg-green-500' : 'bg-gray-200'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Reason */}
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-xs text-gray-500 mb-1">Alasan Retur</p>
        <p className="text-sm text-gray-800">{returnData.reason}</p>
      </div>

      {/* Unboxing Video Link */}
      {returnData.unboxingVideoUrl && (
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">Video Unboxing</p>
          <a
            href={returnData.unboxingVideoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline break-all"
          >
            {returnData.unboxingVideoUrl}
          </a>
        </div>
      )}

      {/* Returned Items */}
      {returnData.items?.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-2">Produk Diretur</p>
          <div className="space-y-1.5">
            {returnData.items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-gray-700">
                  {item.productName} ×{item.quantity}
                </span>
                <span className="text-gray-600">
                  {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(item.price * item.quantity)}
                </span>
              </div>
            ))}
            {returnData.refundAmount > 0 && (
              <div className="flex justify-between text-sm font-semibold pt-1.5 mt-1.5 border-t border-gray-200">
                <span className="text-gray-700">Refund</span>
                <span className="text-green-600">
                  {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(returnData.refundAmount)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tracking Info */}
      {returnData.returnTrackingNumber && (
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-xs text-blue-600 font-medium mb-1">Resi Pengiriman Balik</p>
          <p className="text-sm text-blue-800 font-mono">{returnData.returnTrackingNumber}</p>
          {returnData.returnCourier && (
            <p className="text-xs text-blue-600 mt-0.5">Ekspedisi: {returnData.returnCourier}</p>
          )}
        </div>
      )}

      {/* Input Tracking (if requested) */}
      {returnData.status === 'requested' && !showTrackingForm && (
        <button
          onClick={() => setShowTrackingForm(true)}
          className="w-full py-2.5 border-2 border-dashed border-orange-300 rounded-lg text-sm text-orange-600 font-medium hover:bg-orange-50 transition-colors flex items-center justify-center gap-2"
        >
          <Truck className="w-4 h-4" />
          Input Resi Pengiriman Balik
        </button>
      )}

      {/* Tracking Form */}
      {showTrackingForm && (
        <div className="bg-orange-50 rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium text-orange-700">Input Resi Pengiriman Balik</p>
          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}
          <div className="space-y-2">
            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Nomor resi pengiriman"
              className="w-full px-3 py-2 border border-orange-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
            />
            <input
              type="text"
              value={courier}
              onChange={(e) => setCourier(e.target.value)}
              placeholder="Nama Ekspedisi"
              className="w-full px-3 py-2 border border-orange-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setShowTrackingForm(false); setError(''); }}
              className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              onClick={handleSubmitTracking}
              disabled={updating}
              className="flex-1 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 disabled:opacity-50"
            >
              {updating ? 'Menyimpan...' : 'Simpan Resi'}
            </button>
          </div>
        </div>
      )}

      {/* Admin Notes */}
      {returnData.adminNotes && (
        <div className="bg-yellow-50 rounded-lg p-3">
          <p className="text-xs text-yellow-700 font-medium mb-1">Catatan Admin</p>
          <p className="text-sm text-yellow-800">{returnData.adminNotes}</p>
        </div>
      )}
    </div>
  );
}
