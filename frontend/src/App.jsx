/**
 * App — Routeur principal + providers globaux
 */
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from '@/components/Shared/Toast';
import { FullPageLoader } from '@/components/Shared/LoadingSpinner';
import useAuthStore from '@/store/authStore';

// ── Lazy loading des pages ────────────────────────────────────────────────
const EntryPage  = lazy(() => import('@/pages/EntryPage'));
const TablePage  = lazy(() => import('@/pages/TablePage'));
const AdminPage  = lazy(() => import('@/pages/AdminPage'));
const AdminLogin = lazy(() => import('@/pages/AdminLogin'));
const NotFound   = lazy(() => import('@/pages/NotFound'));

// ── Route protégée admin ──────────────────────────────────────────────────
function AdminRoute({ children }) {
  const { isAdminAuthenticated } = useAuthStore();
  return isAdminAuthenticated ? children : <Navigate to="/admin/login" replace />;
}

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Suspense fallback={<FullPageLoader message="Chargement de l'application..." />}>
          <Routes>
            {/* ── Entrée virgiles ── */}
            <Route path="/entry" element={<EntryPage />} />

            {/* ── Tables invités ── */}
            <Route path="/table/:tableNumber"         element={<TablePage tab="gallery" />} />
            <Route path="/table/:tableNumber/video"   element={<TablePage tab="video"   />} />
            <Route path="/table/:tableNumber/audio"   element={<TablePage tab="audio"   />} />
            <Route path="/table/:tableNumber/voeux"   element={<TablePage tab="voeux"   />} />
            <Route path="/table/:tableNumber/photo"   element={<TablePage tab="photo"   />} />

            {/* ── Admin ── */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminPage tab="dashboard" />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/:section"
              element={
                <AdminRoute>
                  <AdminPage />
                </AdminRoute>
              }
            />

            {/* ── Redirections ── */}
            <Route path="/"  element={<Navigate to="/table/1" replace />} />
            <Route path="*"  element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ToastProvider>
  );
}
