import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import CatchCard from "@/components/catches/CatchCard";
import StatCard from "@/components/dashboard/StatCard";
import SpeciesChart from "@/components/dashboard/SpeciesChart";
import { useToast } from "@/hooks/use-toast";
import { Check, Edit, Fish, Map, Award, Users, Settings, Calendar, Plus, UserPlus, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import CatchForm from "@/components/catches/CatchForm";

export default function ProfilePage() {
  const params = useParams();
  const [_, navigate] = useLocation();
  const { user: currentUser, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const userId = params.id || currentUser?.id;
  const isOwnProfile = currentUser?.id === userId;
  const [following, setFollowing] = useState(false);
  const [isLoadingFollow, setIsLoadingFollow] = useState(false);

  // Fetch user profile
  const { data: user, isLoading: isLoadingUser } = useQuery({
    queryKey: ['/api/users', userId],
    enabled: !!userId,
  });

  // Fetch user's catches
  const { data: catches, isLoading: isLoadingCatches } = useQuery({
    queryKey: ['/api/users', userId, 'catches'],
    enabled: !!userId,
  });

  // Fetch user stats
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['/api/users', userId, 'stats'],
    enabled: !!userId,
  });

  // Fetch species breakdown
  const { data: speciesBreakdown, isLoading: isLoadingSpecies } = useQuery({
    queryKey: ['/api/users', userId, 'species'],
    enabled: !!userId,
  });

  // Fetch following status if looking at someone else's profile
  const { data: followStatus, isLoading: isLoadingFollowStatus } = useQuery({
    queryKey: ['/api/users', userId, 'is-following'],
    enabled: isAuthenticated && !!userId && !isOwnProfile,
  });

  // Set initial following state from API response
  useState(() => {
    if (followStatus && !isLoadingFollowStatus) {
      setFollowing(followStatus.isFollowing);
    }
  });

  // Format data for species chart
  const formattedSpeciesData = speciesBreakdown ? 
    speciesBreakdown.map((item: any) => ({
      species: item.species,
      count: item.count,
      percentage: (item.count / (stats?.totalCatches || 1)) * 100
    })) : [];

  // Handle follow/unfollow action
  const handleFollowAction = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to follow other users",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingFollow(true);
    
    try {
      if (following) {
        // Unfollow
        await apiRequest('DELETE', `/api/users/${userId}/follow`, null);
        setFollowing(false);
        toast({
          title: "Unfollowed",
          description: `You are no longer following ${user.username}.`,
        });
      } else {
        // Follow
        await apiRequest('POST', `/api/users/${userId}/follow`, null);
        setFollowing(true);
        toast({
          title: "Following",
          description: `You are now following ${user.username}.`,
        });
      }
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['/api/users', userId, 'followers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users', userId, 'is-following'] });
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update follow status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingFollow(false);
    }
  };

  if (isLoadingUser) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-gray-500">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Users className="h-8 w-8 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium mb-1">User Not Found</h3>
          <p className="text-gray-500 mb-4">This user profile doesn't exist or has been removed.</p>
          <Button onClick={() => navigate('/')}>
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Profile header */}
      <section className="mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user.profileImageUrl} alt={user.username} />
              <AvatarFallback className="text-xl">{user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-xl font-semibold">{user.username}</h1>
              
              <div className="mt-1 flex items-center justify-center sm:justify-start space-x-3 text-gray-500 text-sm">
                <span className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  Joined {new Date(user.createdAt).toLocaleDateString()}
                </span>
                
                {user.role !== 'user' && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
                    <Check className="h-3 w-3 mr-1" />
                    {user.role === 'admin' ? 'Admin' : 'Moderator'}
                  </Badge>
                )}
              </div>
              
              {user.bio && (
                <p className="mt-2 text-gray-600 text-sm">{user.bio}</p>
              )}
            </div>
            
            <div className="sm:self-start">
              {isOwnProfile ? (
                <Button variant="outline" onClick={() => navigate('/settings')}>
                  <Settings className="h-4 w-4 mr-1" />
                  Edit Profile
                </Button>
              ) : (
                <Button
                  variant={following ? "outline" : "default"}
                  onClick={handleFollowAction}
                  disabled={isLoadingFollow}
                  className={following ? "border-primary text-primary" : ""}
                >
                  {isLoadingFollow ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    following ? (
                      <Check className="h-4 w-4 mr-1" />
                    ) : (
                      <UserPlus className="h-4 w-4 mr-1" />
                    )
                  )}
                  {following ? "Following" : "Follow"}
                </Button>
              )}
            </div>
          </div>
          
          <Separator className="my-4" />
          
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xl font-semibold">{isLoadingStats ? "..." : stats?.totalCatches || 0}</div>
              <div className="text-sm text-gray-500">Catches</div>
            </div>
            <div>
              <div className="text-xl font-semibold">{isLoadingStats ? "..." : stats?.uniqueSpecies || 0}</div>
              <div className="text-sm text-gray-500">Species</div>
            </div>
            <div>
              <div className="text-xl font-semibold">{isLoadingStats ? "..." : stats?.totalLikes || 0}</div>
              <div className="text-sm text-gray-500">Likes</div>
            </div>
          </div>
          
          {isOwnProfile && (
            <div className="mt-4">
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="w-full">
                    <Plus className="h-4 w-4 mr-1" />
                    Log New Catch
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

      {/* Profile content */}
      <section>
        <Tabs defaultValue="catches">
          <TabsList className="w-full">
            <TabsTrigger value="catches" className="flex-1 flex items-center justify-center">
              <Fish className="h-4 w-4 mr-1" />
              Catches
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex-1 flex items-center justify-center">
              <Award className="h-4 w-4 mr-1" />
              Stats
            </TabsTrigger>
            <TabsTrigger value="spots" className="flex-1 flex items-center justify-center">
              <Map className="h-4 w-4 mr-1" />
              Spots
            </TabsTrigger>
          </TabsList>
          
          {/* Catches tab */}
          <TabsContent value="catches" className="pt-4">
            {isLoadingCatches ? (
              <div className="py-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
                <p className="text-gray-500">Loading catches...</p>
              </div>
            ) : catches && catches.length > 0 ? (
              <div className="space-y-4">
                {catches.map((catchItem: any) => (
                  <CatchCard key={catchItem.id} catchData={catchItem} />
                ))}
              </div>
            ) : (
              <Card className="text-center py-8">
                <CardContent>
                  <Fish className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-lg font-medium mb-1">No Catches Yet</h3>
                  <p className="text-gray-500 mb-4">
                    {isOwnProfile ? "You haven't logged any catches yet." : `${user.username} hasn't logged any catches yet.`}
                  </p>
                  
                  {isOwnProfile && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-1" />
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
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          {/* Stats tab */}
          <TabsContent value="stats" className="pt-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <StatCard
                title="Total Catches"
                value={isLoadingStats ? "..." : stats?.totalCatches || 0}
                icon={<Fish className="h-5 w-5 text-primary" />}
              />
              
              <StatCard
                title="Species Variety"
                value={isLoadingStats ? "..." : stats?.uniqueSpecies || 0}
                icon={<i className="ri-apps-line text-secondary"></i>}
                iconBgClass="bg-secondary/10"
              />
            </div>
            
            {stats?.largestCatch && (
              <Card className="mb-4 bg-white shadow-sm border border-gray-100">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Largest Catch</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{stats.largestCatch.species}</p>
                      <div className="flex items-center text-gray-500 text-sm">
                        <span className="mr-3">{stats.largestCatch.size} inches</span>
                        {stats.largestCatch.weight && (
                          <span>{stats.largestCatch.weight} lbs</span>
                        )}
                      </div>
                    </div>
                    <Badge className="bg-primary/10 text-primary">
                      <Trophy className="h-3 w-3 mr-1" />
                      Personal Best
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}
            
            <SpeciesChart 
              title="Species Breakdown" 
              data={isLoadingSpecies ? [] : formattedSpeciesData} 
            />
          </TabsContent>
          
          {/* Spots tab */}
          <TabsContent value="spots" className="pt-4">
            <Card className="bg-white shadow-sm border border-gray-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Favorite Spots</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingCatches ? (
                  <div className="py-4 text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Loading spots...</p>
                  </div>
                ) : catches && catches.length > 0 ? (
                  <>
                    <div className="h-48 bg-gray-100 mb-3 rounded-md relative overflow-hidden">
                      <iframe 
                        src="https://www.openstreetmap.org/export/embed.html?bbox=-97.29492187500001%2C38.272688535980976%2C-92.28515625000001%2C40.97989806962013&amp;layer=mapnik" 
                        style={{ width: '100%', height: '100%', border: 'none' }}
                      ></iframe>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Button 
                          variant="secondary" 
                          className="bg-white/90 backdrop-blur-sm shadow"
                          onClick={() => navigate('/map')}
                        >
                          <Map className="h-4 w-4 mr-1" />
                          View Full Map
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {Array.from(new Set(catches.map((c: any) => c.lakeName)))
                        .filter(Boolean)
                        .map((lake: string, index: number) => {
                          const count = catches.filter((c: any) => c.lakeName === lake).length;
                          return (
                            <Badge 
                              key={lake} 
                              variant="outline" 
                              className="px-3 py-1 bg-gray-50"
                            >
                              <i className="ri-map-pin-line mr-1 text-primary"></i>
                              {lake} ({count})
                            </Badge>
                          );
                        })
                      }
                    </div>
                  </>
                ) : (
                  <div className="py-6 text-center">
                    <Map className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">No fishing spots recorded yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </section>
    </>
  );
}
