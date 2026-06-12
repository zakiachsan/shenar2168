'use client';

import { generateShippingLabelPDF } from '@/lib/generate-shipping-label';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  ShoppingCart,
  MapPin,
  CreditCard,
  User,
  Package,
  Loader2,
  CheckCircle,
  Download,
} from 'lucide-react';

interface OrderDetail {
  id: number;
  number: string;
  status: string;
  total: string;
  subtotal: string;
  shipping_total: string;
  discount_total: string;
  date_created: string;
  date_modified: string;
  payment_method: string;
  payment_method_title: string;
  transaction_id: string;
  customer_note: string;
  billing: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  shipping: {
    first_name: string;
    last_name: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  line_items: {
    id: number;
    name: string;
    product_id: number;
    quantity: number;
    price: number;
    total: string;
    sku: string;
    image?: string;
    variation_id?: number;
    variation_info?: string;
  }[];
  shipping_lines: {
    method_title: string;
    total: string;
  }[];
}

const STATUS_BADGES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-300',
  processing: 'bg-blue-100 text-blue-800 ring-1 ring-blue-300',
  shipped: 'bg-indigo-100 text-indigo-800 ring-1 ring-indigo-300',
  'on-hold': 'bg-orange-100 text-orange-800 ring-1 ring-orange-300',
  completed: 'bg-green-100 text-green-800 ring-1 ring-green-300',
  cancelled: 'bg-red-100 text-red-800 ring-1 ring-red-300',
  refunded: 'bg-purple-100 text-purple-800 ring-1 ring-purple-300',
  failed: 'bg-gray-100 text-gray-800 ring-1 ring-gray-300',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  processing: 'Diproses',
  shipped: 'Dalam Pengiriman',
  'on-hold': 'Ditahan',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
  refunded: 'Dikembalikan',
  failed: 'Gagal',
};

const TRANSITIONS: Record<string, string[]> = {
  pending: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['completed'],
  'on-hold': ['processing', 'cancelled'],
  completed: ['refunded'],
  cancelled: [],
  refunded: [],
  failed: ['pending', 'cancelled'],
};

