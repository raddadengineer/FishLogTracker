import axios from "axios";

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || "default_key";
const BASE_URL = "https://api.openweathermap.org/data/2.5";

type WeatherData = {
  temperature: number; // in Fahrenheit
  weather: string;
  weatherIcon: string;
  humidity: number;
  windSpeed: number;
  windDirection: string;
  moonPhase?: number; // 0-1 value representing moon phase
  pressure: number;
  timestamp: number;
};

export async function getWeatherData(lat: number, lng: number): Promise<WeatherData> {
  try {
    // Get current weather
    const response = await axios.get(`${BASE_URL}/weather`, {
      params: {
        lat,
        lon: lng,
        appid: OPENWEATHER_API_KEY,
        units: "imperial", // Use imperial for Fahrenheit
      },
    });

    const data = response.data;

    // Get moon phase from OneCall API if available
    let moonPhase: number | undefined;
    try {
      const oneCallResponse = await axios.get(`${BASE_URL}/onecall`, {
        params: {
          lat,
          lon: lng,
          exclude: "minutely,hourly",
          appid: OPENWEATHER_API_KEY,
        },
      });
      
      moonPhase = oneCallResponse.data.daily[0].moon_phase;
    } catch (error) {
      console.warn("Could not fetch moon phase data:", error);
    }

    // Convert wind degrees to direction
    const windDirection = degreesToDirection(data.wind.deg);

    return {
      temperature: data.main.temp,
      weather: data.weather[0].main,
      weatherIcon: data.weather[0].icon,
      humidity: data.main.humidity,
      windSpeed: data.wind.speed,
      windDirection,
      moonPhase,
      pressure: data.main.pressure,
      timestamp: data.dt,
    };
  } catch (error) {
    console.error("Error fetching weather data:", error);
    throw new Error("Failed to fetch weather data");
  }
}

// Helper function to convert wind degrees to cardinal direction
function degreesToDirection(degrees: number): string {
  const directions = [
    "N", "NNE", "NE", "ENE", 
    "E", "ESE", "SE", "SSE", 
    "S", "SSW", "SW", "WSW", 
    "W", "WNW", "NW", "NNW"
  ];
  
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}
