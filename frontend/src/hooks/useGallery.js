/**
 * useGallery — Chargement + pagination de la galerie
 */
import { useCallback } from 'react';
import { mediaAPI } from '@/utils/api';
import useGalleryStore from '@/store/galleryStore';
import { cacheMediaList, getCachedMediaList } from '@/utils/storage';

export function useGallery(tableNumber) {
  const {
    page, pageSize, activeFilter, sortBy,
    setLoading, setError, setItems, appendItems, setCounts, resetGallery,
  } = useGalleryStore();

  // Charge la première page (reset complet)
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await mediaAPI.list({
        tableNumber,
        type:    activeFilter === 'all' ? undefined : activeFilter,
        sort:    sortBy,
        page:    1,
        limit:   20,
      });
      const { media, counts } = res.data;
      setItems(media || []);
      if (counts) setCounts(counts);
      cacheMediaList(tableNumber, media || []);
    } catch (err) {
      // Fallback cache offline
      const cached = getCachedMediaList(tableNumber);
      if (cached) {
        setItems(cached);
      } else {
        setError(err.message);
      }
    }
  }, [tableNumber, activeFilter, sortBy, setLoading, setError, setItems, setCounts]);

  // Charge la page suivante (infinite scroll)
  const loadMore = useCallback(async () => {
    setLoading(true);
    try {
      const res = await mediaAPI.list({
        tableNumber,
        type:  activeFilter === 'all' ? undefined : activeFilter,
        sort:  sortBy,
        page,
        limit: 20,
      });
      appendItems(res.data.media || []);
    } catch {
      setLoading(false);
    }
  }, [tableNumber, activeFilter, sortBy, page, setLoading, appendItems]);

  // Rafraîchissement manuel
  const refresh = useCallback(() => {
    resetGallery();
    load();
  }, [resetGallery, load]);

  return { load, loadMore, refresh };
}
