/**
 * Controller Invités — CRUD + scan QR + présences
 */
import { v4 as uuid } from 'uuid';
import { stringify } from 'csv-stringify/sync';
import { parse }     from 'csv-parse/sync';
import bcrypt        from 'bcryptjs';
import supabase      from '../services/supabaseService.js';
import { generateGuestTokens } from '../services/qrService.js';
import { logger } from '../server.js';

// ── GET /guests — liste paginée ───────────────────────────────────────────
export async function listGuests(req, res, next) {
  try {
    const { search, status, limit = 50, page = 1, sort = 'name', order = 'asc' } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let query = supabase
      .from('guests')
      .select('*', { count: 'exact' })
      .order(sort, { ascending: order === 'asc' })
      .range(offset, offset + parseInt(limit, 10) - 1);

    if (search)  query = query.ilike('name', `%${search}%`);
    if (status)  query = query.eq('status', status);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({ guests: data, total: count, page: parseInt(page, 10), limit: parseInt(limit, 10) });
  } catch (err) { next(err); }
}

// ── POST /guests — créer un invité ────────────────────────────────────────
export async function createGuest(req, res, next) {
  try {
    const tokens = generateGuestTokens();
    const guest  = {
      id: uuid(),
      ...req.body,
      qr_code_entry: tokens.qrCodeEntry,
      qr_code_table: tokens.qrCodeTable,
      status: 'registered',
    };

    const { data, error } = await supabase.from('guests').insert(guest).select().single();
    if (error) throw error;

    logger.info({ guestId: data.id, name: data.name }, '[Guest] Créé');
    res.status(201).json({ guest: data });
  } catch (err) { next(err); }
}

// ── PUT /guests/:id — modifier un invité ──────────────────────────────────
export async function updateGuest(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('guests')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Invité introuvable' });
    res.json({ guest: data });
  } catch (err) { next(err); }
}

