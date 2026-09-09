/**
 * useUpload — Hook générique pour upload avec progression et retry
 */
import { useState, useCallback } from 'react';
import { mediaAPI } from '@/utils/api';
import useGalleryStore from '@/store/galleryStore';
import useAuthStore from '@/store/authStore';
import { addToOfflineQueue } from '@/utils/storage';

export function useUpload() {
  const { prependItem } = useGalleryStore();
  const { guestData, tableNumber } = useAuthStore();

  const [state, setState] = useState('idle'); // idle | uploading | success | error
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const upload = useCallback(async ({
    file,
    type,           // 'photo' | 'video' | 'audio'
    guestName,
    caption = '',
    duration,
  }) => {
    setState('uploading');
    setProgress(0);
    setError(null);

    // Vérification connexion
    if (!navigator.onLine) {
      addToOfflineQueue({ file, type, guestName, caption, duration, tableNumber });
      setState('error');
      setError('Hors-ligne — l\'upload sera effectué à la reconnexion');
      return null;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    formData.append('guestName', guestName || guestData?.name || 'Invité');
    formData.append('caption', caption);
    formData.append('tableNumber', tableNumber || 1);
    if (guestData?.id) formData.append('guestId', guestData.id);
    if (duration !== undefined) formData.append('duration', duration);

    try {
      const res = await mediaAPI.upload(formData, (evt) => {
        setProgress(Math.round((evt.loaded / evt.total) * 100));
      });
      prependItem(res.data.media);
      setState('success');
      return res.data.media;
    } catch (err) {
      setState('error');
      setError(err.message);
      return null;
    }
  }, [guestData, tableNumber, prependItem]);

  const reset = useCallback(() => {
    setState('idle');
    setProgress(0);
    setError(null);
  }, []);

  return {
    upload,
    reset,
    state,
    progress,
    error,
    isUploading: state === 'uploading',
    isSuccess:   state === 'success',
    isError:     state === 'error',
  };
}
