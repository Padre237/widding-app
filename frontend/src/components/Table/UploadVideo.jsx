/**
 * UploadVideo — Enregistrement vidéo 45s max
 * MediaRecorder API, flip caméra, timer circulaire, preview, upload
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  IconFlipVertical, IconCheck, IconPlayerStop,
  IconPlayerPause, IconPlayerPlay, IconCloudUpload, IconX,
} from '@tabler/icons-react';
import {
  videoConstraints, videoConstraintsFront,
  getVideoRecorderOptions, generateVideoThumbnail, formatDuration,
} from '@/utils/compress';
import { mediaAPI } from '@/utils/api';
import useAuthStore from '@/store/authStore';
import useGalleryStore from '@/store/galleryStore';
import { UploadProgress } from '@/components/Shared/LoadingSpinner';
import { useToast } from '@/components/Shared/Toast';

const MAX_DURATION = 45; // secondes

export default function UploadVideo() {
  const { guestData, tableNumber } = useAuthStore();
  const { prependItem } = useGalleryStore();
  const toast = useToast();

  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  const [facingBack, setFacingBack] = useState(true);
  const [state, setState] = useState('idle'); // idle | ready | recording | paused | preview | uploading | success
  const [elapsed, setElapsed] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [guestName, setGuestName] = useState(guestData?.name || '');

  const remaining = MAX_DURATION - elapsed;
  const ringPct = Math.round((elapsed / MAX_DURATION) * 100);

  // ── Init caméra ──────────────────────────────────────────────────────
  const initCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const constraints = facingBack ? videoConstraints : videoConstraintsFront;
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setState('ready');
    } catch (err) {
      toast.error('Accès caméra refusé. Autorisez l\'accès dans les paramètres.');
    }
  }, [facingBack, toast]);

  useEffect(() => {
    if (state === 'idle') initCamera();
  }, [state, initCamera]);

  // Flip caméra
  useEffect(() => {
    if (state === 'ready') initCamera();
  }, [facingBack]); // eslint-disable-line

  // Nettoyage
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, []); // eslint-disable-line

  // ── Démarrer enregistrement ──────────────────────────────────────────
  const startRecording = useCallback(() => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const options = getVideoRecorderOptions();
    const mr = new MediaRecorder(streamRef.current, options);
    mediaRecorderRef.current = mr;

    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    mr.onstop = () => {
      const mimeType = options.mimeType || 'video/webm';
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      setRecordedBlob(blob);
      setPreviewUrl(url);
      setState('preview');
    };

    mr.start(1000); // chunk toutes les 1s
    setState('recording');
    setElapsed(0);

    timerRef.current = setInterval(() => {
      setElapsed((prev) => {
        if (prev + 1 >= MAX_DURATION) {
          stopRecording();
          return MAX_DURATION;
        }
        return prev + 1;
      });
    }, 1000);
  }, []);

  // ── Pause / Reprendre ────────────────────────────────────────────────
  const togglePause = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    if (state === 'recording') {
      mr.pause();
      clearInterval(timerRef.current);
      setState('paused');
    } else if (state === 'paused') {
      mr.resume();
      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          if (prev + 1 >= MAX_DURATION) { stopRecording(); return MAX_DURATION; }
          return prev + 1;
        });
      }, 1000);
      setState('recording');
    }
  }, [state]);

  // ── Arrêter ──────────────────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  // ── Upload ───────────────────────────────────────────────────────────
  const handleUpload = useCallback(async () => {
    if (!recordedBlob) return;
    setState('uploading');
    setUploadProgress(0);

    const ext = recordedBlob.type.includes('mp4') ? 'mp4' : 'webm';
    const file = new File([recordedBlob], `video_${Date.now()}.${ext}`, { type: recordedBlob.type });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'video');
    formData.append('guestName', guestName.trim() || 'Invité');
    formData.append('duration', elapsed);
    formData.append('tableNumber', tableNumber || 1);
    if (guestData?.id) formData.append('guestId', guestData.id);

    try {
      const res = await mediaAPI.upload(formData, (evt) => {
        setUploadProgress(Math.round((evt.loaded / evt.total) * 100));
      });
      prependItem(res.data.media);
      setState('success');
      toast.success('Vidéo publiée dans la galerie !');
    } catch (err) {
      setState('preview');
      toast.error('Upload échoué — ' + err.message);
    }
  }, [recordedBlob, guestName, elapsed, tableNumber, guestData, prependItem, toast]);

  // ── Reset ────────────────────────────────────────────────────────────
  const handleReset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setRecordedBlob(null);
    setPreviewUrl(null);
    setElapsed(0);
    setUploadProgress(0);
    setState('idle');
  };

  if (state === 'success') {
    return (
      <div className="flex flex-col items-center gap-space-md py-space-xl animate-enter">
        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
          <IconCheck size={32} className="text-success" stroke={2} />
        </div>
        <p className="font-display text-headline-sm text-on-surface text-center">Vidéo publiée !</p>
        <button onClick={handleReset} className="btn-primary max-w-xs">
          Enregistrer une autre vidéo
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-space-md w-full pb-space-2xl">
      {/* ── En-tête ── */}
      <div className="flex flex-col gap-space-2xs text-center pt-space-xs">
        <span className="section-label">Studio Privé · Table {tableNumber}</span>
        <h1 className="font-display text-headline-md text-on-surface">Message Vidéo pour les Mariés</h1>
        <p className="font-body text-body-sm text-secondary">Durée maximale {MAX_DURATION} secondes</p>
      </div>

      {/* ── Viewer caméra / preview ── */}
      <div className="relative w-full aspect-[4/5] rounded-xl bg-inverse-surface overflow-hidden shadow-xl">
        {/* Vidéo live */}
        {state !== 'preview' && (
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover opacity-90"
            autoPlay playsInline muted
            aria-label="Flux caméra"
          />
        )}
        {/* Preview enregistrée */}
        {state === 'preview' && previewUrl && (
          <video
            src={previewUrl}
            className="absolute inset-0 w-full h-full object-cover"
            controls playsInline
            aria-label="Aperçu vidéo enregistrée"
          />
        )}

        {/* Gradient scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-inverse-surface via-transparent to-inverse-surface/40 pointer-events-none" />

        {/* ── Indicateur badge ── */}
        <div className="absolute top-space-sm left-0 right-0 flex justify-center">
          <div className="flex items-center gap-space-xs px-space-sm py-space-2xs rounded-full bg-inverse-surface/80 backdrop-blur-sm">
            {state === 'recording' && (
              <span className="w-2 h-2 rounded-full bg-error animate-pulse" />
            )}
            <span className="font-body text-label-sm uppercase tracking-widest text-inverse-on-surface">
              {state === 'recording' ? 'REC • En cours' : state === 'paused' ? 'En pause' : state === 'preview' ? 'Aperçu' : 'Direct HD'}
            </span>
          </div>
        </div>

        {/* ── Timer circulaire ── */}
        {(state === 'recording' || state === 'paused') && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative flex items-center justify-center px-space-md py-space-xs rounded-full bg-inverse-surface/85 backdrop-blur-md shadow-lg gap-space-sm">
              <div className="relative w-9 h-9 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path className="text-surface-variant/20" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="2.5" />
                  <path className="text-primary transition-all duration-300 ease-linear" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray={`${ringPct}, 100`} strokeLinecap="round" strokeWidth="3" />
                </svg>
                <span className="absolute w-2 h-2 rounded-full bg-primary" />
              </div>
              <div className="flex flex-col">
                <span className="font-display text-headline-sm tracking-tight text-inverse-on-surface tabular-nums">
                  {formatDuration(elapsed)}{' '}
                  <span className="font-body text-body-sm text-secondary-fixed-dim">
                    / {formatDuration(MAX_DURATION)}
                  </span>
                </span>
                <span className="font-body text-label-sm tracking-wider uppercase text-primary-fixed-dim">
                  {remaining}s restantes
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Reticles luxe */}
        {(state === 'ready' || state === 'recording' || state === 'paused') && (
          <div className="absolute inset-4 pointer-events-none flex flex-col justify-between">
            <div className="flex justify-between">
              <CornerSVG d="M2 9V2h7" />
              <CornerSVG d="M22 9V2h-7" />
            </div>
            <div className="flex justify-between">
              <CornerSVG d="M2 15v7h7" />
              <CornerSVG d="M22 15v7h-7" />
            </div>
          </div>
        )}
      </div>

      {/* ── Contrôles ── */}
      {state !== 'preview' && state !== 'uploading' && (
        <div className="flex items-center justify-around w-full py-space-xs">
          {/* Flip caméra */}
          <button
            onClick={() => setFacingBack((f) => !f)}
            disabled={state === 'recording' || state === 'paused'}
            aria-label="Basculer caméra"
            className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center text-on-surface shadow-sm disabled:opacity-40 hover:bg-surface-container-high transition-colors"
          >
            <IconFlipVertical size={24} stroke={1.5} />
          </button>

          {/* Bouton principal */}
          {state === 'ready' && (
            <button onClick={startRecording} aria-label="Démarrer l'enregistrement"
              className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-on-primary shadow-xl active:scale-95 transition-transform">
              <span className="w-5 h-5 rounded-full bg-on-primary" />
            </button>
          )}
          {(state === 'recording' || state === 'paused') && (
            <div className="flex items-center gap-space-sm">
              <button onClick={togglePause} aria-label={state === 'recording' ? 'Pause' : 'Reprendre'}
                className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-on-surface shadow-md active:scale-95 transition-transform">
                {state === 'recording' ? <IconPlayerPause size={28} stroke={1.5} /> : <IconPlayerPlay size={28} stroke={1.5} />}
              </button>
              <button onClick={stopRecording} aria-label="Arrêter"
                className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-on-primary shadow-md active:scale-95 transition-transform">
                <IconPlayerStop size={28} stroke={1.5} />
              </button>
            </div>
          )}

          {/* Valider (placeholder) */}
          <button disabled aria-label="Valider"
            className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center text-outline shadow-sm opacity-40">
            <IconCheck size={24} stroke={1.5} />
          </button>
        </div>
      )}

      {/* ── Preview + upload ── */}
      {state === 'preview' && (
        <div className="flex flex-col gap-space-md animate-enter">
          {/* Nom */}
          <div className="flex flex-col gap-space-2xs">
            <label className="input-label" htmlFor="guest-name-video">Votre nom</label>
            <input
              id="guest-name-video"
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="input-field"
              maxLength={100}
            />
          </div>
          <div className="flex gap-space-sm">
            <button onClick={handleReset} className="btn-secondary flex-1">
              <IconX size={18} stroke={1.5} /> Refaire
            </button>
            <button onClick={handleUpload} className="btn-primary flex-1">
              <IconCloudUpload size={18} stroke={1.5} /> Envoyer
            </button>
          </div>
        </div>
      )}

      {/* ── Upload progress ── */}
      {state === 'uploading' && (
        <UploadProgress progress={uploadProgress} fileName={`video_${Date.now()}.webm`} />
      )}
    </div>
  );
}

function CornerSVG({ d }) {
  return (
    <svg className="w-6 h-6 text-primary-fixed-dim opacity-75" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path d={d} />
    </svg>
  );
}
