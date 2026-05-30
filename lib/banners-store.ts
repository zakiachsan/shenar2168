import fs from 'fs';
import path from 'path';
import { Banner } from './data';

const BANNERS_FILE = path.join(process.cwd(), 'data', 'banners.json');

const DEFAULT_BANNERS: Banner[] = [
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

function ensureFile() {
  if (!fs.existsSync(BANNERS_FILE)) {
    fs.mkdirSync(path.dirname(BANNERS_FILE), { recursive: true });
    fs.writeFileSync(BANNERS_FILE, JSON.stringify(DEFAULT_BANNERS, null, 2));
  }
}

export function loadBanners(): Banner[] {
  try {
    ensureFile();
    const raw = fs.readFileSync(BANNERS_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Banner[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      saveBanners(DEFAULT_BANNERS);
      return DEFAULT_BANNERS;
    }
    return parsed;
  } catch {
    saveBanners(DEFAULT_BANNERS);
    return DEFAULT_BANNERS;
  }
}

export function saveBanners(banners: Banner[]): void {
  try {
    ensureFile();
    fs.writeFileSync(BANNERS_FILE, JSON.stringify(banners, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save banners:', e);
  }
}
