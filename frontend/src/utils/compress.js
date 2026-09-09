/**
 * Compression côté client — Photos & Vidéos
 * Utilise browser-image-compression pour les photos
 * Utilise MediaRecorder avec des constraints pour la vidéo
 */
import imageCompression from 'browser-image-compression';

// ─── COMPRESSION PHOTOS ────────────────────────────────────────────────────

/**
 * Compresse une image avant upload
 * @param {File} file - Fichier image original
 * @param {Function} onProgress - Callback progression (0-100)
 * @returns {Promise<File>} Fichier compressé
 */
export async function compressImage(file, onProgress) {
  const options = {
    maxSizeMB: 5,              // max 5 MB
    maxWidthOrHeight: 1920,    // max 1920px
    useWebWorker: true,
    fileType: 'image/webp',    // WebP = meilleure compression
    initialQuality: 0.85,
    onProgress: onProgress,
    preserveExif: false,       // supprimer les métadonnées EXIF (vie privée)
  };

  try {
    const compressed = await imageCompression(file, options);

    // Si la compression a réduit la taille, utiliser le résultat
    if (compressed.size < file.size) {
      return new File([compressed], file.name.replace(/\.\w+$/, '.webp'), {
        type: 'image/webp',
        lastModified: Date.now(),
      });
    }
    return file; // Retourner l'original si déjà petit
  } catch (error) {
    console.error('[compress] Erreur compression image:', error);
    return file; // Fallback : original
  }
}

/**
 * Génère un thumbnail base64 d'une image
 * @param {File} file - Fichier image
 * @param {number} maxPx - Taille max du thumbnail
 * @returns {Promise<string>} Data URL base64
 */
export async function generateImageThumbnail(file, maxPx = 400) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ratio = Math.min(maxPx / img.width, maxPx / img.height);
        canvas.width  = Math.round(img.width  * ratio);
        canvas.height = Math.round(img.height * ratio);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/webp', 0.7));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ─── GÉNÉRATION THUMBNAIL VIDÉO ───────────────────────────────────────────

/**
 * Extrait une frame d'une vidéo pour créer un thumbnail
 * @param {File|Blob} videoBlob - Blob vidéo
 * @param {number} seekTime - Secondes pour la frame (défaut: 1s)
 * @returns {Promise<string>} Data URL base64 du thumbnail
 */
export async function generateVideoThumbnail(videoBlob, seekTime = 1) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const url = URL.createObjectURL(videoBlob);
    video.src = url;

    video.onloadeddata = () => {
      video.currentTime = Math.min(seekTime, video.duration * 0.3);
    };

    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = Math.min(video.videoWidth,  640);
      canvas.height = Math.min(video.videoHeight, 480);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/webp', 0.7));
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Impossible de générer le thumbnail vidéo'));
    };
  });
}

// ─── CONSTRAINTS MEDIARECORDER ────────────────────────────────────────────

/**
 * Contraintes vidéo optimisées pour upload (720p H.264)
 * Adaptées aux appareils mobiles avec connexion limitée
 */
export const videoConstraints = {
  video: {
    width: { ideal: 1280, max: 1280 },
    height: { ideal: 720, max: 720 },
    frameRate: { ideal: 24, max: 30 },
    facingMode: 'environment',  // caméra arrière par défaut
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    sampleRate: 44100,
  },
};

export const videoConstraintsFront = {
  ...videoConstraints,
  video: {
    ...videoConstraints.video,
    facingMode: 'user', // caméra frontale
  },
};

/**
 * Options MediaRecorder pour vidéo compressée
 */
export function getVideoRecorderOptions() {
  const preferredCodecs = [
    'video/webm;codecs=h264,opus',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ];

  for (const codec of preferredCodecs) {
    if (MediaRecorder.isTypeSupported(codec)) {
      return {
        mimeType: codec,
        videoBitsPerSecond: 1_200_000, // 1.2 Mbps → ~9MB/min
        audioBitsPerSecond: 128_000,
      };
    }
  }
  return {}; // fallback navigateur
}

/**
 * Options MediaRecorder pour audio
 */
export function getAudioRecorderOptions() {
  const preferredCodecs = [
    'audio/webm;codecs=opus',
    'audio/ogg;codecs=opus',
    'audio/webm',
  ];

  for (const codec of preferredCodecs) {
    if (MediaRecorder.isTypeSupported(codec)) {
      return { mimeType: codec, audioBitsPerSecond: 96_000 };
    }
  }
  return {};
}

/**
 * Contraintes micro pour audio haute qualité vocale
 */
export const audioConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 44100,
    channelCount: 1, // mono suffit pour voix
  },
};

// ─── UTILITAIRES FICHIERS ─────────────────────────────────────────────────

/**
 * Formate une taille en octets → chaîne lisible
 */
export function formatFileSize(bytes) {
  if (bytes < 1024)            return `${bytes} o`;
  if (bytes < 1024 * 1024)     return `${(bytes / 1024).toFixed(1)} Ko`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} Go`;
}

/**
 * Formate des secondes → MM:SS
 */
export function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Vérifie si un fichier est une image acceptée
 */
export function isValidImageFile(file) {
  return ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
    .includes(file.type);
}

/**
 * Vérifie si un fichier est une vidéo acceptée
 */
export function isValidVideoFile(file) {
  return ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v']
    .includes(file.type);
}
