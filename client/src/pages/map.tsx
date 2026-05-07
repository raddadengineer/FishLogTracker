import { useMemo, useState, useEffect } from "react";
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
import { Search, Fish, Map, Filter, Plus, Crosshair, Bookmark } from "lucide-react";
import { formatDate, formatSize, formatWeight } from "@/lib/utils";
import { getFishSpeciesById } from "@/lib/fishSpecies";
import { useToast } from "@/hooks/use-toast";
import { getMySpots, isSpotSaved, removeSpot, saveSpot, spotIdFromNameCoords, type MySpot } from "@/lib/mySpots";

export default function MapPage() {
  const [_, navigate] = useWouterLocation();
  const { location, getLocation, isLoading: isLocLoading } = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("map");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<"newest" | "biggest">("newest");
  const [mapCenter, setMapCenter] = useState<{ latitude: number; longitude: number; zoom?: number } | null>(null);
  const [isLogCatchOpen, setIsLogCatchOpen] = useState(false);
  const [catchPrefill, setCatchPrefill] = useState<{ lakeName?: string; latitude?: number; longitude?: number } | null>(
    null,
  );
  const [filters, setFilters] = useState<{
    species: string;
    lake: string;
    hasGps: boolean;
    hasPhoto: boolean;
    last30Days: boolean;
  }>({
    species: "",
    lake: "",
    hasGps: false,
    hasPhoto: false,
    last30Days: false,
  });
  const [selectedCatch, setSelectedCatch] = useState<number | null>(null);
  const [selectedLake, setSelectedLake] = useState<number | null>(null);
  const [selectedMySpotId, setSelectedMySpotId] = useState<string | null>(null);
  const [mySpots, setMySpots] = useState<MySpot[]>(() => getMySpots());
  const [showMySpots, setShowMySpots] = useState(true);
  const [displayedCatches, setDisplayedCatches] = useState<any[]>([]);

  // Parse URL parameters for initial map position
  const queryParams = new URLSearchParams(window.location.search);
  const initialLat = parseFloat(queryParams.get("lat") || "0") || undefined;
  const initialLng = parseFloat(queryParams.get("lng") || "0") || undefined;

  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get("tab");
    if (tab === "list") {
      setActiveTab("list");
    }
  }, []);

  useEffect(() => {
    if (initialLat != null && initialLng != null) {
      setMapCenter({ latitude: initialLat, longitude: initialLng, zoom: 14 });
      setActiveTab("map");
    }
  }, [initialLat, initialLng]);

  useEffect(() => {
    const qp = new URLSearchParams(window.location.search);
    if (qp.get("logCatch") === "1") {
      const lakeName = qp.get("lakeName") || undefined;
      const lat = qp.get("lat") ? Number(qp.get("lat")) : undefined;
      const lng = qp.get("lng") ? Number(qp.get("lng")) : undefined;
      setCatchPrefill({
        lakeName,
        latitude: Number.isFinite(lat) ? lat : undefined,
        longitude: Number.isFinite(lng) ? lng : undefined,
      });
      setIsLogCatchOpen(true);
    }
  }, []);

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
    
    const q = searchQuery.trim().toLowerCase();
    const speciesQ = filters.species.trim().toLowerCase();
    const lakeQ = filters.lake.trim().toLowerCase();
    const now = Date.now();
    const cutoff = now - 30 * 24 * 60 * 60 * 1000;

    let filtered = catches.filter((catchItem: any) => {
      const haystack = [
        String(catchItem.species ?? ""),
        String(catchItem.lakeName ?? ""),
        String(catchItem.user?.username ?? ""),
      ]
        .join(" ")
        .toLowerCase();

      if (q && !haystack.includes(q)) return false;

      if (speciesQ) {
        const sp = String(getFishSpeciesById(catchItem.species)?.name || catchItem.species || "").toLowerCase();
        if (!sp.includes(speciesQ)) return false;
      }

      if (lakeQ) {
        const lk = String(catchItem.lakeName || "").toLowerCase();
        if (!lk.includes(lakeQ)) return false;
      }

      if (filters.hasGps) {
        const la = Number(catchItem.latitude);
        const ln = Number(catchItem.longitude);
        if (!Number.isFinite(la) || !Number.isFinite(ln)) return false;
      }

      if (filters.hasPhoto) {
        const has = Array.isArray(catchItem.photos) ? catchItem.photos.length > 0 : Boolean(catchItem.photoData?.length);
        if (!has) return false;
      }

      if (filters.last30Days) {
        const t = new Date(catchItem.catchDate ?? catchItem.createdAt ?? 0).getTime();
        if (!Number.isFinite(t) || t < cutoff) return false;
      }

      return true;
    });

    filtered = filtered.slice().sort((a: any, b: any) => {
      if (sortBy === "biggest") {
        return Number(b.size || 0) - Number(a.size || 0);
      }
      // newest
      return (
        new Date(b.catchDate ?? b.createdAt ?? 0).getTime() -
        new Date(a.catchDate ?? a.createdAt ?? 0).getTime()
      );
    });
    
    setDisplayedCatches(filtered);
  }, [searchQuery, catches, filters, sortBy]);

  // Handle marker click
  const handleMarkerClick = (id: number, type: 'catch' | 'lake') => {
    if (type === 'catch') {
      setSelectedCatch(id);
      setSelectedLake(null);
      setSelectedMySpotId(null);
    } else {
      setSelectedLake(id);
      setSelectedCatch(null);
      setSelectedMySpotId(null);
    }
    
    // Switch to list tab to see details
    setActiveTab("list");
  };

  const handleSpotClick = (spotId: string) => {
    setSelectedMySpotId(spotId);
    setSelectedCatch(null);
    setSelectedLake(null);
    setActiveTab("list");
  };

  // Close details panel
  const closeDetails = () => {
    setSelectedCatch(null);
    setSelectedLake(null);
    setSelectedMySpotId(null);
  };

  useEffect(() => {
    const refresh = () => setMySpots(getMySpots());
    window.addEventListener("storage", refresh);
    const id = window.setInterval(refresh, 4000);
    return () => {
      window.removeEventListener("storage", refresh);
      window.clearInterval(id);
    };
  }, []);

  const selectedMySpot = useMemo(() => {
    if (!selectedMySpotId) return null;
    return mySpots.find((s) => s.id === selectedMySpotId) || null;
  }, [mySpots, selectedMySpotId]);

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">Explore Fishing Spots</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={isLocLoading}
            onClick={async () => {
              try {
                const loc = await getLocation();
                if (!loc) return;
                setMapCenter({ latitude: loc.latitude, longitude: loc.longitude, zoom: 14 });
                setActiveTab("map");
              } catch {
                toast({
                  title: "Location Error",
                  description: "Could not access your location.",
                  variant: "destructive",
                });
              }
            }}
          >
            <Crosshair className="h-4 w-4 mr-1" />
            Near me
          </Button>

          <Dialog open={isLogCatchOpen} onOpenChange={setIsLogCatchOpen}>
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
            <CatchForm prefill={catchPrefill ?? undefined} onSuccess={() => setIsLogCatchOpen(false)} />
          </DialogContent>
          </Dialog>
        </div>
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
          <div className="mb-2 flex items-center justify-between gap-2">
            <Button
              type="button"
              size="sm"
              variant={showMySpots ? "default" : "outline"}
              onClick={() => setShowMySpots((v) => !v)}
            >
              My Spots {showMySpots ? "On" : "Off"}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => navigate("/my-spots")}>
              Manage
            </Button>
          </div>
          <LeafletMap
            catches={catches}
            lakes={lakes}
            mySpots={showMySpots ? mySpots : []}
            height="60vh"
            onMarkerClick={handleMarkerClick}
            onSpotClick={handleSpotClick}
            initialCenter={mapCenter ?? undefined}
          />
        </TabsContent>

        {/* List Tab */}
        <TabsContent value="list" className="pt-2">
          {/* Show selected catch or lake details */}
          {(selectedCatch || selectedLake || selectedMySpotId) && (
            <Card className="mb-4 bg-white shadow-sm border border-gray-100">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-md font-medium">
                    {selectedCatch ? 'Catch Details' : selectedLake ? 'Lake Details' : 'My Spot'}
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
                          setMapCenter({
                            latitude: selectedLakeData.latitude,
                            longitude: selectedLakeData.longitude,
                            zoom: 14,
                          });
                        }}
                      >
                        <Map className="h-4 w-4 mr-1" />
                        Show on Map
                      </Button>
                      
                      <Button
                        variant={isSpotSaved(`lake:${selectedLakeData.id}`) ? "outline" : "default"}
                        onClick={() => {
                          const key = `lake:${selectedLakeData.id}`;
                          if (isSpotSaved(key)) {
                            removeSpot(key);
                            toast({ title: "Removed", description: "Removed from My Spots." });
                          } else {
                            saveSpot({
                              id: key,
                              name: selectedLakeData.name,
                              latitude: selectedLakeData.latitude,
                              longitude: selectedLakeData.longitude,
                            });
                            toast({ title: "Saved", description: "Added to My Spots." });
                          }
                        }}
                      >
                        {isSpotSaved(`lake:${selectedLakeData.id}`) ? "Unsave" : "Save spot"}
                      </Button>
                    </div>
                  </div>
                ) : selectedMySpot ? (
                  <div className="space-y-3">
                    <h3 className="text-lg font-medium">{selectedMySpot.name}</h3>

                    <div className="bg-gray-50 p-3 rounded-md text-sm">
                      <div className="text-xs text-gray-500 mb-1">Coordinates</div>
                      <div className="font-medium">
                        {selectedMySpot.latitude.toFixed(4)}, {selectedMySpot.longitude.toFixed(4)}
                      </div>
                      {selectedMySpot.notes ? (
                        <div className="mt-2 text-xs text-gray-700">Notes: {selectedMySpot.notes}</div>
                      ) : null}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setActiveTab("map");
                          setMapCenter({
                            latitude: selectedMySpot.latitude,
                            longitude: selectedMySpot.longitude,
                            zoom: 14,
                          });
                        }}
                      >
                        <Map className="h-4 w-4 mr-1" />
                        Show on Map
                      </Button>
                      <Button
                        onClick={() => {
                          setCatchPrefill({
                            lakeName: selectedMySpot.name,
                            latitude: selectedMySpot.latitude,
                            longitude: selectedMySpot.longitude,
                          });
                          setIsLogCatchOpen(true);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Log here
                      </Button>
                    </div>

                    <Button
                      variant="outline"
                      className="border-red-200 text-red-700 hover:bg-red-50"
                      onClick={() => {
                        removeSpot(selectedMySpot.id);
                        setMySpots(getMySpots());
                        toast({ title: "Removed", description: "Spot removed from My Spots." });
                        closeDetails();
                      }}
                    >
                      Remove from My Spots
                    </Button>
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
            <div className="flex justify-between items-center gap-2">
              <h3 className="font-medium">Recent Catches</h3>
              <div className="flex items-center gap-1">
                <Button
                  variant={sortBy === "newest" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSortBy("newest")}
                >
                  Newest
                </Button>
                <Button
                  variant={sortBy === "biggest" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSortBy("biggest")}
                >
                  Biggest
                </Button>
                <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Filter className="h-3 w-3 mr-1" />
                    Filter
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[520px]">
                  <DialogHeader>
                    <DialogTitle>Filter catches</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <div className="text-sm font-medium mb-1">Species</div>
                        <Input
                          value={filters.species}
                          onChange={(e) => setFilters((p) => ({ ...p, species: e.target.value }))}
                          placeholder="e.g. Walleye"
                        />
                      </div>
                      <div>
                        <div className="text-sm font-medium mb-1">Lake</div>
                        <Input
                          value={filters.lake}
                          onChange={(e) => setFilters((p) => ({ ...p, lake: e.target.value }))}
                          placeholder="e.g. Prior Lake"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant={filters.hasGps ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilters((p) => ({ ...p, hasGps: !p.hasGps }))}
                      >
                        Has GPS
                      </Button>
                      <Button
                        type="button"
                        variant={filters.hasPhoto ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilters((p) => ({ ...p, hasPhoto: !p.hasPhoto }))}
                      >
                        Has photo
                      </Button>
                      <Button
                        type="button"
                        variant={filters.last30Days ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilters((p) => ({ ...p, last30Days: !p.last30Days }))}
                      >
                        Last 30 days
                      </Button>
                    </div>

                    <div className="flex justify-between items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          setFilters({ species: "", lake: "", hasGps: false, hasPhoto: false, last30Days: false })
                        }
                      >
                        Clear
                      </Button>
                      <div className="text-sm text-gray-500">
                        Showing <span className="font-medium text-gray-700">{displayedCatches.length}</span>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              </div>
            </div>

            {(filters.species || filters.lake || filters.hasGps || filters.hasPhoto || filters.last30Days) && (
              <div className="flex flex-wrap gap-2">
                {filters.species ? (
                  <button
                    type="button"
                    className="text-xs px-2 py-1 rounded-full border border-gray-200 bg-gray-50 hover:bg-gray-100"
                    onClick={() => setFilters((p) => ({ ...p, species: "" }))}
                  >
                    Species: {filters.species} ✕
                  </button>
                ) : null}
                {filters.lake ? (
                  <button
                    type="button"
                    className="text-xs px-2 py-1 rounded-full border border-gray-200 bg-gray-50 hover:bg-gray-100"
                    onClick={() => setFilters((p) => ({ ...p, lake: "" }))}
                  >
                    Lake: {filters.lake} ✕
                  </button>
                ) : null}
                {filters.hasGps ? (
                  <button
                    type="button"
                    className="text-xs px-2 py-1 rounded-full border border-gray-200 bg-gray-50 hover:bg-gray-100"
                    onClick={() => setFilters((p) => ({ ...p, hasGps: false }))}
                  >
                    Has GPS ✕
                  </button>
                ) : null}
                {filters.hasPhoto ? (
                  <button
                    type="button"
                    className="text-xs px-2 py-1 rounded-full border border-gray-200 bg-gray-50 hover:bg-gray-100"
                    onClick={() => setFilters((p) => ({ ...p, hasPhoto: false }))}
                  >
                    Has photo ✕
                  </button>
                ) : null}
                {filters.last30Days ? (
                  <button
                    type="button"
                    className="text-xs px-2 py-1 rounded-full border border-gray-200 bg-gray-50 hover:bg-gray-100"
                    onClick={() => setFilters((p) => ({ ...p, last30Days: false }))}
                  >
                    Last 30 days ✕
                  </button>
                ) : null}
              </div>
            )}
            
            {isLoadingCatches ? (
              <div className="py-8 text-center">
                <i className="ri-loader-2-line text-2xl animate-spin text-gray-400"></i>
              </div>
            ) : displayedCatches.length > 0 ? (
              <div className="space-y-2">
                {displayedCatches.map(catchItem => (
                  (() => {
                    const la = Number(catchItem.latitude);
                    const ln = Number(catchItem.longitude);
                    const lakeName = String(catchItem.lakeName || "").trim();
                    const canSave = Boolean(lakeName) && Number.isFinite(la) && Number.isFinite(ln);
                    const key = canSave ? spotIdFromNameCoords(lakeName, la, ln) : "";
                    const saved = canSave ? isSpotSaved(key) : false;

                    return (
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

                      <div className="flex items-center gap-2">
                        {canSave ? (
                          <Button
                            type="button"
                            size="icon"
                            variant={saved ? "default" : "outline"}
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!canSave) return;
                              if (saved) {
                                removeSpot(key);
                                toast({ title: "Removed", description: "Removed from My Spots." });
                              } else {
                                saveSpot({ id: key, name: lakeName, latitude: la, longitude: ln });
                                toast({ title: "Saved", description: "Added to My Spots." });
                              }
                            }}
                            aria-label={saved ? "Unsave spot" : "Save spot"}
                          >
                            <Bookmark className="h-4 w-4" />
                          </Button>
                        ) : null}

                        {catchItem.lakeName && (
                          <Badge variant="outline" className="text-xs bg-primary/10 text-primary">
                            {catchItem.lakeName}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                    );
                  })()
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
