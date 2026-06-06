'use client';

import { useState, useEffect } from 'react';
import { Save, Store, Search, CreditCard, Truck } from 'lucide-react';
import ImageUpload from '@/app/components/admin/ImageUpload';
import NumberInput from '@/app/components/ui/NumberInput';

interface Settings {
  storeName: string;
  storeLogo: string;
  storeDescription: string;
  contactPhone: string;
  contactEmail: string;
  contactWhatsApp: string;
  storeAddress: string;
  seo: {
    metaTitle: string;
    metaDescription: string;
    faviconUrl: string;
  };
  payment: {
    midtransClientKey: string;
    midtransEnvironment: 'sandbox' | 'live';
    enableCOD: boolean;
  };
  shipping: {
    enableFreeShipping: boolean;
    freeShippingMinOrder: number;
    defaultShippingCity: string;
  };
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Pengaturan berhasil disimpan' });
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Gagal menyimpan pengaturan' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Terjadi kesalahan saat menyimpan' });
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof Settings, value: string) => {
    setSettings((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const updateNested = (section: 'seo' | 'payment' | 'shipping', field: string, value: any) => {
    setSettings((prev) =>
      prev ? { ...prev, [section]: { ...prev[section], [field]: value } } : prev
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!settings) {
    return <div className="text-sm text-gray-500">Gagal memuat pengaturan</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pengaturan</h1>
        <p className="text-sm text-gray-500 mt-1">
          Kelola pengaturan toko, SEO, pembayaran, dan pengiriman
        </p>
      </div>

      {message && (
        <div
          className={`rounded-xl border p-4 text-sm ${
            message.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Store Settings */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Store className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="text-base font-semibold text-gray-900">Informasi Toko</h2>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nama Toko</label>
            <input
              type="text"
              value={settings.storeName}
              onChange={(e) => updateField('storeName', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
          </div>
          <div className="md:col-span-2">
            <ImageUpload
              value={settings.storeLogo}
              onChange={(url) => updateField('storeLogo', url)}
              folder="store"
              label="Logo Toko"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Deskripsi</label>
            <textarea
              value={settings.storeDescription}
              onChange={(e) => updateField('storeDescription', e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">No. Telepon</label>
            <input
              type="text"
              value={settings.contactPhone}
              onChange={(e) => updateField('contactPhone', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input
              type="email"
              value={settings.contactEmail}
              onChange={(e) => updateField('contactEmail', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">WhatsApp</label>
            <input
              type="text"
              value={settings.contactWhatsApp}
              onChange={(e) => updateField('contactWhatsApp', e.target.value)}
              placeholder="6281234567890"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Alamat</label>
            <textarea
              value={settings.storeAddress}
              onChange={(e) => updateField('storeAddress', e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white resize-none"
            />
          </div>
        </div>
      </div>

      {/* SEO Settings */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="p-2 bg-purple-50 rounded-lg">
            <Search className="w-5 h-5 text-purple-600" />
          </div>
          <h2 className="text-base font-semibold text-gray-900">SEO</h2>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Meta Title</label>
            <input
              type="text"
              value={settings.seo.metaTitle}
              onChange={(e) => updateNested('seo', 'metaTitle', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Meta Description</label>
            <textarea
              value={settings.seo.metaDescription}
              onChange={(e) => updateNested('seo', 'metaDescription', e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white resize-none"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Favicon URL</label>
            <input
              type="text"
              value={settings.seo.faviconUrl}
              onChange={(e) => updateNested('seo', 'faviconUrl', e.target.value)}
              placeholder="https://example.com/favicon.ico"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
          </div>
        </div>
      </div>

      {/* Payment Settings */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="p-2 bg-green-50 rounded-lg">
            <CreditCard className="w-5 h-5 text-green-600" />
          </div>
          <h2 className="text-base font-semibold text-gray-900">Pembayaran</h2>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Midtrans Client Key
            </label>
            <input
              type="text"
              value={settings.payment.midtransClientKey}
              onChange={(e) => updateNested('payment', 'midtransClientKey', e.target.value)}
              placeholder="Midtrans Client Key"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
            <p className="text-xs text-gray-400 mt-1">
              Client key untuk integrasi Midtrans (Server Key tetap di environment variable).
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Midtrans Environment
            </label>
            <select
              value={settings.payment.midtransEnvironment}
              onChange={(e) =>
                updateNested('payment', 'midtransEnvironment', e.target.value)
              }
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="sandbox">Sandbox</option>
              <option value="live">Live</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            <input
              id="enableCOD"
              type="checkbox"
              checked={settings.payment.enableCOD}
              onChange={(e) => updateNested('payment', 'enableCOD', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="enableCOD" className="text-sm font-medium text-gray-700">
              Aktifkan COD (Cash on Delivery)
            </label>
          </div>
        </div>
      </div>

      {/* Shipping Settings */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="p-2 bg-orange-50 rounded-lg">
            <Truck className="w-5 h-5 text-orange-600" />
          </div>
          <h2 className="text-base font-semibold text-gray-900">Pengiriman</h2>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="flex items-center gap-3 md:col-span-2">
            <input
              id="enableFreeShipping"
              type="checkbox"
              checked={settings.shipping.enableFreeShipping}
              onChange={(e) =>
                updateNested('shipping', 'enableFreeShipping', e.target.checked)
              }
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="enableFreeShipping" className="text-sm font-medium text-gray-700">
              Aktifkan Gratis Ongkir
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Minimum Order Gratis Ongkir (Rp)
            </label>
            <NumberInput
              value={settings.shipping.freeShippingMinOrder}
              onChange={(val) =>
                updateNested('shipping', 'freeShippingMinOrder', Number(val))
              }
              min={0}
              prefix="Rp"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Kota Pengiriman Default
            </label>
            <input
              type="text"
              value={settings.shipping.defaultShippingCity}
              onChange={(e) =>
                updateNested('shipping', 'defaultShippingCity', e.target.value)
              }
              placeholder="Jakarta"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
        >
          {saving ? (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              Menyimpan...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Simpan Pengaturan
            </>
          )}
        </button>
      </div>
    </div>
  );
}
