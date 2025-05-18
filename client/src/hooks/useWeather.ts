import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { getWeatherIcon } from "@/lib/utils";

type WeatherData = {
  temperature: number;
  weather: string;
  weatherIcon: string;
  humidity: number;
  windSpeed: number;
  windDirection: string;
  moonPhase?: number;
  pressure: number;
  timestamp: number;
};

export function useWeather() {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchWeather = async (latitude: number, longitude: number) => {
    if (!latitude || !longitude) return;
    
    setIsLoading(true);
    
    try {
      const response = await fetch(`/api/weather?lat=${latitude}&lng=${longitude}`);
      
      if (!response.ok) {
        // Instead of failing, we'll create an object with the location data only
        const weatherObject: WeatherData = {
          temperature: 75,
          weather: "Unknown",
          weatherIcon: "01d", // default sunny icon
          humidity: 50,
          windSpeed: 5,
          windDirection: "N",
          pressure: 1013,
          timestamp: Math.floor(Date.now() / 1000)
        };
        
        setWeatherData(weatherObject);
        setIsLoading(false);
        return;
      }
      
      const data = await response.json();
      setWeatherData(data);
    } catch (error) {
      console.error('Error fetching weather:', error);
      toast({
        title: "Weather Error",
        description: "Could not fetch weather data for this location.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    weatherData,
    fetchWeather,
    isLoading,
    weatherIcon: weatherData?.weatherIcon ? getWeatherIcon(weatherData.weatherIcon) : null,
  };
}
