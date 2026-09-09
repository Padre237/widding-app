/**
 * Client HTTP — Axios avec intercepteurs JWT
 * Toutes les requêtes API passent par ce module
 */
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// ── Instance principale ────────────────────────────────────────────────────
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Intercepteur requête : injecte le token ───────────────────────────────
api.interceptors.request.use(
  (config) => {
    // Récupère le token depuis sessionStorage (authStore persiste là)
    try {
      const stored = sessionStorage.getItem('wedding-auth');
      if (stored) {
        const { state } = JSON.parse(stored);
        const token = state?.adminToken || state?.guestToken;
        if (token) config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (_) { /* silencieux */ }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Intercepteur réponse : gestion erreurs globale ────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;

    if (status === 401) {
      // Token expiré → vider l'auth
      sessionStorage.removeItem('wedding-auth');
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }

    if (status === 429) {
      return Promise.reject(new Error('Trop de requêtes — veuillez patienter'));
    }

    return Promise.reject(new Error(message || 'Erreur réseau'));
  }
);

export default api;

// ══════════════════════════════════════════════════════════════════════════
// API ENDPOINTS
// ══════════════════════════════════════════════════════════════════════════

// ── Auth Admin ────────────────────────────────────────────────────────────
export const authAPI = {
  login: (email, password) =>
    api.post('/auth/login', { email, password }),

  logout: () =>
    api.post('/auth/logout'),

  me: () =>
    api.get('/auth/me'),
};

// ── Invités ───────────────────────────────────────────────────────────────
export const guestsAPI = {
  // Vérifier un QR code d'entrée
  verifyQR: (qrCode) =>
    api.post('/guests/verify-qr', { qrCode }),

  // Marquer arrivée
  markArrival: (guestId, scannedBy) =>
    api.post(`/guests/${guestId}/arrival`, { scannedBy }),

  // Signaler doublon
  reportDuplicate: (guestId, scannedBy) =>
    api.post(`/guests/${guestId}/duplicate`, { scannedBy }),

  // Accès via QR table
  getByTableQR: (qrCode) =>
    api.post('/guests/table-access', { qrCode }),

  // Liste complète (admin)
  list: (params) =>
    api.get('/guests', { params }),

  // Créer un invité (admin)
  create: (data) =>
    api.post('/guests', data),

  // Modifier un invité (admin)
  update: (id, data) =>
    api.put(`/guests/${id}`, data),

  // Supprimer un invité (admin)
  delete: (id) =>
    api.delete(`/guests/${id}`),

  // Importer CSV (admin)
  importCSV: (formData) =>
    api.post('/guests/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // Exporter CSV (admin)
  exportCSV: () =>
    api.get('/guests/export', { responseType: 'blob' }),

  // Stats présence
  stats: () =>
    api.get('/guests/stats'),
};

// ── Médias ────────────────────────────────────────────────────────────────
export const mediaAPI = {
  // Récupérer la galerie (avec pagination)
  list: (params) =>
    api.get('/media', { params }),

  // Upload un média (multipart)
  upload: (formData, onUploadProgress) =>
    api.post('/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
      timeout: 120000, // 2 min pour les vidéos
    }),

  // Détail d'un média
  get: (id) =>
    api.get(`/media/${id}`),

  // Supprimer (admin)
  delete: (id) =>
    api.delete(`/media/${id}`),

  // Stats médias (admin)
  stats: () =>
    api.get('/media/stats'),
};

// ── Réactions ─────────────────────────────────────────────────────────────
export const reactionsAPI = {
  // Ajouter une réaction
  add: (mediaId, reactionType, guestId) =>
    api.post(`/reactions`, { mediaId, reactionType, guestId }),

  // Retirer une réaction
  remove: (mediaId, reactionType, guestId) =>
    api.delete(`/reactions`, { data: { mediaId, reactionType, guestId } }),

  // Récupérer les réactions d'un média
  getByMedia: (mediaId, guestId) =>
    api.get(`/reactions/${mediaId}`, { params: { guestId } }),
};

// ── Commentaires ──────────────────────────────────────────────────────────
export const commentsAPI = {
  // Récupérer les commentaires d'un média
  list: (mediaId) =>
    api.get(`/comments/${mediaId}`),

  // Ajouter un commentaire
  add: (mediaId, text, guestId, guestName) =>
    api.post('/comments', { mediaId, text, guestId, guestName }),

  // Supprimer un commentaire
  delete: (commentId, guestId) =>
    api.delete(`/comments/${commentId}`, { data: { guestId } }),
};

// ── Admin ─────────────────────────────────────────────────────────────────
export const adminAPI = {
  // Dashboard overview
  dashboard: () =>
    api.get('/admin/dashboard'),

  // Paramètres
  getSettings: () =>
    api.get('/admin/settings'),

  updateSettings: (settings) =>
    api.put('/admin/settings', settings),

  // Réinitialiser présences (zone test)
  resetPresence: () =>
    api.post('/admin/reset-presence'),

  // Générer QR codes
  generateQRCodes: () =>
    api.post('/admin/generate-qr', {}, { responseType: 'blob', timeout: 60000 }),

  // Télécharger archive médias
  downloadArchive: () =>
    api.get('/admin/media-archive', { responseType: 'blob', timeout: 300000 }),
};

// ── Supabase client (temps réel) ──────────────────────────────────────────
import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = supabaseUrl && supabaseAnon
  ? createClient(supabaseUrl, supabaseAnon)
  : null;
