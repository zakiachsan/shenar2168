'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Loader2,
  MessageSquare,
  Trash2,
  Send,
  Search,
  CheckCircle2,
  Clock,
  Reply,
  X,
  Eye,
  Package,
  User,
  Calendar,
} from 'lucide-react';

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

interface Product {
  id: number;
  name: string;
}

const STATUS_TABS = [
  { value: '', label: 'Semua' },
  { value: 'pending', label: 'Menunggu' },
  { value: 'answered', label: 'Dijawab' },
];

const STATUS_BADGES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-300',
  answered: 'bg-green-100 text-green-800 ring-1 ring-green-300',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Menunggu',
  answered: 'Dijawab',
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getShortName(name: string, maxWords = 2): string {
  const words = name.split(' ');
  if (words.length <= maxWords) return name;
  return words.slice(0, maxWords).join(' ') + '...';
}

export default function AdminDiscussionsPage() {
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [products, setProducts] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Modal state
  const [replyModal, setReplyModal] = useState<Discussion | null>(null);
  const [answerText, setAnswerText] = useState('');

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    loadDiscussions();
  }, [statusFilter]);

  const loadAll = async () => {
    try {
      const res = await fetch('/api/admin/products?per_page=100');
      if (res.ok) {
        const data = await res.json();
        const map: Record<number, string> = {};
        if (Array.isArray(data)) {
          data.forEach((p: Product) => {
            map[p.id] = p.name;
          });
        }
        setProducts(map);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
    }
  };

  const loadDiscussions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/admin/discussions?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        let list = Array.isArray(data.discussions) ? data.discussions : [];
        // Sort: pending first, then newest date first
        list.sort((a: Discussion, b: Discussion) => {
          if (a.status === 'pending' && b.status !== 'pending') return -1;
          if (a.status !== 'pending' && b.status === 'pending') return 1;
          return new Date(b.askedAt).getTime() - new Date(a.askedAt).getTime();
        });
        setDiscussions(list);
      }
    } catch (err) {
      console.error('Failed to load discussions:', err);
    } finally {
      setLoading(false);
    }
  };

  const getProductName = (productId: number): string => {
    return products[productId] || `Produk #${productId}`;
  };

  const openReplyModal = (d: Discussion) => {
    setReplyModal(d);
    setAnswerText(d.answer || '');
  };

  const closeReplyModal = () => {
    setReplyModal(null);
    setAnswerText('');
  };

  const handleAnswer = async () => {
    if (!replyModal) return;
    const answer = answerText.trim();
    if (!answer) return;
    setActionLoading(replyModal.id);
    try {
      const res = await fetch('/api/admin/discussions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: replyModal.id, answer, answeredBy: 'Admin' }),
      });
      if (res.ok) {
        closeReplyModal();
        loadDiscussions();
      }
    } catch (err) {
      console.error('Answer failed:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Yakin ingin menghapus diskusi ini?')) return;
    try {
      const res = await fetch(`/api/admin/discussions?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDiscussions((prev) => prev.filter((d) => d.id !== id));
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const filteredDiscussions = useMemo(() => {
    if (!searchQuery.trim()) return discussions;
    const q = searchQuery.toLowerCase();
    return discussions.filter((d) => {
      const productName = getProductName(d.productId).toLowerCase();
      return (
        productName.includes(q) ||
        d.question.toLowerCase().includes(q) ||
        d.askedBy.toLowerCase().includes(q)
      );
    });
  }, [discussions, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Diskusi Produk</h1>
        <p className="text-sm text-gray-500 mt-1">
          Kelola pertanyaan dan jawaban dari pelanggan
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                statusFilter === tab.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cari produk atau pertanyaan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-72"
          />
        </div>
      </div>

      {/* Discussions Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-5 py-3.5">Produk</th>
                <th className="px-5 py-3.5">Pertanyaan</th>
                <th className="px-5 py-3.5">Penanya</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Tanggal</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <div className="inline-flex items-center gap-2 text-sm text-gray-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Memuat diskusi...
                    </div>
                  </td>
                </tr>
              ) : filteredDiscussions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-400">
                      {searchQuery ? 'Tidak ada hasil pencarian' : 'Belum ada diskusi'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredDiscussions.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <Package className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <p className="text-sm font-medium text-gray-900">
                          {getShortName(getProductName(d.productId))}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm text-gray-700 line-clamp-2 max-w-[280px]">
                        {d.question}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-medium text-gray-900">{d.askedBy}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_BADGES[d.status] || 'bg-gray-100 text-gray-800 ring-1 ring-gray-300'
                        }`}
                      >
                        {d.status === 'pending' ? (
                          <Clock className="w-3 h-3" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3" />
                        )}
                        {STATUS_LABELS[d.status] || d.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-xs text-gray-400">
                        {formatDate(d.askedAt)}
                      </p>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1">
                        {d.status === 'pending' ? (
                          <button
                            onClick={() => openReplyModal(d)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                            title="Balas"
                          >
                            <Reply className="w-3 h-3" />
                            Balas
                          </button>
                        ) : (
                          <button
                            onClick={() => openReplyModal(d)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors"
                            title="Lihat"
                          >
                            <Eye className="w-3 h-3" />
                            Lihat
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(d.id)}
                          className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Reply Modal */}
      {replyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={closeReplyModal} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900">
                {replyModal.status === 'pending' ? 'Balas Diskusi' : 'Detail Diskusi'}
              </h2>
              <button
                onClick={closeReplyModal}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Product */}
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg mb-4">
              <Package className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {getProductName(replyModal.productId)}
                </p>
                <p className="text-xs text-gray-500">Produk #{replyModal.productId}</p>
              </div>
            </div>

            {/* Question */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1.5">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-900">{replyModal.askedBy}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
                <Calendar className="w-3.5 h-3.5" />
                {formatDate(replyModal.askedAt)}
              </div>
              <div className="bg-blue-50 rounded-lg p-3.5">
                <p className="text-sm text-gray-800 font-medium mb-1">Pertanyaan:</p>
                <p className="text-sm text-gray-700">{replyModal.question}</p>
              </div>
            </div>

            {/* Answer */}
            {replyModal.status === 'answered' && replyModal.answer && (
              <div className="mb-5">
                <div className="bg-green-50 rounded-lg p-3.5 border border-green-100">
                  <p className="text-sm text-gray-800 font-medium mb-1">
                    Jawaban {replyModal.answeredBy ? `oleh ${replyModal.answeredBy}` : ''}:
                  </p>
                  <p className="text-sm text-gray-700">{replyModal.answer}</p>
                </div>
              </div>
            )}

            {/* Answer Input */}
            {replyModal.status === 'pending' && (
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Jawaban
                </label>
                <textarea
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  placeholder="Tulis jawaban Anda..."
                  rows={4}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={closeReplyModal}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
              >
                Tutup
              </button>
              {replyModal.status === 'pending' && (
                <button
                  onClick={handleAnswer}
                  disabled={actionLoading === replyModal.id || !answerText.trim()}
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors inline-flex items-center justify-center gap-1.5"
                >
                  {actionLoading === replyModal.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Kirim Jawaban
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
