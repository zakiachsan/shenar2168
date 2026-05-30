'use client';

import { Suspense } from 'react';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShoppingCart, Eye, Loader2 } from 'lucide-react';

interface OrderItem {
  name: string;
  quantity: number;
}

interface Order {
  id: number;
  number: string;
  status: string;
  total: string;
  date_created: string;
  billing: { first_name: string; last_name: string; email: string };
  payment_method_title: string;
  line_items: OrderItem[];
  _order_code?: string | null;
}

const STATUS_TABS = [
  { value: '', label: 'Semua' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Diproses' },
  { value: 'completed', label: 'Selesai' },
  { value: 'cancelled', label: 'Dibatalkan' },
  { value: 'refunded', label: 'Dikembalikan' },
];

const STATUS_BADGES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-300',
  processing: 'bg-blue-100 text-blue-800 ring-1 ring-blue-300',
  'on-hold': 'bg-orange-100 text-orange-800 ring-1 ring-orange-300',
  completed: 'bg-green-100 text-green-800 ring-1 ring-green-300',
  cancelled: 'bg-red-100 text-red-800 ring-1 ring-red-300',
  refunded: 'bg-purple-100 text-purple-800 ring-1 ring-purple-300',
  failed: 'bg-gray-100 text-gray-800 ring-1 ring-gray-300',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  processing: 'Diproses',
  'on-hold': 'Ditahan',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
  refunded: 'Dikembalikan',
  failed: 'Gagal',
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
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function OrdersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  useEffect(() => {
    loadCounts();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('per_page', '50');
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/admin/orders?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCounts = async () => {
    try {
      const res = await fetch('/api/admin/orders/count');
      if (res.ok) {
        const data = await res.json();
        setCounts(data);
      }
    } catch (err) {
      console.error('Failed to load order counts:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pesanan</h1>
        <p className="text-sm text-gray-500 mt-1">
          Kelola semua pesanan pelanggan
        </p>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {STATUS_TABS.map((tab) => {
          const count = tab.value ? counts[tab.value] : counts['all'];
          return (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors inline-flex items-center gap-1.5 ${
                statusFilter === tab.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {tab.label}
              {typeof count === 'number' && (
                <span
                  className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 text-[11px] font-bold rounded-full ${
                    statusFilter === tab.value
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-5 py-3.5">Pesanan</th>
                <th className="px-5 py-3.5">Kode</th>
                <th className="px-5 py-3.5">Pelanggan</th>
                <th className="px-5 py-3.5">Total</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Pembayaran</th>
                <th className="px-5 py-3.5">Tanggal</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center">
                    <div className="inline-flex items-center gap-2 text-sm text-gray-400">
                      <div className="animate-spin w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full" />
                      Memuat pesanan...
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center">
                    <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-400">Belum ada pesanan</p>
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/admin/orders/${order.id}`)}
                  >
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-medium text-blue-600">
                        #{order.number || order.id}
                      </p>
                      <p className="text-xs text-gray-400">{order.line_items?.length || 0} item</p>
                    </td>
                    <td className="px-5 py-3.5">
                      {order._order_code ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold bg-orange-50 text-orange-700 border border-orange-200">
                          {order._order_code}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-medium text-gray-900">
                        {order.billing?.first_name} {order.billing?.last_name || ''}
                      </p>
                      <p className="text-xs text-gray-400">{order.billing?.email}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(order.total)}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_BADGES[order.status] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {STATUS_LABELS[order.status] || order.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm text-gray-600">{order.payment_method_title || '-'}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm text-gray-500">{formatDate(order.date_created)}</p>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/admin/orders/${order.id}`);
                        }}
                        className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                        title="Detail"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Memuat...</span>
        </div>
      </div>
    }>
      <OrdersContent />
    </Suspense>
  );
}
