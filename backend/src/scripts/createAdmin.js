/**
 * Script de création du compte admin initial
 * Usage : node src/scripts/createAdmin.js
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const EMAIL    = process.env.ADMIN_EMAIL    || 'admin@mariage-yaounde.cm';
const PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeMe_2026!';

async function run() {
  const hash = await bcrypt.hash(PASSWORD, 12);

  const { data, error } = await supabase
    .from('admin_users')
    .upsert({ id: uuid(), email: EMAIL, password_hash: hash, role: 'admin' }, { onConflict: 'email' })
    .select()
    .single();

  if (error) { console.error('Erreur:', error.message); process.exit(1); }
  console.log(`✅ Admin créé : ${data.email}`);
}

run();
