import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { LoaderCircle } from "lucide-react";
import { loadGoogleIdentity } from "./googleDriveUtils";

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (resp: { access_token?: string; error?: string }) => void;
          }) => { requestAccessToken: () => void };
        };
      };
    };
  }
}

async function uploadBackupToDrive(accessToken: string, fileName: string, json: object) {
  const boundary = "fishlog_" + Math.random().toString(36).slice(2);
  const metadata = JSON.stringify({ name: fileName });
  const content = JSON.stringify(json);
  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${metadata}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: application/json\r\n\r\n` +
    `${content}\r\n` +
    `--${boundary}--`;

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || res.statusText);
  }
  return res.json() as Promise<{ id?: string; name?: string; webViewLink?: string }>;
}

type Props = {
  clientId: string;
  fetchBackup: () => Promise<object>;
  disabled?: boolean;
};

export function GoogleDriveSaveButton({ clientId, fetchBackup, disabled }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    try {
      await loadGoogleIdentity();
      if (!window.google?.accounts?.oauth2) {
        throw new Error("Google Identity script did not load");
      }

      const json = await fetchBackup();
      const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const fileName = `FishLogTracker-backup-${stamp}.json`;

      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: "https://www.googleapis.com/auth/drive.file",
        callback: async (resp) => {
          if (resp.error || !resp.access_token) {
            toast({
              title: "Google authorization failed",
              description: resp.error || "No access token",
              variant: "destructive",
            });
            setLoading(false);
            return;
          }
          try {
            const meta = await uploadBackupToDrive(resp.access_token, fileName, json);
            toast({
              title: "Saved to Google Drive",
              description: meta.webViewLink
                ? `Open in Drive: ${meta.webViewLink}`
                : `Created ${meta.name ?? fileName}`,
            });
          } catch (e) {
            toast({
              title: "Drive upload failed",
              description: e instanceof Error ? e.message : "Upload error",
              variant: "destructive",
            });
          } finally {
            setLoading(false);
          }
        },
      });

      tokenClient.requestAccessToken();
    } catch (e) {
      toast({
        title: "Could not start Drive save",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
      setLoading(false);
    }
  }

  return (
    <Button type="button" variant="secondary" onClick={onClick} disabled={disabled || loading}>
      {loading ? <LoaderCircle className="h-4 w-4 animate-spin mr-2" /> : null}
      Save backup to Google Drive
    </Button>
  );
}
