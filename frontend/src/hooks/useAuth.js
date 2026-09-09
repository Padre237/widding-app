/**
 * useAuth — Hook d'authentification admin + gestion expiration token
 */
import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '@/utils/api';
import useAuthStore from '@/store/authStore';
import { useToast } from '@/components/Shared/Toast';

export function useAuth() {
  const navigate = useNavigate();
  const toast = useToast();
  const {
    adminToken, adminUser,
    setAdminAuth, clearAdminAuth,
    isAdminAuthenticated,
  } = useAuthStore();

  // Écoute l'événement d'expiration token émis par l'intercepteur Axios
  useEffect(() => {
    const onExpired = () => {
      clearAdminAuth();
      toast.warning('Session expirée — veuillez vous reconnecter');
      navigate('/admin/login', { replace: true });
    };
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, [clearAdminAuth, navigate, toast]);

  // Vérifier la validité du token au montage (si token présent)
  useEffect(() => {
    if (!adminToken) return;
    authAPI.me()
      .then((res) => setAdminAuth(adminToken, res.data.user))
      .catch(() => { clearAdminAuth(); });
  }, []); // eslint-disable-line

  const login = useCallback(async (email, password) => {
    const res = await authAPI.login(email, password);
    setAdminAuth(res.data.token, res.data.user);
    return res.data;
  }, [setAdminAuth]);

  const logout = useCallback(async () => {
    try { await authAPI.logout(); } catch { /* silencieux */ }
    clearAdminAuth();
    navigate('/admin/login', { replace: true });
  }, [clearAdminAuth, navigate]);

  return {
    isAuthenticated: isAdminAuthenticated,
    user: adminUser,
    login,
    logout,
  };
}
