'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Package,
  ChevronDown,
  Filter,
  Eye,
  EyeOff,
  X,
  Check,
} from 'lucide-react';
import { createPortal } from 'react-dom';

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

interface ConfirmModal {
  type: 'toggle' | 'delete';
  product: WCProduct;
}

type FilterTab = 'all' | 'active' | 'low-stock' | 'inactive';

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

const TABS: { key: FilterTab; label: string; color: string }[] = [
  { key: 'all', label: 'Semua', color: 'blue' },
  { key: 'active', label: 'Aktif', color: 'green' },
  { key: 'low-stock', label: 'Stok Rendah', color: 'yellow' },
  { key: 'inactive', label: 'Nonaktif', color: 'red' },
];

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

function isStatusActive(status: string): boolean {
  return status === 'publish' || status === 'active';
}

function isStatusInactive(status: string): boolean {
  return !isStatusActive(status);
}

function ConfirmModalContent({
  modal,
  onConfirm,
  onCancel,
  toggling,
}: {
  modal: ConfirmModal;
  onConfirm: () => void;
  onCancel: () => void;
  toggling: boolean;
}) {
  const isDelete = modal.type === 'delete';
  const isActive = isStatusActive(modal.product.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100 text-gray-400"
        >
          <X className="w-5 h-5" />
        </button>

        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
          isDelete ? 'bg-red-100' : isActive ? 'bg-red-100' : 'bg-green-100'
        }`}>
          {isDelete ? (
            <Trash2 className="w-6 h-6 text-red-600" />
          ) : isActive ? (
            <EyeOff className="w-6 h-6 text-red-600" />
          ) : (
            <Eye className="w-6 h-6 text-green-600" />
          )}
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {isDelete ? 'Hapus Produk' : isActive ? 'Nonaktifkan Produk' : 'Aktifkan Produk'}
        </h3>

        <p className="text-sm text-gray-500 mb-1">
          {isDelete
            ? `Yakin ingin menghapus "${modal.product.name}"?`
            : isActive
              ? `Yakin ingin menonaktifkan "${modal.product.name}"?`
              : `Aktifkan "${modal.product.name}"?`}
        </p>
        {isDelete && (
          <p className="text-xs text-red-500 font-medium">
            Tindakan ini tidak dapat dibatalkan.
          </p>
        )}

        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={toggling}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 ${
              isDelete
                ? 'bg-red-600 hover:bg-red-700'
                : isActive
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {toggling ? 'Memproses...' : isDelete ? 'Ya, Hapus' : isActive ? 'Ya, Nonaktifkan' : 'Ya, Aktifkan'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<WCProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [confirmModal, setConfirmModal] = useState<ConfirmModal | null>(null);
  const [toggling, setToggling] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showSavedNotification, setShowSavedNotification] = useState(false);

  useEffect(() => {
    setMounted(true);
    const params = new URLSearchParams(window.location.search);
    if (params.get('saved') === '1') {
      setShowSavedNotification(true);
      // Scroll to top — prevent browser scroll restoration
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      // Clean up the URL param without full reload
      const newUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

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

  // Compute tab counts
  const tabCounts = useMemo(() => {
    const active = products.filter((p) => isStatusActive(p.status));
    const lowStock = active.filter((p) => (p.stock_quantity ?? 0) < 20);
    const inactive = products.filter((p) => isStatusInactive(p.status));
    return {
      all: products.length,
      active: active.length,
      'low-stock': lowStock.length,
      inactive: inactive.length,
    };
  }, [products]);

  // Filter products by selected tab
  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (filterTab === 'active') {
      result = result.filter((p) => isStatusActive(p.status));
    } else if (filterTab === 'low-stock') {
      result = result.filter(
        (p) => isStatusActive(p.status) && (p.stock_quantity ?? 0) < 20
      );
    } else if (filterTab === 'inactive') {
      result = result.filter((p) => isStatusInactive(p.status));
    }

    return result;
  }, [products, filterTab]);

  const handleToggleStatus = async () => {
    if (!confirmModal || confirmModal.type !== 'toggle') return;
    setToggling(true);
    const product = confirmModal.product;
    const isActive = isStatusActive(product.status);
    const newStatus = isActive ? 'draft' : 'publish';

    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setProducts((prev) =>
          prev.map((p) =>
            p.id === product.id ? { ...p, status: newStatus } : p
          )
        );
      } else {
        const err = await res.json();
        console.error('Toggle failed:', err);
      }
    } catch (err) {
      console.error('Toggle failed:', err);
    }
    setToggling(false);
    setConfirmModal(null);
  };

  const handleDelete = async () => {
    if (!confirmModal || confirmModal.type !== 'delete') return;
    setToggling(true);
    const product = confirmModal.product;

    try {
      const res = await fetch(`/api/admin/products?id=${product.id}`, { method: 'DELETE' });
      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== product.id));
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
    setToggling(false);
    setConfirmModal(null);
  };

  const handleConfirm = () => {
    if (confirmModal?.type === 'toggle') handleToggleStatus();
    else if (confirmModal?.type === 'delete') handleDelete();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadProducts();
  };

  const openModal = (type: ConfirmModal['type'], product: WCProduct) => {
    setConfirmModal({ type, product });
  };

  const TAB_COLORS: Record<string, { active: string; bg: string; ring: string }> = {
    blue: { active: 'bg-blue-600 text-white', bg: 'bg-blue-50 text-blue-700', ring: 'ring-blue-600' },
    green: { active: 'bg-green-600 text-white', bg: 'bg-green-50 text-green-700', ring: 'ring-green-600' },
    yellow: { active: 'bg-yellow-500 text-white', bg: 'bg-yellow-50 text-yellow-700', ring: 'ring-yellow-500' },
    red: { active: 'bg-red-600 text-white', bg: 'bg-red-50 text-red-700', ring: 'ring-red-600' },
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Produk</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Kelola semua produk toko
          </p>
        </div>
      </div>

      {showSavedNotification && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4" />
            Produk berhasil disimpan
          </div>
          <button
            onClick={() => setShowSavedNotification(false)}
            className="p-1 hover:bg-green-100 rounded transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter Tabs — single row, compact on mobile */}
      <div className="flex gap-1 sm:gap-2 overflow-x-auto pb-px scrollbar-hide">
        {TABS.map((tab) => {
          const colors = TAB_COLORS[tab.color];
          const isActive = filterTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setFilterTab(tab.key)}
              className={`inline-flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                isActive ? colors.active + ' ring-2 ' + colors.ring : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.label}
              <span className={`inline-flex items-center justify-center min-w-[18px] h-4.5 px-1.5 rounded-full text-[10px] sm:text-xs font-bold ${
                isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {tabCounts[tab.key]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search + Filter status — 1 baris */}
      <div className="flex items-center gap-2">
        <form onSubmit={handleSearch} className="relative flex-1">
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
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setShowStatusFilter(!showStatusFilter)}
            className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 whitespace-nowrap"
          >
            <Filter className="w-4 h-4" />
            <span className="sm:hidden">{statusFilter ? STATUS_LABELS[statusFilter] : 'Status'}</span>
            <span className="hidden sm:inline">{statusFilter ? STATUS_LABELS[statusFilter] : 'Semua Status'}</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {showStatusFilter && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowStatusFilter(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 w-44 sm:w-48 bg-white rounded-lg border border-gray-200 shadow-lg">
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

      {/* Sticky FAB — Tambah Produk */}
      <button
        onClick={() => router.push('/admin/products/new')}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center active:scale-95"
      >
        <Plus className="w-7 h-7" />
      </button>

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
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-400">
                      {filterTab === 'all'
                        ? 'Belum ada produk'
                        : filterTab === 'active'
                          ? 'Tidak ada produk aktif'
                          : filterTab === 'low-stock'
                            ? 'Tidak ada produk dengan stok rendah'
                            : 'Tidak ada produk nonaktif'}
                    </p>
                    {filterTab === 'all' && (
                      <button
                        onClick={() => router.push('/admin/products/new')}
                        className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Tambah produk pertama
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
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
                          {product.sale_price && parseFloat(product.sale_price) > 0 ? (
                            <>
                              <p className="text-sm font-medium text-gray-900">
                                {formatCurrency(product.sale_price)}
                              </p>
                              <p className="text-xs text-gray-400 line-through">
                                {formatCurrency(product.regular_price)}
                              </p>
                            </>
                          ) : (
                            <p className="text-sm font-medium text-gray-900">
                              {product.regular_price && parseFloat(product.regular_price) > 0
                                ? formatCurrency(product.regular_price)
                                : 'Produk Variable'}
                            </p>
                          )}
                          <p className="text-xs text-gray-400">
                            {product.variations && product.variations.length > 0
                              ? `${product.variations.length} Varian`
                              : 'Harga per varian'}
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
                      <span className={`text-sm ${
                        (product.stock_quantity ?? 0) < 20 && isStatusActive(product.status)
                          ? 'text-red-600 font-medium'
                          : 'text-gray-700'
                      }`}>
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
                        {/* Toggle Active/Inactive */}
                        <button
                          onClick={() => openModal('toggle', product)}
                          className={`p-2 rounded-lg transition-colors ${
                            isStatusActive(product.status)
                              ? 'text-green-600 hover:bg-green-50'
                              : 'text-gray-400 hover:bg-gray-100'
                          }`}
                          title={
                            isStatusActive(product.status)
                              ? 'Nonaktifkan'
                              : 'Aktifkan'
                          }
                        >
                          {isStatusActive(product.status) ? (
                            <Eye className="w-4 h-4" />
                          ) : (
                            <EyeOff className="w-4 h-4" />
                          )}
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => router.push(`/admin/products/${product.id}/edit`)}
                          className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => openModal('delete', product)}
                          className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Confirmation Modal */}
      {mounted && confirmModal && createPortal(
        <ConfirmModalContent
          modal={confirmModal}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmModal(null)}
          toggling={toggling}
        />,
        document.body
      )}
    </div>
  );
}
