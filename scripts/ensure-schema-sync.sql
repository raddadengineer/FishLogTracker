-- Patch legacy PostgreSQL databases that predate current Drizzle columns.
-- Safe to run repeatedly (IF NOT EXISTS). Invoked from docker-entrypoint after db:push.

ALTER TABLE catches ADD COLUMN IF NOT EXISTS weather_data json;
ALTER TABLE catches ADD COLUMN IF NOT EXISTS photo_data json;
ALTER TABLE catches ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;
ALTER TABLE catches ADD COLUMN IF NOT EXISTS lake_name varchar;
ALTER TABLE catches ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE catches ADD COLUMN IF NOT EXISTS longitude double precision;
ALTER TABLE catches ADD COLUMN IF NOT EXISTS temperature numeric(5, 2);
ALTER TABLE catches ADD COLUMN IF NOT EXISTS depth numeric(5, 2);
ALTER TABLE catches ADD COLUMN IF NOT EXISTS lure varchar;

UPDATE catches SET is_verified = false WHERE is_verified IS NULL;
