import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function TestCatchPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  const submitTestCatch = async () => {
    try {
      setIsLoading(true);
      
      // Create simple test data for a catch
      const testCatchData = {
        species: "Largemouth Bass",
        size: "18.5",
        weight: "4.2",
        lakeName: "Test Lake",
        latitude: 42.3601,
        longitude: -71.0589,
        lure: "Plastic Worm",
        comments: "Test catch from direct API",
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
    <div className="container py-10 max-w-3xl mx-auto">
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
    </div>
  );
}