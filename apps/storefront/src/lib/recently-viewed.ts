const STORAGE_KEY = 'no-excuse:recently-viewed';
const MAX_ITEMS = 8;

export function getRecentlyViewedIds(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addRecentlyViewed(productId: string) {
  try {
    const current = getRecentlyViewedIds().filter((id) => id !== productId);
    const updated = [productId, ...current].slice(0, MAX_ITEMS);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // localStorage indisponível: ignora
  }
}
