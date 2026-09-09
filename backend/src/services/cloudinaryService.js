/**
 * Service Cloudinary — upload, suppression, transformation
 */
import { v2 as cloudinary } from 'cloudinary';
import { logger } from '../server.js';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true,
});

const FOLDER = process.env.CLOUDINARY_FOLDER || 'mariage-yaounde-2026';

// Sous-dossiers par type
const SUBFOLDERS = { photo: 'photos', video: 'videos', audio: 'audios' };

/**
 * Upload un fichier (Buffer) vers Cloudinary
 * @param {Buffer} buffer
 * @param {{ type: 'photo'|'video'|'audio', publicId?: string }} options
 * @returns {Promise<{ url: string, publicId: string, thumbnailUrl: string|null }>}
 */
export async function uploadMedia(buffer, { type, publicId }) {
  const subfolder  = SUBFOLDERS[type] || 'others';
  const folder     = `${FOLDER}/${subfolder}`;
  const resourceType = type === 'photo' ? 'image' : 'video'; // audio = resource_type video sur Cloudinary

  const uploadOptions = {
    resource_type: resourceType,
    folder,
    public_id:     publicId,
    overwrite:     false,
    // Transformations auto
    ...(type === 'photo' && {
      eager: [{ width: 800, height: 1000, crop: 'limit', quality: 'auto:good', format: 'webp' }],
      eager_async: true,
    }),
    ...(type === 'video' && {
      eager: [{ width: 1280, height: 720, crop: 'limit', quality: 'auto:low', video_codec: 'h264' }],
      eager_async: true,
    }),
  };

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) {
        logger.error({ error }, '[Cloudinary] Upload échoué');
        return reject(new Error('Erreur upload Cloudinary: ' + error.message));
      }

      const thumbnailUrl = type === 'photo'
        ? cloudinary.url(result.public_id, { width: 400, height: 500, crop: 'fill', quality: 80, format: 'webp' })
        : type === 'video'
          ? cloudinary.url(result.public_id, { resource_type: 'video', format: 'jpg', width: 400, height: 500, crop: 'fill' })
          : null;

      resolve({
        url:          result.secure_url,
        publicId:     result.public_id,
        thumbnailUrl,
        bytes:        result.bytes,
        duration:     result.duration || null, // pour vidéo/audio
        format:       result.format,
      });
    });
    stream.end(buffer);
  });
}

/**
 * Supprime un média de Cloudinary
 * @param {string} publicId
 * @param {'image'|'video'} resourceType
 */
export async function deleteMedia(publicId, resourceType = 'image') {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    logger.info({ publicId }, '[Cloudinary] Média supprimé');
  } catch (err) {
    logger.error({ err, publicId }, '[Cloudinary] Suppression échouée');
  }
}

/**
 * Génère une URL signée (accès temporaire)
 */
export function getSignedUrl(publicId, expiresIn = 3600) {
  return cloudinary.utils.private_download_url(publicId, 'jpg', {
    expires_at: Math.floor(Date.now() / 1000) + expiresIn,
  });
}

export default cloudinary;
