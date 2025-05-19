#!/bin/bash

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
  echo "Creating .env file..."
  echo "OPENWEATHER_API_KEY=your_openweather_api_key" > .env
  echo "Please edit the .env file with your actual OpenWeather API key before continuing."
  echo ""
fi

# Start the containers
echo "Starting Docker containers..."
docker-compose up -d

echo ""
echo "Fish Tracker App is starting!"
echo "- Web interface will be available at: http://localhost:5000"
echo "- Database is accessible at: postgresql://postgres:postgres@localhost:5432/fishtracker"
echo ""
echo "To view logs: docker-compose logs -f"
echo "To stop: docker-compose down"