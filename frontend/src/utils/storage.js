/**
 * Utilitaires stockage local sécurisé
 * Pas de données sensibles en localStorage — sessionStorage préféré
 */

// ─── Préférences non-sensibles ────────────────────────────────────────────

export const storage = {
  get: (key, fallback = null) => {
    try {
      const raw = localStorage.getItem(`wedding_${key}`);
      return raw !== null ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  },

  set: (key, value) => {
    try { localStorage.setItem(`wedding_${key}`, JSON.stringify(value)); }
    catch { /* quota dépassé */ }
  },

  remove: (key) => {
    try { localStorage.removeItem(`wedding_${key}`); }
    catch { /* silencieux */ }
  },
};

// ─── Cache médias (pour offline) ─────────────────────────────────────────

const MEDIA_CACHE_KEY = 'wedding_media_cache';
const CACHE_MAX_AGE = 30 * 60 * 1000; // 30 min

export function cacheMediaList(tableNumber, items) {
  try {
    const data = {
      tableNumber,
      items,
      cachedAt: Date.now(),
    };
    sessionStorage.setItem(MEDIA_CACHE_KEY, JSON.stringify(data));
  } catch { /* quota */ }
}

export function getCachedMediaList(tableNumber) {
  try {
    const raw = sessionStorage.getItem(MEDIA_CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.tableNumber !== tableNumber) return null;
    if (Date.now() - data.cachedAt > CACHE_MAX_AGE) return null;
    return data.items;
  } catch { return null; }
}

// ─── Queue offline ────────────────────────────────────────────────────────

const OFFLINE_QUEUE_KEY = 'wedding_offline_queue';

export function getOfflineQueue() {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function addToOfflineQueue(item) {
  try {
    const queue = getOfflineQueue();
    queue.push({ ...item, id: `offline_${Date.now()}`, timestamp: Date.now() });
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch { /* quota */ }
}

export function clearOfflineQueue() {
  localStorage.removeItem(OFFLINE_QUEUE_KEY);
}

// ─── Préférences UI ───────────────────────────────────────────────────────

export function getGuestName() {
  return storage.get('guest_name', '');
}

export function setGuestName(name) {
  storage.set('guest_name', name);
}

export function getLastTableNumber() {
  return storage.get('last_table', null);
}

export function setLastTableNumber(num) {
  storage.set('last_table', num);
}
