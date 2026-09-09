/**
 * AdminLogin — Page de connexion admin
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconMail, IconLock, IconEye, IconEyeOff, IconDiamond } from '@tabler/icons-react';
import { authAPI } from '@/utils/api';
import useAuthStore from '@/store/authStore';
import { useToast } from '@/components/Shared/Toast';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { setAdminAuth, isAdminAuthenticated } = useAuthStore();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Déjà authentifié → rediriger
  if (isAdminAuthenticated) {
    navigate('/admin', { replace: true });
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setError('');
    setLoading(true);
    try {
      const res = await authAPI.login(email, password);
      setAdminAuth(res.data.token, res.data.user);
      toast.success('Connexion réussie');
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err.message || 'Identifiants incorrects');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-screen-gutter py-space-2xl pt-safe pb-safe">
      <div className="w-full max-w-sm flex flex-col gap-space-xl">

        {/* ── Logo ── */}
        <div className="flex flex-col items-center gap-space-sm text-center">
          <div className="w-16 h-16 rounded-full bg-primary-fixed flex items-center justify-center">
            <IconDiamond size={32} className="text-primary" stroke={1.5} />
          </div>
          <div>
            <h1 className="font-display text-headline-lg text-on-surface">Espace Admin</h1>
            <p className="font-body text-body-sm text-secondary mt-1">
              Notre Mariage · Yaoundé Nuptials
            </p>
          </div>
        </div>

        {/* ── Formulaire ── */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-space-md">
          {/* Email */}
          <div className="flex flex-col gap-space-2xs">
            <label className="input-label" htmlFor="admin-email">Adresse email</label>
            <div className="relative">
              <IconMail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" stroke={1.5} />
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@mariage.cm"
                className="input-field pl-10"
                required
                autoComplete="email"
              />
            </div>
          </div>

          {/* Mot de passe */}
          <div className="flex flex-col gap-space-2xs">
            <label className="input-label" htmlFor="admin-password">Mot de passe</label>
            <div className="relative">
              <IconLock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" stroke={1.5} />
              <input
                id="admin-password"
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field pl-10 pr-12"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                aria-label={showPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-on-surface transition-colors"
              >
                {showPwd ? <IconEyeOff size={18} stroke={1.5} /> : <IconEye size={18} stroke={1.5} />}
              </button>
            </div>
          </div>

          {/* Erreur */}
          {error && (
            <div className="bg-error-container rounded-lg px-space-md py-space-sm font-body text-body-sm text-on-error-container animate-enter">
              {error}
            </div>
          )}

          {/* Bouton connexion */}
          <button type="submit" disabled={loading || !email || !password} className="btn-primary mt-space-xs">
            {loading ? (
              <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <IconLock size={18} stroke={2} />
            )}
            <span>{loading ? 'Connexion...' : 'Se connecter'}</span>
          </button>
        </form>

        {/* ── Sécurité mention ── */}
        <p className="text-center font-body text-label-sm text-secondary">
          Accès sécurisé · Session 24h · HTTPS
        </p>
      </div>
    </div>
  );
}
