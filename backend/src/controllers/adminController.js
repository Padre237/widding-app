/**
 * Controller Admin — dashboard, paramètres, reset, archive
 */
import archiver  from 'archiver';
import bcrypt    from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import supabase  from '../services/supabaseService.js';
import { generateQRBuffer, buildTableURL } from '../services/qrService.js';
import { signAdminToken } from '../middleware/auth.js';
import { logger } from '../server.js';

// ── POST /auth/login ──────────────────────────────────────────────────────
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const { data: admin, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !admin) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    // Mise à jour last_login
    await supabase
      .from('admin_users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', admin.id);

    const token = signAdminToken({ id: admin.id, email: admin.email, role: admin.role });

    logger.info({ adminId: admin.id, email: admin.email }, '[Admin] Connexion');
    res.json({
      token,
      user: { id: admin.id, email: admin.email, role: admin.role },
    });
  } catch (err) { next(err); }
}

// ── POST /auth/logout ─────────────────────────────────────────────────────
export async function logout(_req, res) {
  // JWT stateless — le client efface son token
  res.json({ success: true });
}

// ── GET /auth/me ──────────────────────────────────────────────────────────
export async function me(req, res, next) {
  try {
    const { data: admin, error } = await supabase
      .from('admin_users')
      .select('id, email, role, last_login')
      .eq('id', req.admin.id)
      .single();
    if (error || !admin) return res.status(404).json({ error: 'Admin introuvable' });
    res.json({ user: admin });
  } catch (err) { next(err); }
}

// ── GET /admin/dashboard ──────────────────────────────────────────────────
export async function getDashboard(req, res, next) {
  try {
    const { data: stats, error } = await supabase
      .from('stats_overview')
      .select('*')
      .single();

    if (error) throw error;

    // Médias uploadés dans la dernière heure
    const oneHourAgo = new Date(Date.now() - 3600 * 1000).toISOString();
    const { count: mediaThisHour } = await supabase
      .from('media')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', oneHourAgo)
      .eq('is_deleted', false);

    // Tables actives (avec au moins 1 média)
    const { data: activeTables } = await supabase
      .from('media')
      .select('table_number')
      .eq('is_deleted', false);

    const uniqueTables = new Set((activeTables || []).map((m) => m.table_number)).size;
    const totalTables  = 20; // configurable

    res.json({
      totalGuests:    parseInt(stats.total_guests,  10),
      arrived:        parseInt(stats.arrived,       10),
      absent:         parseInt(stats.absent,        10),
      registered:     parseInt(stats.registered,    10),
      totalMedia:     parseInt(stats.total_media,   10),
      photos:         parseInt(stats.photos,        10),
      videos:         parseInt(stats.videos,        10),
      audios:         parseInt(stats.audios,        10),
      totalReactions: parseInt(stats.total_reactions, 10),
      totalComments:  parseInt(stats.total_comments,  10),
      mediaThisHour:  mediaThisHour || 0,
      activeTables:   uniqueTables,
      totalTables,
      engagementPct:  Math.round((uniqueTables / totalTables) * 100),
    });
  } catch (err) { next(err); }
}

// ── GET /admin/settings ───────────────────────────────────────────────────
export async function getSettings(req, res, next) {
  try {
    const { data, error } = await supabase.from('app_settings').select('*');
    if (error) throw error;
    res.json({ settings: data });
  } catch (err) { next(err); }
}

// ── PUT /admin/settings ───────────────────────────────────────────────────
export async function updateSettings(req, res, next) {
  try {
    const updates = Object.entries(req.body).map(([key, value]) => ({
      key,
      value: String(value),
      updated_at: new Date().toISOString(),
    }));

    for (const update of updates) {
      await supabase
        .from('app_settings')
        .upsert(update, { onConflict: 'key' });
    }

    res.json({ success: true });
  } catch (err) { next(err); }
}

// ── POST /admin/reset-presence ────────────────────────────────────────────
export async function resetPresence(req, res, next) {
  try {
    // Supprimer uniquement les scans de test
    await supabase.from('presence_log').delete().eq('status', 'test');

    // Remettre les invités en "registered"
    await supabase
      .from('guests')
      .update({ status: 'registered', arrival_time: null, updated_at: new Date().toISOString() })
      .eq('status', 'arrived');

    logger.info('[Admin] Présences réinitialisées (zone test)');
    res.json({ success: true });
  } catch (err) { next(err); }
}

// ── POST /admin/generate-qr — génère un ZIP de QR codes ──────────────────
export async function generateQRCodes(req, res, next) {
  try {
    const { data: guests, error } = await supabase
      .from('guests')
      .select('id, name, table_number, table_name, qr_code_entry, qr_code_table')
      .order('table_number');

    if (error) throw error;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="QR_Codes_Mariage_Yaounde.zip"');

    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.pipe(res);

    for (const guest of guests) {
      // QR Entrée
      const entryBuffer = await generateQRBuffer(guest.qr_code_entry);
      const safeName    = guest.name.replace(/[^a-zA-Z0-9]/g, '_');
      archive.append(entryBuffer, { name: `entree/Table${guest.table_number}_${safeName}_ENTREE.png` });

      // QR Table (URL directe)
      const tableUrl    = buildTableURL(guest.table_number);
      const tableBuffer = await generateQRBuffer(tableUrl);
      archive.append(tableBuffer, { name: `tables/Table${guest.table_number}_${safeName}_TABLE.png` });
    }

    await archive.finalize();
    logger.info({ count: guests.length }, '[Admin] QR codes générés');
  } catch (err) { next(err); }
}

// ── GET /admin/media-archive — télécharge un ZIP de tous les médias ───────
export async function downloadMediaArchive(req, res, next) {
  try {
    const { data: media, error } = await supabase
      .from('media')
      .select('cloudinary_url, type, guest_name, table_number, created_at')
      .eq('is_deleted', false)
      .order('created_at');

    if (error) throw error;

    // Pour un vrai projet : télécharger chaque fichier depuis Cloudinary
    // Ici on retourne les URLs dans un fichier texte (pour respecter les limites réseau)
    const manifest = media.map((m, i) =>
      `${String(i + 1).padStart(4, '0')} | ${m.type.toUpperCase()} | Table ${m.table_number} | ${m.guest_name} | ${m.cloudinary_url}`
    ).join('\n');

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="Archive_Mariage_Yaounde.zip"');

    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.pipe(res);
    archive.append(Buffer.from(manifest, 'utf-8'), { name: 'LISTE_MEDIAS.txt' });
    await archive.finalize();
  } catch (err) { next(err); }
}
