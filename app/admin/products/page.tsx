'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Package,
  ChevronDown,
  Filter,
} from 'lucide-react';

interface WCProduct {
  id: number;
  name: string;
  slug: string;
  type: string;
  regular_price: string;
  sale_price: string;
  price: string;
  status: string;
  stock_quantity: number | null;
  stock_status: string;
  featured: boolean;
  categories: { id: number; name: string }[];
  images: { src: string }[];
  variations?: number[];
}

const STATUS_LABELS: Record<string, string> = {
  publish: 'Publik',
  draft: 'Draft',
  pending: 'Pending Review',
  private: 'Private',
};

const STATUS_COLORS: Record<string, string> = {
  publish: 'bg-green-100 text-green-800',
  draft: 'bg-gray-100 text-gray-800',
  pending: 'bg-yellow-100 text-yellow-800',
  private: 'bg-red-100 text-red-800',
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

export default function AdminProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<WCProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  useEffect(() => {
    loadProducts();
  }, [statusFilter]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      params.set('per_page', '50');

      const res = await fetch(`/api/admin/products?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/products?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
    setDeleteConfirm(null);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadProducts();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produk</h1>
          <p className="text-sm text-gray-500 mt-1">
            Kelola semua produk toko
          </p>
        </div>
        <button
          onClick={() => router.push('/admin/products/new')}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Tambah Produk
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari produk..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm 
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              placeholder:text-gray-400 bg-white"
          />
        </form>
        <div className="relative">
          <button
            onClick={() => setShowStatusFilter(!showStatusFilter)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
          >
            <Filter className="w-4 h-4" />
            {statusFilter ? STATUS_LABELS[statusFilter] : 'Semua Status'}
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {showStatusFilter && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowStatusFilter(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 w-48 bg-white rounded-lg border border-gray-200 shadow-lg">
                {['', 'publish', 'draft', 'pending'].map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      setStatusFilter(status);
                      setShowStatusFilter(false);
                    }}
                    className={`w-full px-4 py-2.5 text-sm text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg ${
                      statusFilter === status ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'
                    }`}
                  >
                    {status ? STATUS_LABELS[status] : 'Semua'}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-5 py-3.5">Produk</th>
                <th className="px-5 py-3.5">Harga</th>
                <th className="px-5 py-3.5">Stok</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Kategori</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <div className="inline-flex items-center gap-2 text-sm text-gray-400">
                      <div className="animate-spin w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full" />
                      Memuat produk...
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-400">Belum ada produk</p>
                    <button
                      onClick={() => router.push('/admin/products/new')}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Tambah produk pertama
                    </button>
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr
                    key={product.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
                          {product.images?.[0]?.src ? (
                            <img
                              src={product.images[0].src}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div>
                          <button
                            onClick={() => router.push(`/admin/products/${product.id}/edit`)}
                            className="text-sm font-medium text-gray-900 line-clamp-1 max-w-[250px] text-left hover:text-blue-600 transition-colors cursor-pointer"
                          >
                            {product.name}
                          </button>
                          <p className="text-xs text-gray-400">ID: {product.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {product.type === 'variable' ? (
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium text-gray-900">
                            {product.variations && product.variations.length > 0
                              ? `${product.variations.length} Varian`
                              : 'Produk Variable'}
                          </p>
                          <p className="text-xs text-gray-400">
                            Harga per varian
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium text-gray-900">
                            {product.sale_price
                              ? formatCurrency(product.sale_price)
                              : formatCurrency(product.regular_price)}
                          </p>
                          {product.sale_price ? (
                            <p className="text-xs text-gray-400 line-through">
                              {formatCurrency(product.regular_price)}
                            </p>
                          ) : (
                            <p className="text-xs text-gray-400">
                              Harga regular
                            </p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-gray-700">
                        {product.stock_quantity ?? 0}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_COLORS[product.status] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {STATUS_LABELS[product.status] || product.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {product.categories?.slice(0, 2).map((cat) => (
                          <span
                            key={cat.id}
                            className="inline-flex px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                          >
                            {cat.name}
                          </span>
                        ))}
                        {(product.categories?.length || 0) > 2 && (
                          <span className="text-xs text-gray-400">
                            +{product.categories!.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => router.push(`/admin/products/${product.id}/edit`)}
                          className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {deleteConfirm === product.id ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(product.id)}
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
                            onClick={() => setDeleteConfirm(product.id)}
                            className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
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
