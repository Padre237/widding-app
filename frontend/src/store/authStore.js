/**
 * Store d'authentification — Zustand
 * Gère l'état admin (JWT) + l'identité invité (token QR)
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set, get) => ({
      // ── État admin ────────────────────────────────────────────────────────
      adminToken: null,        // JWT admin
      adminUser: null,         // { id, email, role }
      isAdminAuthenticated: false,

      // ── État invité (via QR) ──────────────────────────────────────────────
      guestToken: null,        // token QR scanné
      guestData: null,         // { id, name, tableNumber, tableName, companions }
      tableNumber: null,       // numéro de table courant (URL param)
      isGuestAuthenticated: false,

      // ── Actions Admin ─────────────────────────────────────────────────────
      setAdminAuth: (token, user) => set({
        adminToken: token,
        adminUser: user,
        isAdminAuthenticated: true,
      }),

      clearAdminAuth: () => set({
        adminToken: null,
        adminUser: null,
        isAdminAuthenticated: false,
      }),

      // ── Actions Invité ────────────────────────────────────────────────────
      setGuestAuth: (token, guest) => set({
        guestToken: token,
        guestData: guest,
        tableNumber: guest?.tableNumber || null,
        isGuestAuthenticated: true,
      }),

      clearGuestAuth: () => set({
        guestToken: null,
        guestData: null,
        tableNumber: null,
        isGuestAuthenticated: false,
      }),

      setTableNumber: (num) => set({ tableNumber: num }),

      // ── Sélecteurs ────────────────────────────────────────────────────────
      getGuestName: () => get().guestData?.name || 'Invité',
      getTableNumber: () => get().tableNumber,
      getAdminToken: () => get().adminToken,
      isAdmin: () => get().isAdminAuthenticated,
    }),
    {
      name: 'wedding-auth',
      storage: createJSONStorage(() => sessionStorage), // sessionStorage = pas de persistance sensible
      partialize: (state) => ({
        // Ne pas persister les tokens sensibles en localStorage
        guestData: state.guestData,
        tableNumber: state.tableNumber,
        isGuestAuthenticated: state.isGuestAuthenticated,
        // Admin token: sessionStorage seulement (effacé à fermeture)
        adminToken: state.adminToken,
        adminUser: state.adminUser,
        isAdminAuthenticated: state.isAdminAuthenticated,
      }),
    }
  )
);

export default useAuthStore;
