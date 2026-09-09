/**
 * UploadAudio — Enregistrement audio 2min max
 * Pause/reprendre, visualiseur waveform, preview, vitesse playback
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  IconMicrophone, IconPlayerPause, IconPlayerPlay,
  IconRefresh, IconPlayerStop, IconCloudUpload,
  IconCheck, IconWaveSine, IconX,
} from '@tabler/icons-react';
import {
  audioConstraints, getAudioRecorderOptions, formatDuration,
} from '@/utils/compress';
import { mediaAPI } from '@/utils/api';
import useAuthStore from '@/store/authStore';
import useGalleryStore from '@/store/galleryStore';
import { UploadProgress } from '@/components/Shared/LoadingSpinner';
import { useToast } from '@/components/Shared/Toast';

const MAX_DURATION = 120; // 2 minutes
const SPEEDS = [1, 1.25, 1.5, 2];
const WAVEFORM_BARS = 24;

export default function UploadAudio() {
  const { guestData, tableNumber } = useAuthStore();
  const { prependItem } = useGalleryStore();
  const toast = useToast();

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);

  const [state, setState] = useState('idle'); // idle | recording | paused | preview | uploading | success
  const [elapsed, setElapsed] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [guestName, setGuestName] = useState(guestData?.name || '');
  const [caption, setCaption] = useState('');
  const [speedIdx, setSpeedIdx] = useState(0);
  const [waveHeights, setWaveHeights] = useState(Array(WAVEFORM_BARS).fill(4));
  const [isPlaying, setIsPlaying] = useState(false);

  const remaining = MAX_DURATION - elapsed;

  // ── Visualiseur waveform ─────────────────────────────────────────────
  const startAnalyser = useCallback((stream) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      analyserRef.current = analyser;

      const draw = () => {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        const step = Math.floor(data.length / WAVEFORM_BARS);
        const heights = Array.from({ length: WAVEFORM_BARS }, (_, i) => {
          const val = data[i * step] || 0;
          return Math.max(4, Math.round((val / 255) * 100));
        });
        setWaveHeights(heights);
        animFrameRef.current = requestAnimationFrame(draw);
      };
      draw();
    } catch {
      // Silencieux si Web Audio non supporté
    }
  }, []);

  const stopAnalyser = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setWaveHeights(Array(WAVEFORM_BARS).fill(4));
  }, []);

  // ── Démarrer enregistrement ──────────────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(audioConstraints);
      streamRef.current = stream;
      chunksRef.current = [];
      startAnalyser(stream);

      const options = getAudioRecorderOptions();
      const mr = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const mimeType = options.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setRecordedBlob(blob);
        setPreviewUrl(url);
        setState('preview');
        stopAnalyser();
      };

      mr.start(500);
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
    } catch {
      toast.error('Accès micro refusé. Autorisez le microphone.');
    }
  }, [startAnalyser, stopAnalyser, toast]);

  // ── Pause / Reprendre ────────────────────────────────────────────────
  const togglePause = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    if (state === 'recording') {
      mr.pause();
      clearInterval(timerRef.current);
      stopAnalyser();
      setState('paused');
    } else if (state === 'paused') {
      mr.resume();
      if (streamRef.current) startAnalyser(streamRef.current);
      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          if (prev + 1 >= MAX_DURATION) { stopRecording(); return MAX_DURATION; }
          return prev + 1;
        });
      }, 1000);
      setState('recording');
    }
  }, [state, startAnalyser, stopAnalyser]);

  // ── Arrêter ──────────────────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    clearInterval(timerRef.current);
    stopAnalyser();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    mediaRecorderRef.current?.stop();
  }, [stopAnalyser]);

  // ── Preview play/pause ────────────────────────────────────────────────
  const togglePlayPreview = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.playbackRate = SPEEDS[speedIdx];
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying, speedIdx]);

  const cycleSpeed = useCallback(() => {
    const next = (speedIdx + 1) % SPEEDS.length;
    setSpeedIdx(next);
    if (audioRef.current) audioRef.current.playbackRate = SPEEDS[next];
  }, [speedIdx]);

  // ── Upload ───────────────────────────────────────────────────────────
  const handleUpload = useCallback(async () => {
    if (!recordedBlob) return;
    setState('uploading');
    setUploadProgress(0);

    const ext = recordedBlob.type.includes('ogg') ? 'ogg' : 'webm';
    const file = new File([recordedBlob], `audio_${Date.now()}.${ext}`, { type: recordedBlob.type });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'audio');
    formData.append('guestName', guestName.trim() || 'Invité');
    formData.append('caption', caption.trim());
    formData.append('duration', elapsed);
    formData.append('tableNumber', tableNumber || 1);
    if (guestData?.id) formData.append('guestId', guestData.id);

    try {
      const res = await mediaAPI.upload(formData, (evt) => {
        setUploadProgress(Math.round((evt.loaded / evt.total) * 100));
      });
      prependItem(res.data.media);
      setState('success');
      toast.success('Message audio publié !');
    } catch (err) {
      setState('preview');
      toast.error('Upload échoué — ' + err.message);
    }
  }, [recordedBlob, guestName, caption, elapsed, tableNumber, guestData, prependItem, toast]);

  // ── Reset ────────────────────────────────────────────────────────────
  const handleReset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setRecordedBlob(null);
    setPreviewUrl(null);
    setElapsed(0);
    setIsPlaying(false);
    setState('idle');
  };

  // Nettoyage
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      stopAnalyser();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, []); // eslint-disable-line

  if (state === 'success') {
    return (
      <div className="flex flex-col items-center gap-space-md py-space-xl animate-enter">
        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
          <IconCheck size={32} className="text-success" stroke={2} />
        </div>
        <p className="font-display text-headline-sm text-on-surface text-center">Message audio publié !</p>
        <button onClick={handleReset} className="btn-primary max-w-xs">
          <IconMicrophone size={20} stroke={1.5} /> Enregistrer un autre message
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-space-lg w-full pb-space-2xl">
      {/* ── En-tête ── */}
      <header className="flex flex-col items-center text-center gap-space-2xs mt-space-xs">
        <span className="section-label">Studio Vocal · Table {tableNumber}</span>
        <h1 className="font-display text-headline-lg text-on-surface">Message Audio aux Mariés</h1>
        <p className="font-body text-body-md text-on-surface-variant max-w-xs">
          Enregistrez vos bénédictions spontanées (jusqu&apos;à 2 minutes)
        </p>
      </header>

      {/* ── Carte studio ── */}
      {(state === 'idle' || state === 'recording' || state === 'paused') && (
        <div className="card p-space-lg flex flex-col items-center gap-space-lg">
          {/* Timer + statut */}
          <div className="w-full flex items-center justify-between">
            <div className="flex items-center gap-space-xs bg-surface-container-low px-space-sm py-space-2xs rounded-full">
              {state === 'recording' && <span className="w-2 h-2 rounded-full bg-primary animate-ping" />}
              {state === 'paused'    && <span className="w-2 h-2 rounded-full bg-warning" />}
              {state === 'idle'      && <span className="w-2 h-2 rounded-full bg-outline" />}
              <span className="font-body text-label-md uppercase tracking-wider text-primary font-medium">
                {state === 'recording' ? 'En direct' : state === 'paused' ? 'En pause' : 'Prêt'}
              </span>
            </div>
            <div className="flex items-baseline gap-1 text-on-surface">
              <span className="font-display text-headline-md font-semibold tabular-nums">
                {formatDuration(elapsed)}
              </span>
              <span className="font-body text-body-sm text-secondary">/ {formatDuration(MAX_DURATION)}</span>
            </div>
          </div>

          {/* Waveform */}
          <div className={`w-full h-32 flex items-center justify-center gap-[3px] px-space-xs py-space-sm bg-surface-container-low rounded-lg overflow-hidden ${state === 'recording' ? 'waveform-animated' : ''}`}>
            {waveHeights.map((h, i) => (
              <div
                key={i}
                className="waveform-bar"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>

          {/* Bouton principal */}
          <div className="flex items-center justify-center relative">
            {state === 'recording' && (
              <span className="absolute w-24 h-24 rounded-full bg-primary/10 animate-ping" />
            )}
            <button
              onClick={state === 'idle' ? startRecording : togglePause}
              aria-label={state === 'idle' ? 'Démarrer' : state === 'recording' ? 'Pause' : 'Reprendre'}
              className="relative z-10 w-20 h-20 rounded-full bg-surface-container-lowest shadow-md flex items-center justify-center active:scale-95 transition-transform"
            >
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-on-primary shadow-sm">
                {state === 'idle'      && <IconMicrophone size={32} stroke={1.5} />}
                {state === 'recording' && <IconPlayerPause size={32} stroke={1.5} />}
                {state === 'paused'    && <IconPlayerPlay  size={32} stroke={1.5} />}
              </div>
            </button>
          </div>

          {/* Contrôles secondaires */}
          {state !== 'idle' && (
            <div className="w-full flex items-center justify-between">
              <button onClick={handleReset} aria-label="Recommencer"
                className="w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center text-secondary hover:bg-surface-container-high transition-colors shadow-sm">
                <IconRefresh size={20} stroke={1.5} />
              </button>
              <button onClick={stopRecording} aria-label="Terminer"
                className="h-12 px-space-lg rounded-full bg-primary text-on-primary flex items-center gap-space-xs shadow-md active:scale-95 transition-transform font-body text-label-lg uppercase tracking-wider">
                <IconPlayerStop size={20} stroke={1.5} />
                <span>Terminer</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Preview ── */}
      {state === 'preview' && (
        <div className="card p-space-lg flex flex-col gap-space-md animate-enter">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-space-xs">
              <IconWaveSine size={20} className="text-primary" stroke={1.5} />
              <span className="font-body text-label-lg uppercase tracking-wider text-on-surface">
                Aperçu · {formatDuration(elapsed)}
              </span>
            </div>
          </div>

          {/* Contrôles preview */}
          <div className="flex items-center justify-between bg-surface-container-low rounded-lg p-space-sm">
            <button onClick={cycleSpeed}
              className="h-9 px-space-sm bg-surface-container rounded-full flex items-center gap-space-2xs text-on-surface font-body text-label-md font-semibold">
              {SPEEDS[speedIdx]}x
            </button>
            <div className="flex items-center gap-space-sm">
              <button onClick={togglePlayPreview} aria-label={isPlaying ? 'Pause' : 'Écouter'}
                className="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-sm active:scale-95 transition-transform">
                {isPlaying ? <IconPlayerPause size={22} stroke={1.5} /> : <IconPlayerPlay size={22} stroke={1.5} />}
              </button>
            </div>
            <button onClick={handleReset} aria-label="Recommencer"
              className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-secondary">
              <IconRefresh size={18} stroke={1.5} />
            </button>
          </div>

          {/* Audio element caché */}
          <audio
            ref={audioRef}
            src={previewUrl}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />

          {/* Nom */}
          <div className="flex flex-col gap-space-2xs">
            <label className="input-label" htmlFor="guest-name-audio">Votre nom</label>
            <input id="guest-name-audio" type="text" value={guestName}
              onChange={(e) => setGuestName(e.target.value)} className="input-field" maxLength={100} />
          </div>

          {/* Légende */}
          <div className="flex flex-col gap-space-2xs">
            <label className="input-label" htmlFor="caption-audio">Titre du message (facultatif)</label>
            <input id="caption-audio" type="text" value={caption}
              onChange={(e) => setCaption(e.target.value)} placeholder="Ex: Bénédiction fraternelle..."
              className="input-field" maxLength={100} />
          </div>

          {/* Bouton envoyer */}
          <button onClick={handleUpload} disabled={!guestName.trim()} className="btn-primary">
            <IconCloudUpload size={20} stroke={1.5} />
            <span>Valider &amp; Transmettre le Vœu</span>
          </button>
        </div>
      )}

      {/* Upload progress */}
      {state === 'uploading' && (
        <UploadProgress progress={uploadProgress} fileName="message_audio.webm" />
      )}
    </div>
  );
}
