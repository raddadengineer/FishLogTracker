# Fish Tracker App - Docker Deployment Guide

A comprehensive fishing catch tracker application with offline capabilities, real-time weather data, and social features.

## Features

- **Track Catches**: Log fish catches with species, size, weight, location, and photos
- **Weather Integration**: Real-time weather data for fishing conditions
- **Offline Support**: Continue tracking catches without internet connection
- **Social Features**: View community catches and leaderboards
- **Admin Dashboard**: User management and catch verification
- **Mobile-First Design**: Optimized for mobile devices with PWA support

## Prerequisites

1. [Docker](https://docs.docker.com/get-docker/)
2. [Docker Compose](https://docs.docker.com/compose/install/)
3. [OpenWeather API Key](https://openweathermap.org/api) (optional, for weather features)

## Quick Start

### 1. Clone and Setup

```bash
# Navigate to your project directory
cd fish-tracker-app

# Copy environment template
cp .env.example .env

# Edit .env file with your OpenWeather API key (optional)
# OPENWEATHER_API_KEY=your_api_key_here
```

### 2. Start the Application

Using the provided script:
```bash
./start.sh
```

Or manually:
```bash
# Build and start containers
docker-compose up -d

# View logs
docker-compose logs -f
```

### 3. Access the Application

- **Web Interface**: http://localhost:5000
- **Database**: postgresql://postgres:postgres@localhost:5432/fishtracker

## Default User Accounts

The application automatically creates these accounts on first startup:

| Email | Password | Role |
|-------|----------|------|
| admin@example.com | password123 | Admin |

Additional users can register through the web interface.

## Key Features Overview

### For Anglers
- **Quick Catch Logging**: Fast entry with species selection and size recording
- **GPS Location**: Automatic location detection for catch spots
- **Photo Attachments**: Add photos to document your catches
- **Offline Mode**: Track catches without internet, sync when connected
- **Personal Stats**: View your fishing statistics and progress

### For Communities
- **Public Feed**: Browse catches from other anglers
- **Leaderboards**: See top catches by size, species, and frequency
- **Lake Information**: Track catches by specific fishing locations

### For Administrators
- **User Management**: View and manage user accounts
- **Catch Verification**: Verify submitted catches for accuracy
- **System Monitoring**: Monitor application health and usage

## Configuration

### Environment Variables

Edit your `.env` file to customize the application:

```bash
# Weather data (optional)
OPENWEATHER_API_KEY=your_openweather_api_key

# Session security (optional - default provided)
SESSION_SECRET=your_custom_session_secret
```

### Database Configuration

The PostgreSQL database is automatically configured with:
- **Host**: db (internal Docker network)
- **Port**: 5432
- **Database**: fishtracker
- **User**: postgres
- **Password**: postgres

Data is persisted in a Docker volume named `postgres_data`.

## Management Commands

### Container Management
```bash
# View running containers
docker-compose ps

# Stop all services
docker-compose down

# Restart services
docker-compose restart

# View application logs
docker-compose logs -f app

# View database logs
docker-compose logs -f db
```

### Database Management
```bash
# Access database directly
docker-compose exec db psql -U postgres -d fishtracker

# Backup database
docker-compose exec db pg_dump -U postgres fishtracker > backup.sql

# Reset database (warning: deletes all data)
docker-compose down -v
docker-compose up -d
```

### Application Updates
```bash
# Rebuild after code changes
docker-compose build --no-cache app
docker-compose up -d
```

## Troubleshooting

### Common Issues

**Application won't start**
- Ensure ports 5000 and 5432 are not in use by other services
- Check Docker has sufficient resources allocated

**Database connection errors**
- Wait 10-15 seconds for PostgreSQL to fully initialize
- Check logs: `docker-compose logs db`

**Weather data not loading**
- Verify your OpenWeather API key is valid
- Check the `.env` file format and reload containers

**Container permission issues**
- Ensure Docker daemon is running
- On Linux, you may need to run with `sudo` or add your user to the docker group

### Performance Optimization

For better performance in production:

1. **Resource Allocation**: Increase Docker memory limits
2. **Database Tuning**: Modify PostgreSQL settings in docker-compose.yml
3. **Caching**: The app includes built-in query caching

### Logs and Monitoring

View detailed logs:
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f db

# Follow logs in real-time
docker-compose logs -f --tail=100
```

## Architecture

### Technology Stack
- **Frontend**: React with TypeScript, Tailwind CSS
- **Backend**: Node.js with Express
- **Database**: PostgreSQL with Drizzle ORM
- **Deployment**: Docker with Docker Compose
- **PWA**: Service Worker for offline functionality

### Network Architecture
```
Internet → Port 5000 → Fish Tracker App
                     ↓
                PostgreSQL Database
```

Both services run in an isolated Docker network for security.

## Security Considerations

- Database is not exposed to external networks by default
- Session management uses secure HTTP-only cookies
- API endpoints include authentication and authorization
- File uploads are validated and size-limited

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review container logs for error messages
3. Ensure all prerequisites are properly installed
4. Verify your `.env` file configuration

For weather-related features, you'll need to obtain a free API key from [OpenWeatherMap](https://openweathermap.org/api).