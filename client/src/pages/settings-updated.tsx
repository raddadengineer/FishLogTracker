import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import { useSettings } from "@/hooks/useSettings";

export default function SettingsPage() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { settings, updateSetting, saveSettings } = useSettings();
  
  // Save settings with toast notification
  const handleSaveSettings = () => {
    saveSettings();
    
    toast({
      title: "Settings saved",
      description: "Your preferences have been updated",
    });
  };
  
  return (
    <div className="container mx-auto py-6 max-w-3xl">
      <h1 className="text-2xl font-semibold mb-6">Settings</h1>
      
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
        </TabsList>
        
        {/* General Settings */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Customize your fishing experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <Label htmlFor="darkMode" className="font-medium">Dark Mode</Label>
                  <p className="text-sm text-gray-500">Switch to dark theme</p>
                </div>
                <Switch 
                  id="darkMode" 
                  checked={settings.darkMode} 
                  onCheckedChange={(checked) => updateSetting('darkMode', checked)} 
                />
              </div>
              
              <div className="flex justify-between items-center">
                <div>
                  <Label htmlFor="useMetric" className="font-medium">Use Metric System</Label>
                  <p className="text-sm text-gray-500">Display measurements in metric units</p>
                </div>
                <Switch 
                  id="useMetric" 
                  checked={settings.useMetric} 
                  onCheckedChange={(checked) => updateSetting('useMetric', checked)} 
                />
              </div>
              
              <div className="flex justify-between items-center">
                <div>
                  <Label htmlFor="enableNotifications" className="font-medium">Notifications</Label>
                  <p className="text-sm text-gray-500">Receive reminders and updates</p>
                </div>
                <Switch 
                  id="enableNotifications" 
                  checked={settings.enableNotifications} 
                  onCheckedChange={(checked) => updateSetting('enableNotifications', checked)} 
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveSettings}>Save Changes</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Account Settings */}
        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Manage your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isAuthenticated ? (
                <>
                  <div>
                    <Label htmlFor="username" className="font-medium">Username</Label>
                    <Input id="username" value={user?.username || ""} readOnly className="mt-1" />
                  </div>
                  
                  <div>
                    <Label htmlFor="email" className="font-medium">Email</Label>
                    <Input id="email" value={user?.email || ""} readOnly className="mt-1" />
                  </div>
                  
                  <Link href="/edit-profile">
                    <Button variant="outline" className="mt-2">Edit Profile</Button>
                  </Link>
                </>
              ) : (
                <div className="text-center py-8">
                  <h3 className="text-lg font-medium mb-2">Not Logged In</h3>
                  <p className="text-gray-500 mb-4">You need to be logged in to access account settings</p>
                  <Link href="/login">
                    <Button>Log In</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Privacy Settings */}
        <TabsContent value="privacy">
          <Card>
            <CardHeader>
              <CardTitle>Privacy Settings</CardTitle>
              <CardDescription>Control your data and privacy</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <Label htmlFor="dataSync" className="font-medium">Data Synchronization</Label>
                  <p className="text-sm text-gray-500">Sync your catches to the cloud</p>
                </div>
                <Switch 
                  id="dataSync" 
                  checked={settings.dataSync} 
                  onCheckedChange={(checked) => updateSetting('dataSync', checked)} 
                />
              </div>
              
              <div className="flex justify-between items-center">
                <div>
                  <Label htmlFor="showLocation" className="font-medium">Share Location</Label>
                  <p className="text-sm text-gray-500">Show your fishing spots on the map</p>
                </div>
                <Switch 
                  id="showLocation" 
                  checked={settings.showLocation} 
                  onCheckedChange={(checked) => updateSetting('showLocation', checked)} 
                />
              </div>
              
              <div className="pt-4">
                <Button variant="destructive" size="sm">
                  Delete Account
                </Button>
                <p className="text-xs text-gray-500 mt-1">
                  This action is permanent and cannot be undone.
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveSettings}>Save Changes</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* About */}
        <TabsContent value="about">
          <Card>
            <CardHeader>
              <CardTitle>About Fish Tracker</CardTitle>
              <CardDescription>Application information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium">Version</h3>
                <p className="text-sm text-gray-500">1.0.0</p>
              </div>
              
              <div>
                <h3 className="font-medium">Release Date</h3>
                <p className="text-sm text-gray-500">May 18, 2025</p>
              </div>
              
              <div>
                <h3 className="font-medium">Developer</h3>
                <p className="text-sm text-gray-500">FishTracker Team</p>
              </div>
              
              <div className="pt-4">
                <h3 className="font-medium mb-2">Features</h3>
                <ul className="list-disc list-inside text-sm text-gray-500 space-y-1">
                  <li>Track your fish catches with detailed information</li>
                  <li>Work offline and sync when back online</li>
                  <li>View catches on interactive maps</li>
                  <li>Get local weather conditions</li>
                  <li>See statistics about your fishing activity</li>
                  <li>Share your catches with friends</li>
                </ul>
              </div>
            </CardContent>
            <CardFooter>
              <div className="flex gap-2">
                <Button variant="outline" asChild>
                  <a href="https://github.com/fishtracker/app" target="_blank" rel="noopener noreferrer">
                    <i className="ri-github-line mr-1"></i> GitHub
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a href="https://fishtracker.app/privacy" target="_blank" rel="noopener noreferrer">
                    Privacy Policy
                  </a>
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}