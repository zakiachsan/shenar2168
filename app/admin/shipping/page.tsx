'use client';

import { useState, useEffect } from 'react';
import { Save, Truck } from 'lucide-react';

interface Courier {
  code: string;
  name: string;
  services: string[];
}

const ALL_COURIERS: Courier[] = [
  { code: 'jne', name: 'JNE', services: ['Reguler', 'OKE', 'Jumbo'] },
  { code: 'jnt', name: 'J&T', services: ['EZ', 'OXY'] },
  { code: 'sicepat', name: 'SiCepat', services: ['REG', 'Halu'] },
  { code: 'anteraja', name: 'AnterAja', services: ['Regular', 'Next Day', 'Same Day'] },
  { code: 'ninja', name: 'Ninja Express', services: ['Standard', 'Express'] },
  { code: 'gojek', name: 'GoSend', services: ['Instant', 'Sameday'] },
  { code: 'grab', name: 'GrabExpress', services: ['Instant', 'Sameday'] },
];

export default function AdminShippingPage() {
  const [enabledCouriers, setEnabledCouriers] = useState<string[]>([]);
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
        setEnabledCouriers(data.shipping?.enabledCouriers || []);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleCourier = (code: string) => {
    setEnabledCouriers((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      // First get current settings to merge
      const getRes = await fetch('/api/admin/settings');
      const current = await getRes.json();

      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...current,
          shipping: {
            ...current.shipping,
            enabledCouriers,
          },
        }),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Pengaturan pengiriman berhasil disimpan' });
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Gagal menyimpan' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Terjadi kesalahan saat menyimpan' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pengiriman</h1>
        <p className="text-sm text-gray-500 mt-1">
          Aktifkan atau nonaktifkan ekspedisi yang tersedia saat checkout
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

      {/* Courier List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="p-2 bg-orange-50 rounded-lg">
            <Truck className="w-5 h-5 text-orange-600" />
          </div>
          <h2 className="text-base font-semibold text-gray-900">Ekspedisi</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {ALL_COURIERS.map((courier) => {
            const isEnabled = enabledCouriers.includes(courier.code);
            return (
              <div
                key={courier.code}
                className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                    isEnabled ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {courier.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${isEnabled ? 'text-gray-900' : 'text-gray-400'}`}>
                      {courier.name}
                    </p>
                    <p className={`text-xs ${isEnabled ? 'text-gray-400' : 'text-gray-300'}`}>
                      {courier.services.join(', ')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isEnabled}
                  onClick={() => toggleCourier(courier.code)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                    isEnabled ? 'bg-orange-500' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
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
