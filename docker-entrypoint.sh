#!/bin/sh
set -e

# Wait for PostgreSQL to be available
echo "Waiting for PostgreSQL at db:5432 to be ready..."
until pg_isready -h db -U postgres; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 2
done
echo "PostgreSQL is up - proceeding with database setup"

# Create sessions table if it doesn't exist
echo "Setting up sessions table..."
psql -h db -U postgres -d fishtracker -c "
CREATE TABLE IF NOT EXISTS sessions (
  sid VARCHAR NOT NULL PRIMARY KEY,
  sess JSONB NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions (expire);
"

# Run database migrations using Drizzle
echo "Running database migrations..."
npm run db:push

# Legacy installs: drizzle push sometimes skips new columns on existing tables — add any missing ones
if [ -f /app/scripts/ensure-schema-sync.sql ]; then
  echo "Applying legacy column patches (IF NOT EXISTS)..."
  psql -h db -U postgres -d fishtracker -v ON_ERROR_STOP=1 -f /app/scripts/ensure-schema-sync.sql
fi

# Seed default admin (README: admin@example.com / password123).
# IMPORTANT: use a quoted heredoc so shell does not expand $ in the bcrypt hash
# (double-quoted psql -c "..." mangles $2, $10, etc. and breaks login).
echo "Setting up initial admin user..."
psql -h db -U postgres -d fishtracker <<'EOSQL'
INSERT INTO users (id, username, email, password_hash, role, created_at, updated_at)
VALUES (
  'admin-user-id',
  'admin',
  'admin@example.com',
  '$2b$10$BF2BNwa1yponHB61mc4xN.nX4Gl3JydC/3CQ9Z3LuSfKgPVnTbow2',
  'admin',
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

-- Fix legacy DBs where the hash was corrupted by shell expansion (not 60 chars).
UPDATE users
SET password_hash = '$2b$10$BF2BNwa1yponHB61mc4xN.nX4Gl3JydC/3CQ9Z3LuSfKgPVnTbow2'
WHERE id = 'admin-user-id'
  AND char_length(password_hash) <> 60;
EOSQL

# Start the application
echo "Starting Fish Tracker application..."
exec "$@"