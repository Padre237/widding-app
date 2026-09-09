# 💍 App Mariage Luxe — Yaoundé Nuptials 2026

Application web mobile-first de mariage de luxe : galerie média partagée, scan QR d'entrée, upload photo/vidéo/audio, réactions, commentaires, et dashboard admin complet.

---

## 📁 Structure du projet

```
wedding-app/
├── frontend/          React 18 + Vite + Tailwind CSS
├── backend/           Node.js + Express + Supabase + Cloudinary
├── database/          schema.sql (PostgreSQL Supabase)
└── README.md
```

---

## 🚀 Démarrage rapide local

### Prérequis
- Node.js 20+
- Compte Supabase (gratuit) → https://supabase.com
- Compte Cloudinary (gratuit) → https://cloudinary.com

### 1. Cloner / Initialiser Git

```bash
cd /Users/imacpro/Downloads/wedding-app
git init
git add .
git commit -m "feat: initial wedding app — Yaoundé Nuptials 2026"
```

Créer un repo GitHub sur https://github.com/new puis :

```bash
git remote add origin https://github.com/TON_USERNAME/wedding-app.git
git branch -M main
git push -u origin main
```

### 2. Base de données Supabase

1. Créer un projet sur https://app.supabase.com
2. Aller dans **SQL Editor** → **New query**
3. Copier-coller le contenu de `database/schema.sql`
4. Cliquer **Run**
5. Récupérer dans **Settings > API** :
   - `Project URL` → `SUPABASE_URL`
   - `anon public` → `SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Cloudinary

1. Créer un compte sur https://cloudinary.com (FREE tier = 10GB)
2. Dans le **Dashboard** récupérer :
   - `Cloud Name`
   - `API Key`
   - `API Secret`

### 4. Backend

```bash
cd wedding-app/backend
npm install
cp .env.example .env
# Remplir le .env avec tes clés
npm run dev
```

Créer le premier compte admin :

```bash
ADMIN_EMAIL=admin@mariage.cm ADMIN_PASSWORD=MonMotDePasse2026! node src/scripts/createAdmin.js
```

Le backend tourne sur http://localhost:3000

### 5. Frontend

```bash
cd wedding-app/frontend
npm install
cp .env.example .env
# Remplir le .env
npm run dev
```

L'app tourne sur http://localhost:5173

---

## 🌐 Déploiement production

### Frontend → Vercel

```bash
# Installer Vercel CLI
npm i -g vercel

cd wedding-app/frontend
vercel

# Suivre le wizard, puis ajouter les variables d'environnement :
# VITE_SUPABASE_URL
# VITE_SUPABASE_ANON_KEY
# VITE_API_URL  (URL de ton backend Railway/Render)
# VITE_CLOUDINARY_CLOUD_NAME
```

Ou via l'interface Vercel :
1. https://vercel.com/new → importer le repo GitHub
2. **Root Directory** → `frontend`
3. **Framework** → Vite
4. Ajouter les variables dans **Settings > Environment Variables**

### Backend → Railway (recommandé, gratuit)

1. https://railway.app → New Project → Deploy from GitHub
2. Sélectionner le repo, **Root Directory** → `backend`
3. Ajouter toutes les variables du `.env.example` dans **Variables**
4. Railway détecte automatiquement Node.js et démarre `npm start`
5. Copier l'URL Railway → mettre dans `VITE_API_URL` du frontend Vercel

Alternative gratuite : **Render.com** (même procédure)

### Variables d'environnement de production (Backend)

```
PORT=3000
NODE_ENV=production
JWT_SECRET=<secret_32_chars_minimum>
JWT_EXPIRES_IN=24h
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_ANON_KEY=eyJ...
CLOUDINARY_CLOUD_NAME=xxxxx
CLOUDINARY_API_KEY=xxxxx
CLOUDINARY_API_SECRET=xxxxx
CLOUDINARY_FOLDER=mariage-yaounde-2026
ALLOWED_ORIGINS=https://ton-app.vercel.app
FRONTEND_URL=https://ton-app.vercel.app
UPLOAD_RATE_LIMIT_PER_MIN=5
API_RATE_LIMIT_PER_MIN=60
```

### Variables d'environnement de production (Frontend)

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_URL=https://ton-backend.railway.app/api
VITE_CLOUDINARY_CLOUD_NAME=xxxxx
VITE_APP_NAME=Notre Mariage
VITE_WEDDING_DATE=2026-04-18
```

---

## 📱 URLs de l'application

