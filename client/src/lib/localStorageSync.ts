import { generateId, safeJsonParse } from "./utils";
import { clientAuthHeaders } from "./queryClient";
import { deleteCatchPhotos, getCatchPhotos, putCatchPhotos } from "./offlinePhotoStore";

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
  photosCount?: number;
  catchDate: string;
  createdAt: string;
  synced: boolean;
  userId?: string;
  lastSyncError?: string;
  syncAttempts?: number;
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
export async function saveOfflineCatch(
  catchData: Omit<OfflineCatch, "id" | "synced" | "createdAt"> & { photos?: Blob[] },
): Promise<OfflineCatch> {
  const catches = getOfflineCatches();
  
  const id = generateId();

  if (catchData.photos && catchData.photos.length > 0) {
    await putCatchPhotos(id, catchData.photos);
  }

  const newCatch: OfflineCatch = {
    ...catchData,
    id,
    photosCount: catchData.photos?.length || 0,
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
    lastSyncError: undefined,
  };
  
  localStorage.setItem(OFFLINE_CATCHES_KEY, JSON.stringify(catches));
  
  return catches[index];
}

function setCatchSyncMeta(
  id: string,
  patch: Partial<Pick<OfflineCatch, "synced" | "lastSyncError" | "syncAttempts">>,
): OfflineCatch | null {
  const catches = getOfflineCatches();
  const index = catches.findIndex((c) => c.id === id);
  if (index === -1) return null;
  catches[index] = { ...catches[index], ...patch };
  localStorage.setItem(OFFLINE_CATCHES_KEY, JSON.stringify(catches));
  return catches[index];
}

// Delete an offline catch
export function deleteOfflineCatch(id: string): boolean {
  const catches = getOfflineCatches();
  const filtered = catches.filter(c => c.id !== id);
  
  if (filtered.length === catches.length) return false;
  
  localStorage.setItem(OFFLINE_CATCHES_KEY, JSON.stringify(filtered));
  // Best-effort cleanup of photo blobs
  deleteCatchPhotos(id).catch(() => {});
  return true;
}

// Mark a catch as synced
export function markCatchAsSynced(id: string): boolean {
  return !!setCatchSyncMeta(id, { synced: true, lastSyncError: undefined });
}

async function postOfflineCatchToServer(offlineCatch: OfflineCatch): Promise<{ res: Response; photosCount: number }> {
  const photos = offlineCatch.photosCount ? await getCatchPhotos(offlineCatch.id) : [];

  let body: BodyInit;
  let headers: Record<string, string> = { ...clientAuthHeaders() };

  if (photos.length > 0) {
    const form = new FormData();
    for (const p of photos) {
      form.append("photos", p, `photo-${offlineCatch.id}.jpg`);
    }
    const fields: Record<string, any> = {
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
    };
    Object.entries(fields).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "") return;
      form.append(k, String(v));
    });
    body = form;
  } else {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify({
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
    });
  }

  const res = await fetch("/api/catches", {
    method: "POST",
    credentials: "include",
    headers,
    body,
  });

  return { res, photosCount: photos.length };
}

export async function syncOfflineCatchById(id: string): Promise<{ ok: boolean; message: string }> {
  if (!navigator.onLine) return { ok: false, message: "Cannot sync while offline" };

  const row = getOfflineCatches().find((c) => c.id === id);
  if (!row) return { ok: false, message: "Offline catch not found" };
  if (row.synced) return { ok: true, message: "Already synced" };

  const attempts = (row.syncAttempts ?? 0) + 1;
  setCatchSyncMeta(id, { syncAttempts: attempts, lastSyncError: undefined, synced: false });

  try {
    const { res, photosCount } = await postOfflineCatchToServer(row);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const msg = text || `HTTP ${res.status}`;
      setCatchSyncMeta(id, { lastSyncError: msg, synced: false, syncAttempts: attempts });
      return { ok: false, message: msg };
    }

    markCatchAsSynced(id);
    if (photosCount > 0) await deleteCatchPhotos(id);
    return { ok: true, message: "Synced" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sync failed";
    setCatchSyncMeta(id, { lastSyncError: msg, synced: false, syncAttempts: attempts });
    return { ok: false, message: msg };
  }
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
      const attempts = (offlineCatch.syncAttempts ?? 0) + 1;
      setCatchSyncMeta(offlineCatch.id, { syncAttempts: attempts, lastSyncError: undefined, synced: false });
      try {
        const { res: response, photosCount } = await postOfflineCatchToServer(offlineCatch);
        
        if (response.ok) {
          markCatchAsSynced(offlineCatch.id);
          if (photosCount > 0) {
            await deleteCatchPhotos(offlineCatch.id);
          }
          syncedCount++;
        } else {
          const text = await response.text().catch(() => "");
          const msg = text || `HTTP ${response.status}`;
          setCatchSyncMeta(offlineCatch.id, { lastSyncError: msg, synced: false, syncAttempts: attempts });
          failedCount++;
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Sync failed";
        console.error('Error syncing catch:', error);
        setCatchSyncMeta(offlineCatch.id, { lastSyncError: msg, synced: false, syncAttempts: attempts });
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
    const res = await syncOfflineCatches();
    // Notify UI (toast/notification) in open tabs
    try {
      window.dispatchEvent(new CustomEvent("offline-sync-complete", { detail: res }));
    } catch {
      // ignore
    }
  });
  
  window.addEventListener('offline', () => {
    setSyncStatus('offline');
  });

  // Background Sync (from service worker) triggers this message.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', async (event) => {
      if (event?.data?.type === 'SYNC_OFFLINE_CATCHES') {
        const res = await syncOfflineCatches();
        try {
          window.dispatchEvent(new CustomEvent("offline-sync-complete", { detail: res }));
        } catch {
          // ignore
        }
      }
    });
  }
}

// Initialize sync module with initial status
export function initSyncModule(): void {
  setSyncStatus(navigator.onLine ? 'online' : 'offline');
  registerSyncEventListeners();
}
