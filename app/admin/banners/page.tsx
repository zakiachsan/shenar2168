'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  ImageIcon,
  Edit3,
  Trash2,
  X,
  Check,
  Loader2,
  Upload,
} from 'lucide-react';
import ImageCropper from '@/app/components/admin/ImageCropper';

interface Banner {
  id: number;
  image: string;
  alt: string;
  link?: string;
  active: boolean;
}

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Form state
  const [image, setImage] = useState('');
  const [alt, setAlt] = useState('');
  const [link, setLink] = useState('');
  const [active, setActive] = useState(true);

  // Upload / crop state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cropping, setCropping] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    loadBanners();
  }, []);

  const loadBanners = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/banners');
      if (res.ok) {
        const data = await res.json();
        setBanners(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load banners:', err);
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditing(null);
    setImage('');
    setAlt('');
    setLink('');
    setActive(true);
    setError('');
    setSelectedFile(null);
    setCropping(false);
    setShowModal(true);
  };

  const openEdit = (banner: Banner) => {
    setEditing(banner);
    setImage(banner.image);
    setAlt(banner.alt);
    setLink(banner.link || '');
    setActive(banner.active);
    setError('');
    setSelectedFile(null);
    setCropping(false);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setSelectedFile(null);
    setCropping(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('File harus berupa gambar');
      return;
    }
    setError('');
    setSelectedFile(file);
    setCropping(true);
  };

  const handleCropped = async (blob: Blob, dataUrl: string) => {
    setUploadingImage(true);
    try {
      const formData = new FormData();
      const croppedFile = new File([blob], 'banner.jpg', { type: 'image/jpeg' });
      formData.append('file', croppedFile);
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setImage(data.url);
        setCropping(false);
        setSelectedFile(null);
      } else {
        setError(data.error || 'Gagal upload gambar');
      }
    } catch (err: any) {
      setError('Gagal upload gambar: ' + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCropCancel = () => {
    setCropping(false);
    setSelectedFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const payload: any = {
        image,
        alt,
        link,
        active,
      };

      if (editing) {
        payload.id = editing.id;
      }

      const res = await fetch('/api/admin/banners', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Gagal menyimpan banner');
        setSaving(false);
        return;
      }

      closeModal();
      loadBanners();
    } catch (err: any) {
      setError('Terjadi kesalahan: ' + err.message);
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/banners?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setBanners((prev) => prev.filter((b) => b.id !== id));
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
    setDeleteConfirm(null);
  };

  const toggleActive = async (banner: Banner) => {
    try {
      const res = await fetch('/api/admin/banners', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: banner.id, active: !banner.active }),
      });
      if (res.ok) {
        setBanners((prev) =>
          prev.map((b) => (b.id === banner.id ? { ...b, active: !b.active } : b))
        );
      }
    } catch (err) {
      console.error('Toggle failed:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Banner / Hero</h1>
          <p className="text-sm text-gray-500 mt-1">
            Kelola banner halaman utama
          </p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Tambah Banner
        </button>
      </div>

      {/* Banners Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-5 py-3.5">Gambar</th>
                <th className="px-5 py-3.5">Judul Banner</th>
                <th className="px-5 py-3.5">Link</th>
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
                      Memuat banner...
                    </div>
                  </td>
                </tr>
              ) : banners.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-400">Belum ada banner</p>
                    <button
                      onClick={openAdd}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Tambah banner pertama
                    </button>
                  </td>
                </tr>
              ) : (
                banners.map((banner) => (
                  <tr key={banner.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="w-32 h-16 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
                        {banner.image ? (
                          <img
                            src={banner.image}
                            alt={banner.alt}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-medium text-gray-900">{banner.alt}</p>
                      <p className="text-xs text-gray-400">ID: {banner.id}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      {banner.link ? (
                        <a
                          href={banner.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {banner.link}
                        </a>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => toggleActive(banner)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                          banner.active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            banner.active ? 'bg-green-500' : 'bg-gray-400'
                          }`}
                        />
                        {banner.active ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => openEdit(banner)}
                          className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                          title="Edit"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {deleteConfirm === banner.id ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(banner.id)}
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
                            onClick={() => setDeleteConfirm(banner.id)}
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

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={closeModal} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {editing ? 'Edit Banner' : 'Tambah Banner'}
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

              {/* Upload / Crop Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Gambar Banner <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Rasio <strong>3:1</strong> &middot; Target <strong>1200 &times; 400 px</strong>. Upload gambar lalu geser dan zoom untuk menyesuaikan area crop.
                </p>

                {cropping && selectedFile ? (
                  <ImageCropper
                    file={selectedFile}
                    aspectRatio={3}
                    targetWidth={1200}
                    targetHeight={400}
                    onCrop={handleCropped}
                    onCancel={handleCropCancel}
                  />
                ) : (
                  <div className="space-y-3">
                    {image ? (
                      <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                        <img
                          src={image}
                          alt="Preview banner"
                          className="w-full h-32 object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setImage('')}
                          className="absolute top-2 right-2 p-1 bg-white/90 hover:bg-white rounded-md shadow text-gray-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 hover:border-blue-400 transition-colors">
                        <Upload className="w-6 h-6 text-gray-400 mb-1.5" />
                        <span className="text-xs text-gray-500">Klik untuk upload gambar</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileSelect}
                          disabled={uploadingImage}
                        />
                      </label>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Judul Banner <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={alt}
                  onChange={(e) => setAlt(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Contoh: Promo Gratis Ongkir"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Link Tujuan
                </label>
                <input
                  type="url"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://example.com/promo"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600"
                />
                Aktif
              </label>

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
