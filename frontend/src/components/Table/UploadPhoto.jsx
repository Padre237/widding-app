/**
 * UploadPhoto — Upload photo avec compression client-side
 * Caméra directe OU galerie, compression WebP, progress bar
 */
import { useState, useRef, useCallback } from 'react';
import {
  IconCamera, IconPhoto, IconCloudUpload,
  IconCheck, IconX, IconLock,
} from '@tabler/icons-react';
import { compressImage, generateImageThumbnail, formatFileSize, isValidImageFile } from '@/utils/compress';
import { mediaAPI } from '@/utils/api';
import useAuthStore from '@/store/authStore';
import useGalleryStore from '@/store/galleryStore';
import { UploadProgress } from '@/components/Shared/LoadingSpinner';
import { useToast } from '@/components/Shared/Toast';

const MAX_CAPTION = 100;

export default function UploadPhoto() {
  const { guestData, tableNumber } = useAuthStore();
  const { prependItem } = useGalleryStore();
  const toast = useToast();

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const [preview, setPreview] = useState(null);        // data URL aperçu
  const [selectedFile, setSelectedFile] = useState(null);
  const [compressedFile, setCompressedFile] = useState(null);
  const [caption, setCaption] = useState('');
  const [guestName, setGuestName] = useState(guestData?.name || '');

  const [state, setState] = useState('idle'); // idle | compressing | ready | uploading | success | error
  const [progress, setProgress] = useState(0);
  const [compressedSize, setCompressedSize] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // ── Sélection fichier ────────────────────────────────────────────────
  const handleFileSelect = useCallback(async (file) => {
    if (!file) return;
    if (!isValidImageFile(file)) {
      toast.error('Format non supporté — utilisez JPEG, PNG ou WebP');
      return;
    }

    setErrorMsg('');
    setState('compressing');
    setProgress(0);

    // Aperçu immédiat
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);
    setSelectedFile(file);

    try {
      const compressed = await compressImage(file, (p) => setProgress(Math.round(p * 0.5)));
      setCompressedFile(compressed);
      setCompressedSize(compressed.size);
      setState('ready');
      setProgress(0);
    } catch {
      setState('error');
      setErrorMsg('Erreur de compression — réessayez');
    }
  }, [toast]);

  // ── Trigger inputs ───────────────────────────────────────────────────
  const openCamera = () => cameraInputRef.current?.click();
  const openGallery = () => fileInputRef.current?.click();

  // ── Upload ───────────────────────────────────────────────────────────
  const handleUpload = useCallback(async () => {
    if (!compressedFile || state !== 'ready') return;
    if (!guestName.trim()) {
      toast.warning('Veuillez saisir votre nom');
      return;
    }

    setState('uploading');
    setProgress(0);

    const formData = new FormData();
    formData.append('file', compressedFile);
    formData.append('type', 'photo');
    formData.append('guestName', guestName.trim());
    formData.append('caption', caption.trim());
    formData.append('tableNumber', tableNumber || 1);
    if (guestData?.id) formData.append('guestId', guestData.id);

    try {
      const res = await mediaAPI.upload(formData, (evt) => {
        const pct = Math.round((evt.loaded / evt.total) * 100);
        setProgress(pct);
      });

      // Ajouter en tête de galerie (temps réel local)
      prependItem(res.data.media);
      setState('success');
      toast.success('Photo publiée dans la galerie !');
    } catch (err) {
      setState('error');
      setErrorMsg(err.message || 'Erreur lors de l\'upload');
      toast.error('Upload échoué — réessayez');
    }
  }, [compressedFile, state, guestName, caption, tableNumber, guestData, prependItem, toast]);

  // ── Reset ────────────────────────────────────────────────────────────
  const handleReset = () => {
    setPreview(null);
    setSelectedFile(null);
    setCompressedFile(null);
    setCaption('');
    setProgress(0);
    setCompressedSize(null);
    setErrorMsg('');
    setState('idle');
  };

  return (
    <div className="flex flex-col gap-space-lg w-full pb-space-2xl">
      {/* ── En-tête ── */}
      <div className="flex flex-col gap-space-2xs text-center pt-space-xs">
        <span className="section-label">Souvenir Partagé</span>
        <h1 className="font-display text-headline-lg text-on-surface">Immortaliser un instant</h1>
        <p className="font-body text-body-sm text-on-surface-variant max-w-xs mx-auto">
          Offrez aux mariés un précieux témoignage de cette soirée inoubliable.
        </p>
      </div>

      {/* ── Succès ── */}
      {state === 'success' && (
        <div className="flex flex-col items-center gap-space-md py-space-xl animate-enter">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
            <IconCheck size={32} className="text-success" stroke={2} />
          </div>
          <p className="font-display text-headline-sm text-on-surface text-center">
            Photo publiée avec succès !
          </p>
          <p className="font-body text-body-md text-secondary text-center">
            Votre souvenir est visible dans la galerie commune.
          </p>
          <button onClick={handleReset} className="btn-primary max-w-xs">
            <IconCamera size={20} stroke={1.5} />
            <span>Partager une autre photo</span>
          </button>
        </div>
      )}

      {state !== 'success' && (
        <>
          {/* ── Boutons source ── */}
          {state === 'idle' && (
            <div className="grid grid-cols-2 gap-space-sm">
              <SourceButton
                Icon={IconCamera}
                label="Prendre une photo"
                sublabel="Instantané"
                onClick={openCamera}
              />
              <SourceButton
                Icon={IconPhoto}
                label="Choisir dans la galerie"
                sublabel="Fichiers récents"
                onClick={openGallery}
              />
            </div>
          )}

          {/* Inputs cachés */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files?.[0])}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files?.[0])}
          />

          {/* ── Aperçu ── */}
          {preview && (
            <div className="flex flex-col gap-space-xs">
              <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden shadow-md bg-surface-container">
                <img src={preview} alt="Aperçu" className="w-full h-full object-cover" />

                {/* Badge taille */}
                {compressedSize && (
                  <div className="absolute top-space-xs right-space-xs flex items-center gap-space-2xs bg-on-surface/75 backdrop-blur-md px-space-xs py-1 rounded-full text-surface font-body text-label-sm">
                    <span>{formatFileSize(compressedSize)}</span>
                  </div>
                )}

                {/* Badge compression OK */}
                {state === 'ready' && (
                  <div className="absolute bottom-space-xs left-space-xs right-space-xs flex items-center justify-between p-space-xs rounded-lg bg-surface/90 backdrop-blur-md">
                    <div className="flex items-center gap-space-xs">
                      <IconCheck size={18} className="text-primary" stroke={2} />
                      <span className="font-body text-label-sm text-on-surface">
                        Compression optimisée — {compressedSize < 5_000_000 ? 'Prêt' : 'Trop lourd'}
                      </span>
                    </div>
                    <span className="font-body text-label-sm font-semibold text-primary">Prêt</span>
                  </div>
                )}

                {/* Bouton fermer */}
                <button
                  onClick={handleReset}
                  aria-label="Changer la photo"
                  className="absolute top-space-xs left-space-xs w-8 h-8 rounded-full bg-on-surface/60 backdrop-blur-md flex items-center justify-center text-surface"
                >
                  <IconX size={16} stroke={2} />
                </button>
              </div>

              {/* Barre compression */}
              {state === 'compressing' && (
                <UploadProgress progress={Math.round(progress)} fileName={selectedFile?.name} />
              )}

              {/* Barre upload */}
              {state === 'uploading' && (
                <UploadProgress
                  progress={progress}
                  fileName={selectedFile?.name}
                  fileSize={compressedSize ? formatFileSize(compressedSize) : ''}
                />
              )}
            </div>
          )}

          {/* ── Formulaire ── */}
          {(state === 'ready' || state === 'uploading') && (
            <form
              className="flex flex-col gap-space-md"
              onSubmit={(e) => { e.preventDefault(); handleUpload(); }}
            >
              {/* Nom */}
              <div className="flex flex-col gap-space-2xs">
                <label className="input-label" htmlFor="guest-name-photo">
                  Votre nom (affiché sur la table)
                </label>
                <input
                  id="guest-name-photo"
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Votre nom..."
                  className="input-field"
                  maxLength={100}
                />
              </div>

              {/* Légende */}
              <div className="flex flex-col gap-space-2xs">
                <div className="flex justify-between items-center">
                  <label className="input-label" htmlFor="caption-photo">
                    Mot pour les mariés (facultatif)
                  </label>
                  <span className="font-body text-label-sm text-secondary">
                    {caption.length}/{MAX_CAPTION}
                  </span>
                </div>
                <textarea
                  id="caption-photo"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value.slice(0, MAX_CAPTION))}
                  placeholder="Un mot doux pour accompagner votre cliché..."
                  className="textarea-field"
                  rows={2}
                  maxLength={MAX_CAPTION}
                />
              </div>

              {/* Bouton upload */}
              <div className="flex flex-col gap-space-xs">
                <button
                  type="submit"
                  disabled={state === 'uploading' || !guestName.trim()}
                  className="btn-primary"
                >
                  {state === 'uploading' ? (
                    <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : (
                    <IconCloudUpload size={20} stroke={1.5} />
                  )}
                  <span>
                    {state === 'uploading' ? 'Publication en cours...' : 'Publier dans la galerie commune'}
                  </span>
                </button>
                <div className="flex items-center justify-center gap-space-2xs text-secondary font-body text-label-sm">
                  <IconLock size={16} className="text-primary" stroke={1.5} />
                  <span>Visible instantanément par la Table {tableNumber}</span>
                </div>
              </div>
            </form>
          )}

          {/* Erreur */}
          {state === 'error' && errorMsg && (
            <div className="bg-error-container rounded-lg p-space-md flex items-center gap-space-sm">
              <IconX size={18} className="text-on-error-container shrink-0" stroke={2} />
              <p className="font-body text-body-md text-on-error-container">{errorMsg}</p>
              <button onClick={handleReset} className="ml-auto font-body text-label-md text-on-error-container underline shrink-0">
                Réessayer
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SourceButton({ Icon, label, sublabel, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-center justify-center p-space-md min-h-[56px] rounded-xl bg-surface-container-low active:bg-surface-container transition-all shadow-sm hover:shadow text-on-surface text-center"
    >
      <span className="w-11 h-11 rounded-full bg-surface-container-highest flex items-center justify-center text-primary group-hover:scale-105 transition-transform mb-space-2xs">
        <Icon size={24} stroke={1.5} />
      </span>
      <span className="font-body text-label-lg tracking-normal">{label}</span>
      <span className="font-body text-label-sm text-secondary">{sublabel}</span>
    </button>
  );
}
