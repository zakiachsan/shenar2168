'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Tags,
  Loader2,
  Package,
  ExternalLink,
  ImageIcon,
  Hash,
  FileText,
} from 'lucide-react';

interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  count: number;
  image: { src: string } | null;
  menu_order: number;
}

interface Product {
  id: number;
  name: string;
  slug: string;
  price: string;
  regular_price: string;
  sale_price: string;
  stock_status: string;
  status: string;
  images: { src: string }[];
  sku: string;
  categories: { id: number; name: string }[];
  on_sale: boolean;
}

export default function AdminCategoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id || isNaN(id)) return;
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      // Load category info
      const catRes = await fetch(`/api/admin/categories?id=${id}`);
      if (catRes.ok) {
        const catData = await catRes.json();
        // The GET endpoint returns array, so we need to find the matching one
        // Actually the API returns all categories. Let's also fetch from detail endpoint via wc proxy
        const detailRes = await fetch(`/api/wc/products/categories/${id}`);
        if (detailRes.ok) {
          const detail = await detailRes.json();
          setCategory(detail);
        } else if (Array.isArray(catData)) {
          const found = catData.find((c: Category) => c.id === id);
          if (found) setCategory(found);
        }
      }

      // Load products in this category
      const prodRes = await fetch(`/api/admin/products?category=${id}&per_page=100`);
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(Array.isArray(prodData) ? prodData : prodData.data || []);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: string) => {
    const num = Number(price);
    if (isNaN(num)) return '-';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(num);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Memuat...</span>
        </div>
      </div>
    );
  }

  if (error || !category) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => router.push('/admin/categories')}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Kategori
        </button>
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <p className="text-red-600 text-sm">{error || 'Kategori tidak ditemukan'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/admin/categories')}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{category.name}</h1>
          <p className="text-sm text-gray-500">Detail kategori & produk</p>
        </div>
      </div>

      {/* Category Info Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-auto">
            <div className="w-24 h-24 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden">
              {category.image?.src ? (
                <img src={category.image.src} alt={category.name} className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="w-10 h-10 text-gray-300" />
              )}
            </div>
          </div>
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                <Hash className="w-3 h-3" /> ID
              </p>
              <p className="text-sm font-medium text-gray-900">{category.id}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Slug</p>
              <p className="text-sm font-medium text-gray-900">/{category.slug}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Posisi</p>
              <p className="text-sm font-medium text-gray-900">{category.menu_order ?? 0}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Jumlah Produk</p>
              <p className="text-sm font-medium text-gray-900">{category.count ?? 0}</p>
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                <FileText className="w-3 h-3" /> Deskripsi
              </p>
              <p className="text-sm text-gray-700">{category.description || '-'}</p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Link
              href={`/category/${category.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Lihat di Toko
            </Link>
            <button
              onClick={() => router.push(`/admin/categories`)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-50 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-100 transition-colors"
            >
              <Tags className="w-3.5 h-3.5" />
              Semua Kategori
            </button>
          </div>
        </div>
      </div>

      {/* Products List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Package className="w-4 h-4 text-gray-500" />
            Produk dalam Kategori
          </h2>
          <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
            {products.length} produk
          </span>
        </div>

        {products.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Belum ada produk dalam kategori ini</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-5 py-3">Produk</th>
                  <th className="px-5 py-3">SKU</th>
                  <th className="px-5 py-3">Harga</th>
                  <th className="px-5 py-3 text-center">Stok</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {product.images?.[0]?.src ? (
                            <img src={product.images[0].src} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-4 h-4 text-gray-300" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{product.name}</p>
                          <p className="text-xs text-gray-400">ID: {product.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{product.sku || '-'}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-col">
                        {product.on_sale && product.sale_price ? (
                          <>
                            <span className="font-medium text-gray-900">{formatPrice(product.sale_price)}</span>
                            <span className="text-xs text-gray-400 line-through">{formatPrice(product.regular_price)}</span>
                          </>
                        ) : (
                          <span className="font-medium text-gray-900">{formatPrice(product.price || product.regular_price)}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          product.stock_status === 'instock'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {product.stock_status === 'instock' ? 'Tersedia' : 'Habis'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          product.status === 'publish'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {product.status === 'publish' ? 'Publish' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => router.push(`/admin/products/${product.id}/edit`)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                        >
                          Edit
                        </button>
                        <Link
                          href={`/product/${product.id}`}
                          target="_blank"
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                          title="Lihat di toko"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
