'use client';

import { useState, useEffect } from 'react';
import { Save, Coins, Percent, Banknote, ShoppingCart, AlertCircle, CheckCircle } from 'lucide-react';
import NumberInput from '@/app/components/ui/NumberInput';

interface PointsSettings {
  enabled: boolean;
  type: 'percent' | 'fixed';
  value: number;
  minOrder: number;
  maxPoints: number;
  caption: string;
}

export default function AdminPointsPage() {
  const [settings, setSettings] = useState<PointsSettings | null>(null);
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
        setSettings(data.points || {
          enabled: true,
          type: 'percent',
          value: 1,
          minOrder: 0,
          maxPoints: 0,
          caption: 'Dapatkan 1% cashback dari setiap pembelian',
        });
      }
    } catch (err) {
      console.error('Failed to load points settings:', err);
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
        body: JSON.stringify({ points: settings }),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Pengaturan poin berhasil disimpan' });
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

  const updateField = <K extends keyof PointsSettings>(field: K, value: PointsSettings[K]) => {
    setSettings((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!settings) {
    return <div className="text-sm text-gray-500">Gagal memuat pengaturan poin</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pengaturan Poin</h1>
        <p className="text-sm text-gray-500 mt-1">
          Kelola aturan pemberian koin / loyalty points untuk pembeli
        </p>
      </div>

      {message && (
        <div
          className={`rounded-xl border p-4 text-sm flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {/* Points Config Card */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="p-2 bg-amber-50 rounded-lg">
            <Coins className="w-5 h-5 text-amber-600" />
          </div>
          <h2 className="text-base font-semibold text-gray-900">Konfigurasi Poin</h2>
        </div>

        <div className="p-5 space-y-6">
          {/* Enabled Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Aktifkan Sistem Poin</p>
              <p className="text-xs text-gray-500">Pembeli akan mendapatkan koin saat checkout berhasil</p>
            </div>
            <button
              type="button"
              onClick={() => updateField('enabled', !settings.enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.enabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {settings.enabled && (
            <>
              {/* Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipe Perhitungan Poin
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => updateField('type', 'percent')}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-colors ${
                      settings.type === 'percent'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Percent className="w-5 h-5" />
                    <div>
                      <p className="text-sm font-medium">Persentase dari Total</p>
                      <p className="text-xs opacity-80">Contoh: 1% dari Rp100.000 = 1.000 poin</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateField('type', 'fixed')}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-colors ${
                      settings.type === 'fixed'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Banknote className="w-5 h-5" />
                    <div>
                      <p className="text-sm font-medium">Fix Point Langsung</p>
                      <p className="text-xs opacity-80">Contoh: Setiap transaksi dapat 500 poin</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Value */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {settings.type === 'percent' ? 'Persentase Cashback (%)' : 'Jumlah Fix Point'}
                </label>
                <NumberInput
                  value={settings.value}
                  onChange={(val) => updateField('value', Number(val))}
                  min={0}
                  suffix={settings.type === 'percent' ? '%' : 'poin'}
                />
                <p className="text-xs text-gray-400 mt-1">
                  {settings.type === 'percent'
                    ? 'Masukkan angka persentase (contoh: 1 untuk 1%, 5 untuk 5%)'
                    : 'Masukkan jumlah poin tetap yang didapat per transaksi'}
                </p>
              </div>

              {/* Min Order */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Minimal Transaksi
                </label>
                <NumberInput
                  value={settings.minOrder}
                  onChange={(val) => updateField('minOrder', Number(val))}
                  min={0}
                  suffix="Rp"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Pembeli hanya mendapat poin jika total transaksi mencapai minimal ini. Kosongkan atau 0 untuk tanpa minimum.
                </p>
              </div>

              {/* Max Points */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Maksimal Poin per Transaksi
                </label>
                <NumberInput
                  value={settings.maxPoints}
                  onChange={(val) => updateField('maxPoints', Number(val))}
                  min={0}
                  suffix="poin"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Batas maksimal poin yang bisa didapat dalam satu transaksi. Kosongkan atau 0 untuk tidak dibatasi.
                </p>
              </div>

              {/* Caption */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Caption / Deskripsi
                </label>
                <input
                  type="text"
                  value={settings.caption}
                  onChange={(e) => updateField('caption', e.target.value)}
                  placeholder="Dapatkan 1% cashback dari setiap pembelian"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Teks ini akan ditampilkan ke pembeli di halaman koin.
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Preview */}
      {settings.enabled && (
        <div className="bg-blue-50 rounded-xl border border-blue-100 p-5">
          <h3 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            Contoh Perhitungan
          </h3>
          <div className="space-y-1 text-sm text-blue-700">
            <p>
              • Total transaksi: <strong>Rp100.000</strong>
            </p>
            <p>
              • Minimal transaksi: <strong>Rp{settings.minOrder.toLocaleString('id-ID')}</strong>
            </p>
            {settings.type === 'percent' ? (
              <>
                <p>
                  • Poin didapat: <strong>Rp100.000 × {settings.value}% = {(100000 * (settings.value / 100)).toLocaleString('id-ID')} poin</strong>
                </p>
                {settings.maxPoints > 0 && (
                  <p>
                    • Setelah dibatasi maksimal: <strong>{Math.min(Math.floor(100000 * (settings.value / 100)), settings.maxPoints).toLocaleString('id-ID')} poin</strong>
                  </p>
                )}
              </>
            ) : (
              <>
                <p>
                  • Poin didapat: <strong>{settings.value.toLocaleString('id-ID')} poin</strong>
                </p>
                {settings.maxPoints > 0 && settings.value > settings.maxPoints && (
                  <p>
                    • Setelah dibatasi maksimal: <strong>{settings.maxPoints.toLocaleString('id-ID')} poin</strong>
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}

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
