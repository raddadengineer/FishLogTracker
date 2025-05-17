import { useState, useEffect } from "react";
import { 
  getOfflineCatches, 
  syncOfflineCatches, 
  getSyncStatus, 
  setSyncStatus 
} from "@/lib/localStorageSync";
import { useToast } from "@/hooks/use-toast";

export function useOfflineSync() {
  const [offlineCatches, setOfflineCatches] = useState(getOfflineCatches());
  const [syncStatus, setSyncState] = useState<'online' | 'offline' | 'syncing'>(getSyncStatus());
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  // Update the offline catches list when storage changes
  useEffect(() => {
    const handleStorageChange = () => {
      setOfflineCatches(getOfflineCatches());
    };

    // Add listeners for storage events
    window.addEventListener('storage', handleStorageChange);
    
    // Check periodically for changes (storage event doesn't fire in same tab)
    const intervalId = setInterval(handleStorageChange, 5000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(intervalId);
    };
  }, []);

  // Update sync status when online/offline status changes
  useEffect(() => {
    const updateSyncStatus = () => {
      const newStatus = navigator.onLine ? 'online' : 'offline';
      setSyncState(newStatus);
      setSyncStatus(newStatus);
    };

    // Set initial status
    updateSyncStatus();

    // Listen for online/offline events
    window.addEventListener('online', updateSyncStatus);
    window.addEventListener('offline', updateSyncStatus);

    return () => {
      window.removeEventListener('online', updateSyncStatus);
      window.removeEventListener('offline', updateSyncStatus);
    };
  }, []);

  // Trigger manual sync
  const triggerSync = async () => {
    if (!navigator.onLine) {
      toast({
        title: "Can't Sync",
        description: "You are currently offline. Connect to the internet to sync your catches.",
        variant: "destructive",
      });
      return;
    }

    setIsSyncing(true);
    setSyncState('syncing');
    setSyncStatus('syncing');

    try {
      const result = await syncOfflineCatches();
      
      toast({
        title: result.success ? "Sync Complete" : "Sync Incomplete",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
      
      // Refresh offline catches list
      setOfflineCatches(getOfflineCatches());
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: "There was an error syncing your catches.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
      setSyncState(navigator.onLine ? 'online' : 'offline');
      setSyncStatus(navigator.onLine ? 'online' : 'offline');
    }
  };

  // Check if there are unsynced catches
  const hasUnsyncedCatches = offlineCatches.some(c => !c.synced);

  return {
    offlineCatches,
    syncStatus,
    isSyncing,
    hasUnsyncedCatches,
    triggerSync,
  };
}
