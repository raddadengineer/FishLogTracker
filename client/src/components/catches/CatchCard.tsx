import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, MessageSquare, Check, MapPin, Ruler, Scale, Thermometer, Cloud } from "lucide-react";
import { timeAgo, formatSize, formatWeight, formatTemperature } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CatchCardProps {
  catchData: {
    id: number;
    species: string;
    size: number;
    weight?: number;
    lakeName?: string;
    latitude?: number;
    longitude?: number;
    temperature?: number;
    photos?: string[];
    comments?: string;
    catchDate: string;
    createdAt: string;
    isVerified?: boolean;
    weatherData?: any;
    userId?: string;
    user?: {
      id: string;
      username: string;
      firstName?: string;
      lastName?: string;
      profileImageUrl?: string;
    };
    likesCount?: number;
    commentsCount?: number;
    isLiked?: boolean;
  };
}

export default function CatchCard({ catchData }: CatchCardProps) {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [isLiked, setIsLiked] = useState(catchData.isLiked || false);
  const [likesCount, setLikesCount] = useState(catchData.likesCount || 0);

  const handleLike = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to like catches",
        variant: "destructive",
      });
      return;
    }

    try {
      const method = isLiked ? 'DELETE' : 'POST';
      const response = await apiRequest(
        method,
        `/api/catches/${catchData.id}/like`,
        null
      );
      
      const data = await response.json();
      setIsLiked(data.liked);
      setLikesCount(data.likes);
      
      // Invalidate queries that might contain this catch
      queryClient.invalidateQueries({ queryKey: ['/api/catches'] });
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update like status",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
      <CardHeader className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <Link href={`/profile/${catchData.user?.id || catchData.userId}`}>
            <a className="flex items-center space-x-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={catchData.user?.profileImageUrl} alt={catchData.user?.username || 'User'} />
                <AvatarFallback>{(catchData.user?.username || 'User').substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">
                  {catchData.user?.firstName && catchData.user?.lastName 
                    ? `${catchData.user.firstName} ${catchData.user.lastName}`
                    : catchData.user?.username || (catchData.userId ? `User-${catchData.userId.substring(0, 4)}` : 'Anonymous')}
                </p>
                <p className="text-xs text-gray-500">{timeAgo(catchData.createdAt)}</p>
              </div>
            </a>
          </Link>
          
          {catchData.lakeName && (
            <Badge variant="outline" className="flex items-center space-x-1 bg-primary/10 text-primary">
              <MapPin className="h-3 w-3" />
              <span>{catchData.lakeName}</span>
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <div className="relative">
        {catchData.photos && catchData.photos.length > 0 ? (
          <img 
            src={catchData.photos[0]} 
            alt={`${catchData.species} catch`} 
            className="w-full h-48 object-cover"
          />
        ) : (
          <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
            <span className="text-gray-400">No photo</span>
          </div>
        )}
        
        <div className="absolute bottom-0 left-0 right-0 px-4 py-2 bg-gradient-to-t from-black/70 to-transparent">
          <div className="flex justify-between items-end">
            <div>
              <h3 className="text-white font-semibold">{catchData.species}</h3>
              <div className="flex items-center space-x-2">
                <div className="flex items-center">
                  <Ruler className="text-white/80 h-3 w-3 mr-1" />
                  <span className="text-white/80 text-xs">{formatSize(catchData.size)}</span>
                </div>
                {catchData.weight && (
                  <div className="flex items-center">
                    <Scale className="text-white/80 h-3 w-3 mr-1" />
                    <span className="text-white/80 text-xs">{formatWeight(catchData.weight)}</span>
                  </div>
                )}
              </div>
            </div>
            
            {catchData.isVerified && (
              <Badge variant="secondary" className="bg-secondary/90 text-white text-xs">
                <Check className="h-3 w-3 mr-1" /> Verified
              </Badge>
            )}
          </div>
        </div>
      </div>
      
      <CardContent className="p-4">
        {catchData.comments && (
          <p className="text-sm text-gray-600 mb-3">{catchData.comments}</p>
        )}
        
        <div className="flex justify-between items-center">
          <div className="flex space-x-4">
            <Button 
              variant="ghost" 
              size="sm" 
              className={`flex items-center ${isLiked ? 'text-primary' : 'text-gray-500 hover:text-primary'}`}
              onClick={handleLike}
            >
              <Heart className={`h-4 w-4 mr-1 ${isLiked ? 'fill-current' : ''}`} />
              <span className="text-xs">{likesCount}</span>
            </Button>
            
            <Link href={`/catches/${catchData.id}`}>
              <Button variant="ghost" size="sm" className="flex items-center text-gray-500 hover:text-primary">
                <MessageSquare className="h-4 w-4 mr-1" />
                <span className="text-xs">{catchData.commentsCount || 0}</span>
              </Button>
            </Link>
          </div>
          
          <div className="flex items-center space-x-1">
            {catchData.temperature && (
              <>
                <Thermometer className="h-3 w-3 text-gray-500" />
                <span className="text-xs text-gray-500">{formatTemperature(catchData.temperature)}</span>
              </>
            )}
            
            {catchData.weatherData?.weather && (
              <>
                <Cloud className="h-3 w-3 text-gray-500 ml-2" />
                <span className="text-xs text-gray-500">{catchData.weatherData.weather}</span>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
