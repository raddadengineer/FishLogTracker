import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  deleteOfflineCatch,
  getOfflineCatches,
  syncOfflineCatchById,
  syncOfflineCatches,
  type OfflineCatch,
} from "@/lib/localStorageSync";

export default function OfflineCatchesPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<OfflineCatch[]>(() => getOfflineCatches());
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(() => navigator.onLine);

  const unsynced = useMemo(() => rows.filter((c) => !c.synced), [rows]);

  useEffect(() => {
    const refresh = () => setRows(getOfflineCatches());
    const updateOnline = () => setIsOnline(navigator.onLine);

    window.addEventListener("storage", refresh);
    window.addEventListener("online", () => {
      updateOnline();
      refresh();
    });
    window.addEventListener("offline", updateOnline);

    // localStorage 'storage' doesn't fire in the same tab, so poll lightly.
    const id = window.setInterval(refresh, 4000);

    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
      window.clearInterval(id);
    };
  }, []);

  const onSyncNow = async () => {
    if (!navigator.onLine) {
      toast({
        title: "Offline",
        description: "Connect to the internet to sync your offline catches.",
        variant: "destructive",
      });
      return;
    }

    setIsSyncing(true);
    try {
      const result = await syncOfflineCatches();
      toast({
        title: result.success ? "Sync Complete" : "Sync Incomplete",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
      setRows(getOfflineCatches());
    } catch {
      toast({
        title: "Sync Failed",
        description: "There was an error syncing your offline catches.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const onDelete = (id: string) => {
    const ok = deleteOfflineCatch(id);
    if (ok) {
      setRows(getOfflineCatches());
      toast({ title: "Deleted", description: "Removed offline catch." });
    }
  };

  const onRetryOne = async (id: string) => {
    if (!navigator.onLine) {
      toast({
        title: "Offline",
        description: "Connect to the internet to sync your offline catches.",
        variant: "destructive",
      });
      return;
    }
    const res = await syncOfflineCatchById(id);
    toast({
      title: res.ok ? "Synced" : "Sync failed",
      description: res.message,
      variant: res.ok ? "default" : "destructive",
    });
    setRows(getOfflineCatches());
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Offline Catches</h1>
          <p className="text-sm text-gray-600">
            Saved on this device. They’ll sync automatically when you’re back online.
          </p>
        </div>

        <Button onClick={onSyncNow} disabled={!isOnline || isSyncing || unsynced.length === 0}>
          {isSyncing ? (
            <>
              <i className="ri-loader-2-line animate-spin mr-1"></i>
              Syncing…
            </>
          ) : (
            <>
              <i className="ri-refresh-line mr-1"></i>
              Sync Now
            </>
          )}
        </Button>
      </div>

      {!isOnline && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-3 text-sm text-amber-900">
            You are currently offline. You can review/delete queued catches, but syncing is disabled.
          </CardContent>
        </Card>
      )}

      {rows.length === 0 ? (
        <Card>
          <CardContent className="p-4 text-sm text-gray-600">
            No offline catches saved on this device.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows
            .slice()
            .reverse()
            .map((c) => (
              <Card key={c.id} className="overflow-hidden">
                <CardContent className="p-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-medium truncate">
                        {c.species} • {c.size}in
                      </div>
                      {c.synced ? (
                        <span className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                          Synced
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          Pending
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {c.lakeName ? `Lake: ${c.lakeName}` : "Lake: (not set)"}
                      {" • "}
                      Saved: {new Date(c.createdAt).toLocaleString()}
                        {c.photosCount ? (
                          <>
                            {" • "}
                            Photos: {c.photosCount}
                          </>
                        ) : null}
                    </div>
                    {c.comments ? (
                      <div className="text-sm text-gray-700 mt-2 line-clamp-2">{c.comments}</div>
                    ) : null}
                    {!c.synced && c.lastSyncError ? (
                      <div className="mt-2 text-xs text-red-700">
                        Last sync error: <span className="font-mono">{c.lastSyncError}</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {!c.synced ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!isOnline}
                        onClick={() => onRetryOne(c.id)}
                      >
                        <i className="ri-refresh-line mr-1"></i>
                        Retry
                      </Button>
                    ) : null}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDelete(c.id)}
                      className="text-red-700 border-red-200 hover:bg-red-50"
                    >
                      <i className="ri-delete-bin-line mr-1"></i>
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}

