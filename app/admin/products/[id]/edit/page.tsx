'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Save, ImagePlus, Loader2, Trash2, X, ArrowUp, ArrowDown, Plus, Lock, LockOpen } from 'lucide-react';
import VariationManager, { FormVariation } from '../../components/VariationManager';
import { MultiImageUpload } from '@/app/components/admin/ImageUpload';
import NumberInput from '@/app/components/ui/NumberInput';
import { stripHtml } from '@/lib/data';

interface Category {
  id: number;
  name: string;
  slug: string;
}

function OptionRow({
  value,
  index,
  onChange,
  onRemove,
}: {
  value: string;
  index: number;
  onChange: (val: string) => void;
  onRemove: () => void;
}) {
  const [unlocked, setUnlocked] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={!unlocked}
        className={`flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
          unlocked
            ? 'border-gray-300 bg-white'
            : 'border-gray-200 bg-gray-100 text-gray-600 cursor-not-allowed'
        }`}
        placeholder={`Pilihan ${index + 1}`}
      />
      <button
        type="button"
        onClick={() => setUnlocked(!unlocked)}
        className={`p-2 rounded-lg transition-colors ${
          unlocked
            ? 'text-amber-600 hover:bg-amber-50 bg-amber-50'
            : 'text-gray-400 hover:text-amber-600 hover:bg-amber-50'
        }`}
        title={unlocked ? 'Kunci pilihan' : 'Buka kunci untuk edit'}
      >
        {unlocked ? <LockOpen className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        title="Hapus pilihan"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function AddOptionInput({ onAdd }: { onAdd: (value: string) => void }) {
  const [value, setValue] = useState('');

  const handleSubmit = () => {
    if (value.trim()) {
      onAdd(value.trim());
      setValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex items-center gap-2 mt-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        placeholder="Tambah pilihan baru..."
      />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!value.trim()}
        className="inline-flex items-center gap-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors disabled:opacity-50"
      >
        <Plus className="w-4 h-4" />
        Tambah
      </button>
    </div>
  );
}

interface ProductAttribute {
  id?: number;
  name: string;
  options: string[];
  visible: boolean;
  variation: boolean;
}

function generateCombinations(attrs: ProductAttribute[]): { name: string; option: string }[][] {
  const variationAttrs = attrs.filter((a) => a.variation && a.name.trim() && a.options.length > 0);
  if (variationAttrs.length === 0) return [];

  const result: { name: string; option: string }[][] = [];

  function cartesian(index: number, current: { name: string; option: string }[]) {
    if (index === variationAttrs.length) {
      result.push([...current]);
      return;
    }
    for (const opt of variationAttrs[index].options) {
      current.push({ name: variationAttrs[index].name, option: opt });
      cartesian(index + 1, current);
      current.pop();
    }
  }

  cartesian(0, []);
  return result;
}

function comboKey(combo: { name: string; option: string }[]): string {
  return combo.map((a) => `${a.name}:${a.option}`).sort().join('|');
}

function syncVariations(
  attrs: ProductAttribute[],
  currentVariations: FormVariation[]
): FormVariation[] {
  const combos = generateCombinations(attrs);
  if (combos.length === 0) return [];

  const existingMap = new Map<string, FormVariation>();
  for (const v of currentVariations) {
    if (!v._deleted) {
      existingMap.set(comboKey(v.attributes), v);
    }
  }

  const newVariations: FormVariation[] = [];
  for (const combo of combos) {
    const key = comboKey(combo);
    const existing = existingMap.get(key);
    if (existing) {
      newVariations.push(existing);
    } else {
      newVariations.push({
        attributes: combo,
        regular_price: '',
        sale_price: '',
        stock_quantity: '',
        sku: '',
      });
    }
  }
  return newVariations;
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [regularPrice, setRegularPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [salePriceEnabled, setSalePriceEnabled] = useState(false);
  const [description, setDescription] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [sku, setSku] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [manageStock, setManageStock] = useState(true);
  const [status, setStatus] = useState('draft');
  const [featured, setFeatured] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>(['']);
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [variations, setVariations] = useState<FormVariation[]>([]);
  const [useVariant, setUseVariant] = useState(false);
  const preservedVariationsRef = useRef<FormVariation[]>([]);

  // Computed: does this product have active variations?
  const hasVariations = useVariant && attributes.some(
    (a) => a.variation && a.name.trim() && a.options.length > 0
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [catRes, prodRes] = await Promise.all([
        fetch('/api/admin/categories'),
        fetch(`/api/admin/products/${productId}`),
      ]);

      if (catRes.ok) {
        const data = await catRes.json();
        setCategories(Array.isArray(data) ? data : []);
      }

      if (prodRes.ok) {
        const product = await prodRes.json();

        if (product && product.id) {
          setName(product.name || '');
          setUseVariant(product.type === 'variable');
          setRegularPrice(product.regular_price || '');
          setSalePrice(product.sale_price || '');
          setSalePriceEnabled(!!product.sale_price);
          setDescription(stripHtml(product.description || ''));
          setShortDescription(stripHtml(product.short_description || ''));
          setSku(product.sku || '');
          setStockQuantity(String(product.stock_quantity ?? ''));
          setManageStock(product.manage_stock !== false);
          setStatus(product.status || 'draft');
          setFeatured(product.featured || false);
          setSelectedCategories((product.categories || []).map((c: any) => c.id));
          setImageUrls(product.images?.map((img: any) => img.src) || []);
          setAttributes(
            (product.attributes || []).map((attr: any) => ({
              id: attr.id,
              name: attr.name || '',
              options: Array.isArray(attr.options) ? attr.options : [],
              visible: attr.visible !== false,
              variation: attr.variation === true,
            }))
          );
          // Load variations
          const loadedVariations: FormVariation[] = (product.variations || [])
            .filter((v: any) => v && v.id)
            .map((v: any) => ({
              id: v.id,
              attributes: Array.isArray(v.attributes)
                ? v.attributes.map((a: any) => ({ name: a.name || '', option: a.option || '' }))
                : [],
              regular_price: v.regular_price || '',
              sale_price: v.sale_price || '',
              stock_quantity: v.stock_quantity !== undefined && v.stock_quantity !== null ? String(v.stock_quantity) : '',
              sku: v.sku || '',
              image: v.image?.src || '',
            }));
          setVariations(loadedVariations);
          preservedVariationsRef.current = loadedVariations;
        } else {
          setNotFound(true);
        }
      } else {
        setNotFound(true);
      }
    } catch (err) {
      console.error('Failed to load product:', err);
      setError('Gagal memuat data produk');
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (id: number) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  // Attribute handlers with auto-sync variations
  const setAttributesAndSync = useCallback((newAttributes: ProductAttribute[]) => {
    setAttributes(newAttributes);
    if (useVariant) {
      setVariations((prev) => syncVariations(newAttributes, prev));
    }
  }, [useVariant]);

  const addAttribute = () => {
    setAttributesAndSync([...attributes, { name: '', options: [], visible: true, variation: true }]);
  };

  const addOption = (attrIndex: number, value: string) => {
    if (!value.trim()) return;
    const next = [...attributes];
    next[attrIndex] = { ...next[attrIndex], options: [...next[attrIndex].options, value.trim()] };
    setAttributesAndSync(next);
  };

  const removeOption = (attrIndex: number, optIndex: number) => {
    const next = [...attributes];
    next[attrIndex] = { ...next[attrIndex], options: next[attrIndex].options.filter((_, i) => i !== optIndex) };
    setAttributesAndSync(next);
  };

  const updateOption = (attrIndex: number, optIndex: number, value: string) => {
    const next = [...attributes];
    const newOptions = [...next[attrIndex].options];
    newOptions[optIndex] = value;
    next[attrIndex] = { ...next[attrIndex], options: newOptions };
    setAttributesAndSync(next);
  };

  const updateAttribute = (index: number, field: keyof ProductAttribute, value: any) => {
    const next = [...attributes];
    next[index] = { ...next[index], [field]: value };
    setAttributesAndSync(next);
  };

  const removeAttribute = (index: number) => {
    setAttributesAndSync(attributes.filter((_, i) => i !== index));
  };

  const addImage = () => setImageUrls((prev) => [...prev, '']);
  const removeImage = (index: number) => setImageUrls((prev) => prev.filter((_, i) => i !== index));
  const updateImage = (index: number, value: string) =>
    setImageUrls((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  const moveImage = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === imageUrls.length - 1) return;
    setImageUrls((prev) => {
      const next = [...prev];
      const swapIndex = direction === 'up' ? index - 1 : index + 1;
      [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const payload: any = {
        id: parseInt(productId),
        name,
        type: useVariant ? 'variable' : 'simple',
        status,
        featured,
        description,
        short_description: shortDescription,
      };

      if (!useVariant) {
        payload.regular_price = regularPrice;
        payload.sku = sku;
        if (salePriceEnabled && salePrice) {
          payload.sale_price = salePrice;
        } else {
          payload.sale_price = '';
        }
        if (manageStock) {
          payload.stock_quantity = stockQuantity ? parseInt(stockQuantity) : 0;
          payload.manage_stock = true;
        } else {
          payload.manage_stock = false;
        }
      } else {
        // Variable product: parent price is 0, sku empty
        payload.regular_price = '0';
        payload.sku = '';
        payload.stock_quantity = 0;
        payload.manage_stock = false;
      }

      if (selectedCategories.length > 0) {
        payload.categories = selectedCategories;
      }

      payload.images = imageUrls.filter(Boolean).map((src) => ({ src }));

      payload.attributes = attributes.map((attr) => ({
        id: attr.id || 0,
        name: attr.name,
        options: attr.options.filter(Boolean),
        visible: attr.visible,
        variation: attr.variation,
      }));

      if (useVariant) {
        payload.variations = variations.map((v) => ({
          id: v.id,
          attributes: v.attributes,
          regular_price: v.regular_price,
          sale_price: v.sale_price || undefined,
          stock_quantity: v.stock_quantity ? parseInt(v.stock_quantity) : 0,
          manage_stock: true,
          sku: v.sku,
          image: v.image ? { src: v.image } : undefined,
          _deleted: v._deleted,
        }));
      }

      const res = await fetch('/api/admin/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Gagal menyimpan produk');
        setSaving(false);
        return;
      }

      router.push('/admin/products');
    } catch (err: any) {
      setError('Terjadi kesalahan: ' + err.message);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Memuat produk...</span>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400 text-sm">Produk tidak ditemukan</p>
        <button
          onClick={() => router.push('/admin/products')}
          className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Kembali ke daftar produk
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Produk</h1>
            <p className="text-sm text-gray-500 mt-1">ID: {productId}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="space-y-6">
            {/* Basic Info */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h2 className="text-base font-semibold text-gray-900 pb-2 border-b border-gray-100">
                Informasi Dasar
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nama Produk <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Masukkan nama produk"
                  required
                />
              </div>

              {/* Variant Toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <p className="text-sm font-medium text-gray-900">Gunakan Varian</p>
                  <p className="text-xs text-gray-500">
                    {useVariant
                      ? 'Harga, stok, dan SKU diatur per varian'
                      : 'Produk dengan harga, stok, dan SKU tunggal'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                      setUseVariant((prev) => !prev);
                      if (useVariant) {
                        // Turning off variants: preserve variations for potential re-enable
                        preservedVariationsRef.current = variations;
                        setVariations([]);
                      } else {
                        // Turning on variants: restore preserved or sync from attributes
                        setVariations((prev) => syncVariations(attributes, preservedVariationsRef.current.length > 0 ? preservedVariationsRef.current : prev));
                      }
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    useVariant ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      useVariant ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {!useVariant && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    SKU
                  </label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Kode produk"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Deskripsi Singkat
                </label>
                <input
                  type="text"
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Deskripsi singkat produk"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Deskripsi
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
                  placeholder="Deskripsi lengkap produk"
                />
              </div>
            </div>

            {/* Pricing - only when no variants */}
            {!useVariant && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                <h2 className="text-base font-semibold text-gray-900 pb-2 border-b border-gray-100">
                  Harga
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Harga Regular (Rp) <span className="text-red-500">*</span>
                    </label>
                    <NumberInput
                      value={regularPrice}
                      onChange={setRegularPrice}
                      prefix="Rp"
                      placeholder="0"
                      min={0}
                      required={!useVariant}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-sm font-medium text-gray-700">
                        Harga Diskon (Rp)
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-gray-500">
                        <input
                          type="checkbox"
                          checked={salePriceEnabled}
                          onChange={(e) => setSalePriceEnabled(e.target.checked)}
                          className="rounded border-gray-300 text-blue-600"
                        />
                        Aktifkan
                      </label>
                    </div>
                    <NumberInput
                      value={salePrice}
                      onChange={setSalePrice}
                      prefix="Rp"
                      placeholder="0"
                      min={0}
                      disabled={!salePriceEnabled}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Images - only when no variants */}
            {!useVariant && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                <h2 className="text-base font-semibold text-gray-900 pb-2 border-b border-gray-100">
                  Gambar
                </h2>

                <MultiImageUpload
                  values={imageUrls}
                  onChange={setImageUrls}
                  folder="products"
                  label="Gambar Produk"
                />
              </div>
            )}

            {/* Attributes & Variants - only when useVariant is on */}
            {useVariant && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-900">
                  Atribut & Varian
                </h2>
                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  Tambah pilihan untuk otomatis membuat varian
                </span>
              </div>

              <div className="space-y-3">
                {attributes.length === 0 && (
                  <p className="text-sm text-gray-400">Belum ada atribut</p>
                )}
                {attributes.map((attr, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Nama Atribut
                          </label>
                          <input
                            type="text"
                            value={attr.name}
                            onChange={(e) => updateAttribute(idx, 'name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Contoh: Warna, Ukuran"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1.5">
                            Pilihan
                          </label>
                          <div className="space-y-2">
                            {attr.options.map((opt, optIdx) => (
                              <OptionRow
                                key={optIdx}
                                value={opt}
                                index={optIdx}
                                onChange={(val) => updateOption(idx, optIdx, val)}
                                onRemove={() => removeOption(idx, optIdx)}
                              />
                            ))}
                            <AddOptionInput onAdd={(value) => addOption(idx, value)} />
                          </div>
                        </div>

                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={attr.variation}
                            onChange={(e) => updateAttribute(idx, 'variation', e.target.checked)}
                            className="rounded border-gray-300 text-blue-600"
                          />
                          Digunakan untuk varian
                        </label>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeAttribute(idx)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Hapus atribut"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

                <button
                  type="button"
                  onClick={addAttribute}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Atribut
                </button>
              </div>
            )}

            {/* Variations */}
            {hasVariations && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                <h2 className="text-base font-semibold text-gray-900 pb-2 border-b border-gray-100">
                  Varian Produk
                </h2>
                <VariationManager
                  attributes={attributes}
                  variations={variations}
                  onChange={setVariations}
                />
              </div>
            )}


            {/* Stock - only when no variants */}
            {!useVariant && (
              <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                <h2 className="text-sm font-semibold text-gray-900">Stok</h2>

                <label className="flex items-center gap-2.5 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={manageStock}
                    onChange={(e) => setManageStock(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600"
                  />
                  Kelola Stok
                </label>

                {manageStock && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Jumlah Stok
                    </label>
                    <NumberInput
                      value={stockQuantity}
                      onChange={setStockQuantity}
                      placeholder="0"
                      min={0}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Categories */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
              <h2 className="text-sm font-semibold text-gray-900">Kategori</h2>
              {categories.length === 0 ? (
                <p className="text-xs text-gray-400">Tidak ada kategori</p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {categories.map((cat) => (
                    <label
                      key={cat.id}
                      className="flex items-center gap-2.5 text-sm text-gray-700 py-1"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(cat.id)}
                        onChange={() => toggleCategory(cat.id)}
                        className="rounded border-gray-300 text-blue-600"
                      />
                      {cat.name}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Publish */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <h2 className="text-sm font-semibold text-gray-900">Publikasi</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="draft">Draft</option>
                  <option value="publish">Publik</option>
                  <option value="pending">Pending Review</option>
                </select>
              </div>

              <label className="flex items-center gap-2.5 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600"
                />
                Produk Unggulan
              </label>

              <button
                type="submit"
                disabled={saving}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>

        {/* Mobile Save Button */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200">
          <button
            type="submit"
            disabled={saving}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </form>

      <div className="h-20 lg:hidden" />
    </div>
  );
}
