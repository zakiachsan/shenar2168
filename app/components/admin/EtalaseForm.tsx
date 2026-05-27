'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  AlertCircle,
  Save,
  X,
  Search,
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
  LayoutGrid,
  Package,
  UploadCloud,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import NumberInput from '@/app/components/ui/NumberInput';

interface ProductData {
  id: number;
  name: string;
  price: number;
  image: string;
}

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
  bannerImage?: string;
  icon: string;
  isFlashSale: boolean;
  flashSaleEndTime?: string;
  products: EtalaseProduct[];
}

const PRESET_TYPES = [
  { value: 'flash_sale', label: 'Flash Sale', icon: 'Zap' },
  { value: 'discount', label: 'Dengan Diskon', icon: 'Tag' },
  { value: 'best_sellers', label: 'Produk Terlaris', icon: 'TrendingUp' },
  { value: 'custom', label: 'Custom', icon: 'LayoutGrid' },
];

const ICON_OPTIONS = [
  { name: 'LayoutGrid', label: 'Grid' },
  { name: 'Zap', label: 'Flash' },
  { name: 'Tag', label: 'Tag' },
  { name: 'TrendingUp', label: 'Trending' },
  { name: 'Star', label: 'Star' },
  { name: 'Heart', label: 'Heart' },
  { name: 'ShoppingBag', label: 'Bag' },
  { name: 'Percent', label: 'Percent' },
  { name: 'Clock', label: 'Clock' },
  { name: 'Sparkles', label: 'Sparkles' },
  { name: 'Gift', label: 'Gift' },
  { name: 'Trophy', label: 'Trophy' },
  { name: 'Flame', label: 'Flame' },
  { name: 'Package', label: 'Package' },
];

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutGrid, Zap, Tag, TrendingUp, Star, Heart, ShoppingBag, Percent, Clock, Sparkles, Gift, Trophy, Flame, Package,
};

function DynamicIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] || LayoutGrid;
  return <Icon className={className} />;
}

interface EtalaseFormProps {
  initialData?: EtalaseSection;
  onSaved?: () => void;
}

