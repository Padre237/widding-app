/**
 * Comments — Section commentaires d'un média
 * Publication directe, suppression propre, max 500 chars
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { IconSend, IconTrash, IconMessageCircle } from '@tabler/icons-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { commentsAPI } from '@/utils/api';
import useAuthStore from '@/store/authStore';
import { useToast } from '@/components/Shared/Toast';

const MAX_CHARS = 500;

export default function Comments({ mediaId }) {
  const { guestData } = useAuthStore();
  const toast = useToast();

  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const listEndRef = useRef(null);

  // Charger les commentaires
  useEffect(() => {
    if (!mediaId) return;
    setIsLoading(true);
    commentsAPI.list(mediaId)
      .then((res) => setComments(res.data.comments || []))
      .catch(() => {/* silencieux */})
      .finally(() => setIsLoading(false));
  }, [mediaId]);

  // Scroll vers le bas lors d'un nouveau commentaire
  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments.length]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || isSubmitting) return;

    if (!guestData?.id) {
      toast.warning('Identifiez-vous via votre QR code de table');
      return;
    }

    setIsSubmitting(true);
    // Optimiste
    const tempId = `temp_${Date.now()}`;
    const optimistic = {
      id: tempId,
      text: trimmed,
      guestName: guestData.name,
      guestId: guestData.id,
      createdAt: new Date().toISOString(),
      isPending: true,
    };
    setComments((prev) => [...prev, optimistic]);
    setText('');

    try {
      const res = await commentsAPI.add(mediaId, trimmed, guestData.id, guestData.name);
      const saved = res.data.comment;
      setComments((prev) =>
        prev.map((c) => (c.id === tempId ? { ...saved } : c))
      );
    } catch (err) {
      // Rollback
      setComments((prev) => prev.filter((c) => c.id !== tempId));
      setText(trimmed);
      toast.error('Impossible d\'envoyer le commentaire');
    } finally {
      setIsSubmitting(false);
    }
  }, [text, isSubmitting, guestData, mediaId, toast]);

  const handleDelete = useCallback(async (commentId) => {
    if (!guestData?.id) return;
    // Optimiste
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    try {
      await commentsAPI.delete(commentId, guestData.id);
    } catch {
      toast.error('Impossible de supprimer le commentaire');
      // Recharger
      commentsAPI.list(mediaId)
        .then((res) => setComments(res.data.comments || []))
        .catch(() => {});
    }
  }, [guestData, mediaId, toast]);

  const initials = (name = '') =>
    name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase() || '?';

  const isOwn = (comment) => comment.guestId === guestData?.id;

  return (
    <section aria-label="Commentaires" className="flex flex-col gap-space-sm mt-space-lg">
      {/* ── En-tête ── */}
      <div className="flex items-center justify-between px-space-2xs">
        <div className="flex items-center gap-space-xs">
          <h3 className="font-display text-headline-sm text-on-surface">
            Paroles d&apos;Honneur
          </h3>
          <span className="bg-surface-container-high text-on-surface-variant font-body text-label-sm px-2 py-0.5 rounded-full">
            {comments.length}
          </span>
        </div>
        <IconMessageCircle size={16} className="text-outline" stroke={1.5} />
      </div>

      {/* ── Liste commentaires ── */}
      {isLoading ? (
        <div className="flex justify-center py-space-md">
          <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : comments.length === 0 ? (
        <p className="font-body text-body-sm text-outline text-center py-space-md">
          Soyez le premier à laisser un mot...
        </p>
      ) : (
        <div className="flex flex-col gap-space-xs">
          {comments.map((comment) => (
            <article
              key={comment.id}
              className={`card p-space-md transition-all animate-enter ${comment.isPending ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between gap-space-xs mb-1.5">
                <div className="flex items-center gap-space-xs">
                  {/* Avatar initiales */}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center font-body text-label-md shrink-0 ${isOwn(comment) ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-surface-container-high text-on-surface-variant'}`}>
                    {initials(comment.guestName)}
                  </div>
                  <div className="flex flex-col">
                    <h4 className="font-body text-label-lg text-on-surface leading-snug">
                      {comment.guestName}
                      {isOwn(comment) && (
                        <span className="ml-1 font-body text-label-sm text-primary">(vous)</span>
                      )}
                    </h4>
                    <span className="font-body text-label-sm text-secondary uppercase">
                      {comment.createdAt
                        ? formatDistanceToNow(new Date(comment.createdAt), { locale: fr, addSuffix: true })
                        : 'À l\'instant'}
                    </span>
                  </div>
                </div>
                {/* Supprimer — seulement son propre commentaire */}
                {isOwn(comment) && !comment.isPending && (
                  <button
                    onClick={() => handleDelete(comment.id)}
                    aria-label="Supprimer mon commentaire"
                    className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:text-error transition-colors shrink-0"
                  >
                    <IconTrash size={14} stroke={1.5} />
                  </button>
                )}
              </div>

              <p className="font-body text-body-md text-on-surface-variant pl-9 leading-relaxed">
                {comment.text}
              </p>
            </article>
          ))}
          <div ref={listEndRef} />
        </div>
      )}

      {/* ── Formulaire saisie ── */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-space-xs bg-surface-container-lowest rounded-full p-1.5 shadow-md"
      >
        <div className="pl-3.5 flex items-center text-outline">
          <IconMessageCircle size={20} stroke={1.5} />
        </div>
        <div className="flex-1 relative">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
            placeholder="Ajouter un mot..."
            aria-label="Votre commentaire"
            className="w-full bg-transparent px-2 py-2.5 font-body text-body-md text-on-surface placeholder:text-outline focus:outline-none"
            maxLength={MAX_CHARS}
          />
        </div>
        {text.length > 0 && (
          <span className={`font-body text-label-sm shrink-0 ${text.length > MAX_CHARS * 0.9 ? 'text-error' : 'text-outline'}`}>
            {MAX_CHARS - text.length}
          </span>
        )}
        <button
          type="submit"
          disabled={!text.trim() || isSubmitting}
          aria-label="Envoyer"
          className="w-11 h-11 rounded-full bg-primary text-on-primary flex items-center justify-center shadow hover:opacity-90 active:scale-95 transition-all shrink-0 touch-target disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
          ) : (
            <IconSend size={18} stroke={2} />
          )}
        </button>
      </form>
    </section>
  );
}
