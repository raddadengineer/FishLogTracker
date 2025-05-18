import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
import StaticLeaderboard from "@/components/StaticLeaderboard";

export default function LeaderboardPage() {
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'year' | 'all'>('all');
  const [lakeId, setLakeId] = useState<string>('global'); // 'global' or a lake ID
  const [criteria, setCriteria] = useState<'catches' | 'species' | 'size'>('catches');

  // Fetch lakes for filtering
  const { data: lakes = [], isLoading: isLoadingLakes } = useQuery({
    queryKey: ['/api/lakes'],
    enabled: true,
  });

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
            <i className="ri-fish-line text-sm mr-1"></i>
            Most Catches
          </TabsTrigger>
          <TabsTrigger value="species" className="flex items-center justify-center">
            <i className="ri-apps-line text-sm mr-1"></i>
            Most Species
          </TabsTrigger>
          <TabsTrigger value="size" className="flex items-center justify-center">
            <i className="ri-scales-3-line text-sm mr-1"></i>
            Largest Catch
          </TabsTrigger>
        </TabsList>

        {/* Tab content - use the StaticLeaderboard component for all tabs */}
        <TabsContent value={criteria} className="space-y-4">
          <StaticLeaderboard criteria={criteria} />
        </TabsContent>
      </Tabs>
    </>
  );
}
