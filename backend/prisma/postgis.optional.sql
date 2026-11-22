-- Apply only on a PostgreSQL server with PostGIS installed.
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE INDEX IF NOT EXISTS "Outlet_geo_gist" ON "Outlet" USING GIST (ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326)) WHERE "longitude" IS NOT NULL AND "latitude" IS NOT NULL;
