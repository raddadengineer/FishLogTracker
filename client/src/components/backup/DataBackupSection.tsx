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
      const data = await fetchExportJson();
      const stamp = new Date().toISOString().slice(0, 10);
      downloadJson(data, `fishlogtracker-backup-${stamp}.json`);
      toast({ title: "Backup downloaded", description: "You can store this file in Google Drive or iCloud Drive." });
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
      const text = await file.text();
      const body = parseFishlogBackupJson(text);
      const { imported, rowErrorCount: errCount } = await mergeImportBackupPayload(body);

      await invalidateCatchQueries();

      toast({
        title: "Import finished",
        description:
          errCount > 0
            ? `Imported ${imported} catch(es). ${errCount} row(s) could not be imported.`
            : `Imported ${imported} catch(es).`,
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
          Your catches already live on this app&apos;s server when you are online. Export and import require a normal
          browser session (sign in with email and password). Use backup to keep a copy you control, move devices, or
          recover from mistakes.{" "}
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
        <p className="text-sm text-muted-foreground">JSON file with your profile and all catches.</p>
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
        <p className="text-sm text-muted-foreground">Choose a backup JSON (from download, Drive, or iCloud Files).</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
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
