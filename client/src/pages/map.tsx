import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation as useWouterLocation } from "wouter";
import { useLocation } from "@/hooks/useLocation";
import LeafletMap from "@/components/maps/LeafletMap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import SpotChip from "@/components/maps/SpotChip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import CatchForm from "@/components/catches/CatchForm";
import { Search, Fish, Map, Filter, Plus } from "lucide-react";
import { formatDate, formatSize, formatWeight } from "@/lib/utils";
import { getFishSpeciesById } from "@/lib/fishSpecies";

export default function MapPage() {
  const [_, navigate] = useWouterLocation();
  const { location, getLocation } = useLocation();
  const [activeTab, setActiveTab] = useState<string>("map");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCatch, setSelectedCatch] = useState<number | null>(null);
  const [selectedLake, setSelectedLake] = useState<number | null>(null);
  const [displayedCatches, setDisplayedCatches] = useState<any[]>([]);

  // Parse URL parameters for initial map position
  const queryParams = new URLSearchParams(window.location.search);
  const initialLat = parseFloat(queryParams.get("lat") || "0") || undefined;
  const initialLng = parseFloat(queryParams.get("lng") || "0") || undefined;

  // Fetch all catches
  const { data: catches = [], isLoading: isLoadingCatches } = useQuery({
    queryKey: ['/api/catches'],
    enabled: true,
  });

  // Fetch all lakes
  const { data: lakes = [], isLoading: isLoadingLakes } = useQuery({
    queryKey: ['/api/lakes'],
    enabled: true,
  });

  // Fetch selected catch details
  const { data: selectedCatchData, isLoading: isLoadingSelectedCatch } = useQuery({
    queryKey: ['/api/catches', selectedCatch],
    enabled: !!selectedCatch,
  });

  // Fetch selected lake details
  const { data: selectedLakeData, isLoading: isLoadingSelectedLake } = useQuery({
    queryKey: ['/api/lakes', selectedLake],
    enabled: !!selectedLake,
  });

  // Filter catches based on search query
  useEffect(() => {
    if (!catches || !Array.isArray(catches)) return;
    
    if (!searchQuery) {
      setDisplayedCatches(catches);
      return;
    }
    
    const filtered = catches.filter(catchItem => 
      catchItem.species.toLowerCase().includes(searchQuery.toLowerCase()) ||
      catchItem.lakeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      catchItem.user?.username?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    setDisplayedCatches(filtered);
  }, [searchQuery, catches]);

  // Handle marker click
  const handleMarkerClick = (id: number, type: 'catch' | 'lake') => {
    if (type === 'catch') {
      setSelectedCatch(id);
      setSelectedLake(null);
    } else {
      setSelectedLake(id);
      setSelectedCatch(null);
    }
    
    // Switch to list tab to see details
    setActiveTab("list");
  };

  // Close details panel
  const closeDetails = () => {
    setSelectedCatch(null);
    setSelectedLake(null);
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">Explore Fishing Spots</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Log Catch
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Log a New Catch</DialogTitle>
            </DialogHeader>
            <CatchForm />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search bar */}
      <div className="relative mb-4">
        <Input
          className="pl-10 pr-4 py-2 w-full bg-white"
          placeholder="Search for species, lakes, or users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
      </div>

      {/* Tabs */}
      <Tabs 
        defaultValue="map" 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="mb-6"
      >
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="map" className="flex items-center">
            <Map className="h-4 w-4 mr-2" />
            Map View
          </TabsTrigger>
          <TabsTrigger value="list" className="flex items-center">
            <Fish className="h-4 w-4 mr-2" />
            Catches & Spots
          </TabsTrigger>
        </TabsList>

        {/* Map Tab */}
        <TabsContent value="map" className="pt-2">
          <LeafletMap
            catches={catches}
            lakes={lakes}
            height="60vh"
            onMarkerClick={handleMarkerClick}
          />
        </TabsContent>

        {/* List Tab */}
        <TabsContent value="list" className="pt-2">
          {/* Show selected catch or lake details */}
          {(selectedCatch || selectedLake) && (
            <Card className="mb-4 bg-white shadow-sm border border-gray-100">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-md font-medium">
                    {selectedCatch ? 'Catch Details' : 'Lake Details'}
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={closeDetails}>
                    <i className="ri-close-line"></i>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {selectedCatch && selectedCatchData ? (
                  <div className="space-y-3">
                    {/* Catch details */}
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={selectedCatchData.user?.profileImageUrl} />
                        <AvatarFallback>{selectedCatchData.user?.username?.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{selectedCatchData.user?.username}</p>
                        <p className="text-xs text-gray-500">{formatDate(selectedCatchData.catchDate)}</p>
                      </div>
                    </div>
                    
                    {selectedCatchData.photos && selectedCatchData.photos.length > 0 && (
                      <div className="rounded-md overflow-hidden h-48">
                        <img
                          src={selectedCatchData.photos[0]}
                          alt={selectedCatchData.species}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-gray-50 p-2 rounded-md">
                        <p className="text-xs text-gray-500">Species</p>
                        <p className="font-medium">{getFishSpeciesById(selectedCatchData.species)?.name || selectedCatchData.species}</p>
                      </div>
                      <div className="bg-gray-50 p-2 rounded-md">
                        <p className="text-xs text-gray-500">Size</p>
                        <p className="font-medium">{formatSize(selectedCatchData.size)}</p>
                      </div>
                      {selectedCatchData.weight && (
                        <div className="bg-gray-50 p-2 rounded-md">
                          <p className="text-xs text-gray-500">Weight</p>
                          <p className="font-medium">{formatWeight(selectedCatchData.weight)}</p>
                        </div>
                      )}
                      {selectedCatchData.lakeName && (
                        <div className="bg-gray-50 p-2 rounded-md">
                          <p className="text-xs text-gray-500">Location</p>
                          <p className="font-medium">{selectedCatchData.lakeName}</p>
                        </div>
                      )}
                    </div>
                    
                    {selectedCatchData.comments && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Comments</p>
                        <p className="text-sm">{selectedCatchData.comments}</p>
                      </div>
                    )}
                    
                    <Button 
                      className="w-full" 
                      onClick={() => navigate(`/catches/${selectedCatchData.id}`)}
                    >
                      View Full Details
                    </Button>
                  </div>
                ) : selectedLake && selectedLakeData ? (
                  <div className="space-y-3">
                    {/* Lake details */}
                    <h3 className="text-lg font-medium">{selectedLakeData.name}</h3>
                    
                    <div className="bg-gray-50 p-3 rounded-md">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm">Coordinates</p>
                        <Badge variant="outline">
                          {selectedLakeData.latitude.toFixed(4)}, {selectedLakeData.longitude.toFixed(4)}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <p className="text-sm">Total Catches</p>
                        <Badge variant="outline" className="bg-primary/10 text-primary">
                          {selectedLakeData.catchCount || 0}
                        </Badge>
                      </div>
                    </div>
                    
                    {selectedLakeData.description && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">About</p>
                        <p className="text-sm">{selectedLakeData.description}</p>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setActiveTab("map");
                          // Center map on this lake
                        }}
                      >
                        <Map className="h-4 w-4 mr-1" />
                        Show on Map
                      </Button>
                      
                      <Button 
                        onClick={() => navigate(`/lakes/${selectedLakeData.id}`)}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <i className="ri-loader-2-line text-2xl animate-spin text-gray-400"></i>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Catches list */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">Recent Catches</h3>
              <Button variant="ghost" size="sm">
                <Filter className="h-3 w-3 mr-1" />
                Filter
              </Button>
            </div>
            
            {isLoadingCatches ? (
              <div className="py-8 text-center">
                <i className="ri-loader-2-line text-2xl animate-spin text-gray-400"></i>
              </div>
            ) : displayedCatches.length > 0 ? (
              <div className="space-y-2">
                {displayedCatches.map(catchItem => (
                  <Card 
                    key={catchItem.id} 
                    className={`cursor-pointer bg-white shadow-sm border ${selectedCatch === catchItem.id ? 'border-primary' : 'border-gray-100'}`}
                    onClick={() => handleMarkerClick(catchItem.id, 'catch')}
                  >
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={catchItem.user?.profileImageUrl} />
                          <AvatarFallback>{catchItem.user?.username?.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{getFishSpeciesById(catchItem.species)?.name || catchItem.species}</p>
                          <p className="text-xs text-gray-500">{formatSize(catchItem.size)} • {catchItem.user?.username}</p>
                        </div>
                      </div>
                      
                      {catchItem.lakeName && (
                        <Badge variant="outline" className="text-xs bg-primary/10 text-primary">
                          {catchItem.lakeName}
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center text-gray-500 text-sm">
                No catches match your search
              </div>
            )}
          </div>
          
          {/* Popular spots */}
          <div className="mt-6 space-y-2">
            <h3 className="font-medium">Popular Spots</h3>
            
            {isLoadingLakes ? (
              <div className="py-8 text-center">
                <i className="ri-loader-2-line text-2xl animate-spin text-gray-400"></i>
              </div>
            ) : lakes && lakes.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {lakes.map((lake: any, index: number) => (
                  <SpotChip
                    key={lake.id}
                    name={lake.name}
                    catchCount={lake.catchCount || 0}
                    colorScheme={
                      index % 4 === 0 ? 'primary' : 
                      index % 4 === 1 ? 'secondary' : 
                      index % 4 === 2 ? 'accent' : 'neutral'
                    }
                    onClick={() => handleMarkerClick(lake.id, 'lake')}
                  />
                ))}
              </div>
            ) : (
              <div className="py-4 text-center text-gray-500 text-sm">
                No fishing spots available
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
