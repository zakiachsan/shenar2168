'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  Loader2,
  AlertCircle,
  LayoutGrid,
  Zap,
  Tag,
  TrendingUp,
  Star,
  Heart,
  ShoppingBag,
  Percent,
  Clock,
  Sparkles,
  Gift,
  Trophy,
  Flame,
  type LucideIcon,
} from 'lucide-react';

interface EtalaseProduct {
  productId: number;
  flashSaleStock?: number;
}

interface EtalaseSection {
  id: string;
  title: string;
  type: string;
  enabled: boolean;
  sortOrder: number;
  icon: string;
  isFlashSale: boolean;
  products: EtalaseProduct[];
}

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutGrid,
  Zap,
  Tag,
  TrendingUp,
  Star,
  Heart,
  ShoppingBag,
  Percent,
  Clock,
  Sparkles,
  Gift,
  Trophy,
  Flame,
};

function DynamicIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] || LayoutGrid;
  return <Icon className={className} />;
}

export default function AdminEtalasePage() {
  const router = useRouter();
  const [sections, setSections] = useState<EtalaseSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadEtalase();
  }, []);

  const loadEtalase = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/etalase');
      if (res.ok) {
        const data = await res.json();
        setSections(Array.isArray(data) ? data.sort((a: EtalaseSection, b: EtalaseSection) => a.sortOrder - b.sortOrder) : []);
      } else {
        setError('Gagal memuat konfigurasi etalase');
      }
    } catch {
      setError('Gagal memuat konfigurasi etalase');
    } finally {
      setLoading(false);
    }
  };

  const saveSections = async (newSections: EtalaseSection[]) => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/etalase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections: newSections }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Gagal menyimpan');
      } else {
        setError('');
      }
    } catch {
      setError('Terjadi kesalahan saat menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newSections = [...sections];
    const temp = newSections[index];
    newSections[index] = newSections[index - 1];
    newSections[index - 1] = temp;
    newSections.forEach((s, i) => (s.sortOrder = i + 1));
    setSections(newSections);
    saveSections(newSections);
  };

  const moveDown = (index: number) => {
    if (index === sections.length - 1) return;
    const newSections = [...sections];
    const temp = newSections[index];
    newSections[index] = newSections[index + 1];
    newSections[index + 1] = temp;
    newSections.forEach((s, i) => (s.sortOrder = i + 1));
    setSections(newSections);
    saveSections(newSections);
  };

  const toggleEnabled = (index: number) => {
    const newSections = [...sections];
    newSections[index] = { ...newSections[index], enabled: !newSections[index].enabled };
    setSections(newSections);
    saveSections(newSections);
  };

  const removeSection = (index: number) => {
    if (!confirm('Hapus etalase ini?')) return;
    const newSections = sections.filter((_, i) => i !== index);
    newSections.forEach((s, i) => (s.sortOrder = i + 1));
    setSections(newSections);
    saveSections(newSections);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="inline-flex items-center gap-2 text-sm text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          Memuat etalase...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Etalase</h1>
          <p className="text-sm text-gray-500 mt-1">
            Atur section produk yang tampil di homepage
          </p>
        </div>
        <button
          onClick={() => router.push('/admin/etalase/new')}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Tambah Etalase
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {saving && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-sm text-blue-600 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Menyimpan perubahan...
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-5 py-3">Etalase</th>
                <th className="px-5 py-3">Tipe</th>
                <th className="px-5 py-3 text-center">Produk</th>
                <th className="px-5 py-3 text-center">Status</th>
                <th className="px-5 py-3 text-center">Flash Sale</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sections.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-gray-400">
                    <LayoutGrid className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                    <p>Belum ada etalase</p>
                    <p className="text-xs mt-1">Klik "Tambah Etalase" untuk membuat section baru</p>
                  </td>
                </tr>
              ) : (
                sections.map((section, index) => (
                  <tr key={section.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                          <DynamicIcon name={section.icon} className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{section.title}</p>
                          <p className="text-xs text-gray-400">ID: {section.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {section.type}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center text-gray-700">
                      {section.products.length}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <button
                        onClick={() => toggleEnabled(index)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                          section.enabled
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${section.enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
                        {section.enabled ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </td>
                    <td className="px-5 py-3 text-center">
                      {section.isFlashSale ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                          <Zap className="w-3 h-3" />
                          Aktif
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
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
                          disabled={index === sections.length - 1}
                          className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 disabled:opacity-30 transition-colors"
                          title="Turun"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => router.push(`/admin/etalase/${section.id}/edit`)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeSection(index)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
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
    </div>
  );
}
