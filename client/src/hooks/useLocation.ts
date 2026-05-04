import { useEffect, useRef, useState } from "react";

type Location = {
  latitude: number;
  longitude: number;
  accuracy?: number;
};

export function useLocation() {
  const [location, setLocation] = useState<Location | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  const getLocation = (): Promise<Location | null> => {
    return new Promise((resolve, reject) => {
      setIsLoading(true);
      setError(null);
      
      if (!navigator.geolocation) {
        setError("Geolocation is not supported by your browser");
        setIsLoading(false);
        reject("Geolocation is not supported");
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          
          setLocation(newLocation);
          setIsLoading(false);
          resolve(newLocation);
        },
        (err) => {
          let errorMessage;
          
          switch (err.code) {
            case err.PERMISSION_DENIED:
              errorMessage = "Location access was denied by the user";
              break;
            case err.POSITION_UNAVAILABLE:
              errorMessage = "Location information is unavailable";
              break;
            case err.TIMEOUT:
              errorMessage = "The request to get location timed out";
              break;
            default:
              errorMessage = "An unknown error occurred when getting location";
          }
          
          setError(errorMessage);
          setIsLoading(false);
          reject(errorMessage);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  };

  const startTracking = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    // Already tracking
    if (watchIdRef.current !== null) {
      setIsTracking(true);
      return;
    }

    setError(null);
    setIsTracking(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (err) => {
        let errorMessage;
        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMessage = "Location access was denied by the user";
            break;
          case err.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable";
            break;
          case err.TIMEOUT:
            errorMessage = "The request to get location timed out";
            break;
          default:
            errorMessage = "An unknown error occurred when tracking location";
        }

        setError(errorMessage);
        setIsTracking(false);
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
      },
    );
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    watchIdRef.current = null;
    setIsTracking(false);
  };

  // Try to get location on mount if autoload is true
  useEffect(() => {
    // Optional: Automatically get location on mount
    // getLocation().catch(() => {});
  }, []);

  // Cleanup any geolocation watches on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      watchIdRef.current = null;
    };
  }, []);

  return {
    location,
    getLocation,
    startTracking,
    stopTracking,
    isTracking,
    isLoading,
    error,
  };
}
