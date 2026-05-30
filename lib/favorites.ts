/**
 * Favorites library — persists to localStorage
 * Key: shenar2168-favorites
 */

export interface FavoriteItem {
  id: number;
  name: string;
  price: number;
  image: string;
}

const STORAGE_KEY = 'shenar2168-favorites';

export function getFavorites(): FavoriteItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function isFavorite(productId: number): boolean {
  return getFavorites().some((f) => f.id === productId);
}

export function addFavorite(item: FavoriteItem): void {
  const current = getFavorites();
  if (current.some((f) => f.id === item.id)) return;
  const next = [item, ...current];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  // Dispatch custom event so other components can react
  window.dispatchEvent(new CustomEvent('favorites-changed', { detail: next }));
}

export function removeFavorite(productId: number): void {
  const next = getFavorites().filter((f) => f.id !== productId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('favorites-changed', { detail: next }));
}

export function toggleFavorite(item: FavoriteItem): boolean {
  if (isFavorite(item.id)) {
    removeFavorite(item.id);
    return false;
  }
  addFavorite(item);
  return true;
}
