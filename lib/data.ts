export const categories = [
  { id: 1, name: "Elektronik", icon: "🔌", color: "bg-blue-100 text-blue-600" },
  { id: 2, name: "Handphone", icon: "📱", color: "bg-green-100 text-green-600" },
  { id: 3, name: "Pakaian Pria", icon: "👕", color: "bg-indigo-100 text-indigo-600" },
  { id: 4, name: "Pakaian Wanita", icon: "👗", color: "bg-pink-100 text-pink-600" },
  { id: 5, name: "Kecantikan", icon: "💄", color: "bg-rose-100 text-rose-600" },
  { id: 6, name: "Tas & Sepatu", icon: "👟", color: "bg-amber-100 text-amber-600" },
  { id: 7, name: "Rumah Tangga", icon: "🏠", color: "bg-teal-100 text-teal-600" },
  { id: 8, name: "Mainan & Bayi", icon: "🧸", color: "bg-orange-100 text-orange-600" },
  { id: 9, name: "Olahraga", icon: "⚽", color: "bg-cyan-100 text-cyan-600" },
  { id: 10, name: "Otomotif", icon: "🚗", color: "bg-gray-100 text-gray-600" },
  { id: 11, name: "Makanan", icon: "🍔", color: "bg-red-100 text-red-600" },
  { id: 12, name: "Komputer", icon: "💻", color: "bg-slate-100 text-slate-600" },
  { id: 13, name: "Kesehatan", icon: "💊", color: "bg-emerald-100 text-emerald-600" },
  { id: 14, name: "Buku", icon: "📚", color: "bg-yellow-100 text-yellow-600" },
  { id: 15, name: "Hobi", icon: "🎨", color: "bg-violet-100 text-violet-600" },
  { id: 16, name: "Perlengkapan", icon: "🛠️", color: "bg-stone-100 text-stone-600" },
  { id: 17, name: "Voucher", icon: "🎫", color: "bg-fuchsia-100 text-fuchsia-600" },
  { id: 18, name: "Lainnya", icon: "🔖", color: "bg-zinc-100 text-zinc-600" },
  { id: 19, name: "Travel", icon: "✈️", color: "bg-sky-100 text-sky-600" },
  { id: 20, name: "Fotografi", icon: "📷", color: "bg-lime-100 text-lime-600" },
];

export const navCategories = [
  "Elektronik", "Komputer", "Handphone", "Pakaian Pria", "Pakaian Wanita",
  "Kecantikan", "Rumah Tangga", "Tas & Sepatu", "Mainan", "Olahraga",
  "Makanan", "Otomotif", "Kesehatan", "Hobi", "Voucher"
];

export const NO_IMAGE_PLACEHOLDER = 'https://placehold.co/400x400/f5f5f5/757575?text=No+Image';

const CATEGORY_KEYWORDS: Record<string, string> = {
  elektronik: 'electronics',
  'pakaian-pria': 'men-clothing',
  'pakaian-wanita': 'women-clothing',
  handphone: 'smartphone',
  kecantikan: 'cosmetics',
  'tas-sepatu': 'shoes',
  'rumah-tangga': 'home-appliance',
  mainan: 'toys',
  olahraga: 'sports',
  makanan: 'food',
  otomotif: 'automotive',
  komputer: 'computer',
  kesehatan: 'health',
  hobi: 'hobby',
  buku: 'books',
  travel: 'travel',
  fotografi: 'camera',
  perlengkapan: 'tools',
  voucher: 'gift-card',
};

function getFlickrKeyword(name: string, categories: string[]): string {
  for (const cat of categories) {
    const slug = cat.toLowerCase().trim();
    if (CATEGORY_KEYWORDS[slug]) return CATEGORY_KEYWORDS[slug];
  }
  // Fallback: first meaningful word from product name
  const firstWord = name.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
  return firstWord || 'product';
}

export function getProductImageUrl(
  image?: string | null,
  seed?: string | number,
  name?: string,
  categories?: string[],
  size: number = 400
): string {
  if (image && image.trim()) return image;
  if (seed !== undefined && seed !== null && seed !== '') {
    const keyword = name ? getFlickrKeyword(name, categories || []) : 'product';
    return `https://placehold.co/${size}x${size}/f5f5f5/757575?text=No+Image`;
  }
  return `https://placehold.co/${size}x${size}/f5f5f5/757575?text=No+Image`;
}

export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, "")
    .replace(/\s+/g, "-")
    .replace(/--+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+$/, "");
}

export interface Banner {
  id: number;
  image: string;
  alt: string;
  link?: string;
  active: boolean;
}

export const banners: Banner[] = [
  {
    id: 1,
    image: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&h=400&fit=crop",
    alt: "Promo Gratis Ongkir",
    link: "",
    active: true,
  },
  {
    id: 2,
    image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&h=400&fit=crop",
    alt: "Flash Sale Harian",
    link: "",
    active: true,
  },
  {
    id: 3,
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&h=400&fit=crop",
    alt: "Fashion Sale",
    link: "",
    active: true,
  },
];

export interface Product {
  id: number;
  name: string;
  price: number;
  originalPrice: number;
  image: string;
  images?: string[];
  description?: string;
  rating: number;
  sold: string;
  location: string;
  discount?: number;
  badge?: string;
  badgeColor?: string;
  categories?: string[];
  attributes?: any[];
  weight?: number;
  height?: number;
  length?: number;
  width?: number;
  type?: 'simple' | 'variable';
}



export function stripHtml(html: string): string {
  if (!html) return '';
  if (typeof window !== 'undefined') {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }
  return html.replace(/<[^>]*>?/gm, '');
}

export const formatPrice = (price: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};


export const flashSaleProducts: Product[] = [];
export const products: Product[] = [];
export const dealsProducts: Product[] = [];
export const allProducts: Product[] = [];
