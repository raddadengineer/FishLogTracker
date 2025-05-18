import { createContext, useState, useContext, useEffect, ReactNode } from 'react';

// Define settings interface
export interface Settings {
  darkMode: boolean;
  useMetric: boolean;
  enableNotifications: boolean;
  dataSync: boolean;
  showLocation: boolean;
}

// Define context interface with settings and update functions
interface SettingsContextType {
  settings: Settings;
  updateSetting: (key: keyof Settings, value: boolean) => void;
  saveSettings: () => void;
}

// Default settings
const defaultSettings: Settings = {
  darkMode: false,
  useMetric: false,
  enableNotifications: true,
  dataSync: true,
  showLocation: true
};

// Create context with a default value
const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  updateSetting: () => {},
  saveSettings: () => {}
});

// Settings provider component
export function SettingsProvider({ children }: { children: ReactNode }) {
  // State to hold settings
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [initialized, setInitialized] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('fishTrackerSettings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings({
          darkMode: parsedSettings.darkMode ?? defaultSettings.darkMode,
          useMetric: parsedSettings.useMetric ?? defaultSettings.useMetric,
          enableNotifications: parsedSettings.enableNotifications ?? defaultSettings.enableNotifications,
          dataSync: parsedSettings.dataSync ?? defaultSettings.dataSync,
          showLocation: parsedSettings.showLocation ?? defaultSettings.showLocation
        });
      } catch (e) {
        console.error("Failed to parse settings:", e);
      }
    }
    setInitialized(true);
  }, []);

  // Apply dark mode class when settings change
  useEffect(() => {
    if (initialized) {
      if (settings.darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [settings.darkMode, initialized]);

  // Update individual setting
  const updateSetting = (key: keyof Settings, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Save settings to localStorage
  const saveSettings = () => {
    localStorage.setItem('fishTrackerSettings', JSON.stringify(settings));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, saveSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

// Custom hook to use settings
export function useSettings() {
  return useContext(SettingsContext);
}