/**
 * Utilitaires QR Code
 * - Scan via jsQR (caméra)
 * - Génération de tokens uniques
 */
import jsQR from 'jsqr';

// ─── SCANNER QR VIA CAMÉRA ────────────────────────────────────────────────

/**
 * Lit les pixels d'un canvas/video et tente de décoder un QR
 * @param {HTMLVideoElement|HTMLCanvasElement} source - Source vidéo ou canvas
 * @returns {string|null} Contenu du QR ou null si non trouvé
 */
export function scanQRFromFrame(source) {
  try {
    const canvas = document.createElement('canvas');
    const video = source instanceof HTMLVideoElement ? source : null;

    if (video) {
      if (video.readyState !== video.HAVE_ENOUGH_DATA) return null;
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
    } else {
      canvas.width  = source.width;
      canvas.height = source.height;
    }

    const ctx = canvas.getContext('2d');
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });

    return code ? code.data : null;
  } catch (error) {
    console.error('[qrScanner] Erreur lecture frame:', error);
    return null;
  }
}

/**
 * Démarre la caméra et retourne le stream
 * @param {boolean} facingBack - true = caméra arrière, false = frontale
 * @returns {Promise<MediaStream>}
 */
export async function startCamera(facingBack = true) {
  const constraints = {
    video: {
      facingMode: facingBack ? 'environment' : 'user',
      width:  { ideal: 1280 },
      height: { ideal: 720 },
    },
    audio: false,
  };

  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch (error) {
    // Fallback sans contraintes de caméra
    try {
      return await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    } catch {
      throw new Error('Accès caméra refusé. Veuillez autoriser l\'accès dans les paramètres.');
    }
  }
}

/**
 * Arrête proprement un MediaStream
 * @param {MediaStream|null} stream
 */
export function stopCamera(stream) {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
  }
}

/**
 * Boucle de scan sur un élément video
 * @param {HTMLVideoElement} videoEl - Élément vidéo avec stream actif
 * @param {Function} onFound - Callback quand un QR est trouvé : (data: string) => void
 * @param {Function} [onFrame] - Appelé à chaque frame (pour animation)
 * @returns {Function} Fonction d'annulation du scan
 */
export function startQRScanLoop(videoEl, onFound, onFrame) {
  let active = true;
  let lastFound = null;
  let cooldown = false;

  const tick = () => {
    if (!active) return;

    if (onFrame) onFrame();

    const data = scanQRFromFrame(videoEl);
    if (data && data !== lastFound && !cooldown) {
      lastFound = data;
      cooldown = true;
      onFound(data);
      // Cooldown 2s pour éviter double scan
      setTimeout(() => {
        cooldown = false;
        lastFound = null;
      }, 2000);
    }

    requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);

  return () => { active = false; };
}

// ─── GÉNÉRATION TOKENS QR ─────────────────────────────────────────────────

/**
 * Génère un token QR unique et non-devinable
 * Format: WED-{prefix}-{timestamp}-{random}
 * @param {string} prefix - 'ENTRY' ou 'TABLE'
 * @returns {string}
 */
export function generateQRToken(prefix = 'ENTRY') {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Array.from(
    crypto.getRandomValues(new Uint8Array(8)),
    (b) => b.toString(16).padStart(2, '0')
  ).join('').toUpperCase();
  return `WED-${prefix}-${timestamp}-${random}`;
}

/**
 * Génère les tokens QR pour un invité
 * @param {string} guestId - UUID de l'invité
 * @returns {{ entry: string, table: string }}
 */
export function generateGuestQRTokens(guestId) {
  const shortId = guestId.replace(/-/g, '').slice(0, 8).toUpperCase();
  return {
    entry: `WED-ENTRY-${shortId}-${Date.now().toString(36).toUpperCase()}`,
    table: `WED-TABLE-${shortId}-${Date.now().toString(36).toUpperCase()}`,
  };
}

/**
 * Construit l'URL de la page table depuis le numéro
 * @param {number} tableNumber
 * @returns {string}
 */
export function buildTableURL(tableNumber) {
  const base = window.location.origin;
  return `${base}/table/${tableNumber}`;
}

/**
 * Extrait le numéro de table d'une URL ou d'un QR de table
 * @param {string} data - Contenu du QR code
 * @returns {number|null}
 */
export function parseTableFromQR(data) {
  // Format URL: .../table/12
  const urlMatch = data.match(/\/table\/(\d+)/);
  if (urlMatch) return parseInt(urlMatch[1], 10);

  // Format token: WED-TABLE-...
  if (data.startsWith('WED-TABLE-')) return null; // retourné au backend

  return null;
}

// ─── VALIDATION QR ───────────────────────────────────────────────────────

/**
 * Vérifie si un QR scanné ressemble à un QR de notre app
 */
export function isWeddingQR(data) {
  return typeof data === 'string' && (
    data.startsWith('WED-ENTRY-') ||
    data.startsWith('WED-TABLE-') ||
    data.includes('/table/')
  );
}
