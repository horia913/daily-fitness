const KEY = "dailyfitness:meal-builder-food-recents";
const MAX_RECENTS = 12;

export function readRecentFoodIds(): string[] {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string").slice(0, MAX_RECENTS);
  } catch {
    return [];
  }
}

export function recordRecentFoodId(foodId: string): void {
  if (typeof window === "undefined" || !window.localStorage || !foodId) return;
  try {
    const prev = readRecentFoodIds().filter((id) => id !== foodId);
    const next = [foodId, ...prev].slice(0, MAX_RECENTS);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}
