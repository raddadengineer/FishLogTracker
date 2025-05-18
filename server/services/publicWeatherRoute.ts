import express from 'express';
import { getWeatherData } from './openWeatherService';

// Create router for public weather access
export const publicWeatherRouter = express.Router();

// Public weather endpoint
publicWeatherRouter.get('/', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    
    // Validate query parameters
    if (!lat || !lng) {
      return res.status(400).json({ message: "Latitude and longitude are required" });
    }
    
    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lng as string);
    
    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ message: "Invalid latitude or longitude" });
    }
    
    const weatherData = await getWeatherData(latitude, longitude);
    res.json(weatherData);
  } catch (error) {
    console.error("Error fetching weather:", error);
    res.status(500).json({ message: "Failed to fetch weather data" });
  }
});