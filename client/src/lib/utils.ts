import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format date to readable string
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Format time elapsed since date
export function timeAgo(date: Date | string): string {
  const now = new Date();
  const past = new Date(date);
  const seconds = Math.floor((now.getTime() - past.getTime()) / 1000);
  
  if (seconds < 60) {
    return 'just now';
  }
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  
  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }
  
  return formatDate(date);
}

// Convert size from inches to display format
export function formatSize(size: number): string {
  return `${size} in`;
}

// Convert weight from pounds to display format
export function formatWeight(weight: number): string {
  return `${weight} lbs`;
}

// Format temperature with degree symbol
export function formatTemperature(temp: number): string {
  return `${Math.round(temp)}°F`;
}

// Format depth with ft
export function formatDepth(depth: number): string {
  return `${depth} ft`;
}

// Truncate text with ellipsis
export function truncateText(text: string, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

// Get initials from name
export function getInitials(name: string): string {
  if (!name) return '';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// Generate a deterministic color based on string
export function stringToColor(str: string): string {
  if (!str) return '#3B82F6'; // Default to primary color
  
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const colors = [
    '#3B82F6', // primary
    '#10B981', // secondary
    '#F59E0B', // accent
    '#EF4444', // error
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#14B8A6', // teal
  ];
  
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

// Parse JSON safely
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch (e) {
    return fallback;
  }
}

// Generate a unique ID
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// Format coordinates to readable string
export function formatCoordinates(lat?: number, lng?: number): string {
  if (lat === undefined || lng === undefined) return 'Unknown Location';
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

// Get moon phase name from value (0-1)
export function getMoonPhaseName(phase?: number): string {
  if (phase === undefined) return 'Unknown';
  
  if (phase === 0 || phase === 1) return 'New Moon';
  if (phase < 0.25) return 'Waxing Crescent';
  if (phase === 0.25) return 'First Quarter';
  if (phase < 0.5) return 'Waxing Gibbous';
  if (phase === 0.5) return 'Full Moon';
  if (phase < 0.75) return 'Waning Gibbous';
  if (phase === 0.75) return 'Last Quarter';
  return 'Waning Crescent';
}

// Convert icon code from OpenWeather to readable name
export function getWeatherName(iconCode: string): string {
  const iconMap: Record<string, string> = {
    '01d': 'Clear Sky',
    '01n': 'Clear Night',
    '02d': 'Few Clouds',
    '02n': 'Few Clouds',
    '03d': 'Scattered Clouds',
    '03n': 'Scattered Clouds',
    '04d': 'Broken Clouds',
    '04n': 'Broken Clouds',
    '09d': 'Shower Rain',
    '09n': 'Shower Rain',
    '10d': 'Rain',
    '10n': 'Rain',
    '11d': 'Thunderstorm',
    '11n': 'Thunderstorm',
    '13d': 'Snow',
    '13n': 'Snow',
    '50d': 'Mist',
    '50n': 'Mist',
  };
  
  return iconMap[iconCode] || 'Unknown';
}

// Get icon for weather from OpenWeather icon code
export function getWeatherIcon(iconCode: string): string {
  const iconMap: Record<string, string> = {
    '01d': 'ri-sun-line',
    '01n': 'ri-moon-clear-line',
    '02d': 'ri-sun-cloudy-line',
    '02n': 'ri-moon-cloudy-line',
    '03d': 'ri-cloudy-line',
    '03n': 'ri-cloudy-line',
    '04d': 'ri-cloudy-line',
    '04n': 'ri-cloudy-line',
    '09d': 'ri-showers-line',
    '09n': 'ri-showers-line',
    '10d': 'ri-heavy-showers-line',
    '10n': 'ri-heavy-showers-line',
    '11d': 'ri-thunderstorms-line',
    '11n': 'ri-thunderstorms-line',
    '13d': 'ri-snowy-line',
    '13n': 'ri-snowy-line',
    '50d': 'ri-mist-line',
    '50n': 'ri-mist-line',
  };
  
  return iconMap[iconCode] || 'ri-question-line';
}

// Get icon for moon phase
export function getMoonPhaseIcon(phase?: number): string {
  if (phase === undefined) return 'ri-moon-line';
  
  if (phase === 0 || phase === 1) return 'ri-moon-line';
  if (phase < 0.25) return 'ri-moon-foggy-line';
  if (phase === 0.25) return 'ri-moon-foggy-line';
  if (phase < 0.5) return 'ri-moon-cloudy-line';
  if (phase === 0.5) return 'ri-moon-clear-line';
  if (phase < 0.75) return 'ri-moon-cloudy-line';
  if (phase === 0.75) return 'ri-moon-foggy-line';
  return 'ri-moon-foggy-line';
}
