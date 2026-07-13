'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Loader2,
  Users,
  X,
  Phone,
  ShoppingBag,
  Wallet,
  User,
  Star,
  MessageCircle,
  Package,
  ChevronDown,
  ChevronUp,
  MapPin,
} from 'lucide-react';

interface Customer {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  billing?: {
    phone?: string;
    city?: string;
    address_1?: string;
    postcode?: string;
    state?: string;
  };
  shipping?: {
    phone?: string;
  };
  avatar_url?: string;
}

interface Order {
  id: number;
  number: string;
  status: string;
  total: string;
  date_created: string;
  customer_id: number;
  billing: { first_name: string; last_name: string; city?: string };
  line_items: { name: string; quantity: number }[];
}

interface Review {
  id: number;
  product_id: number;
  product_name: string;
  reviewer: string;
  reviewer_email: string;
  review: string;
  rating: number;
  date_created: string;
  status: string;
}

interface Discussion {
  id: number;
  productId: number;
  question: string;
  askedBy: string;
  askedAt: string;
  answer?: string;
  answeredBy?: string;
  answeredAt?: string;
  status: 'pending' | 'answered';
}

interface CustomerDetail extends Customer {
  orders: Order[];
  reviews: Review[];
  discussions: Discussion[];
  totalSpent: number;
  orderCount: number;
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

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getName(customer: Customer): string {
  const name = `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
  return name || '(Tanpa Nama)';
}

function getPhone(customer: Customer): string {
  return customer.billing?.phone || customer.shipping?.phone || '-';
}

function getFullAddress(customer: Customer): string {
  const parts = [
    customer.billing?.address_1,
    customer.billing?.city,
    customer.billing?.state,
    customer.billing?.postcode,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : '-';
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [detailCustomer, setDetailCustomer] = useState<CustomerDetail | null>(null);
  const [activeTab, setActiveTab] = useState<'orders' | 'reviews' | 'discussions'>('orders');

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [custRes, ordRes, revRes, discRes] = await Promise.all([
        fetch('/api/admin/customers?per_page=50'),
        fetch('/api/admin/orders?per_page=100'),
        fetch('/api/admin/reviews?per_page=100'),
        fetch('/api/admin/discussions'),
      ]);

      const custData = custRes.ok ? await custRes.json() : [];
      const ordData = ordRes.ok ? await ordRes.json() : [];
      const revData = revRes.ok ? await revRes.json() : [];
      const discData = discRes.ok ? await discRes.json() : { discussions: [] };

      setCustomers(Array.isArray(custData) ? custData : []);
      setOrders(Array.isArray(ordData) ? ordData : []);
      setReviews(Array.isArray(revData) ? revData : []);
      setDiscussions(discData.discussions || []);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const enrichedCustomers = useMemo(() => {
    const result: CustomerDetail[] = [];
    for (const c of customers) {
      const custOrders = orders.filter((o) => o.customer_id === c.id);
      const totalSpent = custOrders.reduce((sum, o) => sum + parseFloat(o.total || '0'), 0);
      const custReviews = reviews.filter(
        (r) => r.reviewer_email?.toLowerCase() === c.email?.toLowerCase()
      );
      const custDiscussions = discussions.filter(
        (d) => d.askedBy?.toLowerCase() === getName(c).toLowerCase()
      );

      // Only include customers who have orders
      if (custOrders.length > 0) {
        result.push({
          ...c,
          orders: custOrders.sort((a, b) => new Date(b.date_created).getTime() - new Date(a.date_created).getTime()),
          reviews: custReviews,
          discussions: custDiscussions,
          totalSpent,
          orderCount: custOrders.length,
        });
      }
    }
    return result;
  }, [customers, orders, reviews, discussions]);

  const filteredCustomers = useMemo(() => {
    if (!search.trim()) return enrichedCustomers;
    const q = search.toLowerCase();
    return enrichedCustomers.filter(
      (c) =>
        getName(c).toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        getPhone(c).includes(q)
    );
  }, [enrichedCustomers, search]);

  const openDetail = (customer: CustomerDetail) => {
    setDetailCustomer(customer);
    setActiveTab('orders');
  };

  const closeDetail = () => {
    setDetailCustomer(null);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pelanggan</h1>
        <p className="text-sm text-gray-500 mt-1">
          Kelola data pelanggan yang sudah bertransaksi
        </p>
      </div>

      {/* Search */}
      <form
        onSubmit={(e) => e.preventDefault()}
        className="flex gap-3"
      >
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama pelanggan..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm 
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              placeholder:text-gray-400 bg-white"
          />
        </div>
      </form>

      {/* Customers Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-5 py-3.5">Pelanggan</th>
                <th className="px-5 py-3.5">Total Pesanan</th>
                <th className="px-5 py-3.5">Total Belanja</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-5 py-12 text-center">
                    <div className="inline-flex items-center gap-2 text-sm text-gray-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Memuat pelanggan...
                    </div>
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-5 py-12 text-center">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-400">Belum ada pelanggan yang bertransaksi</p>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => openDetail(customer)}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {customer.avatar_url ? (
                            <img
                              src={customer.avatar_url}
                              alt={getName(customer)}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="w-5 h-5 text-blue-500" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {getName(customer)}
                          </p>
                          <p className="text-xs text-gray-400">ID: {customer.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <ShoppingBag className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-sm text-gray-700">{customer.orderCount}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <Wallet className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrency(customer.totalSpent)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {detailCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={closeDetail} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Detail Pelanggan</h2>
              <button
                onClick={closeDetail}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Profile */}
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center overflow-hidden">
                  {detailCustomer.avatar_url ? (
                    <img
                      src={detailCustomer.avatar_url}
                      alt={getName(detailCustomer)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-7 h-7 text-blue-500" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-gray-900">{getName(detailCustomer)}</h3>
                  <p className="text-sm text-gray-500">ID: {detailCustomer.id}</p>
                </div>
                <div className="flex gap-4 text-sm">
                  <div className="text-center">
                    <p className="font-semibold text-gray-900">{detailCustomer.orderCount}</p>
                    <p className="text-xs text-gray-500">Pesanan</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-blue-600">{formatCurrency(detailCustomer.totalSpent)}</p>
                    <p className="text-xs text-gray-500">Belanja</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-amber-600">{detailCustomer.reviews.length}</p>
                    <p className="text-xs text-gray-500">Ulasan</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-blue-600">{detailCustomer.discussions.length}</p>
                    <p className="text-xs text-gray-500">Diskusi</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact & Address */}
            <div className="px-6 py-3 border-b border-gray-100 bg-white">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-start gap-2.5">
                  <Phone className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">Telepon</p>
                    <p className="text-sm text-gray-800">{getPhone(detailCustomer)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">Alamat</p>
                    <p className="text-sm text-gray-800">{getFullAddress(detailCustomer)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 px-6">
              {[
                { key: 'orders', label: 'Pesanan', count: detailCustomer.orders.length, icon: Package },
                { key: 'reviews', label: 'Ulasan', count: detailCustomer.reviews.length, icon: Star },
                { key: 'discussions', label: 'Diskusi', count: detailCustomer.discussions.length, icon: MessageCircle },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                    activeTab === tab.key
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  <span className="ml-1 px-1.5 py-0.5 text-[11px] font-semibold rounded-full bg-gray-100 text-gray-600">
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'orders' && (
                <div className="space-y-3">
                  {detailCustomer.orders.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">Belum ada pesanan</p>
                  ) : (
                    detailCustomer.orders.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-3.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-blue-600">#{order.number || order.id}</span>
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_BADGES[order.status] || 'bg-gray-100 text-gray-800'}`}>
                              {STATUS_LABELS[order.status] || order.status}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            {order.line_items?.length || 0} item &middot; {formatDate(order.date_created)}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-gray-900">{formatCurrency(order.total)}</span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'reviews' && (
                <div className="space-y-3">
                  {detailCustomer.reviews.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">Belum ada ulasan</p>
                  ) : (
                    detailCustomer.reviews.map((review) => (
                      <div
                        key={review.id}
                        className="p-3.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium text-gray-900">{review.product_name}</span>
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3.5 h-3.5 ${i < review.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600" dangerouslySetInnerHTML={{ __html: review.review }} />
                        <p className="text-xs text-gray-400 mt-1">{formatDate(review.date_created)}</p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'discussions' && (
                <div className="space-y-3">
                  {detailCustomer.discussions.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">Belum ada diskusi</p>
                  ) : (
                    detailCustomer.discussions.map((d) => (
                      <div
                        key={d.id}
                        className="p-3.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs text-gray-500">Produk #{d.productId}</span>
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${d.status === 'answered' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {d.status === 'answered' ? 'Terjawab' : 'Menunggu'}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-900 mb-1">Q: {d.question}</p>
                        {d.answer && (
                          <p className="text-sm text-gray-600 bg-blue-50 rounded-md px-2.5 py-1.5 mt-1">
                            A: {d.answer}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-1.5">{formatDate(d.askedAt)}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
