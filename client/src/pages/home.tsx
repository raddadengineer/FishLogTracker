import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import CatchCard from "@/components/catches/CatchCard";
import StatCard from "@/components/dashboard/StatCard";
import SpeciesChart from "@/components/dashboard/SpeciesChart";
import SpotChip from "@/components/maps/SpotChip";
import { Card, CardContent } from "@/components/ui/card";
import { Fish, MapPin, LineChart, ActivitySquare } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import CatchForm from "@/components/catches/CatchForm";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const { syncStatus, hasUnsyncedCatches, triggerSync } = useOfflineSync();
  const [timeframe, setTimeframe] = useState<'month' | 'year' | 'all'>('month');

  // Fetch recent catches
  const { data: recentCatches, isLoading: isLoadingCatches } = useQuery({
    queryKey: ['/api/catches'],
    enabled: true,
  });

  // Fetch user stats if authenticated
  const { data: userStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['/api/users', user?.id, 'stats'],
    enabled: isAuthenticated && !!user?.id,
  });

  // Fetch species breakdown if authenticated
  const { data: speciesBreakdown, isLoading: isLoadingSpecies } = useQuery({
    queryKey: ['/api/users', user?.id, 'species'],
    enabled: isAuthenticated && !!user?.id,
  });

  // Fetch popular lakes
  const { data: lakes, isLoading: isLoadingLakes } = useQuery({
    queryKey: ['/api/lakes'],
    enabled: true,
  });

  // Format species data for chart
  const formattedSpeciesData = speciesBreakdown && Array.isArray(speciesBreakdown) ? 
    speciesBreakdown.map((item: any) => ({
      species: item.species,
      count: Number(item.count),
      percentage: (Number(item.count) / (userStats?.totalCatches || 1)) * 100
    })) : [];

  // Format popular lakes for chips
  const popularLakes = lakes ? 
    lakes
      .slice(0, 4)  // Get top 4 lakes
      .map((lake, index) => ({
        ...lake,
        colorScheme: index === 0 ? 'primary' : 
                      index === 1 ? 'secondary' : 
                      index === 2 ? 'accent' : 'neutral'
      })) : [];

  return (
    <>
      {/* Welcome section */}
      <section className="mb-6">
        <h1 className="text-xl font-semibold">
          {isAuthenticated ? `Welcome, ${user?.username || 'Angler'}!` : 'Welcome to Fish Tracker!'}
        </h1>
        <p className="text-gray-500 text-sm">Track your catches and explore fishing spots</p>
      </section>

      {/* Quick actions */}
      <section className="mb-6">
        <div className="grid grid-cols-2 gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                className="flex flex-col items-center justify-center p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition duration-200 h-auto"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <i className="ri-add-line text-xl text-primary"></i>
                </div>
                <span className="text-sm font-medium">Log Catch</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Log a New Catch</DialogTitle>
              </DialogHeader>
              <CatchForm />
            </DialogContent>
          </Dialog>
          
          <Link href="/map">
            <Button 
              variant="outline" 
              className="flex flex-col items-center justify-center p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition duration-200 h-auto w-full"
            >
              <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center mb-2">
                <i className="ri-map-pin-line text-xl text-secondary"></i>
              </div>
              <span className="text-sm font-medium">Explore Map</span>
            </Button>
          </Link>
        </div>
      </section>

      {/* Sync notification for offline catches */}
      {hasUnsyncedCatches && (
        <section className="mb-6">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex justify-between items-center">
            <div className="flex items-center">
              <i className="ri-error-warning-line text-amber-500 mr-2"></i>
              <span className="text-sm">You have catches that need to be synced</span>
            </div>
            <Button 
              size="sm"
              onClick={triggerSync}
              disabled={syncStatus === 'offline' || syncStatus === 'syncing'}
            >
              {syncStatus === 'syncing' ? (
                <>
                  <i className="ri-loader-2-line animate-spin mr-1"></i>
                  Syncing...
                </>
              ) : (
                <>
                  <i className="ri-refresh-line mr-1"></i>
                  Sync Now
                </>
              )}
            </Button>
          </div>
        </section>
      )}

      {/* Recent catches section */}
      <section className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">Recent Catches</h2>
          <Link href="/catches">
            <a className="text-primary text-sm font-medium">View All</a>
          </Link>
        </div>
        
        {/* Catch cards */}
        <div className="space-y-4">
          {isLoadingCatches ? (
            // Skeleton loader for catches
            <>
              <div className="h-64 bg-gray-100 animate-pulse rounded-xl"></div>
              <div className="h-64 bg-gray-100 animate-pulse rounded-xl"></div>
            </>
          ) : recentCatches && recentCatches.length > 0 ? (
            recentCatches.slice(0, 2).map((catchItem: any) => (
              <CatchCard key={catchItem.id} catchData={catchItem} />
            ))
          ) : (
            <div className="bg-white rounded-xl shadow-sm p-6 text-center border border-gray-100">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <Fish className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium mb-2">No catches yet</h3>
              <p className="text-gray-500 text-sm mb-4">
                Log your first catch to see it appear here.
              </p>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <i className="ri-add-line mr-1"></i>
                    Log Your First Catch
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
          )}
        </div>
      </section>

      {/* Statistics section - show only for authenticated users */}
      {isAuthenticated && (
        <section className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold">Your Stats</h2>
            <select 
              className="text-sm border-none bg-transparent text-primary font-medium focus:outline-none focus:ring-0"
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as any)}
            >
              <option value="month">This Month</option>
              <option value="year">This Year</option>
              <option value="all">All Time</option>
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-4">
            <StatCard
              title="Total Catches"
              value={isLoadingStats ? "..." : userStats?.totalCatches || 0}
              icon={<Fish className="h-5 w-5 text-primary" />}
              change="+8 from last month"
              isPositive={true}
            />
            
            <StatCard
              title="Species Caught"
              value={isLoadingStats ? "..." : userStats?.uniqueSpecies || 0}
              icon={<ActivitySquare className="h-5 w-5 text-secondary" />}
              iconBgClass="bg-secondary/10"
              change="+2 from last month"
              isPositive={true}
            />
          </div>

          {/* Top species chart */}
          <SpeciesChart 
            title="Top Species" 
            data={isLoadingSpecies ? [] : formattedSpeciesData} 
          />
        </section>
      )}

      {/* Popular fishing spots */}
      <section className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">Popular Spots</h2>
          <Link href="/map">
            <a className="text-primary text-sm font-medium">View Map</a>
          </Link>
        </div>
        
        <Card className="rounded-xl overflow-hidden shadow-sm border border-gray-100 bg-white">
          <div className="h-48 bg-gray-100 relative">
            {isLoadingLakes ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <i className="ri-loader-2-line text-2xl animate-spin text-gray-400"></i>
              </div>
            ) : (
              <>
                <iframe 
                  src="https://www.openstreetmap.org/export/embed.html?bbox=-97.29492187500001%2C38.272688535980976%2C-92.28515625000001%2C40.97989806962013&amp;layer=mapnik" 
                  style={{ width: '100%', height: '100%', border: 'none' }}
                ></iframe>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Link href="/map">
                    <Button className="bg-white/90 backdrop-blur-sm rounded-full py-2 px-4 text-sm font-medium text-primary shadow-md">
                      <i className="ri-map-2-line mr-1"></i>
                      Open Interactive Map
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </div>
          <CardContent className="p-1 overflow-x-auto no-scrollbar">
            <div className="flex space-x-2 p-2">
              {isLoadingLakes ? (
                // Skeleton loader for lake chips
                <>
                  <div className="h-8 w-32 bg-gray-100 animate-pulse rounded-full"></div>
                  <div className="h-8 w-28 bg-gray-100 animate-pulse rounded-full"></div>
                  <div className="h-8 w-36 bg-gray-100 animate-pulse rounded-full"></div>
                </>
              ) : popularLakes && popularLakes.length > 0 ? (
                popularLakes.map((lake: any, index: number) => (
                  <SpotChip
                    key={lake.id}
                    name={lake.name}
                    catchCount={lake.catchCount || 0}
                    colorScheme={lake.colorScheme}
                    onClick={() => {
                      // Navigate to map centered on this lake
                      window.location.href = `/map?lat=${lake.latitude}&lng=${lake.longitude}`;
                    }}
                  />
                ))
              ) : (
                <div className="p-2 text-gray-500 text-sm">No popular spots yet</div>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
