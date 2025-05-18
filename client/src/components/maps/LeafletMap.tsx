import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "@/hooks/useLocation";
import { Tag, HomeIcon } from "lucide-react";
import { getFishSpeciesById } from "@/lib/fishSpecies";
import { Loader2 } from "lucide-react";

// Dynamically import Leaflet components to avoid SSR issues
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Define marker types
interface CatchMarker {
  id: number;
  latitude: number;
  longitude: number;
  species: string;
  size: number;
  userId: string;
  username: string;
  lakeName?: string;
  catchDate: string;
  photos?: string[];
}

interface LakeMarker {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  catchCount: number;
}

interface LeafletMapProps {
  catches?: CatchMarker[];
  lakes?: LakeMarker[];
  height?: string;
  showControls?: boolean;
  onMarkerClick?: (markerId: number, type: 'catch' | 'lake') => void;
}

export default function LeafletMap({ 
  catches = [], 
  lakes = [], 
  height = "400px",
  showControls = true,
  onMarkerClick 
}: LeafletMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const catchMarkersRef = useRef<L.LayerGroup | null>(null);
  const lakeMarkersRef = useRef<L.LayerGroup | null>(null);
  const heatLayerRef = useRef<any | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { location, getLocation, isLoading: isLocationLoading } = useLocation();
  const [showHeatmap, setShowHeatmap] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    
    // Initialize map if it doesn't exist yet
    if (!mapRef.current) {
      // Set default icon paths for Leaflet markers (fixes missing marker issue)
      const defaultIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });
      L.Marker.prototype.options.icon = defaultIcon;
      
      // Create map centered on US (will recenter based on user location)
      mapRef.current = L.map(mapContainerRef.current).setView([39.8283, -98.5795], 4);
      
      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(mapRef.current);
      
      // Create layer groups for markers
      catchMarkersRef.current = L.layerGroup().addTo(mapRef.current);
      lakeMarkersRef.current = L.layerGroup().addTo(mapRef.current);
      
      // Initialize with user location if available
      if (location) {
        mapRef.current.setView([location.latitude, location.longitude], 12);
      } else {
        // Try to get user location
        getLocation().then(loc => {
          if (loc && mapRef.current) {
            mapRef.current.setView([loc.latitude, loc.longitude], 12);
          }
        }).catch(() => {
          // If location access is denied, keep default view
        });
      }
    }
    
    return () => {
      // Clean up map on component unmount
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Add catch markers to map
  useEffect(() => {
    if (!mapRef.current || !catchMarkersRef.current) return;
    
    // Clear existing markers
    catchMarkersRef.current.clearLayers();
    
    // Add markers for catches
    catches.forEach(catchItem => {
      if (catchItem.latitude && catchItem.longitude) {
        // Create custom icon based on species
        const customIcon = L.divIcon({
          className: 'custom-marker-icon',
          html: `<div class="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center shadow-md">
                  <i class="ri-fish-line"></i>
                </div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });
        
        // Get proper fish species name 
        const fishSpecies = getFishSpeciesById(catchItem.species);
        const speciesName = fishSpecies ? fishSpecies.name : catchItem.species;
        
        // Create marker
        const marker = L.marker([catchItem.latitude, catchItem.longitude], { 
          icon: customIcon,
          title: `${speciesName} (${catchItem.size}in)`
        });
        
        // Add popup
        marker.bindPopup(`
          <div class="catch-popup">
            <h4 class="font-medium">${speciesName}</h4>
            <p class="text-sm">${catchItem.size}in caught by ${catchItem.username}</p>
            ${catchItem.lakeName ? `<p class="text-sm text-gray-600">${catchItem.lakeName}</p>` : ''}
            <button class="view-catch-btn mt-2 bg-primary text-white text-xs px-2 py-1 rounded">View Details</button>
          </div>
        `);
        
        // Add click handler
        marker.on('click', () => {
          if (onMarkerClick) {
            onMarkerClick(catchItem.id, 'catch');
          }
        });
        
        // Add to layer group
        marker.addTo(catchMarkersRef.current!);
      }
    });
    
    // Update heatmap if enabled
    if (showHeatmap) {
      updateHeatmap();
    }
  }, [catches, showHeatmap]);

  // Add lake markers to map
  useEffect(() => {
    if (!mapRef.current || !lakeMarkersRef.current) return;
    
    // Clear existing markers
    lakeMarkersRef.current.clearLayers();
    
    // Add markers for lakes
    lakes.forEach(lake => {
      // Create custom icon for lake
      const customIcon = L.divIcon({
        className: 'custom-lake-icon',
        html: `<div class="bg-secondary text-white rounded-full w-10 h-10 flex items-center justify-center shadow-md">
                <i class="ri-water-flash-line"></i>
              </div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });
      
      // Create marker
      const marker = L.marker([lake.latitude, lake.longitude], { 
        icon: customIcon,
        title: lake.name
      });
      
      // Add popup
      marker.bindPopup(`
        <div class="lake-popup">
          <h4 class="font-medium">${lake.name}</h4>
          <p class="text-sm">${lake.catchCount} ${lake.catchCount === 1 ? 'catch' : 'catches'} recorded</p>
          <button class="view-lake-btn mt-2 bg-secondary text-white text-xs px-2 py-1 rounded">View Details</button>
        </div>
      `);
      
      // Add click handler
      marker.on('click', () => {
        if (onMarkerClick) {
          onMarkerClick(lake.id, 'lake');
        }
      });
      
      // Add to layer group
      marker.addTo(lakeMarkersRef.current!);
    });
  }, [lakes]);

  // Center map on user location
  const centerOnUserLocation = async () => {
    try {
      const loc = await getLocation();
      if (loc && mapRef.current) {
        mapRef.current.setView([loc.latitude, loc.longitude], 14);
      }
    } catch (error) {
      toast({
        title: "Location Error",
        description: "Could not access your location. Please check your permissions.",
        variant: "destructive",
      });
    }
  };

  // Toggle heatmap
  const toggleHeatmap = () => {
    setShowHeatmap(!showHeatmap);
  };

  // Update heatmap layer
  const updateHeatmap = () => {
    if (!mapRef.current) return;
    
    // Try to use the Leaflet.heat plugin if available
    if (window.L.heatLayer && catches.length > 0) {
      // Remove existing heatmap if it exists
      if (heatLayerRef.current) {
        mapRef.current.removeLayer(heatLayerRef.current);
      }
      
      // Create points for heatmap
      const points = catches
        .filter(c => c.latitude && c.longitude)
        .map(c => [c.latitude, c.longitude, 0.5]); // lat, lng, intensity
      
      if (points.length > 0) {
        // Create and add heatmap layer
        heatLayerRef.current = window.L.heatLayer(points, {
          radius: 25,
          blur: 15,
          maxZoom: 17
        }).addTo(mapRef.current);
      }
    } else {
      // Heatmap plugin not available
      if (!window.L.heatLayer) {
        toast({
          title: "Heatmap Unavailable",
          description: "Heatmap functionality requires the Leaflet.heat plugin.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <Card className="overflow-hidden shadow-sm border border-gray-100">
      <div 
        ref={mapContainerRef} 
        className="w-full"
        style={{ height }}
      ></div>
      
      {showControls && (
        <CardContent className="p-3 flex justify-between">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={centerOnUserLocation}
            disabled={isLocationLoading}
          >
            {isLocationLoading ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <i className="ri-focus-3-line mr-1"></i>
            )}
            My Location
          </Button>
          
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleHeatmap}
              className={showHeatmap ? "bg-primary/10 border-primary/20" : ""}
            >
              <i className="ri-fire-line mr-1"></i>
              Heatmap
            </Button>
            
            <Button variant="outline" size="sm">
              <i className="ri-filter-line mr-1"></i>
              Filter
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// Add missing type definition for Leaflet heatmap plugin
declare global {
  interface Window {
    L: typeof L & {
      heatLayer?: (latlngs: any[], options?: any) => any;
    }
  }
}
