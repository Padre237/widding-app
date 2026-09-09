/**
 * Service QR Code — génération PNG + PDF planches
 */
import QRCode from 'qrcode';
import { randomBytes } from 'crypto';

/**
 * Génère un token QR unique non-devinable
 */
export function generateQRToken(prefix = 'ENTRY') {
  const random = randomBytes(8).toString('hex').toUpperCase();
  const ts     = Date.now().toString(36).toUpperCase();
  return `WED-${prefix}-${ts}-${random}`;
}

/**
 * Génère les deux tokens QR d'un invité (entrée + table)
 */
export function generateGuestTokens() {
  return {
    qrCodeEntry: generateQRToken('ENTRY'),
    qrCodeTable: generateQRToken('TABLE'),
  };
}

/**
 * Génère un QR code en format Data URL (base64 PNG)
 * @param {string} content — contenu du QR (token ou URL)
 * @returns {Promise<string>} Data URL PNG
 */
export async function generateQRDataURL(content) {
  return QRCode.toDataURL(content, {
    errorCorrectionLevel: 'H',
    type:    'image/png',
    width:   400,
    margin:  2,
    color: { dark: '#1e1b17', light: '#fff8f1' },
  });
}

/**
 * Génère un QR code en Buffer PNG
 */
export async function generateQRBuffer(content) {
  return QRCode.toBuffer(content, {
    errorCorrectionLevel: 'H',
    type:    'png',
    width:   300,
    margin:  2,
    color: { dark: '#1e1b17', light: '#fff8f1' },
  });
}

/**
 * Construit l'URL de la page table
 */
export function buildTableURL(tableNumber, baseUrl) {
  const base = baseUrl || process.env.FRONTEND_URL || 'https://mariage.vercel.app';
  return `${base}/table/${tableNumber}`;
}
