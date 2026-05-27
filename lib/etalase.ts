import fs from 'fs';
import path from 'path';

const ETALASE_PATH = path.join(process.cwd(), 'data', 'etalase.json');

export interface EtalaseProduct {
  productId: number;
  flashSaleStock?: number;
  flashSaleSold?: number;
}

export interface EtalaseSection {
  id: string;
  title: string;
  type: string;
  enabled: boolean;
  sortOrder: number;
  bannerImage?: string;
  bannerLink?: string;
  icon: string;
  isFlashSale: boolean;
  flashSaleEndTime?: string;
  products: EtalaseProduct[];
}

// Migrate old format (productIds array) to new format (products array)
function migrateSection(s: any): EtalaseSection {
  const products: EtalaseProduct[] = [];
  if (Array.isArray(s.products)) {
    s.products.forEach((p: any) => {
      if (typeof p === 'number') {
        products.push({ productId: p });
      } else if (p && typeof p.productId === 'number') {
        products.push(p);
      }
    });
  } else if (Array.isArray(s.productIds)) {
    s.productIds.forEach((id: number) => products.push({ productId: id }));
  }

  return {
    id: String(s.id || `${s.type || 'custom'}-${Date.now()}`),
    title: String(s.title || 'Etalase'),
    type: String(s.type || 'custom'),
    enabled: Boolean(s.enabled ?? true),
    sortOrder: Number(s.sortOrder ?? 0),
    bannerImage: s.bannerImage ? String(s.bannerImage) : undefined,
    bannerLink: s.bannerLink ? String(s.bannerLink) : undefined,
    icon: String(s.icon || getDefaultIcon(s.type)),
    isFlashSale: Boolean(s.isFlashSale ?? s.type === 'flash_sale'),
    flashSaleEndTime: s.flashSaleEndTime ? String(s.flashSaleEndTime) : undefined,
    products,
  };
}

function getDefaultIcon(type: string): string {
  switch (type) {
    case 'flash_sale': return 'Zap';
    case 'discount': return 'Tag';
    case 'best_sellers': return 'TrendingUp';
    default: return 'LayoutGrid';
  }
}

const defaultEtalase: EtalaseSection[] = [
  {
    id: 'flash-sale',
    title: 'Flash Sale',
    type: 'flash_sale',
    enabled: true,
    sortOrder: 1,
    icon: 'Zap',
    isFlashSale: true,
    flashSaleEndTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    products: [
      { productId: 1, flashSaleStock: 100, flashSaleSold: 50 },
      { productId: 2, flashSaleStock: 80, flashSaleSold: 40 },
      { productId: 3, flashSaleStock: 120, flashSaleSold: 72 },
      { productId: 4, flashSaleStock: 60, flashSaleSold: 30 },
    ],
  },
  {
    id: 'discount',
    title: 'Dengan Diskon',
    type: 'discount',
    enabled: true,
    sortOrder: 2,
    icon: 'Tag',
    isFlashSale: false,
    products: [
      { productId: 102 },
      { productId: 103 },
      { productId: 104 },
      { productId: 105 },
    ],
  },
  {
    id: 'best-sellers',
    title: 'Produk Terlaris',
    type: 'best_sellers',
    enabled: true,
    sortOrder: 3,
    icon: 'TrendingUp',
    isFlashSale: false,
    products: [
      { productId: 101 },
      { productId: 106 },
      { productId: 107 },
      { productId: 108 },
    ],
  },
];

export function getEtalase(): EtalaseSection[] {
  try {
    if (!fs.existsSync(ETALASE_PATH)) {
      return defaultEtalase;
    }
    const data = fs.readFileSync(ETALASE_PATH, 'utf-8');
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      return parsed.map(migrateSection);
    }
    return defaultEtalase;
  } catch {
    return defaultEtalase;
  }
}

export function getEnabledEtalase(): EtalaseSection[] {
  return getEtalase()
    .filter((s) => s.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getEtalaseById(id: string): EtalaseSection | undefined {
  return getEtalase().find((s) => s.id === id);
}

export function saveEtalase(sections: EtalaseSection[]): void {
  const dir = path.dirname(ETALASE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(ETALASE_PATH, JSON.stringify(sections, null, 2), 'utf-8');
}
