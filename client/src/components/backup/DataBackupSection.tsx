import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LoaderCircle, Download, Upload, Cloud } from "lucide-react";
import { GoogleDriveSaveButton } from "./GoogleDriveSaveButton";
import { GoogleDriveRestoreButton } from "./GoogleDriveRestoreButton";
import { clientAuthHeaders } from "@/lib/queryClient";
import { mergeImportBackupPayload, parseFishlogBackupJson } from "@/lib/backupImport";
import { exportDeviceBackup, importDeviceBackup } from "@/lib/deviceBackup";
import { buildBackupZip, restoreBackupZip } from "@/lib/deviceBackupZip";

async function fetchExportJson(): Promise<object> {
  const res = await fetch("/api/user/backup/export", {
    credentials: "include",
    headers: { ...clientAuthHeaders() },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || res.statusText);
  }
  return res.json();
}

function downloadJson(data: object, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function DataBackupSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<null | "export" | "import">(null);

  const driveClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  const driveApiKey = import.meta.env.VITE_GOOGLE_API_KEY as string | undefined;

  async function invalidateCatchQueries() {
    await queryClient.invalidateQueries({ queryKey: ["/api/catches"] });
    await queryClient.invalidateQueries({ queryKey: ["/api/users"] });
  }

  async function handleDownload() {
    setBusy("export");
    try {
      const stamp = new Date().toISOString().slice(0, 10);
      const zipBlob = await buildBackupZip();
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fishlogtracker-backup-${stamp}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: "Backup downloaded", description: "ZIP includes cloud data plus this device’s offline photos." });
    } catch (e) {
      toast({
        title: "Download failed",
        description: e instanceof Error ? e.message : "Could not export data",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setBusy("import");
    try {
      let imported = 0;
      let errCount = 0;
      let deviceRestored: string | null = null;
      let photosRestored: number | null = null;

      if (file.name.toLowerCase().endsWith(".zip")) {
        const r = await restoreBackupZip(file);
        imported = r.imported;
        errCount = r.rowErrorCount;
        deviceRestored = `${r.deviceRestored.mySpots} spot(s), ${r.deviceRestored.offlineCatches} offline catch(es)`;
        photosRestored = r.photosRestored;
      } else {
        const text = await file.text();
        const body = parseFishlogBackupJson(text);
        const r = await mergeImportBackupPayload(body);
        imported = r.imported;
        errCount = r.rowErrorCount;
        try {
          const d = (body as any).device;
          if (d) {
            const dr = importDeviceBackup(d);
            deviceRestored = `${dr.restored.mySpots} spot(s), ${dr.restored.offlineCatches} offline catch(es)`;
          }
        } catch (e) {
          deviceRestored = null;
          console.warn("Device restore skipped:", e);
        }
      }

      await invalidateCatchQueries();

      toast({
        title: "Import finished",
        description:
          errCount > 0
            ? `Imported ${imported} catch(es). ${errCount} row(s) could not be imported.`
            : `Imported ${imported} catch(es).${deviceRestored ? ` Restored device data: ${deviceRestored}.` : ""}${
                photosRestored != null ? ` Restored ${photosRestored} offline photo(s).` : ""
              }`,
        variant: errCount > 0 ? "destructive" : "default",
      });
    } catch (e) {
      toast({
        title: "Import failed",
        description: e instanceof Error ? e.message : "Invalid file or server error",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-1">About backup and sync</p>
        <p>
          Your catches already live on this app&apos;s server when you are online. Export and import require an active
          browser session (you must be signed in; the server must accept session cookies—over plain HTTP such as Docker
          on localhost, the server should set <span className="font-mono text-foreground">SESSION_COOKIE_SECURE=false</span>
          ). Use backup to keep a copy you control, move devices, or recover from mistakes.{" "}
          <strong className="text-foreground">Replace mode</strong> is not exposed in the UI yet; merge adds catches
          from the file to your account (duplicates are possible if you import twice).
        </p>
        <p className="mt-2">
          <strong className="text-foreground">iCloud Drive:</strong> Apple does not offer a web API to save directly to
          iCloud Drive the way Google Drive does. Use <em>Download backup</em>, then save to iCloud: on{" "}
          <strong className="text-foreground">iPhone/iPad</strong>, tap Share → Save to Files → iCloud Drive. On{" "}
          <strong className="text-foreground">Mac</strong>, save the download and drag the file into an iCloud Drive
          folder in Finder. To restore, use <em>Import backup</em> and pick the JSON from Files or Finder.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Download backup</Label>
        <p className="text-sm text-muted-foreground">
          ZIP file with your profile + all catches (cloud) and this device’s My Spots + offline catches + settings +
          offline photos.
        </p>
        <Button type="button" variant="secondary" onClick={handleDownload} disabled={busy !== null}>
          {busy === "export" ? <LoaderCircle className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
          Download backup
        </Button>
      </div>

      {driveClientId ? (
        <div className="space-y-3">
          <Label>Google Drive</Label>
          <p className="text-sm text-muted-foreground">
            Save uploads JSON to Drive (new file each time). Restore opens Google&apos;s file picker; with the{" "}
            <code className="text-xs">drive.file</code> scope you can read backups you created here or any file you
            select in the picker.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <GoogleDriveSaveButton clientId={driveClientId} fetchBackup={fetchExportJson} disabled={busy !== null} />
            {driveApiKey ? (
              <GoogleDriveRestoreButton
                clientId={driveClientId}
                developerKey={driveApiKey}
                disabled={busy !== null}
                onImportComplete={invalidateCatchQueries}
              />
            ) : null}
          </div>
          {!driveApiKey ? (
            <p className="text-xs text-muted-foreground">
              Set <code className="text-xs">VITE_GOOGLE_API_KEY</code> (browser API key, HTTP referrer–restricted) and
              enable the <strong className="text-foreground">Google Picker API</strong> in Google Cloud to use{" "}
              <em>Restore from Google Drive</em>.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          <Cloud className="inline h-4 w-4 mr-1 align-text-bottom" />
          Set <code className="text-xs">VITE_GOOGLE_CLIENT_ID</code> in your environment to enable save/restore with
          Google Drive (OAuth Web client + Drive scope). Add <code className="text-xs">VITE_GOOGLE_API_KEY</code> for
          the Drive restore picker.
        </div>
      )}

      <div className="space-y-2">
        <Label>Restore from file</Label>
        <p className="text-sm text-muted-foreground">
          Choose a backup ZIP (preferred) or JSON. Import will merge cloud catches and restore included device data. ZIP
          restores offline photos too.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/zip,.zip,application/json,.json"
          className="hidden"
          onChange={handleFileSelected}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy !== null}
        >
          {busy === "import" ? <LoaderCircle className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
          Import backup (merge)
        </Button>
      </div>
    </div>
  );
}
