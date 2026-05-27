'use client';

import { useState, useEffect } from 'react';
import {
  Star,
  Loader2,
  MessageSquare,
  Check,
  Ban,
  X,
  Eye,
  Send,
  Calendar,
  User,
  Mail,
} from 'lucide-react';

interface Review {
  id: number;
  product_id: number;
  product_name?: string;
  product_permalink?: string;
  reviewer: string;
  reviewer_email: string;
  review: string;
  rating: number;
  status: string;
  date_created: string;
  verified?: boolean;
}

const STATUS_TABS = [
  { value: '', label: 'Semua' },
  { value: 'approved', label: 'Disetujui' },
  { value: 'hold', label: 'Pending' },
  { value: 'spam', label: 'Spam' },
];

const STATUS_LABELS: Record<string, string> = {
  approved: 'Disetujui',
  hold: 'Pending',
  spam: 'Spam',
  trash: 'Sampah',
};

const STATUS_BADGES: Record<string, string> = {
  approved: 'bg-green-100 text-green-800 ring-1 ring-green-300',
  hold: 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-300',
  spam: 'bg-red-100 text-red-800 ring-1 ring-red-300',
  trash: 'bg-gray-100 text-gray-800 ring-1 ring-gray-300',
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${
            star <= rating
              ? 'text-amber-400 fill-amber-400'
              : 'text-gray-300'
          }`}
        />
      ))}
    </div>
  );
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

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [detailReview, setDetailReview] = useState<Review | null>(null);

  useEffect(() => {
    loadReviews();
    loadCounts();
  }, [statusFilter]);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('per_page', '50');
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/admin/reviews?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        // Sort: pending first, then by newest date
        const statusOrder: Record<string, number> = { hold: 0, pending: 0, approved: 1, spam: 2, trash: 3 };
        list.sort((a: Review, b: Review) => {
          const sa = statusOrder[a.status] ?? 99;
          const sb = statusOrder[b.status] ?? 99;
          if (sa !== sb) return sa - sb;
          return new Date(b.date_created).getTime() - new Date(a.date_created).getTime();
        });
        setReviews(list);
      }
    } catch (err) {
      console.error('Failed to load reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCounts = async () => {
    try {
      const res = await fetch('/api/admin/reviews/count');
      if (res.ok) {
        const data = await res.json();
        setCounts(data);
      }
    } catch (err) {
      console.error('Failed to load review counts:', err);
    }
  };

  const updateStatus = async (id: number, status: string) => {
    setActionLoading(id);
    try {
      const res = await fetch('/api/admin/reviews', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        setReviews((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status } : r))
        );
        loadCounts();
      }
    } catch (err) {
      console.error('Update failed:', err);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ulasan Produk</h1>
        <p className="text-sm text-gray-500 mt-1">
          Kelola ulasan dan rating dari pelanggan
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

      {/* Reviews Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-5 py-3.5">Produk</th>
                <th className="px-5 py-3.5">Pelanggan</th>
                <th className="px-5 py-3.5">Rating</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <div className="inline-flex items-center gap-2 text-sm text-gray-400">
                      <div className="animate-spin w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full" />
                      Memuat ulasan...
                    </div>
                  </td>
                </tr>
              ) : reviews.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-400">Belum ada ulasan</p>
                  </td>
                </tr>
              ) : (
                reviews.map((review) => (
                  <tr
                    key={review.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <Send className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <p className="text-sm font-medium text-gray-900 line-clamp-1 max-w-[200px]">
                          {review.product_name || `Produk #${review.product_id}`}
                        </p>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatDate(review.date_created)}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-medium text-gray-900">{review.reviewer}</p>
                      <p className="text-xs text-gray-400">{review.reviewer_email}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <StarRating rating={review.rating} />
                      <p className="text-xs text-gray-400 mt-0.5">{review.rating}/5</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_BADGES[review.status] || 'bg-gray-100 text-gray-800 ring-1 ring-gray-300'
                        }`}
                      >
                        {STATUS_LABELS[review.status] || review.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1">
                        {/* Only 2 actions: Approve & Spam */}
                        {review.status !== 'approved' && (
                          <button
                            onClick={() => updateStatus(review.id, 'approved')}
                            disabled={actionLoading === review.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-green-50 text-green-600 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors disabled:opacity-50"
                            title="Setujui"
                          >
                            <Check className="w-3 h-3" />
                            Disetujui
                          </button>
                        )}
                        {review.status !== 'spam' && (
                          <button
                            onClick={() => updateStatus(review.id, 'spam')}
                            disabled={actionLoading === review.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
                            title="Spam"
                          >
                            <Ban className="w-3 h-3" />
                            Spam
                          </button>
                        )}
                        <button
                          onClick={() => setDetailReview(review)}
                          className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                          title="Lihat Detail"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
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
      {detailReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setDetailReview(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900">Detail Ulasan</h2>
              <button
                onClick={() => setDetailReview(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Product */}
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg mb-4">
              <Send className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {detailReview.product_name || `Produk #${detailReview.product_id}`}
                </p>
                <a
                  href={detailReview.product_permalink || `/product/${detailReview.product_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  Lihat produk
                </a>
              </div>
            </div>

            {/* Reviewer Info */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                <User className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{detailReview.reviewer}</p>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Mail className="w-3 h-3" />
                  {detailReview.reviewer_email}
                </div>
              </div>
            </div>

            {/* Rating & Date */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <StarRating rating={detailReview.rating} />
                <p className="text-xs text-gray-500 mt-0.5">{detailReview.rating} dari 5 bintang</p>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Calendar className="w-3.5 h-3.5" />
                {formatDate(detailReview.date_created)}
              </div>
            </div>

            {/* Status */}
            <div className="mb-4">
              <span
                className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  STATUS_BADGES[detailReview.status] || 'bg-gray-100 text-gray-800'
                }`}
              >
                {STATUS_LABELS[detailReview.status] || detailReview.status}
              </span>
            </div>

            {/* Review Content */}
            <div className="bg-gray-50 rounded-lg p-4 mb-5">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {detailReview.review}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              {detailReview.status !== 'approved' && (
                <button
                  onClick={() => {
                    updateStatus(detailReview.id, 'approved');
                    setDetailReview(null);
                  }}
                  disabled={actionLoading === detailReview.id}
                  className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors inline-flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Disetujui
                </button>
              )}
              {detailReview.status !== 'spam' && (
                <button
                  onClick={() => {
                    updateStatus(detailReview.id, 'spam');
                    setDetailReview(null);
                  }}
                  disabled={actionLoading === detailReview.id}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors inline-flex items-center justify-center gap-1.5"
                >
                  <Ban className="w-4 h-4" />
                  Spam
                </button>
              )}
              <button
                onClick={() => setDetailReview(null)}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
