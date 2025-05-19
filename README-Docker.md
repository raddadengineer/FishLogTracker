# Deploying Fish Tracker App with Docker

This guide explains how to deploy the Fish Tracker application locally using Docker.

## Prerequisites

1. [Docker](https://docs.docker.com/get-docker/)
2. [Docker Compose](https://docs.docker.com/compose/install/)
3. [OpenWeather API Key](https://openweathermap.org/api) (for weather data)

## Setup Instructions

### 1. Environment Setup

Create a `.env` file in the project root directory with your OpenWeather API key:

```
OPENWEATHER_API_KEY=your_openweather_api_key
```

This is required for the weather data features of the application.

### 2. Quick Start

Run the provided startup script:

```bash
./start.sh
```

This script will:
- Create a `.env` file if it doesn't exist
- Start the Docker containers (web app and database)
- Provide you with access URLs

### 3. Manual Setup

If you prefer to start the containers manually:

```bash
# Start containers in the background
docker-compose up -d

# View logs
docker-compose logs -f
```

## Accessing the Application

- Web Interface: http://localhost:5000
- Database: postgresql://postgres:postgres@localhost:5432/fishtracker

## Managing Docker Containers

- View container status: `docker-compose ps`
- Stop containers: `docker-compose down`
- Restart containers: `docker-compose restart`
- Rebuild the application: `docker-compose build`

## Database Management

The database is persisted using a Docker volume, so your data will survive container restarts. If you need to reset the database:

```bash
# Stop containers and remove volumes
docker-compose down -v

# Restart everything
docker-compose up -d
```

## Default Credentials

For demonstration purposes, the application includes these default accounts:

- Admin: admin@example.com / password123
- Regular User: user@example.com / password123

## Troubleshooting

- If the web application shows connection errors, ensure the database has fully started (this can take a few seconds).
- If the weather data is not displaying, verify that your OpenWeather API key is valid and set correctly in the `.env` file.
- For permission issues, ensure Docker has access to the project directory.

## Custom Configuration

To modify any configuration settings:
1. Stop the containers: `docker-compose down`
2. Edit the `docker-compose.yml` file to change environment variables or ports
3. Restart the containers: `docker-compose up -d`