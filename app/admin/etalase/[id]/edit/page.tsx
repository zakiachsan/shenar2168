'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import EtalaseForm from '@/app/components/admin/EtalaseForm';

export default function EditEtalasePage() {
  const params = useParams();
  const id = params.id as string;
  const [etalase, setEtalase] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/etalase/${id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Etalase tidak ditemukan');
        const data = await res.json();
        setEtalase(data);
      })
      .catch(() => setError('Gagal memuat data etalase'))
      .finally(() => setLoading(false));
  }, [id]);

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

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600 flex items-center gap-2">
        <AlertCircle className="w-4 h-4" />
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Edit Etalase</h1>
        <p className="text-sm text-gray-500 mt-1">Ubah konfigurasi section etalase</p>
      </div>
      <EtalaseForm initialData={etalase} />
    </div>
  );
}
