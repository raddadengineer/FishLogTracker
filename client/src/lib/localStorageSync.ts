import { generateId, safeJsonParse } from "./utils";

// Type definitions
export interface OfflineCatch {
  id: string;
  species: string;
  size: number;
  weight?: number;
  lakeName?: string;
  lakeId?: number;
  latitude?: number;
  longitude?: number;
  temperature?: number;
  depth?: number;
  lure?: string;
  comments?: string;
  photosBlob?: Blob[];
  catchDate: string;
  createdAt: string;
  synced: boolean;
  userId?: string;
}

// Storage keys
const OFFLINE_CATCHES_KEY = 'fishtracker_offline_catches';
const SYNC_STATUS_KEY = 'fishtracker_sync_status';

// Get all offline catches
export function getOfflineCatches(): OfflineCatch[] {
  const stored = localStorage.getItem(OFFLINE_CATCHES_KEY);
  return safeJsonParse<OfflineCatch[]>(stored || '[]', []);
}

// Save a catch to offline storage
export async function saveOfflineCatch(catchData: Omit<OfflineCatch, 'id' | 'synced' | 'createdAt'>): Promise<OfflineCatch> {
  const catches = getOfflineCatches();
  
  const newCatch: OfflineCatch = {
    ...catchData,
    id: generateId(),
    synced: false,
    createdAt: new Date().toISOString(),
  };
  
  catches.push(newCatch);
  localStorage.setItem(OFFLINE_CATCHES_KEY, JSON.stringify(catches));
  
  // Trigger a background sync if service worker is available
  await requestBackgroundSync();
  
  return newCatch;
}

// Update an offline catch
export function updateOfflineCatch(id: string, updateData: Partial<OfflineCatch>): OfflineCatch | null {
  const catches = getOfflineCatches();
  const index = catches.findIndex(c => c.id === id);
  
  if (index === -1) return null;
  
  catches[index] = {
    ...catches[index],
    ...updateData,
    synced: false,
  };
  
  localStorage.setItem(OFFLINE_CATCHES_KEY, JSON.stringify(catches));
  
  return catches[index];
}

// Delete an offline catch
export function deleteOfflineCatch(id: string): boolean {
  const catches = getOfflineCatches();
  const filtered = catches.filter(c => c.id !== id);
  
  if (filtered.length === catches.length) return false;
  
  localStorage.setItem(OFFLINE_CATCHES_KEY, JSON.stringify(filtered));
  return true;
}

// Mark a catch as synced
export function markCatchAsSynced(id: string): boolean {
  return !!updateOfflineCatch(id, { synced: true });
}

// Get sync status
export function getSyncStatus(): 'online' | 'offline' | 'syncing' {
  // Check network status first
  if (!navigator.onLine) return 'offline';
  
  // Check if we're in the middle of a sync
  const status = localStorage.getItem(SYNC_STATUS_KEY);
  return status === 'syncing' ? 'syncing' : 'online';
}

// Set sync status
export function setSyncStatus(status: 'online' | 'offline' | 'syncing'): void {
  localStorage.setItem(SYNC_STATUS_KEY, status);
}

// Trigger a manual sync of offline catches
export async function syncOfflineCatches(): Promise<{ 
  success: boolean; 
  synced: number; 
  failed: number; 
  message: string 
}> {
  try {
    // If offline, don't even try
    if (!navigator.onLine) {
      return {
        success: false,
        synced: 0,
        failed: 0,
        message: 'Cannot sync while offline',
      };
    }
    
    // Set syncing status
    setSyncStatus('syncing');
    
    // Get unsynced catches
    const catches = getOfflineCatches().filter(c => !c.synced);
    
    if (catches.length === 0) {
      setSyncStatus('online');
      return {
        success: true,
        synced: 0,
        failed: 0,
        message: 'No catches to sync',
      };
    }
    
    let syncedCount = 0;
    let failedCount = 0;
    
    // Process each catch
    for (const offlineCatch of catches) {
      try {
        const response = await fetch('/api/catches', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            species: offlineCatch.species,
            size: offlineCatch.size,
            weight: offlineCatch.weight,
            lakeName: offlineCatch.lakeName,
            lakeId: offlineCatch.lakeId,
            latitude: offlineCatch.latitude,
            longitude: offlineCatch.longitude,
            temperature: offlineCatch.temperature,
            depth: offlineCatch.depth,
            lure: offlineCatch.lure,
            comments: offlineCatch.comments,
            catchDate: offlineCatch.catchDate,
            // Photos are handled separately in a real implementation
          }),
        });
        
        if (response.ok) {
          markCatchAsSynced(offlineCatch.id);
          syncedCount++;
        } else {
          failedCount++;
        }
      } catch (error) {
        console.error('Error syncing catch:', error);
        failedCount++;
      }
    }
    
    // Set status back to online
    setSyncStatus('online');
    
    return {
      success: failedCount === 0,
      synced: syncedCount,
      failed: failedCount,
      message: failedCount === 0 
        ? `Successfully synced ${syncedCount} catches` 
        : `Synced ${syncedCount} catches, ${failedCount} failed`,
    };
  } catch (error) {
    console.error('Error during sync process:', error);
    setSyncStatus('online');
    return {
      success: false,
      synced: 0,
      failed: 0,
      message: 'Sync failed due to an error',
    };
  }
}

// Request a background sync from the service worker
async function requestBackgroundSync(): Promise<void> {
  try {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('sync-catches');
    }
  } catch (error) {
    console.error('Background sync registration failed:', error);
  }
}

// Register event listeners for online/offline events
export function registerSyncEventListeners(): void {
  window.addEventListener('online', async () => {
    setSyncStatus('online');
    await syncOfflineCatches();
  });
  
  window.addEventListener('offline', () => {
    setSyncStatus('offline');
  });
}

// Initialize sync module with initial status
export function initSyncModule(): void {
  setSyncStatus(navigator.onLine ? 'online' : 'offline');
  registerSyncEventListeners();
}