// ── DELETE /guests/:id ────────────────────────────────────────────────────
export async function deleteGuest(req, res, next) {
  try {
    const { error } = await supabase.from('guests').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { next(err); }
}

// ── POST /guests/verify-qr — scan entrée ─────────────────────────────────
export async function verifyQR(req, res, next) {
  try {
    const { qrCode } = req.body;

    const { data: guest, error } = await supabase
      .from('guests')
      .select('*')
      .eq('qr_code_entry', qrCode)
      .single();

    if (error || !guest) {
      return res.status(404).json({ error: 'QR introuvable — invité non reconnu', code: 'QR_NOT_FOUND' });
    }

    const isDuplicate = guest.status === 'arrived';

    res.json({
      guest: {
        id:                  guest.id,
        name:                guest.name,
        tableNumber:         guest.table_number,
        tableName:           guest.table_name,
        companions:          guest.companions,
        dietaryRestrictions: guest.dietary_restrictions,
        zone:                guest.zone,
        status:              guest.status,
        arrivalTime:         guest.arrival_time
          ? new Date(guest.arrival_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
          : null,
      },
      isDuplicate,
    });
  } catch (err) { next(err); }
}

// ── POST /guests/:id/arrival — marquer arrivée ────────────────────────────
export async function markArrival(req, res, next) {
  try {
    const { id } = req.params;
    const { scannedBy = 'virgile' } = req.body;

    // Marquer le statut
    const { data: guest, error } = await supabase
      .from('guests')
      .update({ status: 'arrived', arrival_time: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Enregistrer dans le journal
    await supabase.from('presence_log').insert({
      id:           uuid(),
      guest_id:     id,
      arrival_time: new Date().toISOString(),
      status:       'entry',
      scanned_by:   scannedBy,
    });

    logger.info({ guestId: id, name: guest?.name }, '[Presence] Entrée enregistrée');
    res.json({ success: true, guest });
  } catch (err) { next(err); }
}

// ── POST /guests/:id/duplicate — signaler doublon ─────────────────────────
export async function reportDuplicate(req, res, next) {
  try {
    const { id } = req.params;
    const { scannedBy = 'virgile' } = req.body;

    await supabase.from('presence_log').insert({
      id:           uuid(),
      guest_id:     id,
      arrival_time: new Date().toISOString(),
      status:       'duplicate',
      scanned_by:   scannedBy,
    });

    res.json({ success: true });
  } catch (err) { next(err); }
}

// ── POST /guests/table-access — accès via QR table ────────────────────────
export async function tableAccess(req, res, next) {
  try {
    const { qrCode } = req.body;

    // Chercher d'abord par QR table
    let { data: guest } = await supabase
      .from('guests')
      .select('id, name, table_number, table_name')
      .eq('qr_code_table', qrCode)
      .single();

    if (!guest) {
      return res.status(404).json({ error: 'QR de table invalide' });
    }

    res.json({
      guest: { id: guest.id, name: guest.name, tableNumber: guest.table_number, tableName: guest.table_name },
      tableNumber: guest.table_number,
    });
  } catch (err) { next(err); }
}

// ── GET /guests/stats ─────────────────────────────────────────────────────
export async function getStats(req, res, next) {
  try {
    const { data, error } = await supabase.from('stats_overview').select('*').single();
    if (error) throw error;
    res.json({
      totalGuests: parseInt(data.total_guests, 10),
      arrived:     parseInt(data.arrived,      10),
      absent:      parseInt(data.absent,       10),
      registered:  parseInt(data.registered,   10),
    });
  } catch (err) { next(err); }
}

// ── GET /guests/export — export CSV ──────────────────────────────────────
export async function exportCSV(req, res, next) {
  try {
    const { data: guests, error } = await supabase
      .from('guests')
      .select('name, email, phone, table_number, table_name, companions, dietary_restrictions, status, arrival_time, zone')
      .order('name');

    if (error) throw error;

    const csv = stringify(guests.map((g) => ({
      Nom:              g.name,
      Email:            g.email || '',
      Téléphone:        g.phone || '',
      'Numéro Table':   g.table_number || '',
      'Nom Table':      g.table_name  || '',
      Accompagnateurs:  g.companions  || 0,
      'Régime Spécial': g.dietary_restrictions || '',
      Statut:           g.status,
      'Heure Arrivée':  g.arrival_time
        ? new Date(g.arrival_time).toLocaleString('fr-FR')
        : '',
      Zone:             g.zone || '',
    })), { header: true, delimiter: ';' });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="invites_mariage_${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send('\uFEFF' + csv); // BOM UTF-8 pour Excel
  } catch (err) { next(err); }
}

// ── POST /guests/import — import CSV ─────────────────────────────────────
export async function importCSV(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'Fichier CSV manquant' });

    const rows = parse(req.file.buffer.toString('utf-8'), {
      columns:          true,
      skip_empty_lines: true,
      delimiter:        [',', ';'],
      trim:             true,
    });

    const toInsert = rows.map((row) => {
      const tokens = generateGuestTokens();
      return {
        id:                  uuid(),
        name:                row['Nom'] || row['name'] || row['NAME'] || '',
        email:               row['Email'] || row['email'] || '',
        phone:               row['Téléphone'] || row['phone'] || '',
        table_number:        parseInt(row['Numéro Table'] || row['table_number'] || '0', 10) || null,
        table_name:          row['Nom Table'] || row['table_name'] || '',
        companions:          parseInt(row['Accompagnateurs'] || row['companions'] || '0', 10),
        dietary_restrictions:row['Régime Spécial'] || row['dietary_restrictions'] || '',
        zone:                row['Zone'] || row['zone'] || '',
        qr_code_entry:       tokens.qrCodeEntry,
        qr_code_table:       tokens.qrCodeTable,
        status:              'registered',
      };
    }).filter((g) => g.name);

    if (!toInsert.length) return res.status(400).json({ error: 'Aucune ligne valide dans le CSV' });

    const { error } = await supabase.from('guests').insert(toInsert);
    if (error) throw error;

    logger.info({ count: toInsert.length }, '[Guest] Import CSV');
    res.json({ imported: toInsert.length });
  } catch (err) { next(err); }
}
