# M.shaies Haute Parfumerie — Supabase & Production Deployment Guide

This guide outlines how to configure your Supabase (PostgreSQL) database, run database migrations, seed store data, and deploy the application to production.

---

## 🏛️ Architecture Overview

- **Frontend**: TanStack Start (React 19, Vite, Tailwind CSS v4, Lucide Icons, Framer Motion)
- **Server Layer**: TanStack Start Server Functions (`createServerFn`), Nitro Engine
- **Database**: PostgreSQL on Supabase via Drizzle ORM & Postgres.js
- **Authentication**: Supabase Auth (Staff Session JWT verification) with optional secondary Master PIN lock
- **AI Intelligence**: Google Gemini 1.5 Flash via server-isolated `GEMINI_API_KEY` (with zero browser leakage)
- **Local AI Development**: Ollama via loopback-only server requests (optional; Gemini remains available as a fallback)

---

## 🚀 Step 1: Create a Free Supabase Project

1. Visit [supabase.com](https://supabase.com) and create a free account.
2. Click **"New Project"**.
   - **Name**: `mshaies-haute-parfumerie`
   - **Database Password**: Choose a strong password and save it securely.
   - **Region**: Select a region close to your primary audience (e.g. `eu-central-1` Frankfurt or `ap-southeast-1` Singapore).
3. Wait ~2 minutes for the database provisioning to complete.

---

## 🔑 Step 2: Configure Environment Variables

1. In your local project directory, create a `.env` file by copying the template:
   ```bash
   cp .env.example .env
   ```
2. Retrieve your credentials from your Supabase Dashboard:
   - Go to **Project Settings** → **Database** → **Connection String** → Select **URI** (choose **Transaction Pooler**, port `6543`).
   - Go to **Project Settings** → **API** to copy:
     - `Project URL` → `SUPABASE_URL`
     - `anon / public key` → `SUPABASE_ANON_KEY`
     - `service_role key` (secret) → `SUPABASE_SERVICE_ROLE_KEY`
3. Fill your `.env` file:
   ```env
   DATABASE_URL=postgresql://postgres.your-project-ref:your-db-password@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
   SUPABASE_URL=https://your-project-ref.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOi...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
   GEMINI_API_KEY=AIzaSy...
   OLLAMA_ENABLED=true
   OLLAMA_BASE_URL=http://127.0.0.1:11434
   OLLAMA_MODEL=llama3.2
   NITRO_PRESET=node-server
   ```

### Optional: Run the advisor with Ollama locally

Install Ollama for Windows, start the Ollama service, and download the configured model:

```bash
ollama pull llama3.2
```

The advisor calls Ollama's `/api/chat` endpoint from the server only and accepts loopback addresses only. If Ollama is stopped or the model is missing, it automatically falls back to Gemini and then the built-in sommelier engine.

---

## 🗄️ Step 3: Run Database Migrations

You can apply the 10 normalized tables to Supabase using either method below:

### Method A: Via Supabase SQL Editor (Fastest)
1. In your Supabase Dashboard, click **SQL Editor** on the left navigation bar.
2. Open [`drizzle/0000_gorgeous_robbie_robertson.sql`](drizzle/0000_gorgeous_robbie_robertson.sql).
3. Copy the entire file content, paste it into the Supabase SQL Editor, and click **Run** (Ctrl+Enter).

### Method B: Via Terminal CLI
Once your `DATABASE_URL` is set in `.env`, run:
```bash
npm run db:push
```

---

## 🛡️ Step 4: Apply Row Level Security (RLS) Policies

1. Open [`supabase/rls_policies.sql`](supabase/rls_policies.sql).
2. Copy the entire content and paste it into the **Supabase SQL Editor**.
3. Click **Run**.
4. This enforces:
   - Public read access for published products, notes, reviews, active coupons, and settings.
   - Full authoritative mutation access exclusively for backend server functions using the `service_role` key.
   - Authenticated staff read access for orders, customers, and audit logs.

---

## 👤 Step 5: Create Initial Admin Staff User

1. In Supabase Dashboard, go to **Authentication** → **Users**.
2. Click **"Add User"** → **"Create User"**.
   - **Email**: `admin@mshaies.com` (or your preferred management email)
   - **Password**: Set a strong password.
   - Check **"Auto Confirm User?"** so you can log in immediately.
3. Click **Create User**.

---

## 📦 Step 6: Seed Catalog & Store Data

Populate your database with the complete launch catalog (12+ signature fragrances, 4-size volume flacons, launch coupons, store parameters, verified reviews, and audit logs):

```bash
npm run db:migrate
```

*Expected Output:*
```
🔌 Connecting to Supabase PostgreSQL database...
📦 Seeding store settings...
📦 Seeding 12 signature fragrances...
📦 Seeding 3 privilege voucher codes...
📦 Seeding 8 customer reviews...
📦 Recording migration in audit trail...
✅ Migration completed successfully! All data is now securely stored in Supabase.
```

---

## 🌐 Step 7: Production Deployment

### Option A: Vercel Deployment
1. Push your repository to GitHub or GitLab.
2. In Vercel, click **"Add New Project"** and import the repository.
3. In **Project Settings** → **Environment Variables**, add:
   - `DATABASE_URL`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GEMINI_API_KEY`
4. Deploy! Vercel will automatically build and deploy SSR server functions.

### Option B: Node.js VPS / Hostinger / DigitalOcean
1. Build the production bundle:
   ```bash
   npm run build
   ```
2. Start the server:
   ```bash
   node .output/server/index.mjs
   ```
3. Use PM2 for continuous process management:
   ```bash
   npm install -g pm2
   pm2 start .output/server/index.mjs --name "mshaies-store"
   pm2 save
   ```

---

## 🔐 Staff Dashboard Login

1. Navigate to `/admin`.
2. Select **"Supabase Staff Auth"**:
   - **Email**: `admin@mshaies.com`
   - **Password**: Your Supabase user password
3. If using local development without Supabase credentials, the console automatically accepts the developer fallback (`admin@mshaies.com` / `Mshaies7860!`) or the secondary PIN (`7860`).
