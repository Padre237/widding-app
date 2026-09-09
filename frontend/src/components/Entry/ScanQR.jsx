/**
 * ScanQR — Scanner QR code d'entrée (interface virgiles)
 * Utilise jsQR via la caméra du téléphone/tablette
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  IconShieldCheck,
  IconAlertTriangle,
  IconRefresh,
  IconQrcode,
} from '@tabler/icons-react';
import { startCamera, stopCamera, startQRScanLoop } from '@/utils/qrGenerator';
import usePresenceStore from '@/store/presenceStore';
import { guestsAPI } from '@/utils/api';
import { useToast } from '@/components/Shared/Toast';

export default function ScanQR() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const stopScanRef = useRef(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [scanLinePos, setScanLinePos] = useState(false);

  const { scanState, isProcessing, setScanning, setScanSuccess, setScanDuplicate, setScanError, resetScan } = usePresenceStore();
  const toast = useToast();

  // ── Démarrage caméra ──────────────────────────────────────────────────
  const initCamera = useCallback(async () => {
    setCameraError(null);
    setCameraReady(false);
    try {
      const stream = await startCamera(true);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
      }
    } catch (err) {
      setCameraError(err.message);
    }
  }, []);

  // ── Traitement QR scanné ──────────────────────────────────────────────
  const handleQRFound = useCallback(async (data) => {
    if (isProcessing || scanState === 'success') return;
    setScanning();
    try {
      const res = await guestsAPI.verifyQR(data);
      const guest = res.data.guest;
      if (res.data.isDuplicate) {
        setScanDuplicate(guest);
        toast.warning(`${guest.name} est déjà enregistré(e)`);
      } else {
        await guestsAPI.markArrival(guest.id, 'virgile');
        setScanSuccess(guest);
        toast.success(`Bienvenue, ${guest.name} !`);
      }
    } catch (err) {
      const msg = err.message || 'QR invalide ou non reconnu';
      setScanError(msg);
      toast.error(msg);
    }
  }, [isProcessing, scanState, setScanning, setScanSuccess, setScanDuplicate, setScanError, toast]);

  // ── Boucle de scan ────────────────────────────────────────────────────
  useEffect(() => {
    if (!cameraReady || !videoRef.current) return;
    stopScanRef.current = startQRScanLoop(
      videoRef.current,
      handleQRFound,
      () => setScanLinePos((p) => !p)
    );
    return () => { if (stopScanRef.current) stopScanRef.current(); };
  }, [cameraReady, handleQRFound]);

  // ── Init/cleanup caméra ───────────────────────────────────────────────
  useEffect(() => {
    initCamera();
    return () => {
      if (stopScanRef.current) stopScanRef.current();
      stopCamera(streamRef.current);
    };
  }, [initCamera]);

  const handleReset = () => {
    resetScan();
  };

  // ── Overlay résultat ──────────────────────────────────────────────────
  const renderOverlay = () => {
    if (scanState === 'success') {
      return (
        <div className="absolute inset-0 bg-success/90 flex items-center justify-center rounded-xl">
          <div className="flex flex-col items-center gap-space-sm text-white text-center px-space-md">
            <IconShieldCheck size={48} stroke={1.5} />
            <p className="font-display text-headline-sm">Entrée Confirmée</p>
          </div>
        </div>
      );
    }
    if (scanState === 'duplicate') {
      return (
        <div className="absolute inset-0 bg-error/90 flex items-center justify-center rounded-xl">
          <div className="flex flex-col items-center gap-space-sm text-white text-center px-space-md">
            <IconAlertTriangle size={48} stroke={1.5} />
            <p className="font-display text-headline-sm">Doublon Détecté</p>
          </div>
        </div>
      );
    }
    if (scanState === 'error') {
      return (
        <div className="absolute inset-0 bg-inverse-surface/90 flex items-center justify-center rounded-xl">
          <div className="flex flex-col items-center gap-space-sm text-white text-center px-space-md">
            <IconQrcode size={48} stroke={1.5} />
            <p className="font-display text-headline-sm">QR Non Reconnu</p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-space-md w-full">
      {/* ── Viseur caméra ── */}
      <div className="relative w-full max-w-[300px] mx-auto aspect-square rounded-xl bg-inverse-surface overflow-hidden shadow-lg">
        {/* Vidéo caméra */}
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover opacity-70"
          autoPlay
          playsInline
          muted
          aria-label="Flux caméra pour scan QR"
        />

        {/* Overlay noir si pas de caméra */}
        {!cameraReady && !cameraError && (
          <div className="absolute inset-0 bg-inverse-surface flex items-center justify-center">
            <div className="flex flex-col items-center gap-space-sm text-surface">
              <IconQrcode size={40} stroke={1} className="opacity-30" />
              <p className="font-body text-label-sm uppercase tracking-widest opacity-50">
                Initialisation...
              </p>
            </div>
          </div>
        )}

        {/* Erreur caméra */}
        {cameraError && (
          <div className="absolute inset-0 bg-inverse-surface flex items-center justify-center p-space-md">
            <div className="flex flex-col items-center gap-space-sm text-center">
              <IconAlertTriangle size={32} className="text-error" stroke={1.5} />
              <p className="font-body text-label-sm text-surface opacity-70 text-center">{cameraError}</p>
              <button onClick={initCamera} className="flex items-center gap-1 text-primary-fixed font-body text-label-md uppercase tracking-wider">
                <IconRefresh size={16} stroke={2} /> Réessayer
              </button>
            </div>
          </div>
        )}

        {/* Reticles luxe */}
        {cameraReady && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-48 h-48">
              <div className="scanner-corner-tl" />
              <div className="scanner-corner-tr" />
              <div className="scanner-corner-bl" />
              <div className="scanner-corner-br" />
              {/* Ligne de scan animée */}
              <div
                className="absolute left-2 right-2 h-0.5 bg-primary-container shadow-sm transition-transform duration-[1200ms] ease-in-out"
                style={{ transform: scanLinePos ? 'translateY(5rem)' : 'translateY(-5rem)' }}
              />
            </div>
          </div>
        )}

        {/* Overlay résultat */}
        {renderOverlay()}

        {/* Texte bas */}
        {cameraReady && scanState === 'idle' && (
          <div className="absolute bottom-space-xs left-0 right-0 flex justify-center">
            <span className="px-space-sm py-0.5 rounded bg-on-surface/80 backdrop-blur-sm font-body text-label-sm uppercase tracking-wider text-surface">
              Cadrer l&apos;invitation
            </span>
          </div>
        )}

        {/* Bouton reset après résultat */}
        {(scanState === 'success' || scanState === 'duplicate' || scanState === 'error') && (
          <button
            onClick={handleReset}
            className="absolute bottom-space-xs left-0 right-0 flex justify-center"
          >
            <span className="px-space-sm py-0.5 rounded bg-on-surface/80 backdrop-blur-sm font-body text-label-sm uppercase tracking-wider text-surface flex items-center gap-1">
              <IconRefresh size={12} stroke={2} /> Scanner suivant
            </span>
          </button>
        )}
      </div>

      {/* Indicateur traitement */}
      {isProcessing && (
        <div className="flex items-center justify-center gap-space-xs text-primary">
          <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="font-body text-label-md uppercase tracking-wider">Vérification...</span>
        </div>
      )}
    </div>
  );
}
