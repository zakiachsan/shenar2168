'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Package,
  ShoppingCart,
  DollarSign,
  Clock,
  TrendingUp,
  ArrowRight,
  Calendar,
} from 'lucide-react';

interface Stats {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  processingOrders: number;
  completedOrders: number;
}

interface Order {
  id: number;
  number: string;
  status: string;
  total: string;
  date_created: string;
  billing: { first_name: string; last_name: string };
  payment_method_title: string;
  line_items: { name: string; quantity: number }[];
}

const STATUS_BADGES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  'on-hold': 'bg-orange-100 text-orange-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  refunded: 'bg-purple-100 text-purple-800',
  failed: 'bg-gray-100 text-gray-800',
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

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    processingOrders: 0,
    completedOrders: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Default date range: last 30 days
  const getDefaultFrom = () => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  };
  const getDefaultTo = () => new Date().toISOString().split('T')[0];

  const [dateFrom, setDateFrom] = useState(getDefaultFrom());
  const [dateTo, setDateTo] = useState(getDefaultTo());

  useEffect(() => {
    loadDashboard();
  }, [dateFrom, dateTo]);

  const loadDashboard = async () => {
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('from', dateFrom + 'T00:00:00');
      params.append('to', dateTo + 'T23:59:59');
      const [statsRes, ordersRes] = await Promise.all([
        fetch(`/api/admin/stats?${params.toString()}`),
        fetch('/api/admin/orders?per_page=10'),
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      } else {
        setError('Gagal memuat data dashboard. Pastikan WooCommerce berjalan.');
      }
      if (ordersRes.ok) {
        const data = await ordersRes.json();
        setRecentOrders(Array.isArray(data) ? data : (data.orders || []));
      }
    } catch (err) {
      console.error('Dashboard load error:', err);
      setError('Tidak dapat terhubung ke server. Periksa koneksi dan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const summaryCards = [
    {
      label: 'Total Produk',
      value: stats.totalProducts,
      icon: Package,
      color: 'bg-blue-500',
      bgLight: 'bg-blue-50',
      textColor: 'text-blue-600',
      href: '/admin/products',
    },
    {
      label: 'Total Pesanan',
      value: stats.totalOrders,
      icon: ShoppingCart,
      color: 'bg-green-500',
      bgLight: 'bg-green-50',
      textColor: 'text-green-600',
      href: '/admin/orders',
    },
    {
      label: 'Pendapatan',
      value: formatCurrency(stats.totalRevenue),
      icon: DollarSign,
      color: 'bg-purple-500',
      bgLight: 'bg-purple-50',
      textColor: 'text-purple-600',
      href: '/admin/orders',
      isFormatted: true
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-lg flex-shrink-0">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-amber-800">Data Tidak Tersedia</h3>
              <p className="text-sm text-amber-600 mt-1">{error}</p>
              <button
                onClick={loadDashboard}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 text-sm rounded-lg transition-colors font-medium"
              >
                🔄 Coba Lagi
              </button>
            </div>
          </div>
        </div>
        {/* Show empty skeleton to maintain layout */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 opacity-50">
          {summaryCards.map((card) => (
            <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-3 sm:p-5">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg ${card.bgLight}`} />
              <div className="mt-2 sm:mt-4"><p className="text-lg sm:text-2xl font-bold text-gray-300">—</p></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Ringkasan aktivitas toko Shenar2168
        </p>
      </div>

      {/* Date Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="text-sm text-gray-700 bg-transparent border-none outline-none focus:ring-0 p-0"
          />
          <span className="text-sm text-gray-400">-</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="text-sm text-gray-700 bg-transparent border-none outline-none focus:ring-0 p-0"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.label}
              onClick={() => router.push(card.href)}
              className="bg-white rounded-xl border border-gray-200 p-3 sm:p-5 hover:shadow-md transition-shadow text-left"
            >
              <div className="flex items-start justify-between">
                <div className={`p-1.5 sm:p-2.5 rounded-lg ${card.bgLight}`}>
                  <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${card.textColor}`} />
                </div>
                <TrendingUp className="w-4 h-4 text-green-500 hidden sm:block" />
              </div>
              <div className="mt-2 sm:mt-4">
                <p className="text-lg sm:text-2xl font-bold text-gray-900 leading-tight">
                  {card.isFormatted ? card.value : card.value.toLocaleString('id-ID')}
                </p>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">{card.label}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Pesanan Terbaru</h2>
          <button
            onClick={() => router.push('/admin/orders')}
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Lihat Semua
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-5 py-3">Pesanan</th>
                <th className="px-5 py-3">Pelanggan</th>
                <th className="px-5 py-3">Total</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Tanggal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-400">
                    Belum ada pesanan
                  </td>
                </tr>
              ) : (
                recentOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/admin/orders/${order.id}`)}
                  >
                    <td className="px-5 py-3 text-sm font-medium text-blue-600">
                      #{order.number || order.id}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-700">
                      {order.billing?.first_name} {order.billing?.last_name || ''}
                    </td>
                    <td className="px-5 py-3 text-sm font-medium text-gray-900">
                      {formatCurrency(parseFloat(order.total))}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_BADGES[order.status] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {STATUS_LABELS[order.status] || order.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">
                      {formatDate(order.date_created)}
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
