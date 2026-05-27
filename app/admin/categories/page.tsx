'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Tags,
  Plus,
  Edit3,
  Trash2,
  X,
  Check,
  Loader2,
  ArrowUp,
  ArrowDown,
  Eye,
  AlertCircle,
  ImageIcon,
  GripVertical,
} from 'lucide-react';
import ImageUpload from '@/app/components/admin/ImageUpload';

interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  count: number;
  image: { src: string } | null;
  menu_order: number;
}

export default function AdminCategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/categories');
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        // Sort by menu_order ascending
        list.sort((a: Category, b: Category) => {
          const oa = a.menu_order ?? 0;
          const ob = b.menu_order ?? 0;
          if (oa !== ob) return oa - ob;
          return (a.name || '').localeCompare(b.name || '');
        });
        setCategories(list);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveOrder = async (newCategories: Category[]) => {
    setSaving(true);
    setSaveError('');
    try {
      const orders = newCategories.map((cat, index) => ({
        id: cat.id,
        menu_order: index + 1,
      }));
      const res = await fetch('/api/admin/categories/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders }),
      });
      if (!res.ok) {
        const data = await res.json();
        setSaveError(data.error || 'Gagal menyimpan posisi');
      }
    } catch (err: any) {
      setSaveError(err.message || 'Gagal menyimpan posisi');
    } finally {
      setSaving(false);
    }
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newCategories = [...categories];
    const temp = newCategories[index];
    newCategories[index] = newCategories[index - 1];
    newCategories[index - 1] = temp;
    setCategories(newCategories);
    saveOrder(newCategories);
  };

  const moveDown = (index: number) => {
    if (index === categories.length - 1) return;
    const newCategories = [...categories];
    const temp = newCategories[index];
    newCategories[index] = newCategories[index + 1];
    newCategories[index + 1] = temp;
    setCategories(newCategories);
    saveOrder(newCategories);
  };

  const openAdd = () => {
    setEditing(null);
    setName('');
    setSlug('');
    setDescription('');
    setImage('');
    setError('');
    setShowModal(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setDescription(cat.description || '');
    setImage(cat.image?.src || '');
    setError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
  };

  function toSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/&/g, 'dan')
      .replace(/\s+/g, '-')
      .replace(/--+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+$/, '');
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const autoSlug = slug.trim() || toSlug(name);
      const payload: any = {
        name,
        slug: autoSlug,
        description,
        image,
      };

      if (editing) {
        payload.id = editing.id;
      }

      const res = await fetch('/api/admin/categories', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Gagal menyimpan kategori');
        setSaving(false);
        return;
      }

      closeModal();
      loadCategories();
    } catch (err: any) {
      setError('Terjadi kesalahan: ' + err.message);
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Yakin ingin menghapus kategori ini?')) return;

    try {
      const res = await fetch(`/api/admin/categories?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCategories((prev) => prev.filter((c) => c.id !== id));
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kategori</h1>
          <p className="text-sm text-gray-500 mt-1">
            Kelola kategori produk toko &mdash; urutkan posisi dengan tombol naik/turun
          </p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Tambah Kategori
        </button>
      </div>

      {saveError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {saveError}
        </div>
      )}

      {saving && !showModal && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-sm text-blue-600 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Menyimpan perubahan posisi...
        </div>
      )}

      {/* Categories Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="flex items-center gap-2 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Memuat kategori...</span>
          </div>
        </div>
      ) : categories.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Tags className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Belum ada kategori</p>
          <button
            onClick={openAdd}
            className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Tambah kategori pertama
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3 w-12 text-center">No</th>
                  <th className="px-5 py-3">Kategori</th>
                  <th className="px-5 py-3">Slug</th>
                  <th className="px-5 py-3 text-center">Produk</th>
                  <th className="px-5 py-3 text-center">Posisi</th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {categories.map((cat, index) => (
                  <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-center text-gray-400">
                      <div className="flex items-center justify-center gap-1">
                        <GripVertical className="w-3 h-3 text-gray-300" />
                        <span className="text-xs">{index + 1}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {cat.image?.src ? (
                            <img src={cat.image.src} alt={cat.name} className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-4 h-4 text-blue-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{cat.name}</p>
                          {cat.description && (
                            <p className="text-xs text-gray-400 line-clamp-1">{cat.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-600 text-xs">/{cat.slug}</td>
                    <td className="px-5 py-3 text-center">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {cat.count || 0}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center text-xs text-gray-500">
                      {cat.menu_order ?? 0}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => moveUp(index)}
                          disabled={index === 0}
                          className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 disabled:opacity-30 transition-colors"
                          title="Naik"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => moveDown(index)}
                          disabled={index === categories.length - 1}
                          className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 disabled:opacity-30 transition-colors"
                          title="Turun"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => router.push(`/admin/categories/${cat.id}`)}
                          className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition-colors"
                          title="Lihat Detail"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEdit(cat)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                          title="Edit"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(cat.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={closeModal} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {editing ? 'Edit Kategori' : 'Tambah Kategori'}
              </h2>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nama Kategori <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Nama kategori"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Deskripsi
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="Deskripsi kategori"
                />
              </div>

              <ImageUpload
                value={image}
                onChange={setImage}
                folder="categories"
                label="Gambar Kategori"
              />

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  {saving ? 'Menyimpan...' : editing ? 'Simpan' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
