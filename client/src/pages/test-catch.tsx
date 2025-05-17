import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatDate, formatSize, formatWeight } from '@/lib/utils';

export default function TestCatchPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [catches, setCatches] = useState<any[]>([]);
  const [isLoadingCatches, setIsLoadingCatches] = useState(false);
  
  // Fetch all catches without requiring authentication
  const fetchAllCatches = async () => {
    try {
      setIsLoadingCatches(true);
      const response = await fetch('/api/public-catches/all');
      if (response.ok) {
        const data = await response.json();
        setCatches(data);
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch catches",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error fetching catches:", error);
    } finally {
      setIsLoadingCatches(false);
    }
  };
  
  // Fetch catches on component mount
  useEffect(() => {
    fetchAllCatches();
  }, []);
  
  const submitTestCatch = async () => {
    try {
      setIsLoading(true);
      
      // Create test data for a catch - add a random element to make each test unique
      const testCatchData = {
        species: "Largemouth Bass",
        size: (18 + Math.random() * 5).toFixed(1), // Random size between 18-23 inches
        weight: (4 + Math.random() * 2).toFixed(1), // Random weight between 4-6 pounds
        lakeName: "Test Lake",
        latitude: 42.3601,
        longitude: -71.0589,
        lure: "Plastic Worm",
        comments: `Test catch created at ${new Date().toLocaleTimeString()}`,
      };
      
      // Send to our direct catch API
      const response = await fetch('/api/direct-catch/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testCatchData)
      });
      
      const data = await response.json();
      
      setResult(data);
      
      if (response.ok) {
        toast({
          title: "Success!",
          description: "Test catch created successfully",
        });
        
        // Refresh the catches list to show the new catch
        await fetchAllCatches();
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to create test catch",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Test catch error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="container py-10 max-w-3xl mx-auto space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Test Catch Creation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p>
              This page creates a test fish catch record using the direct API.
              Click the button below to create a test catch without requiring authentication.
            </p>
            
            <Button 
              onClick={submitTestCatch}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? "Creating..." : "Create Test Catch"}
            </Button>
            
            {result && (
              <div className="mt-6 p-4 bg-muted rounded-md">
                <Label>API Response:</Label>
                <pre className="mt-2 text-xs overflow-auto max-h-60">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Recent Catches</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingCatches ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary rounded-full border-t-transparent"></div>
            </div>
          ) : catches.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              No catches found. Create one using the form above.
            </div>
          ) : (
            <div className="space-y-4">
              <p>Found {catches.length} catches in the database:</p>
              
              <div className="grid gap-4">
                {catches.map((catchItem) => (
                  <div key={catchItem.id} className="border rounded-lg p-4 hover:bg-muted transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-medium text-lg">{catchItem.species}</h3>
                        <div className="text-sm text-muted-foreground">
                          {catchItem.lakeName ? catchItem.lakeName : 'Unknown location'} • 
                          {catchItem.catchDate ? formatDate(catchItem.catchDate) : 'Unknown date'}
                        </div>
                      </div>
                      <Badge>{catchItem.isVerified ? 'Verified' : 'Unverified'}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Size:</span> {formatSize(parseFloat(catchItem.size))}
                      </div>
                      {catchItem.weight && (
                        <div>
                          <span className="text-muted-foreground">Weight:</span> {formatWeight(parseFloat(catchItem.weight))}
                        </div>
                      )}
                      {catchItem.lure && (
                        <div>
                          <span className="text-muted-foreground">Lure:</span> {catchItem.lure}
                        </div>
                      )}
                    </div>
                    {catchItem.comments && (
                      <div className="mt-3 text-sm">
                        <span className="text-muted-foreground">Comments:</span> {catchItem.comments}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="flex justify-center mt-4">
                <Button 
                  variant="outline" 
                  onClick={fetchAllCatches}
                  disabled={isLoadingCatches}
                >
                  Refresh Catches
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}