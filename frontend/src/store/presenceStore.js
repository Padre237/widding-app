/**
 * Store de présence — Zustand
 * Gère les scans QR, le compteur d'arrivées et l'historique
 */
import { create } from 'zustand';

const usePresenceStore = create((set, get) => ({
  // ── Compteurs ─────────────────────────────────────────────────────────────
  totalGuests: 200,
  arrivedCount: 0,
  pendingCount: 0,

  // ── Scan en cours ─────────────────────────────────────────────────────────
  scanState: 'idle', // 'idle' | 'scanning' | 'success' | 'duplicate' | 'error'
  lastScannedGuest: null,  // données du dernier invité scanné
  scanError: null,
  isProcessing: false,

  // ── Historique des scans (dernières entrées) ──────────────────────────────
  recentScans: [],   // [{id, guestName, tableName, time, status}]

  // ── Mode offline ──────────────────────────────────────────────────────────
  isOffline: false,
  pendingSyncQueue: [], // scans en attente de sync

  // ── Actions ───────────────────────────────────────────────────────────────
  setStats: ({ total, arrived }) => set({
    totalGuests: total,
    arrivedCount: arrived,
    pendingCount: total - arrived,
  }),

  setScanning: () => set({
    scanState: 'scanning',
    lastScannedGuest: null,
    scanError: null,
    isProcessing: true,
  }),

  setScanSuccess: (guest) => set((state) => ({
    scanState: 'success',
    lastScannedGuest: guest,
    scanError: null,
    isProcessing: false,
    arrivedCount: state.arrivedCount + 1,
    pendingCount: Math.max(0, state.pendingCount - 1),
    recentScans: [
      {
        id: guest.id,
        guestName: guest.name,
        tableName: guest.tableName || `Table ${guest.tableNumber}`,
        companions: guest.companions,
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        status: 'validated',
      },
      ...state.recentScans.slice(0, 9), // garder 10 derniers
    ],
  })),

  setScanDuplicate: (guest) => set({
    scanState: 'duplicate',
    lastScannedGuest: guest,
    scanError: `${guest.name} est déjà arrivé(e) à ${guest.arrivalTime}`,
    isProcessing: false,
  }),

  setScanError: (message) => set({
    scanState: 'error',
    lastScannedGuest: null,
    scanError: message,
    isProcessing: false,
  }),

  resetScan: () => set({
    scanState: 'idle',
    lastScannedGuest: null,
    scanError: null,
    isProcessing: false,
  }),

  // ── Offline sync ──────────────────────────────────────────────────────────
  setOffline: (val) => set({ isOffline: val }),

  addToPendingQueue: (scan) => set((state) => ({
    pendingSyncQueue: [...state.pendingSyncQueue, { ...scan, timestamp: Date.now() }],
  })),

  clearPendingQueue: () => set({ pendingSyncQueue: [] }),

  // ── Sélecteurs ────────────────────────────────────────────────────────────
  getArrivalPercentage: () => {
    const { arrivedCount, totalGuests } = get();
    if (!totalGuests) return 0;
    return Math.round((arrivedCount / totalGuests) * 100);
  },

  isSuccess: () => get().scanState === 'success',
  isDuplicate: () => get().scanState === 'duplicate',
  isError: () => get().scanState === 'error',
}));

export default usePresenceStore;
