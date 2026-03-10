# Cold Hawaii — Deployment Guide

## Overview

This site uses:
- **Vercel** — hosting + serverless API functions
- **Neon** — free PostgreSQL database (for comments)
- **Resend** — free email notifications (optional)

---

## Step 1 — Set up the Neon database

1. Go to [neon.tech](https://neon.tech) and log in
2. Open your project → click **SQL Editor**
3. Paste and run the contents of `setup-db.sql`:

```sql
CREATE TABLE IF NOT EXISTS comments (
  id         SERIAL PRIMARY KEY,
  parent_id  INTEGER REFERENCES comments(id) ON DELETE CASCADE,
  name       VARCHAR(80)   NOT NULL,
  body       TEXT          NOT NULL,
  created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_created ON comments(created_at DESC);
```

4. Click **Run** — you should see "Success"

---

## Step 2 — Set up Resend for email notifications (free)

1. Go to [resend.com](https://resend.com) and sign up (free — 100 emails/day)
2. Go to **API Keys** → **Create API Key** → copy it (starts with `re_`)
3. You'll use this as `RESEND_API_KEY` below

> **Note:** On Resend's free plan, you can only send FROM `onboarding@resend.dev` unless you verify a custom domain. The notification emails will still arrive at `lars.houbak@gmail.com` — they'll just show as sent from Resend's address.

---

## Step 3 — Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Click **Import Git Repository** → select `larhou/surfing-cold-hawaii`
3. Leave all build settings as default (Vercel auto-detects static + serverless)
4. Click **Environment Variables** and add these:

| Variable | Value |
|---|---|
| `DATABASE_URL` | `postgresql://neondb_owner:npg_pLehBI96bMzo@ep-flat-bird-altm8j2d-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require` |
| `ADMIN_PASSWORD` | `nh-cold-haweii` |
| `RESEND_API_KEY` | your Resend API key |
| `NOTIFY_EMAIL` | `lars.houbak@gmail.com` |
| `SITE_URL` | `https://coldhawaiirockandroller.com` |

5. Click **Deploy** — done in ~2 minutes

---

## Step 4 — Connect your domain

1. In Vercel → your project → **Settings** → **Domains**
2. Add `coldhawaiirockandroller.com` and `www.coldhawaiirockandroller.com`
3. Vercel will show you DNS records to add at your domain registrar (Porkbun/Namecheap)
4. Add the records → wait 5–30 minutes for DNS to propagate
5. Vercel automatically provisions a free SSL certificate

---

## Admin moderation

Visit `https://coldhawaiirockandroller.com/admin.html` to:
- See all comments
- Filter by top-level / replies
- Delete any comment (and its replies)

Password: `nh-cold-haweii`

---

## Local development

```bash
# Install Vercel CLI
npm i -g vercel

# Create .env.local with your variables (see .env.example)
cp .env.example .env.local
# Edit .env.local with your real values

# Run locally
vercel dev
```

The site will be available at `http://localhost:3000` with the API routes working.
