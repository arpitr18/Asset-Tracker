# Cadbury Visi Cooler Store Tracker

JavaScript Expo app and Express API. The workbook contains **one original and 50 synthetic records**. Synthetic rows are labeled in the app and retained with `recordType` in PostgreSQL.

## Setup

1. Install Node.js 20+, PostgreSQL with PostGIS, and Redis.
2. From this directory run `npm install`.
3. Local `.env` files are configured for the existing Docker PostgreSQL and Redis containers. They are ignored by Git. The mobile API URL is `http://192.168.1.7:4000`; update `mobile/.env` if the Wi-Fi IP changes.
4. Run `npm run db:generate -w backend`, then `npm run db:migrate -w backend`, then `npm run db:seed -w backend`.
5. Preview the workbook: from `backend`, run `npm run import -- ../data/Outlet_Visicooler_Asset_Dataset.xlsx`. Apply: add `--apply` after the file path.
6. Start API with `npm run dev:api`; it reports `http://localhost:4000` and `/health`. Start Expo with `npm run start -w mobile` (tunnel mode, port 8082) and scan its fresh QR code. The Metro tunnel serves the app bundle; the phone must also reach the API on the same Wi-Fi network.

Local demo login: `demo@example.com` / `local-demo-2026`. Change this before any shared deployment.

The existing `postgres:18` container lacks PostGIS. Local viewport search uses an indexed bounding box; `backend/prisma/postgis.optional.sql` contains the spatial index for a PostGIS-enabled deployment.

The demo login credentials come from `backend/.env`. Assign `territoryId` to FIELD and MANAGER employees before giving them access. ADMIN can see all territories.

## Current scope

Store Explorer, viewport map, store details, basic survey submission, and distributor search call the API. The workbook has no verified distributor GPS, sales, visits, photographs, or cooler capacity. These stay empty or unknown. Map markers use outlet coordinates. Survey photos, support chat, admin UI, object storage, Redis caching, BullMQ jobs, OpenAPI, and offline SQLite sync are still to be implemented. This is an incremental foundation and has not been production validated.

## Performance targets to benchmark

On representative Android devices and a seeded production-like database: API p50 under 100 ms and p95 under 400 ms for viewport and store search; warm screen transitions under 300 ms; map and list interaction near 60 fps; peak memory under 250 MB. These are targets, not measured results.
