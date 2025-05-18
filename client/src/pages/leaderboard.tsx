import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Trophy, Fish, Medal, Scale, MapPin } from "lucide-react";
import { formatDate, formatSize, formatWeight } from "@/lib/utils";

export default function LeaderboardPage() {
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'year' | 'all'>('all');
  const [lakeId, setLakeId] = useState<string>('global'); // 'global' or a lake ID
  const [criteria, setCriteria] = useState<'catches' | 'species' | 'size'>('catches');

  // Fetch lakes for filtering
  const { data: lakes = [], isLoading: isLoadingLakes } = useQuery({
    queryKey: ['/api/lakes'],
    enabled: true,
  });

  // Fetch appropriate leaderboard based on criteria and filters
  const { data: leaderboard = [], isLoading: isLoadingLeaderboard } = useQuery({
    queryKey: [
      lakeId === 'global' 
        ? '/api/leaderboard' 
        : `/api/lakes/${lakeId}/leaderboard`,
      { criteria, timeframe }
    ],
    // Use axios with the queryClient's apiRequest function
    queryFn: async ({ queryKey }) => {
      try {
        // Manually build URL with parameters to bypass the default fetch logic
        const baseUrl = queryKey[0] as string;
        const params = new URLSearchParams();
        params.append('criteria', criteria);
        if (timeframe !== 'all') {
          params.append('timeframe', timeframe);
        }
        
        // Direct API fetch that bypasses the client-side routing
        const fullUrl = `${window.location.origin}${baseUrl}?${params.toString()}`;
        console.log(`Fetching leaderboard from: ${fullUrl}`);
        
        const response = await fetch(fullUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch leaderboard: ${response.status}`);
        }
        
        const text = await response.text();
        try {
          // Safely parse the response
          const data = JSON.parse(text);
          console.log('Leaderboard data received:', data);
          return Array.isArray(data) ? data : [];
        } catch (parseError) {
          console.error('Error parsing response:', text.substring(0, 200) + '...');
          return [];
        }
      } catch (error) {
        console.error('Error in leaderboard fetch:', error);
        return [];
      }
    },
    retry: 1,
    enabled: true,
  });

  // Determine what icon to show for each rank
  const getRankIcon = (rank: number) => {
    if (rank === 0) return <Trophy className="h-5 w-5 text-amber-500" />;
    if (rank === 1) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-amber-700" />;
    return <span className="text-gray-500 font-bold">{rank + 1}</span>;
  };

  // Show different icons for different leaderboard types
  const getCriteriaIcon = () => {
    switch (criteria) {
      case 'catches':
        return <Fish className="h-5 w-5" />;
      case 'species':
        return <i className="ri-apps-line text-lg"></i>;
      case 'size':
        return <Scale className="h-5 w-5" />;
      default:
        return <Trophy className="h-5 w-5" />;
    }
  };

  // Format the achievement text based on criteria
  const getAchievementText = (item: any) => {
    switch (criteria) {
      case 'catches':
        return `${item.count} ${item.count === 1 ? 'catch' : 'catches'}`;
      case 'species':
        return `${item.count} ${item.count === 1 ? 'species' : 'species'}`;
      case 'size':
        return `${item.species}: ${formatSize(item.size)}${item.weight ? ` • ${formatWeight(item.weight)}` : ''}`;
      default:
        return '';
    }
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">Leaderboards</h1>
        <div className="flex gap-2">
          <Link href="/map">
            <Button variant="outline" size="sm">
              <MapPin className="h-4 w-4 mr-1" />
              View Map
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <section className="mb-6">
        <Card className="bg-white shadow-sm border border-gray-100">
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block text-gray-700">Location</label>
                <Select
                  value={lakeId}
                  onValueChange={setLakeId}
                  disabled={isLoadingLakes}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global</SelectItem>
                    {lakes.map((lake: any) => (
                      <SelectItem key={lake.id} value={lake.id.toString()}>
                        {lake.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block text-gray-700">Time Period</label>
                <Select
                  value={timeframe}
                  onValueChange={(value) => setTimeframe(value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select time period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="year">This Year</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Leaderboard tabs */}
      <Tabs 
        defaultValue="catches" 
        value={criteria}
        onValueChange={(value) => setCriteria(value as any)}
        className="space-y-4"
      >
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="catches" className="flex items-center justify-center">
            <Fish className="h-4 w-4 mr-1" />
            Most Catches
          </TabsTrigger>
          <TabsTrigger value="species" className="flex items-center justify-center">
            <i className="ri-apps-line mr-1"></i>
            Most Species
          </TabsTrigger>
          <TabsTrigger value="size" className="flex items-center justify-center">
            <Scale className="h-4 w-4 mr-1" />
            Largest Catch
          </TabsTrigger>
        </TabsList>

        {/* Tab content - shared for all tabs with dynamic content */}
        <TabsContent value={criteria} className="space-y-4">
          <Card className="bg-white shadow-sm border border-gray-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-md font-medium flex items-center">
                {getCriteriaIcon()}
                <span className="ml-2">
                  {criteria === 'catches' && 'Most Catches'}
                  {criteria === 'species' && 'Most Species Variety'}
                  {criteria === 'size' && 'Largest Catches'}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoadingLeaderboard ? (
                <div className="py-8 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
                  <p className="text-gray-500">Loading leaderboard...</p>
                </div>
              ) : leaderboard.length > 0 ? (
                <div className="space-y-3">
                  {leaderboard.map((item: any, index: number) => (
                    <Link key={index} href={`/profile/${item.id}`}>
                      <div className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-center w-8 mr-3">
                          {getRankIcon(index)}
                        </div>
                        
                        <Avatar className="h-10 w-10 mr-3">
                          <AvatarImage src={item.profileImageUrl} />
                          <AvatarFallback>{item.username?.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1">
                          <p className="font-medium">{item.username}</p>
                          <p className="text-sm text-gray-500">
                            {getAchievementText(item)}
                            {criteria === 'size' && item.catchDate && (
                              <span className="ml-2 text-xs">
                                {formatDate(item.catchDate)}
                              </span>
                            )}
                          </p>
                        </div>
                        
                        {index === 0 && (
                          <Badge className="bg-amber-50 text-amber-600 border-amber-200">
                            <Trophy className="h-4 w-4 mr-1" />
                            Top Angler
                          </Badge>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <Trophy className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No data available for this leaderboard yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