| URL | Description |
|-----|-------------|
| `/table/1` | Galerie Table 1 (invités) |
| `/table/12/video` | Enregistrement vidéo Table 12 |
| `/table/12/audio` | Enregistrement audio Table 12 |
| `/table/12/voeux` | Vœux aux mariés Table 12 |
| `/entry` | Interface scan QR virgiles |
| `/admin` | Dashboard admin |
| `/admin/login` | Connexion admin |

---

## 🗺️ Architecture technique

```
Invités (mobile)
    │  scan QR table → /table/:num
    │
    ├── React Frontend (Vercel)
    │       ├── Zustand stores (auth, gallery, presence)
    │       ├── Supabase Realtime (WebSocket) ←── mises à jour live
    │       └── API calls via Axios
    │
    └── Express Backend (Railway)
            ├── JWT auth (admin) + token QR (invités)
            ├── Multer upload → Cloudinary
            ├── Supabase PostgreSQL (données)
            └── Rate limiting, Zod validation, Pino logs

Virgiles (tablette)
    └── /entry → ScanQR (jsQR) → verify → mark arrival
```

---

## 🗄️ Schéma base de données

| Table | Description |
|-------|-------------|
| `guests` | Invités avec QR codes uniques |
| `media` | Photos, vidéos, audios uploadés |
| `reactions` | Réactions (heart/star/bravo/fire) |
| `comments` | Commentaires sur les médias |
| `presence_log` | Journal des scans d'entrée |
| `admin_users` | Comptes administrateurs |
| `app_settings` | Paramètres de l'application |

---

## 🔐 Sécurité

- **JWT** 24h pour les admins
- **RLS Supabase** activé sur toutes les tables
- **Rate limiting** : 5 uploads/min par table, 60 req/min global
- **Validation Zod** sur toutes les entrées backend
- **Helmet.js** pour les headers HTTP sécurisés
- **CORS** strict par liste d'origines autorisées
- **Bcrypt** (12 rounds) pour les mots de passe admin
- Pas de données sensibles en `localStorage` (sessionStorage uniquement)

---

## 📦 Stack complète

### Frontend
| Package | Usage |
|---------|-------|
| React 18 + Vite | Framework + bundler |
| Tailwind CSS v3 | Styles utility-first |
| @tabler/icons-react | Icônes SVG (pas d'emojis) |
| Zustand | State management |
| Axios | Client HTTP |
| @supabase/supabase-js | Realtime WebSocket |
| jsQR | Scanner QR caméra |
| browser-image-compression | Compression photos client-side |
| date-fns | Formatage dates en français |
| react-router-dom v6 | Routing SPA |
| vite-plugin-pwa | PWA / Service Worker |

### Backend
| Package | Usage |
|---------|-------|
| Express | Serveur HTTP |
| Supabase JS | Client PostgreSQL |
| Cloudinary v1 | Stockage médias |
| Multer | Upload fichiers |
| jsonwebtoken | Tokens JWT |
| bcryptjs | Hash mots de passe |
| Zod | Validation données |
| express-rate-limit | Anti-spam |
| Helmet | Sécurité headers |
| Pino | Logging structuré |
| QRCode | Génération QR PNG |
| Archiver | Création ZIP |
| csv-parse / csv-stringify | Import/export CSV |

---

## 🎨 Design System

- **Primaire** : `#914800` (Orange Brûlé)
- **Surface** : `#fff8f1` (Crème)
- **Texte** : `#1e1b17` (Charcoal)
- **Typographie** : Playfair Display (titres) + Inter (corps)
- **Icônes** : @tabler/icons-react uniquement (1.5px stroke)
- **Grid spacing** : base 8px

---

## 📋 Checklist déploiement

- [ ] Exécuter `database/schema.sql` dans Supabase
- [ ] Créer le compte admin via `createAdmin.js`
- [ ] Configurer les variables d'environnement backend
- [ ] Déployer le backend (Railway/Render)
- [ ] Configurer les variables d'environnement frontend
- [ ] Déployer le frontend (Vercel)
- [ ] Tester le scan QR sur mobile
- [ ] Tester l'upload photo/vidéo/audio
- [ ] Vérifier le dashboard admin
- [ ] Configurer un domaine custom (optionnel)
- [ ] Activer HTTPS (automatique Vercel/Railway)
- [ ] Importer la liste des invités CSV

---

## 🆘 Support & Debugging

Logs backend en temps réel :
```bash
# Local
npm run dev   # pino-pretty avec couleurs

# Railway
railway logs
```

Vérifier la santé du serveur :
```
GET /health
```

Pour réinitialiser les données de test avant le jour J :
1. Admin → Paramètres → "Réinitialiser le pointeur de présence"

---

## 📞 Contact

Application développée pour le mariage de Yaoundé 2026.
.