export default function EtalaseForm({ initialData, onSaved }: EtalaseFormProps) {
  const router = useRouter();
  const isEdit = !!initialData;

  const [title, setTitle] = useState(initialData?.title || '');
  const [type, setType] = useState(initialData?.type || 'custom');
  const [icon, setIcon] = useState(initialData?.icon || 'LayoutGrid');
  const [bannerImageUrl, setBannerImageUrl] = useState(initialData?.bannerImage || '');
  const [bannerImageFile, setBannerImageFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState(initialData?.bannerImage || '');
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const [isFlashSale, setIsFlashSale] = useState(initialData?.isFlashSale || false);
  const [flashSaleEndTime, setFlashSaleEndTime] = useState(
    initialData?.flashSaleEndTime
      ? new Date(initialData.flashSaleEndTime).toISOString().slice(0, 16)
      : ''
  );
  const [selectedProducts, setSelectedProducts] = useState<EtalaseProduct[]>(
    initialData?.products || []
  );

  const [allProducts, setAllProducts] = useState<ProductData[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showSelectedModal, setShowSelectedModal] = useState(false);

  useEffect(() => {
    fetch('/api/products?per_page=100')
      .then((res) => res.json())
      .then((data) => {
        setAllProducts(data.products || []);
      })
      .catch(() => setError('Gagal memuat daftar produk'))
      .finally(() => setLoadingProducts(false));
  }, []);

  const handleBannerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setError('Hanya file gambar (JPG, PNG, WEBP, GIF) yang diizinkan');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Ukuran file maksimal 5MB');
      return;
    }

    setBannerImageFile(file);
    setBannerPreview(URL.createObjectURL(file));
    setError('');
  };

  const removeBanner = () => {
    setBannerImageFile(null);
    setBannerPreview('');
    setBannerImageUrl('');
  };

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return allProducts;
    const q = productSearch.toLowerCase();
    return allProducts.filter((p) => p.name.toLowerCase().includes(q));
  }, [allProducts, productSearch]);

  const isSelected = (productId: number) =>
    selectedProducts.some((p) => p.productId === productId);

  const toggleProduct = (productId: number) => {
    if (isSelected(productId)) {
      setSelectedProducts((prev) => prev.filter((p) => p.productId !== productId));
    } else {
      setSelectedProducts((prev) => [...prev, { productId }]);
    }
  };

  const updateProductStock = (productId: number, stock: string) => {
    const num = parseInt(stock, 10);
    setSelectedProducts((prev) =>
      prev.map((p) =>
        p.productId === productId ? { ...p, flashSaleStock: isNaN(num) ? undefined : num } : p
      )
    );
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Judul etalase harus diisi');
      return;
    }
    if (selectedProducts.length === 0) {
      setError('Pilih minimal 1 produk');
      return;
    }

    setSaving(true);
    setError('');

    try {
      let finalBannerUrl = bannerImageUrl;

      // Upload banner if new file selected
      if (bannerImageFile) {
        setUploadingBanner(true);
        const formData = new FormData();
        formData.append('file', bannerImageFile);
        const uploadRes = await fetch('/api/admin/upload', {
          method: 'POST',
          body: formData,
        });
        setUploadingBanner(false);

        if (!uploadRes.ok) {
          const uploadData = await uploadRes.json();
          setError(uploadData.error || 'Gagal upload banner');
          setSaving(false);
          return;
        }
        const uploadData = await uploadRes.json();
        finalBannerUrl = uploadData.url;
      }

      // Fetch existing sections to update/add this one
      const resList = await fetch('/api/admin/etalase');
      const existing: EtalaseSection[] = resList.ok ? await resList.json() : [];

      const newSection: EtalaseSection = {
        id: initialData?.id || `${type}-${Date.now()}`,
        title: title.trim(),
        type,
        enabled: initialData?.enabled ?? true,
        sortOrder: initialData?.sortOrder ?? existing.length + 1,
        bannerImage: finalBannerUrl || undefined,
        icon,
        isFlashSale,
        flashSaleEndTime: isFlashSale && flashSaleEndTime ? new Date(flashSaleEndTime).toISOString() : undefined,
        products: selectedProducts,
      };

      const updated = isEdit
        ? existing.map((s) => (s.id === initialData.id ? newSection : s))
        : [...existing, newSection];

      const res = await fetch('/api/admin/etalase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections: updated }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Gagal menyimpan');
      } else {
        onSaved?.();
        router.push('/admin/etalase');
      }
    } catch {
      setError('Terjadi kesalahan saat menyimpan');
    } finally {
      setSaving(false);
    }
  };

  // Selected products for display in picker area
  const selectedProductDetails = useMemo(() => {
    return selectedProducts
      .map((sp) => {
        const product = allProducts.find((p) => p.id === sp.productId);
        return product ? { ...sp, ...product } : null;
      })
      .filter(Boolean) as (EtalaseProduct & ProductData)[];
  }, [selectedProducts, allProducts]);

  return (
    <div className="space-y-6 max-w-4xl">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* ====== General Settings ====== */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <h2 className="text-base font-semibold text-gray-900">Pengaturan Umum</h2>

        {/* Judul */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Judul Etalase</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Contoh: Flash Sale Harian"
          />
        </div>

        {/* Tipe & Icon */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipe / Kategori</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {PRESET_TYPES.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => {
                    setType(preset.value);
                    setIcon(preset.icon);
                    if (preset.value === 'flash_sale') setIsFlashSale(true);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                    type === preset.value
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <DynamicIcon name={preset.icon} className="w-3.5 h-3.5" />
                  {preset.label}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Atau ketik tipe custom..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
            <div className="grid grid-cols-7 gap-2">
              {ICON_OPTIONS.map((opt) => (
                <button
                  key={opt.name}
                  onClick={() => setIcon(opt.name)}
                  title={opt.label}
                  className={`flex items-center justify-center p-2.5 rounded-lg border transition-colors ${
                    icon === opt.name
                      ? 'bg-blue-50 border-blue-300 text-blue-600'
                      : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <DynamicIcon name={opt.name} className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Banner Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Gambar Banner</label>
          {bannerPreview ? (
            <div className="relative w-full max-w-md">
              <div className="rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                <img
                  src={bannerPreview}
                  alt="Banner preview"
                  className="w-full h-40 object-cover"
                />
              </div>
              <button
                onClick={removeBanner}
                className="absolute top-2 right-2 p-1.5 bg-white/90 hover:bg-white rounded-lg text-red-500 shadow-sm border border-gray-200 transition-colors"
                title="Hapus banner"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full max-w-md h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 hover:border-gray-400 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <UploadCloud className="w-8 h-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">Klik untuk upload banner</p>
                <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP, GIF (max 5MB)</p>
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleBannerFileChange}
                className="hidden"
              />
            </label>
          )}
        </div>
      </div>

      {/* ====== Flash Sale Settings ====== */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Mode Flash Sale</h2>
          <button
            onClick={() => setIsFlashSale(!isFlashSale)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isFlashSale ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isFlashSale ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {isFlashSale && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Waktu Berakhir Flash Sale</label>
            <input
              type="datetime-local"
              value={flashSaleEndTime}
              onChange={(e) => setFlashSaleEndTime(e.target.value)}
              className="w-full md:w-auto px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Countdown timer akan muncul di frontend sampai waktu ini.
            </p>
          </div>
        )}
      </div>

      {/* ====== Product Picker ====== */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Pilih Produk</h2>
        </div>

        {loadingProducts ? (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-8">
            <Loader2 className="w-4 h-4 animate-spin" />
            Memuat produk...
          </div>
        ) : (
          <>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Cari produk..."
                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Selected Products Chips — inline di area picker */}
            {selectedProductDetails.length > 0 && (
              <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3">
                <p className="text-xs font-medium text-blue-700 mb-2">
                  Produk Terpilih ({selectedProductDetails.length}):
                </p>
                <div className="flex flex-wrap gap-2 items-center">
                  {selectedProductDetails.slice(0, 2).map((product) => (
                    <div
                      key={product.id}
                      className="inline-flex items-center gap-2 bg-white border border-blue-200 rounded-lg px-2.5 py-1.5 text-sm shadow-sm"
                    >
                      <img
                        src={product.image || `https://placehold.co/40x40?text=${product.id}`}
                        alt=""
                        className="w-6 h-6 rounded object-cover"
                      />
                      <span className="text-gray-700 truncate max-w-[180px]">{product.name}</span>
                      {isFlashSale && (
                        <NumberInput
                          min={1}
                          value={
                            selectedProducts.find((p) => p.productId === product.id)?.flashSaleStock || ''
                          }
                          onChange={(val) => updateProductStock(product.id, val)}
                          className="w-16 px-1.5 py-0.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Stock"
                        />
                      )}
                      <button
                        onClick={() => toggleProduct(product.id)}
                        className="text-gray-400 hover:text-red-500 p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {selectedProductDetails.length > 2 && (
                    <button
                      onClick={() => setShowSelectedModal(true)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-xs font-medium transition-colors"
                    >
                      +{selectedProductDetails.length - 2} lainnya
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Product List */}
            <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg">
              {filteredProducts.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-400">Tidak ada produk</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredProducts.map((product) => {
                    const selected = isSelected(product.id);
                    return (
                      <label
                        key={product.id}
                        className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                          selected ? 'bg-blue-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleProduct(product.id)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                        />
                        <img
                          src={product.image || `https://placehold.co/60x60?text=${product.id}`}
                          alt={product.name}
                          className="w-10 h-10 rounded-lg object-cover bg-gray-100 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                          <p className="text-xs text-gray-500">Rp {product.price.toLocaleString('id-ID')}</p>
                        </div>
                        {selected && isFlashSale && (
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs text-gray-500">Stock:</span>
                            <NumberInput
                              min={1}
                              value={
                                selectedProducts.find((p) => p.productId === product.id)?.flashSaleStock || ''
                              }
                              onChange={(val) => updateProductStock(product.id, val)}
                              className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="100"
                            />
                          </div>
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Selected Products Modal */}
      {showSelectedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowSelectedModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">
                Produk Terpilih ({selectedProductDetails.length})
              </h3>
              <button
                onClick={() => setShowSelectedModal(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-2">
                {selectedProductDetails.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <img
                      src={product.image || `https://placehold.co/60x60?text=${product.id}`}
                      alt={product.name}
                      className="w-12 h-12 rounded-lg object-cover bg-gray-100 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                      <p className="text-xs text-gray-500">Rp {product.price.toLocaleString('id-ID')}</p>
                    </div>
                    {isFlashSale && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-gray-500">Stock:</span>
                        <NumberInput
                          min={1}
                          value={
                            selectedProducts.find((p) => p.productId === product.id)?.flashSaleStock || ''
                          }
                          onChange={(val) => updateProductStock(product.id, val)}
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="100"
                        />
                      </div>
                    )}
                    <button
                      onClick={() => toggleProduct(product.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-5 py-4 border-t border-gray-100">
              <button
                onClick={() => setShowSelectedModal(false)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || uploadingBanner}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {saving || uploadingBanner ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Menyimpan...' : uploadingBanner ? 'Uploading...' : isEdit ? 'Simpan Perubahan' : 'Buat Etalase'}
        </button>
        <button
          onClick={() => router.push('/admin/etalase')}
          className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Batal
        </button>
      </div>
    </div>
  );
}
