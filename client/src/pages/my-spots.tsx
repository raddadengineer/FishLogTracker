import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getMySpots, removeSpot, updateSpot, type MySpot } from "@/lib/mySpots";
import { Map, Trash2, PlusCircle, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function MySpotsPage() {
  const { toast } = useToast();
  const [spots, setSpots] = useState<MySpot[]>(() => getMySpots());
  const [noteDraft, setNoteDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => setSpots(getMySpots());
    window.addEventListener("storage", refresh);
    const id = window.setInterval(refresh, 4000);
    return () => {
      window.removeEventListener("storage", refresh);
      window.clearInterval(id);
    };
  }, []);

  const editingSpot = useMemo(() => spots.find((s) => s.id === editingId) || null, [spots, editingId]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">My Spots</h1>
          <p className="text-sm text-gray-600">Saved lakes/spots on this device.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/map">
            <Map className="h-4 w-4 mr-1" />
            Open map
          </Link>
        </Button>
      </div>

      {spots.length === 0 ? (
        <Card>
          <CardContent className="p-4 text-sm text-gray-600">
            No saved spots yet. Open the map, select a lake, and tap “Save spot”.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {spots
            .slice()
            .reverse()
            .map((s) => (
              <Card key={s.id} className="bg-white shadow-sm border border-gray-100">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{s.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-3">
                  <div className="text-xs text-gray-600">
                    {s.latitude.toFixed(4)}, {s.longitude.toFixed(4)}
                    <div className="text-[11px] text-gray-500 mt-1">
                      Saved {new Date(s.createdAt).toLocaleString()}
                    </div>
                    {s.lastVisitedAt ? (
                      <div className="text-[11px] text-emerald-700 mt-1">
                        Last visited {new Date(s.lastVisitedAt).toLocaleString()}
                      </div>
                    ) : null}
                    {s.notes ? (
                      <div className="text-[11px] text-gray-600 mt-1 line-clamp-2">
                        Notes: {s.notes}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/map?lat=${encodeURIComponent(String(s.latitude))}&lng=${encodeURIComponent(String(s.longitude))}`}>
                        <Map className="h-4 w-4 mr-1" />
                        View
                      </Link>
                    </Button>
                    <Button asChild size="sm">
                      <Link
                        href={`/map?logCatch=1&lakeName=${encodeURIComponent(s.name)}&lat=${encodeURIComponent(
                          String(s.latitude),
                        )}&lng=${encodeURIComponent(String(s.longitude))}`}
                      >
                        <PlusCircle className="h-4 w-4 mr-1" />
                        Log here
                      </Link>
                    </Button>

                    <Dialog
                      open={editingId === s.id}
                      onOpenChange={(open) => {
                        if (open) {
                          setEditingId(s.id);
                          setNoteDraft(s.notes || "");
                        } else {
                          setEditingId(null);
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[520px]">
                        <DialogHeader>
                          <DialogTitle>Edit notes</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3">
                          <div className="text-sm font-medium">{s.name}</div>
                          <Textarea
                            value={noteDraft}
                            onChange={(e) => setNoteDraft(e.target.value)}
                            placeholder="Add tips (best time, lure, access, etc.)"
                            className="min-h-[120px]"
                          />
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setEditingId(null);
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              onClick={() => {
                                updateSpot(s.id, { notes: noteDraft.trim() || undefined });
                                setSpots(getMySpots());
                                toast({ title: "Saved", description: "Spot notes updated." });
                                setEditingId(null);
                              }}
                            >
                              Save
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-200 text-red-700 hover:bg-red-50"
                      onClick={() => {
                        removeSpot(s.id);
                        setSpots(getMySpots());
                        toast({ title: "Removed", description: "Spot removed from My Spots." });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
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

