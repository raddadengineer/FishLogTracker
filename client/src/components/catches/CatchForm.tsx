import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "@/hooks/useLocation";
import { useWeather } from "@/hooks/useWeather";
import { getFishSpeciesOptions } from "@/lib/fishSpecies";
import { saveOfflineCatch } from "@/lib/localStorageSync";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { getWeatherIcon } from "@/lib/utils";
import { Mic, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Form validation schema
const formSchema = z.object({
  species: z.string().min(1, "Species is required"),
  size: z.coerce.number().min(0.1, "Size must be greater than 0"),
  weight: z.coerce.number().min(0).optional(),
  lakeName: z.string().optional(),
  lure: z.string().optional(),
  depth: z.coerce.number().min(0).optional(),
  temperature: z.coerce.number().min(0).optional(),
  comments: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CatchFormProps {
  catchToEdit?: any; // The catch data to edit, if provided
  onSuccess?: () => void; // Optional callback for when form submission succeeds
}

export default function CatchForm({ catchToEdit, onSuccess }: CatchFormProps) {
  const { toast } = useToast();
  const { location, getLocation, isLoading: isLocationLoading } = useLocation();
  const { weatherData, fetchWeather, isLoading: isWeatherLoading } = useWeather();
  const [photos, setPhotos] = useState<File[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isOnline = navigator.onLine;

  // Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: catchToEdit ? {
      species: catchToEdit.species,
      size: parseFloat(catchToEdit.size),
      weight: catchToEdit.weight ? parseFloat(catchToEdit.weight) : undefined,
      lakeName: catchToEdit.lakeName || "",
      lure: catchToEdit.lure || "",
      depth: catchToEdit.depth ? parseFloat(catchToEdit.depth) : undefined,
      temperature: catchToEdit.temperature ? parseFloat(catchToEdit.temperature) : undefined,
      comments: catchToEdit.comments || "",
      latitude: catchToEdit.latitude || location?.latitude,
      longitude: catchToEdit.longitude || location?.longitude,
    } : {
      species: "",
      size: undefined,
      weight: undefined,
      lakeName: "",
      lure: "",
      depth: undefined,
      temperature: undefined,
      comments: "",
      latitude: location?.latitude,
      longitude: location?.longitude,
    },
  });

  // Improved direct access to geolocation
  const getMyLocation = () => {
    setIsLoadingLocation(true);
    
    if (!navigator.geolocation) {
      toast({
        title: "Not Supported",
        description: "Geolocation is not supported in your browser.",
        variant: "destructive"
      });
      setIsLoadingLocation(false);
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        form.setValue("latitude", latitude);
        form.setValue("longitude", longitude);
        
        // Try to get weather data with coordinates
        fetchWeather(latitude, longitude);
        
        toast({
          title: "Location Found",
          description: `GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        });
        setIsLoadingLocation(false);
      },
      (error) => {
        console.error("Error getting location:", error);
        toast({
          title: "Location Error",
          description: "Could not get your location. Please check your permissions.",
          variant: "destructive"
        });
        setIsLoadingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Handle location button click
  const handleGetLocation = async () => {
    try {
      const location = await getLocation();
      if (location) {
        form.setValue("latitude", location.latitude);
        form.setValue("longitude", location.longitude);
        
        // Fetch weather data when location is available
        fetchWeather(location.latitude, location.longitude);
      }
    } catch (error) {
      toast({
        title: "Location Error",
        description: "Could not get your location. Please check your permissions.",
        variant: "destructive",
      });
    }
  };

  // Handle photo upload
  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newPhotos = Array.from(files);
      setPhotos((prev) => [...prev, ...newPhotos]);
    }
  };

  // Handle photo container click
  const handlePhotoContainerClick = () => {
    fileInputRef.current?.click();
  };

  // Speech recognition for comments
  const startSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window)) {
      toast({
        title: "Not Supported",
        description: "Speech recognition is not supported in this browser.",
        variant: "destructive",
      });
      return;
    }
    
    const SpeechRecognition = window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    
    setIsRecording(true);
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const currentText = form.getValues("comments") || "";
      form.setValue("comments", currentText ? `${currentText} ${transcript}` : transcript);
    };
    
    recognition.onerror = () => {
      setIsRecording(false);
      toast({
        title: "Speech Recognition Error",
        description: "An error occurred while recording speech.",
        variant: "destructive",
      });
    };
    
    recognition.onend = () => {
      setIsRecording(false);
    };
    
    recognition.start();
  };

  // Form submission
  const onSubmit = async (data: FormValues) => {
    setIsSaving(true);
    try {
      if (isOnline) {
        // Create form data for multipart upload
        const formData = new FormData();
        
        // Append all form fields
        Object.entries(data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            formData.append(key, value.toString());
          }
        });
        
        // Add weather data if available
        if (weatherData) {
          formData.append('weatherData', JSON.stringify(weatherData));
        }
        
        // Add user ID from localStorage for authentication
        const userId = localStorage.getItem('currentUserId');
        if (userId) {
          formData.append('userId', userId);
        }
        
        // Append all photos
        photos.forEach((photo, index) => {
          formData.append('photos', photo);
        });
        
        // Create simplified data with proper formatting
        const simplifiedData = {
          userId: userId || '32a4819a-ee2b-4e91-aa42-d313eb2214ba', // Use a default Guest ID if not logged in
          species: data.species,
          size: data.size.toString(),
          weight: data.weight ? data.weight.toString() : null,
          lakeName: data.lakeName || null,
          lure: data.lure || null,
          depth: data.depth ? data.depth.toString() : null,
          temperature: data.temperature ? data.temperature.toString() : null,
          latitude: data.latitude || null,
          longitude: data.longitude || null,
          comments: data.comments || null,
          photos: [],  // Prepare empty photos array
          weatherData: weatherData || null,
          catchDate: new Date().toISOString()
        };
        
        let response;
        
        if (catchToEdit) {
          // For edit, use the direct API that doesn't require authentication
          response = await fetch('/api/direct-catch/update', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              ...simplifiedData,
              id: catchToEdit.id // Include catch ID for the update
            })
          });
        } else {
          // If creating a new catch, use direct-catch API
          response = await fetch('/api/direct-catch/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(simplifiedData)
          });
        }
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          console.error("Error response:", errorData);
          throw new Error(`Request failed with status ${response.status}`);
        }
        
        // Invalidate catches query to refetch the data
        queryClient.invalidateQueries({ queryKey: ['/api/catches'] });
        queryClient.invalidateQueries({ queryKey: ['/api/users'] });
        
        toast({
          title: "Success",
          description: catchToEdit 
            ? "Your catch has been updated!" 
            : "Your catch has been logged!",
        });
        
        // Call onSuccess callback if provided
        if (onSuccess) {
          onSuccess();
        }
        
      } else {
        if (catchToEdit) {
          toast({
            title: "Cannot Edit Offline",
            description: "You need to be online to edit existing catches.",
            variant: "destructive",
          });
          return;
        }
        
        // Store offline and sync later
        const catchData = {
          ...data,
          catchDate: new Date().toISOString(),
          weatherData: weatherData || undefined,
          // We can't store File objects in localStorage, so we'll skip photos for now
          // In a real implementation, we would store them in IndexedDB
        };
        
        await saveOfflineCatch(catchData);
        
        toast({
          title: "Saved Offline",
          description: "Your catch has been saved and will sync when you're online.",
        });
      }
      
      // Reset form
      if (!catchToEdit) {
        form.reset();
        setPhotos([]);
      }
      
    } catch (error) {
      console.error('Error saving catch:', error);
      toast({
        title: "Error",
        description: catchToEdit 
          ? "Failed to update catch. Please try again." 
          : "Failed to save catch. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Photo upload */}
        <div className="mb-4">
          <FormLabel>Add Photos</FormLabel>
          <div 
            onClick={handlePhotoContainerClick}
            className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer"
          >
            <div className="space-y-1">
              <i className="ri-camera-line text-2xl text-gray-400"></i>
              <p className="text-sm text-gray-500">Tap to add photos</p>
              <p className="text-xs text-gray-400">or drag & drop</p>
            </div>
            <input 
              type="file" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handlePhotoUpload}
              multiple 
              accept="image/*" 
            />
          </div>
          
          {/* Photo preview */}
          {photos.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {photos.map((photo, index) => (
                <div key={index} className="relative w-16 h-16 rounded overflow-hidden">
                  <img 
                    src={URL.createObjectURL(photo)} 
                    alt={`Photo ${index + 1}`} 
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    className="absolute top-0 right-0 bg-red-500 text-white w-5 h-5 flex items-center justify-center rounded-full"
                    onClick={() => setPhotos(photos.filter((_, i) => i !== index))}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Species selection */}
        <FormField
          control={form.control}
          name="species"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Species *</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select species" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {getFishSpeciesOptions().map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Size and weight */}
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="size"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Size (inches) *</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="Length" 
                    min="0" 
                    step="0.1" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="weight"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Weight (lbs)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="Optional" 
                    min="0" 
                    step="0.1" 
                    {...field} 
                    value={field.value || ""}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Location */}
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="lakeName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <div className="relative">
                  <FormControl>
                    <Input 
                      type="text" 
                      placeholder="Where did you catch it?"
                      className="pl-9"
                      {...field} 
                    />
                  </FormControl>
                  <div className="absolute top-0 left-0 h-full flex items-center pl-3">
                    <MapPin className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* GPS Coordinates Section */}
          <div className="flex flex-col space-y-2">
            <div className="flex justify-between items-center">
              <FormLabel className="text-sm">GPS Coordinates</FormLabel>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                className="h-8 text-xs flex items-center gap-1"
                onClick={getMyLocation}
                disabled={isLoadingLocation}
              >
                {isLoadingLocation ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Getting location...
                  </>
                ) : (
                  <>
                    <MapPin className="h-3 w-3 mr-1" />
                    Get My Location
                  </>
                )}
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="latitude"
                render={({ field }) => (
                  <FormItem>
                    <div className="relative">
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Latitude"
                          className="text-sm"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </FormControl>
                    </div>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="longitude"
                render={({ field }) => (
                  <FormItem>
                    <div className="relative">
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Longitude"
                          className="text-sm"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </FormControl>
                    </div>
                  </FormItem>
                )}
              />
            </div>
            
            {/* Show location status */}
            {form.getValues("latitude") && form.getValues("longitude") && (
              <div className="text-xs text-green-600 flex items-center">
                <i className="ri-checkbox-circle-line mr-1"></i>
                GPS coordinates set
              </div>
            )}
          </div>
        </div>

        {/* Date and time */}
        <div className="grid grid-cols-2 gap-3">
          <FormItem>
            <FormLabel>Date</FormLabel>
            <FormControl>
              <Input 
                type="date" 
                defaultValue={new Date().toISOString().substring(0, 10)} 
              />
            </FormControl>
          </FormItem>
          
          <FormItem>
            <FormLabel>Time</FormLabel>
            <FormControl>
              <Input 
                type="time" 
                defaultValue={new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })} 
              />
            </FormControl>
          </FormItem>
        </div>

        {/* Water conditions */}
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="temperature"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Water Temp</FormLabel>
                <div className="relative">
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="°F" 
                      className="pl-9"
                      min="0"
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <div className="absolute top-0 left-0 h-full flex items-center pl-3">
                    <i className="ri-temp-cold-line text-gray-400"></i>
                  </div>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="depth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Depth</FormLabel>
                <div className="relative">
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="ft" 
                      className="pl-9"
                      min="0"
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <div className="absolute top-0 left-0 h-full flex items-center pl-3">
                    <i className="ri-arrow-down-line text-gray-400"></i>
                  </div>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Lure/Bait */}
        <FormField
          control={form.control}
          name="lure"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Lure/Bait</FormLabel>
              <FormControl>
                <Input 
                  type="text" 
                  placeholder="What did you use?" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Comments */}
        <FormField
          control={form.control}
          name="comments"
          render={({ field }) => (
            <FormItem>
              <div className="flex justify-between items-center mb-1">
                <FormLabel>Comments</FormLabel>
                <Button 
                  type="button" 
                  variant="ghost"
                  size="sm" 
                  className="h-8 text-xs text-primary flex items-center"
                  onClick={startSpeechRecognition}
                  disabled={isRecording}
                >
                  <Mic className="h-3 w-3 mr-1" />
                  {isRecording ? "Recording..." : "Voice to text"}
                </Button>
              </div>
              <FormControl>
                <Textarea 
                  placeholder="Any notes about your catch?" 
                  className="resize-none" 
                  rows={3} 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Weather information if available */}
        {weatherData && (
          <div className="p-3 bg-gray-50 rounded-md text-sm">
            <p className="font-medium text-gray-700 mb-1">Current Conditions:</p>
            <div className="flex items-center justify-between text-gray-600">
              <span>
                <i className={`${weatherData.weatherIcon ? getWeatherIcon(weatherData.weatherIcon) : 'ri-cloud-line'} mr-1`}></i>
                {weatherData.weather}
              </span>
              <span>
                <i className="ri-temp-hot-line mr-1"></i>
                {Math.round(weatherData.temperature)}°F
              </span>
            </div>
          </div>
        )}

        {/* Submit button */}
        <Button 
          type="submit" 
          className="w-full bg-primary text-white font-medium"
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Log Catch"
          )}
        </Button>
      </form>
    </Form>
  );
}