function formatCurrency(amount: string): string {
  const num = parseFloat(amount);
  if (isNaN(num)) return 'Rp0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [confirmStatus, setConfirmStatus] = useState<string | null>(null);

  useEffect(() => {
    loadOrder();
  }, []);

  const loadOrder = async () => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
      } else {
        setError('Pesanan tidak ditemukan');
      }
    } catch (err) {
      setError('Gagal memuat pesanan');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    setUpdating(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        const data = await res.json();
        setOrder(data);
      } else {
        const errData = await res.json();
        setError(errData.error || 'Gagal mengupdate status');
      }
    } catch (err: any) {
      setError('Terjadi kesalahan: ' + err.message);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Memuat pesanan...</span>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-16">
        <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-400 text-sm">Pesanan tidak ditemukan</p>
        <button
          onClick={() => router.push('/admin/orders')}
          className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Kembali ke daftar pesanan
        </button>
      </div>
    );
  }

  const availableTransitions = TRANSITIONS[order.status] || [];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">
                Pesanan #{order.number || order.id}
              </h1>
              <span
                className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  STATUS_BADGES[order.status] || 'bg-gray-100 text-gray-800'
                }`}
              >
                {STATUS_LABELS[order.status] || order.status}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Dibuat: {formatDate(order.date_created)}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-5 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-gray-400" />
                Item Pesanan
              </h2>
            </div>
            <div className="divide-y divide-gray-100">
              {order.line_items.map((item) => (
                <div key={item.id} className="p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 line-clamp-1">{item.name}</p>
                    {item.variation_info && (
                      <p className="text-xs text-orange-600 mt-0.5">{item.variation_info}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">
                      Qty: {item.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      {formatCurrency(item.total)}
                    </p>
                    <p className="text-xs text-gray-400">
                      @{formatCurrency(String(item.price))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-5 border-t border-gray-100 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="text-gray-700">{formatCurrency(order.subtotal || '0')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Ongkos Kirim</span>
                <span className="text-gray-700">{formatCurrency(order.shipping_total || '0')}</span>
              </div>
              {order.discount_total && parseFloat(order.discount_total) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Diskon</span>
                  <span className="text-green-600">-{formatCurrency(order.discount_total)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-100">
                <span className="text-gray-900">Total</span>
                <span className="text-gray-900">{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Customer Note */}
          {order.customer_note && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Catatan Pelanggan</h3>
              <p className="text-sm text-gray-600">{order.customer_note}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Update */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-gray-400" />
              Update Status
            </h2>
            {availableTransitions.length === 0 ? (
              <p className="text-xs text-gray-400">
                Tidak ada transisi status yang tersedia
              </p>
            ) : (
              <div className="space-y-2">
                {availableTransitions.map((newStatus) => {
                  const label =
                    newStatus === 'shipped'
                      ? 'Siap Dikirim'
                      : newStatus === 'completed'
                      ? 'Selesaikan Pesanan'
                      : newStatus === 'cancelled'
                      ? 'Batalkan Pesanan'
                      : `Tandai ${STATUS_LABELS[newStatus] || newStatus}`;
                  return (
                    <button
                      key={newStatus}
                      onClick={() => setConfirmStatus(newStatus)}
                      disabled={updating}
                      className={`w-full px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                        newStatus === 'cancelled'
                          ? 'bg-red-50 text-red-600 hover:bg-red-100'
                          : newStatus === 'completed'
                          ? 'bg-green-50 text-green-600 hover:bg-green-100'
                          : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Billing */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" />
              Informasi Tagihan
            </h2>
            <div className="space-y-1.5 text-sm">
              <p className="text-gray-900 font-medium">
                {order.billing?.first_name} {order.billing?.last_name}
              </p>
              <p className="text-gray-500">{order.billing?.phone}</p>
              {order.billing?.address_1 && (
                <p className="text-gray-500 text-xs mt-2">
                  {order.billing.address_1}
                </p>
              )}
              {order.customer_note && (
                <p className="text-xs text-orange-600 mt-2 bg-orange-50 rounded px-2 py-1">
                  Catatan: {order.customer_note}
                </p>
              )}
            </div>
          </div>

          {/* Shipping */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              Pengiriman
            </h2>
            <div className="space-y-1.5 text-sm">
              <p className="text-gray-900 font-medium">
                {order.shipping?.first_name} {order.shipping?.last_name}
              </p>
              {order.shipping?.address_1 && (
                <p className="text-gray-500 text-xs">
                  {order.shipping.address_1}, {order.shipping.city}, {order.shipping.state} {order.shipping.postcode}
                </p>
              )}
              {order.shipping_lines?.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
                  {order.shipping_lines.map((sl, i) => (
                    <div key={i} className="flex justify-between">
                      <span className="text-gray-500">{sl.method_title}</span>
                      <span className="font-medium text-gray-700">{formatCurrency(sl.total)}</span>
                    </div>
                  ))}
                </div>
              )}
              {(order as any).waybill_id && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-400">No. Resi</p>
                  <p className="text-sm font-mono font-semibold text-gray-900">{(order as any).waybill_id}</p>
                </div>
              )}
            </div>

            {/* Download Resi Button - only when shipped + waybill exists */}
            {order.status === "shipped" && (order as any).waybill_id && (
            <button
              onClick={() => {
                const courierName = order.shipping_lines?.[0]?.method_title || '';
                generateShippingLabelPDF({
                  storeName: 'Shenar2168',
                  orderNumber: order.number || String(order.id),
                  courierName: courierName,
                  courierService: courierName,
                  waybillId: (order as any).waybill_id || '',
                  recipientName: order.shipping?.first_name ? `${order.shipping.first_name} ${order.shipping.last_name || ''}`.trim() : order.billing?.first_name ? `${order.billing.first_name} ${order.billing.last_name || ''}`.trim() : 'Pembeli',
                  recipientPhone: order.billing?.phone || '',
                  recipientAddress: order.shipping?.address_1 || order.billing?.address_1 || '',
                  recipientCity: order.shipping?.city || '',
                  recipientPostalCode: order.shipping?.postcode || '',
                  senderName: 'Shenar2168 Official Store',
                  senderPhone: '081234567890',
                  senderAddress: 'Pantai Indah Kapuk, Jakarta Utara',
                  senderCity: 'Jakarta Utara',
                  senderPostalCode: '14470',
                  weight: 0,
                  codAmount: 0,
                  items: order.line_items?.map(item => ({
                    name: item.name,
                    sku: item.sku,
                    variation: item.variation_info || '',
                    quantity: item.quantity,
                  })) || [],
                });
              }}
              className="mt-3 w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download Resi
            </button>
            )}
          </div>

          {/* Payment */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-gray-400" />
              Pembayaran
            </h2>
            <div className="space-y-1.5 text-sm">
              <p className="text-gray-700">{order.payment_method_title || order.payment_method}</p>
              {order.transaction_id && (
                <p className="text-xs text-gray-400">
                  Transaksi: {order.transaction_id}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setConfirmStatus(null)}
          />
          {/* Modal Card */}
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6 z-10">
            <div className="text-center">
              {confirmStatus === 'cancelled' ? (
                <>
                  <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Batalkan Pesanan?
                  </h3>
                  <p className="text-sm text-gray-500 mb-6">
                    Tindakan ini tidak dapat diburukkan.
                  </p>
                </>
              ) : confirmStatus === 'shipped' ? (
                <>
                  <div className="mx-auto w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Tandai Pesanan Siap Dikirim?
                  </h3>
                  <p className="text-sm text-gray-500 mb-6">
                    Status akan berubah ke Dalam Pengiriman.
                  </p>
                </>
              ) : (
                <>
                  <div className="mx-auto w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Konfirmasi Perubahan Status
                  </h3>
                  <p className="text-sm text-gray-500 mb-6">
                    Anda yakin ingin mengubah status ke <span className="font-medium text-gray-700">{STATUS_LABELS[confirmStatus] || confirmStatus}</span>?
                  </p>
                </>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmStatus(null)}
                  disabled={updating}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    updateStatus(confirmStatus);
                    setConfirmStatus(null);
                  }}
                  disabled={updating}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                    confirmStatus === 'cancelled'
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {updating ? 'Memproses...' : 'Konfirmasi'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
