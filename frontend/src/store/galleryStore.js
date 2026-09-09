/**
 * Store galerie — Zustand
 * Gère les médias, filtres, pagination et état temps réel
 */
import { create } from 'zustand';

const useGalleryStore = create((set, get) => ({
  // ── Médias ────────────────────────────────────────────────────────────────
  items: [],           // tableau de médias [{id, type, url, guestName, ...}]
  isLoading: false,
  error: null,
  hasMore: true,
  page: 1,
  pageSize: 20,

  // ── Filtres ───────────────────────────────────────────────────────────────
  activeFilter: 'all', // 'all' | 'photo' | 'video' | 'audio'
  sortBy: 'newest',    // 'newest' | 'popular'

  // ── Média sélectionné (lightbox) ──────────────────────────────────────────
  selectedMedia: null,
  lightboxOpen: false,

  // ── Compteurs ─────────────────────────────────────────────────────────────
  counts: { total: 0, photos: 0, videos: 0, audios: 0 },

  // ── Actions de chargement ─────────────────────────────────────────────────
  setLoading: (val) => set({ isLoading: val }),
  setError: (err) => set({ error: err }),

  setItems: (items) => set({
    items,
    isLoading: false,
    error: null,
    page: 1,
  }),

  appendItems: (newItems) => set((state) => ({
    items: [...state.items, ...newItems],
    isLoading: false,
    hasMore: newItems.length >= state.pageSize,
    page: state.page + 1,
  })),

  // ── Ajout temps réel (Supabase realtime) ──────────────────────────────────
  prependItem: (item) => set((state) => ({
    items: [item, ...state.items],
    counts: {
      ...state.counts,
      total: state.counts.total + 1,
      photos:  item.type === 'photo' ? state.counts.photos  + 1 : state.counts.photos,
      videos:  item.type === 'video' ? state.counts.videos  + 1 : state.counts.videos,
      audios:  item.type === 'audio' ? state.counts.audios  + 1 : state.counts.audios,
    },
  })),

  // ── Suppression (admin) ───────────────────────────────────────────────────
  removeItem: (id) => set((state) => {
    const removed = state.items.find((i) => i.id === id);
    return {
      items: state.items.filter((i) => i.id !== id),
      counts: removed ? {
        ...state.counts,
        total:  state.counts.total  - 1,
        photos: removed.type === 'photo' ? state.counts.photos - 1 : state.counts.photos,
        videos: removed.type === 'video' ? state.counts.videos - 1 : state.counts.videos,
        audios: removed.type === 'audio' ? state.counts.audios - 1 : state.counts.audios,
      } : state.counts,
    };
  }),

  // ── Mise à jour réactions/commentaires ───────────────────────────────────
  updateItemReactions: (mediaId, reactions) => set((state) => ({
    items: state.items.map((item) =>
      item.id === mediaId ? { ...item, reactions } : item
    ),
    selectedMedia: state.selectedMedia?.id === mediaId
      ? { ...state.selectedMedia, reactions }
      : state.selectedMedia,
  })),

  updateItemComments: (mediaId, comments) => set((state) => ({
    items: state.items.map((item) =>
      item.id === mediaId
        ? { ...item, commentCount: comments.length }
        : item
    ),
    selectedMedia: state.selectedMedia?.id === mediaId
      ? { ...state.selectedMedia, comments }
      : state.selectedMedia,
  })),

  // ── Filtres ───────────────────────────────────────────────────────────────
  setFilter: (filter) => set({ activeFilter: filter, page: 1, items: [], hasMore: true }),
  setSortBy: (sort)   => set({ sortBy: sort, page: 1, items: [], hasMore: true }),

  // ── Lightbox ──────────────────────────────────────────────────────────────
  openLightbox: (media) => set({ selectedMedia: media, lightboxOpen: true }),
  closeLightbox: ()      => set({ selectedMedia: null, lightboxOpen: false }),

  updateSelectedMedia: (updates) => set((state) => ({
    selectedMedia: state.selectedMedia
      ? { ...state.selectedMedia, ...updates }
      : null,
  })),

  // ── Compteurs ─────────────────────────────────────────────────────────────
  setCounts: (counts) => set({ counts }),

  // ── Reset ─────────────────────────────────────────────────────────────────
  resetGallery: () => set({
    items: [],
    isLoading: false,
    error: null,
    hasMore: true,
    page: 1,
    activeFilter: 'all',
    selectedMedia: null,
    lightboxOpen: false,
  }),

  // ── Sélecteurs ────────────────────────────────────────────────────────────
  getFilteredItems: () => {
    const { items, activeFilter } = get();
    if (activeFilter === 'all') return items;
    return items.filter((i) => i.type === activeFilter);
  },
}));

export default useGalleryStore;
