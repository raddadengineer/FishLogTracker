#!/bin/sh
set -e

# Wait for PostgreSQL to be available
echo "Waiting for PostgreSQL at db:5432 to be ready..."
until pg_isready -h db -U postgres; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 2
done
echo "PostgreSQL is up - proceeding with database setup"

# Run database migrations using Drizzle
echo "Running database migrations..."
npm run db:push

# Start the application
echo "Starting Fish Tracker application..."
exec "$@"