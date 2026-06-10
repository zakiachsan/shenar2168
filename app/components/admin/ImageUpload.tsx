'use client';

import { useRef, useState } from 'react';
import { Upload, Loader2, X, ImagePlus, Plus, ArrowUp, ArrowDown } from 'lucide-react';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  label?: string;
  className?: string;
  recommendedSize?: string;
}

export default function ImageUpload({
  value,
  onChange,
  folder = 'general',
  label = 'Gambar',
  className = '',
  recommendedSize = '800 x 800 px',
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Gagal upload gambar');
        return;
      }

      onChange(data.url);
    } catch (err: any) {
      setError(err.message || 'Gagal upload gambar');
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    onChange('');
    setError('');
  };

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>

      {value ? (
        <div className="relative w-full max-w-[320px]">
          <img
            src={value}
            alt="Preview"
            className="w-full h-48 object-contain bg-gray-100 rounded-lg border border-gray-200"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-sm"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex flex-col items-center justify-center w-full max-w-[320px] h-48 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          ) : (
            <>
              <ImagePlus className="w-6 h-6 text-gray-400 mb-1" />
              <span className="text-xs text-gray-500">Klik untuk upload</span>
            </>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        className="hidden"
      />

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      <p className="text-xs text-gray-400 mt-1">Format: JPG, PNG, WEBP, GIF. Maks 1MB. Rekomendasi: {recommendedSize}.</p>
    </div>
  );
}

interface MultiImageUploadProps {
  values: string[];
  onChange: (urls: string[]) => void;
  folder?: string;
  label?: string;
}

export function MultiImageUpload({
  values,
  onChange,
  folder = 'products',
  label = 'Gambar Produk',
}: MultiImageUploadProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<number, string>>({});

  const handleFileChange = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingIndex(index);
    setErrors((prev) => ({ ...prev, [index]: '' }));

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setErrors((prev) => ({ ...prev, [index]: data.error || 'Gagal upload' }));
        return;
      }

      const newValues = [...values];
      newValues[index] = data.url;
      onChange(newValues);
    } catch (err: any) {
      setErrors((prev) => ({ ...prev, [index]: err.message || 'Gagal upload' }));
    } finally {
      setUploadingIndex(null);
      if (inputRefs.current[index]) {
        inputRefs.current[index]!.value = '';
      }
    }
  };

  const handleRemove = (index: number) => {
    const newValues = values.filter((_, i) => i !== index);
    onChange(newValues);
    setErrors((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const handleAdd = () => {
    onChange([...values, '']);
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newValues = [...values];
    const temp = newValues[index];
    newValues[index] = newValues[index - 1];
    newValues[index - 1] = temp;
    onChange(newValues);
  };

  const moveDown = (index: number) => {
    if (index === values.length - 1) return;
    const newValues = [...values];
    const temp = newValues[index];
    newValues[index] = newValues[index + 1];
    newValues[index + 1] = temp;
    onChange(newValues);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>

      <div className="space-y-3">
        {values.map((url, idx) => (
          <div key={idx} className="flex items-start gap-3">
            <div className="w-40 h-40 rounded-lg border border-gray-200 flex-shrink-0 overflow-hidden bg-gray-50">
              {url ? (
                <img src={url} alt={`Preview ${idx + 1}`} className="w-full h-full object-contain bg-gray-100" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  {uploadingIndex === idx ? (
                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                  ) : (
                    <ImagePlus className="w-5 h-5 text-gray-300" />
                  )}
                </div>
              )}
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => inputRefs.current[idx]?.click()}
                  disabled={uploadingIndex === idx}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors disabled:opacity-50"
                >
                  <Upload className="w-3 h-3" />
                  {url ? 'Ganti' : 'Upload'}
                </button>
                {url && (
                  <button
                    type="button"
                    onClick={() => handleRemove(idx)}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Hapus"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => moveUp(idx)}
                  disabled={idx === 0}
                  className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30"
                  title="Naik"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => moveDown(idx)}
                  disabled={idx === values.length - 1}
                  className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30"
                  title="Turun"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                {idx === 0 && url && (
                  <span className="text-xs text-blue-600 font-medium">Gambar Utama</span>
                )}
              </div>
              {errors[idx] && <p className="text-xs text-red-500">{errors[idx]}</p>}
              <input
                ref={(el) => { inputRefs.current[idx] = el; }}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => handleFileChange(idx, e)}
                className="hidden"
              />
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={handleAdd}
        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-gray-300 text-gray-600 rounded-lg text-xs font-medium hover:border-gray-400 hover:bg-gray-50 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Tambah Gambar
      </button>

      <p className="text-xs text-gray-400 mt-2">Format: JPG, PNG, WEBP, GIF. Maks 1MB per gambar. Rekomendasi: 800 x 800 px.</p>
    </div>
  );
}
