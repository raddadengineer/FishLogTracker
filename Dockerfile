FROM node:20-alpine

WORKDIR /app

# Install PostgreSQL client for database initialization checks
RUN apk add --no-cache postgresql-client

# Install dependencies first (for better caching)
COPY package*.json ./
RUN npm ci

# Copy application code
COPY . .

# Build the application
RUN npm run build

# Add database setup script
COPY --chmod=755 docker-entrypoint.sh /docker-entrypoint.sh

# Expose the application port
EXPOSE 5000

# Set the entrypoint script to handle database migrations
ENTRYPOINT ["/docker-entrypoint.sh"]

# Start the application
CMD ["npm", "start"]