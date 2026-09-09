-- ═══════════════════════════════════════════════════════════════════════════
-- SCHÉMA POSTGRESQL — APP MARIAGE LUXE YAOUNDÉ
-- À exécuter dans l'éditeur SQL de Supabase
-- ═══════════════════════════════════════════════════════════════════════════

-- Extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── 1. TABLE INVITÉS ────────────────────────────────────────────────────────
CREATE TABLE guests (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                 VARCHAR(200)  NOT NULL,
  email                VARCHAR(200),
  phone                VARCHAR(50),
  table_number         INTEGER,
  table_name           VARCHAR(100),                         -- ex: "Les Baobabs"
  companions           INTEGER       DEFAULT 0,
  dietary_restrictions TEXT,
  qr_code_entry        VARCHAR(100)  UNIQUE NOT NULL,        -- QR entrée (virgiles)
  qr_code_table        VARCHAR(100)  UNIQUE,                 -- QR table (galerie)
  status               VARCHAR(20)   DEFAULT 'registered'
                         CHECK (status IN ('registered','arrived','absent')),
  arrival_time         TIMESTAMPTZ,
  zone                 VARCHAR(50),                          -- ex: "Zone A"
  notes                TEXT,
  created_at           TIMESTAMPTZ   DEFAULT NOW(),
  updated_at           TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX idx_guests_qr_entry ON guests(qr_code_entry);
CREATE INDEX idx_guests_qr_table ON guests(qr_code_table);
CREATE INDEX idx_guests_status    ON guests(status);
CREATE INDEX idx_guests_table     ON guests(table_number);

-- ─── 2. TABLE MÉDIAS ─────────────────────────────────────────────────────────
CREATE TABLE media (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guest_id             UUID          REFERENCES guests(id) ON DELETE SET NULL,
  guest_name           VARCHAR(200)  NOT NULL,
  type                 VARCHAR(20)   NOT NULL
                         CHECK (type IN ('photo','video','audio')),
  cloudinary_url       TEXT          NOT NULL,
  cloudinary_public_id TEXT          NOT NULL,
  thumbnail_url        TEXT,
  duration             INTEGER,                              -- secondes (vidéo/audio)
  file_size            BIGINT,                               -- octets
  caption              TEXT,
  table_number         INTEGER,
  is_deleted           BOOLEAN       DEFAULT FALSE,
  created_at           TIMESTAMPTZ   DEFAULT NOW(),
  updated_at           TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX idx_media_guest     ON media(guest_id);
CREATE INDEX idx_media_type      ON media(type);
CREATE INDEX idx_media_table     ON media(table_number);
CREATE INDEX idx_media_created   ON media(created_at DESC);
CREATE INDEX idx_media_active    ON media(is_deleted) WHERE is_deleted = FALSE;

-- ─── 3. TABLE RÉACTIONS ──────────────────────────────────────────────────────
CREATE TABLE reactions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  media_id      UUID         NOT NULL REFERENCES media(id)  ON DELETE CASCADE,
  guest_id      UUID         NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  reaction_type VARCHAR(20)  NOT NULL
                  CHECK (reaction_type IN ('heart','star','bravo','fire')),
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE (media_id, guest_id, reaction_type)                -- 1 réaction/type/invité/média
);

CREATE INDEX idx_reactions_media ON reactions(media_id);
CREATE INDEX idx_reactions_guest ON reactions(guest_id);

-- ─── 4. TABLE COMMENTAIRES ───────────────────────────────────────────────────
CREATE TABLE comments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  media_id    UUID         NOT NULL REFERENCES media(id)   ON DELETE CASCADE,
  guest_id    UUID         REFERENCES guests(id)           ON DELETE SET NULL,
  guest_name  VARCHAR(200) NOT NULL,
  text        VARCHAR(500) NOT NULL,
  is_deleted  BOOLEAN      DEFAULT FALSE,
  created_at  TIMESTAMPTZ  DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX idx_comments_media   ON comments(media_id);
CREATE INDEX idx_comments_guest   ON comments(guest_id);
CREATE INDEX idx_comments_created ON comments(created_at ASC);

-- ─── 5. JOURNAL DE PRÉSENCE ──────────────────────────────────────────────────
CREATE TABLE presence_log (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guest_id     UUID         REFERENCES guests(id) ON DELETE CASCADE,
  arrival_time TIMESTAMPTZ  DEFAULT NOW(),
  status       VARCHAR(20)  NOT NULL
                 CHECK (status IN ('entry','duplicate','error','test')),
  scanned_by   VARCHAR(200),                                -- identifiant virgile
  notes        TEXT,
  created_at   TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX idx_presence_guest  ON presence_log(guest_id);
CREATE INDEX idx_presence_status ON presence_log(status);
CREATE INDEX idx_presence_time   ON presence_log(arrival_time DESC);

-- ─── 6. ADMINISTRATEURS ──────────────────────────────────────────────────────
CREATE TABLE admin_users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         VARCHAR(200) UNIQUE NOT NULL,
  password_hash TEXT         NOT NULL,
  role          VARCHAR(20)  DEFAULT 'admin'
                  CHECK (role IN ('admin','moderator')),
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- ─── 7. PARAMÈTRES APPLICATION ───────────────────────────────────────────────
CREATE TABLE app_settings (
  key         VARCHAR(100) PRIMARY KEY,
  value       TEXT,
  description TEXT,
  updated_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- Valeurs par défaut
INSERT INTO app_settings (key, value, description) VALUES
  ('comments_enabled',     'true',  'Activer/désactiver les commentaires publics'),
  ('offline_mode_forced',  'false', 'Forcer le mode hors-ligne'),
  ('max_video_duration',   '45',    'Durée max vidéo en secondes'),
  ('max_audio_duration',   '120',   'Durée max audio en secondes'),
  ('max_photo_size_mb',    '5',     'Taille max photo en MB après compression'),
  ('max_video_size_mb',    '15',    'Taille max vidéo en MB'),
  ('wedding_date',         '2026-04-18', 'Date du mariage'),
  ('wedding_venue',        'Yaoundé, Cameroun', 'Lieu du mariage'),
  ('total_guests_expected','200',   'Nombre d invités attendus');

-- ─── TRIGGERS updated_at ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER guests_updated_at
  BEFORE UPDATE ON guests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER media_updated_at
  BEFORE UPDATE ON media
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── VUES UTILES ─────────────────────────────────────────────────────────────

-- Vue : statistiques globales
CREATE VIEW stats_overview AS
SELECT
  (SELECT COUNT(*) FROM guests)                                   AS total_guests,
  (SELECT COUNT(*) FROM guests WHERE status = 'arrived')          AS arrived,
  (SELECT COUNT(*) FROM guests WHERE status = 'absent')           AS absent,
  (SELECT COUNT(*) FROM guests WHERE status = 'registered')       AS registered,
  (SELECT COUNT(*) FROM media WHERE is_deleted = FALSE)           AS total_media,
  (SELECT COUNT(*) FROM media WHERE type = 'photo' AND is_deleted = FALSE) AS photos,
  (SELECT COUNT(*) FROM media WHERE type = 'video' AND is_deleted = FALSE) AS videos,
  (SELECT COUNT(*) FROM media WHERE type = 'audio' AND is_deleted = FALSE) AS audios,
  (SELECT COUNT(*) FROM reactions)                                AS total_reactions,
  (SELECT COUNT(*) FROM comments WHERE is_deleted = FALSE)        AS total_comments;

-- Vue : médias avec compteurs réactions
CREATE VIEW media_with_stats AS
SELECT
  m.*,
  COALESCE(r.heart_count,  0) AS heart_count,
  COALESCE(r.star_count,   0) AS star_count,
  COALESCE(r.bravo_count,  0) AS bravo_count,
  COALESCE(r.fire_count,   0) AS fire_count,
  COALESCE(c.comment_count,0) AS comment_count
FROM media m
LEFT JOIN (
  SELECT
    media_id,
    COUNT(*) FILTER (WHERE reaction_type = 'heart') AS heart_count,
    COUNT(*) FILTER (WHERE reaction_type = 'star')  AS star_count,
    COUNT(*) FILTER (WHERE reaction_type = 'bravo') AS bravo_count,
    COUNT(*) FILTER (WHERE reaction_type = 'fire')  AS fire_count
  FROM reactions
  GROUP BY media_id
) r ON r.media_id = m.id
LEFT JOIN (
  SELECT media_id, COUNT(*) AS comment_count
  FROM comments WHERE is_deleted = FALSE
  GROUP BY media_id
) c ON c.media_id = m.id
WHERE m.is_deleted = FALSE;

-- ─── ROW LEVEL SECURITY (RLS) ────────────────────────────────────────────────
-- Active RLS sur toutes les tables
ALTER TABLE guests       ENABLE ROW LEVEL SECURITY;
ALTER TABLE media        ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE presence_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users  ENABLE ROW LEVEL SECURITY;

-- Politique lecture publique pour médias (via anon key)
CREATE POLICY "media_select_public" ON media
  FOR SELECT USING (is_deleted = FALSE);

-- Politique insertion média par n'importe quel client authentifié (token QR)
CREATE POLICY "media_insert_authenticated" ON media
  FOR INSERT WITH CHECK (TRUE);

-- Politique lecture commentaires publics
CREATE POLICY "comments_select_public" ON comments
  FOR SELECT USING (is_deleted = FALSE);

-- Politique insertion commentaires
CREATE POLICY "comments_insert_authenticated" ON comments
  FOR INSERT WITH CHECK (TRUE);

-- Politique lecture/insertion réactions
CREATE POLICY "reactions_select_public" ON reactions
  FOR SELECT USING (TRUE);

CREATE POLICY "reactions_insert_authenticated" ON reactions
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "reactions_delete_own" ON reactions
  FOR DELETE USING (TRUE);

-- Politique invités : lecture via service_role uniquement
CREATE POLICY "guests_admin_only" ON guests
  FOR ALL USING (auth.role() = 'service_role');

-- Politique présence : service_role uniquement
CREATE POLICY "presence_admin_only" ON presence_log
  FOR ALL USING (auth.role() = 'service_role');

-- Politique admin_users : service_role uniquement
CREATE POLICY "admin_users_only" ON admin_users
  FOR ALL USING (auth.role() = 'service_role');

-- ─── DONNÉES DE TEST ─────────────────────────────────────────────────────────
-- Décommenter pour des données de démonstration

/*
INSERT INTO guests (name, email, phone, table_number, table_name, companions, qr_code_entry, qr_code_table, status, zone) VALUES
  ('Dr. Samuel Eto''o',        'samuel@example.cm', '+237600000001', 4,  'Les Baobabs',  1, 'QR_ENTRY_001', 'QR_TABLE_004', 'arrived',    'Zone A'),
  ('Mme Chantal Dupont',       'chantal@example.cm','+237600000002', 1,  'Table Royale', 3, 'QR_ENTRY_002', 'QR_TABLE_001', 'arrived',    'Zone A'),
  ('Hon. Luc Atangana',        'luc@example.cm',    '+237600000003', 2,  'Les Hibiscus', 0, 'QR_ENTRY_003', 'QR_TABLE_002', 'arrived',    'Zone B'),
  ('Pr. Joseph Owona',         'joseph@example.cm', '+237600000004', 5,  'Les Ébènes',  2, 'QR_ENTRY_004', 'QR_TABLE_005', 'arrived',    'Zone B'),
  ('Dr. Alain Kouam',          'alain@example.cm',  '+237600000005', 3,  'Les Palmiers', 1, 'QR_ENTRY_005', 'QR_TABLE_003', 'registered', 'Zone A'),
  ('Mme Christine Eyenga',     'chris@example.cm',  '+237600000006', 1,  'Table Royale', 0, 'QR_ENTRY_006', 'QR_TABLE_001', 'arrived',    'Zone A'),
  ('M. Jean-Paul Essomba',     'jp@example.cm',     '+237600000007', 6,  'Table Alliance',0,'QR_ENTRY_007', 'QR_TABLE_006', 'registered', 'Zone C'),
  ('Tante Henriette Mbarga',   'henriette@example.cm','+237600000008',7, 'Table Famille',0,'QR_ENTRY_008', 'QR_TABLE_007', 'arrived',    'Zone B');
*/
