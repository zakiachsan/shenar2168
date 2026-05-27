'use client';

import { useState, useMemo, useRef } from 'react';
import { Trash2, Package, Upload, Loader2, X } from 'lucide-react';
import NumberInput from '@/app/components/ui/NumberInput';

export interface FormVariation {
  id?: number;
  attributes: { name: string; option: string }[];
  regular_price: string;
  sale_price: string;
  stock_quantity: string;
  sku: string;
  image?: string;
  _deleted?: boolean;
}

interface ProductAttribute {
  id?: number;
  name: string;
  options: string[];
  visible: boolean;
  variation: boolean;
}

interface VariationManagerProps {
  attributes: ProductAttribute[];
  variations: FormVariation[];
  onChange: (variations: FormVariation[]) => void;
}

export default function VariationManager({ attributes, variations, onChange }: VariationManagerProps) {
  const [bulkPrice, setBulkPrice] = useState('');
  const [bulkStock, setBulkStock] = useState('');
  const [bulkSkuPrefix, setBulkSkuPrefix] = useState('');

  const variationAttrs = useMemo(
    () => attributes.filter((a) => a.variation && a.name.trim() && a.options.length > 0),
    [attributes]
  );

  const activeVariations = useMemo(
    () => variations.filter((v) => !v._deleted),
    [variations]
  );

  const updateVariation = (index: number, field: keyof FormVariation, value: any) => {
    const next = [...variations];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  };

  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleVariationUpload = async (index: number, file: File) => {
    setUploadingIdx(index);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'products');

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        const next = [...variations];
        next[index] = { ...next[index], image: data.url };
        onChange(next);
      }
    } catch (e) {
      console.error('Upload error:', e);
    } finally {
      setUploadingIdx(null);
      if (fileInputRefs.current[index]) {
        fileInputRefs.current[index]!.value = '';
      }
    }
  };

  const removeVariation = (index: number) => {
    const next = [...variations];
    const v = next[index];
    if (v.id && v.id > 0) {
      next[index] = { ...v, _deleted: true };
    } else {
      next.splice(index, 1);
    }
    onChange(next);
  };

  const applyBulk = () => {
    const next = variations.map((v) => {
      if (v._deleted) return v;
      return {
        ...v,
        regular_price: bulkPrice || v.regular_price,
        stock_quantity: bulkStock || v.stock_quantity,
        sku: bulkSkuPrefix
          ? `${bulkSkuPrefix}-${v.attributes.map((a) => a.option).join('-')}`
          : v.sku,
      };
    });
    onChange(next);
  };

  if (variationAttrs.length === 0) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-700">
        <p>Tambahkan atribut dengan opsi &quot;Digunakan untuk varian&quot; aktif untuk mengelola varian.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Variation count info */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">
          {variationAttrs.length} atribut varian
        </span>
        <span className="inline-flex items-center px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs font-medium">
          {activeVariations.length} kombinasi varian
        </span>
      </div>

      {/* Bulk Edit */}
      {activeVariations.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Set Massal</h4>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Harga Regular</label>
              <NumberInput
                value={bulkPrice}
                onChange={setBulkPrice}
                prefix="Rp"
                placeholder="0"
                min={0}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Stok</label>
              <NumberInput
                value={bulkStock}
                onChange={setBulkStock}
                placeholder="0"
                min={0}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Prefix SKU</label>
              <input
                type="text"
                value={bulkSkuPrefix}
                onChange={(e) => setBulkSkuPrefix(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="SKU-"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={applyBulk}
                className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Terapkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Variations Table */}
      {activeVariations.length > 0 ? (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {variationAttrs.map((attr) => (
                  <th key={attr.name} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {attr.name}
                  </th>
                ))}
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Harga Regular
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Harga Diskon
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Stok
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Gambar
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {variations.map((v, idx) => {
                if (v._deleted) return null;
                return (
                  <tr key={idx} className="hover:bg-gray-50">
                    {variationAttrs.map((attr) => {
                      const match = v.attributes.find((a) => a.name === attr.name);
                      return (
                        <td key={attr.name} className="px-4 py-2.5 text-gray-700 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded text-xs font-medium">
                            {match?.option || '-'}
                          </span>
                        </td>
                      );
                    })}
                    <td className="px-4 py-2.5">
                      <NumberInput
                        value={v.regular_price}
                        onChange={(val) => updateVariation(idx, 'regular_price', val)}
                        prefix="Rp"
                        placeholder="0"
                        min={0}
                        className="w-28 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <NumberInput
                        value={v.sale_price}
                        onChange={(val) => updateVariation(idx, 'sale_price', val)}
                        prefix="Rp"
                        placeholder="0"
                        min={0}
                        className="w-28 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <NumberInput
                        value={v.stock_quantity}
                        onChange={(val) => updateVariation(idx, 'stock_quantity', val)}
                        placeholder="0"
                        min={0}
                        className="w-20 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="text"
                        value={v.sku}
                        onChange={(e) => updateVariation(idx, 'sku', e.target.value)}
                        className="w-32 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="SKU"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        {v.image ? (
                          <div className="relative">
                            <img src={v.image} alt="" className="w-8 h-8 rounded object-cover border border-gray-200" />
                            <button
                              type="button"
                              onClick={() => {
                                const next = [...variations];
                                next[idx] = { ...next[idx], image: '' };
                                onChange(next);
                              }}
                              className="absolute -top-1 -right-1 p-0.5 bg-red-500 text-white rounded-full hover:bg-red-600"
                            >
                              <X className="w-2 h-2" />
                            </button>
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center border border-gray-200">
                            {uploadingIdx === idx ? (
                              <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                            ) : (
                              <Package className="w-4 h-4 text-gray-300" />
                            )}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => fileInputRefs.current[idx]?.click()}
                          disabled={uploadingIdx === idx}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs font-medium hover:bg-blue-100 transition-colors disabled:opacity-50"
                        >
                          <Upload className="w-3 h-3" />
                          {v.image ? 'Ganti' : 'Upload'}
                        </button>
                        <input
                          ref={(el) => { fileInputRefs.current[idx] = el; }}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleVariationUpload(idx, file);
                          }}
                          className="hidden"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => removeVariation(idx)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-gray-200 rounded-lg">
          <Package className="w-8 h-8 text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">Belum ada varian</p>
          <p className="text-xs text-gray-400 mt-1">Tambahkan pilihan di atribut varian untuk membuat kombinasi</p>
        </div>
      )}
    </div>
  );
}
