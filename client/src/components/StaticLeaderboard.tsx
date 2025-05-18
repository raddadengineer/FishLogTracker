import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trophy, Fish, Medal, Scale } from "lucide-react";
import { formatDate, formatSize, formatWeight } from "@/lib/utils";
import { getFishSpeciesById } from '@/lib/fishSpecies';
import { Link } from "wouter";

type LeaderboardEntry = {
  id: string;
  username: string;
  profileImageUrl: string | null;
  count?: number;
  species?: string;
  size?: string;
  weight?: number;
  catchDate?: string;
};

type StaticLeaderboardProps = {
  criteria: 'catches' | 'species' | 'size';
};

export default function StaticLeaderboard({ criteria }: StaticLeaderboardProps) {
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboardData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Use a direct fetch to get appropriate data
        const res = await fetch('/api/catches');
        
        if (!res.ok) {
          throw new Error('Failed to fetch catch data');
        }
        
        const catchesData = await res.json();
        
        if (!Array.isArray(catchesData) || catchesData.length === 0) {
          setData([]);
          setLoading(false);
          return;
        }
        
        // Group data by user first so we can calculate
        const userMap = new Map();
        const speciesMap = new Map();
        let largestCatches: any[] = [];
        
        // Process catches for each criteria
        catchesData.forEach((catchItem: any) => {
          const userId = catchItem.userId;
          const username = catchItem.user?.username || 'Unknown User';
          const profileImageUrl = catchItem.user?.profileImageUrl || null;
          const species = catchItem.species;
          const size = parseFloat(catchItem.size) || 0;
          
          // For total catches count
          if (!userMap.has(userId)) {
            userMap.set(userId, { 
              id: userId, 
              username, 
              profileImageUrl, 
              count: 0,
              catches: []
            });
          }
          
          const userData = userMap.get(userId);
          userData.count += 1;
          userData.catches.push(catchItem);
          userMap.set(userId, userData);
          
          // For unique species count
          if (!speciesMap.has(userId)) {
            speciesMap.set(userId, { 
              id: userId, 
              username, 
              profileImageUrl, 
              speciesList: new Set(),
              count: 0 
            });
          }
          
          const userSpeciesData = speciesMap.get(userId);
          userSpeciesData.speciesList.add(species);
          userSpeciesData.count = userSpeciesData.speciesList.size;
          speciesMap.set(userId, userSpeciesData);
          
          // For largest catches
          if (size > 0) {
            largestCatches.push({
              id: userId,
              username,
              profileImageUrl,
              species,
              size,
              weight: catchItem.weight,
              catchDate: catchItem.catchDate
            });
          }
        });
        
        // Prepare results based on criteria
        let leaderboardData: LeaderboardEntry[] = [];
        
        if (criteria === 'catches') {
          leaderboardData = Array.from(userMap.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        } else if (criteria === 'species') {
          leaderboardData = Array.from(speciesMap.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        } else if (criteria === 'size') {
          leaderboardData = largestCatches
            .sort((a, b) => b.size - a.size)
            .slice(0, 10);
        }
        
        setData(leaderboardData);
      } catch (err) {
        console.error('Error getting leaderboard data:', err);
        setError('Failed to load leaderboard data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchLeaderboardData();
  }, [criteria]);

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
  const getAchievementText = (item: LeaderboardEntry) => {
    switch (criteria) {
      case 'catches':
        return `${item.count} ${item.count === 1 ? 'catch' : 'catches'}`;
      case 'species':
        return `${item.count} ${item.count === 1 ? 'species' : 'species'}`;
      case 'size':
        const speciesName = item.species ? getFishSpeciesById(item.species).name : 'Unknown';
        const sizeText = item.size ? formatSize(parseFloat(item.size as string)) : '';
        const weightText = item.weight ? ` • ${formatWeight(item.weight)}` : '';
        return `${speciesName}: ${sizeText}${weightText}`;
      default:
        return '';
    }
  };

  return (
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
        {loading ? (
          <div className="py-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-gray-500">Loading leaderboard...</p>
          </div>
        ) : error ? (
          <div className="py-8 text-center">
            <p className="text-red-500">{error}</p>
          </div>
        ) : data.length > 0 ? (
          <div className="space-y-3">
            {data.map((item: LeaderboardEntry, index: number) => (
              <Link key={index} href={`/profile/${item.id}`}>
                <div className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-center w-8 mr-3">
                    {getRankIcon(index)}
                  </div>
                  
                  <Avatar className="h-10 w-10 mr-3">
                    <AvatarImage src={item.profileImageUrl || undefined} />
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
  );
}