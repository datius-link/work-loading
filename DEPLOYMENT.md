# Work Loading — Cloud Deployment Guide

The stack after deployment:

| Piece | Where it lives | Status |
|---|---|---|
| PostgreSQL | **Neon** (already provisioned) | done |
| Node/Express API (`node/`) | **Render** web service | this guide |
| Media/file uploads + chat | **Convex** (`https://utmost-gnu-126.convex.cloud`) | already cloud |
| Admin web app (`web/`) | Render Static Site (or Vercel/Netlify) | optional, below |
| Mobile app (`mobile/`) | EAS build (APK) | point it at the Render URL |

The API already does everything Render needs: it reads `PORT`, binds `0.0.0.0`,
uses `DATABASE_URL` + SSL when `NODE_ENV=production` (see `node/knexfile.js`),
runs Knex migrations automatically on boot, and serves `/health` for health checks.

---

## 1. Deploy the API on Render

**Option A — Blueprint (easiest).** Push this repo to GitHub, then in the Render
dashboard: **New + → Blueprint → select the `work-loading` repo**. Render reads
[render.yaml](render.yaml) and creates the `work-loading-api` service. It will
prompt you for the env vars marked `sync: false` (see table below).

**Option B — Manual.** New + → Web Service → connect the repo, then set:

- **Root Directory:** `node`
- **Build Command:** `npm ci`
- **Start Command:** `npm start`
- **Health Check Path:** `/health`
- **Instance type:** Free (fine to start; note it sleeps after ~15 min idle — first request after sleep takes ~30–60 s)

### Environment variables (Render dashboard → Environment)

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Your Neon connection string: Neon dashboard → your project → **Connection string** (looks like `postgresql://USER:PASSWORD@ep-xxxx.aws.neon.tech/DBNAME?sslmode=require`). Use the **pooled** connection string if offered. |
| `AUTH_TOKEN_SECRET` | long random string (Render can generate) |
| `VERIFY_TOKEN_SECRET` | long random string |
| `ADMIN_TOKEN_SECRET` | long random string |
| `ADMIN_API_PREFIX` | e.g. `/api/x7k-ops` — must match the web admin's `VITE_ADMIN_API_PREFIX` |
| `SWAGGER_USERNAME` / `SWAGGER_PASSWORD` | credentials for `/api-docs` |

> ⚠️ If you change the token secrets from what your local `.env` used, all
> previously issued logins/JWTs become invalid — users just log in again.

On first boot the logs should show `✅ PostgreSQL Connected`, `✅ Migrations up
to date`, `🚀 Server running`. Your API base URL is then:

```
https://work-loading-api.onrender.com/api
```

(Confirm the exact hostname on the service page; Render may add a suffix.)
Sanity check in a browser: `https://<your-service>.onrender.com/health`.

### Create the admin user (one time)

Render service → **Shell** tab:

```
npm run create-admin
```

---

## 2. Point the mobile app at the cloud API

Local dev (`mobile/.env` — gitignored, stays on your machine):

```
EXPO_PUBLIC_API_URL=https://<your-service>.onrender.com/api
EXPO_PUBLIC_CONVEX_URL=https://utmost-gnu-126.convex.cloud
```

EAS builds do **not** see your gitignored `.env` — the values are baked in at
build time from `eas.json` (`build.*.env`). After deploying, update the
`EXPO_PUBLIC_API_URL` value in [mobile/eas.json](mobile/eas.json) to your real
Render URL, then rebuild:

```
cd mobile
npx eas-cli build --platform android --profile preview
```

## 3. Web admin

Local dev: create `web/.env` with

```
VITE_API_BASE_URL=https://<your-service>.onrender.com/api
VITE_ADMIN_API_PREFIX=/api/x7k-ops
```

To host it (Render Static Site): Root Directory `web`, Build `npm ci && npm run build`,
Publish directory `dist`, plus the two env vars above.

---

## 4. Running everything after deployment (daily use)

- **Database & API:** always on in the cloud — nothing to start on your PC.
- **Phone app:** install the EAS APK once; it talks to Render + Convex directly
  over the internet from anywhere (no more LAN IP / same-WiFi requirement).
- **Admin panel:** open the hosted web URL (or `npm run dev` in `web/` locally).
- **Offline:** the app's cached data (offlineCache/sqlite) keeps browsing
  working without internet, and **Bluetooth Share** (Settings → Bluetooth
  Share) sends messages, photos and documents phone-to-phone with no network
  at all. Everything syncs/normal-operates again when data returns.
- **Local backend development** still works: run `npm run dev` in `node/` and
  set `EXPO_PUBLIC_API_URL` back to your LAN IP in `mobile/.env`.
