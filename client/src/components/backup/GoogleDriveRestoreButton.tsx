import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { LoaderCircle, FolderOpen } from "lucide-react";
import { loadGoogleIdentity, loadGooglePickerApi } from "./googleDriveUtils";
import { mergeImportBackupPayload, parseFishlogBackupJson } from "@/lib/backupImport";

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

async function downloadDriveFileMedia(accessToken: string, fileId: string): Promise<string> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || res.statusText);
  }
  return res.text();
}

type PickerData = {
  action: string;
  docs?: Array<{ id: string; name?: string }>;
};

type Props = {
  clientId: string;
  /** Browser API key (Picker developer key); restrict by HTTP referrer in Google Cloud. */
  developerKey: string;
  disabled?: boolean;
  onImportComplete?: () => void | Promise<void>;
};

export function GoogleDriveRestoreButton({ clientId, developerKey, disabled, onImportComplete }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  function openPicker(accessToken: string): void {
    type BuilderChain = {
      addView(v: unknown): BuilderChain;
      setOAuthToken(t: string): BuilderChain;
      setDeveloperKey(k: string): BuilderChain;
      setTitle(title: string): BuilderChain;
      setCallback(cb: (data: PickerData) => void): BuilderChain;
      build(): { setVisible(visible: boolean): void };
    };

    type PickerNs = {
      PickerBuilder: new () => BuilderChain;
      DocsView: new (viewId?: unknown) => unknown;
      ViewId: { DOCS: unknown };
      Action: { PICKED: string; CANCEL: string };
    };

    const pickerNs = (window.google as { picker?: PickerNs } | undefined)?.picker;
    if (!pickerNs?.PickerBuilder || !pickerNs.DocsView || !pickerNs.ViewId) {
      toast({
        title: "Picker unavailable",
        description: "Google Picker did not load. Enable Google Picker API in Cloud Console.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const view = new pickerNs.DocsView(pickerNs.ViewId.DOCS);

    const picker = new pickerNs.PickerBuilder()
      .addView(view)
      .setOAuthToken(accessToken)
      .setDeveloperKey(developerKey)
      .setTitle("Select FishLogTracker backup (.json)")
      .setCallback(async (data: PickerData) => {
        const picked = data.action === pickerNs.Action?.PICKED || data.action === "picked";
        const cancelled = data.action === pickerNs.Action?.CANCEL || data.action === "cancel";

        if (cancelled || !picked) {
          setLoading(false);
          return;
        }

        const doc = data.docs?.[0];
        if (!doc?.id) {
          toast({ title: "Nothing selected", variant: "destructive" });
          setLoading(false);
          return;
        }

        try {
          const text = await downloadDriveFileMedia(accessToken, doc.id);
          const parsed = parseFishlogBackupJson(text);
          const { imported, rowErrorCount } = await mergeImportBackupPayload(parsed);

          toast({
            title: "Import finished",
            description:
              rowErrorCount > 0
                ? `Imported ${imported} catch(es). ${rowErrorCount} row(s) could not be imported.`
                : `Imported ${imported} catch(es).`,
            variant: rowErrorCount > 0 ? "destructive" : "default",
          });

          await onImportComplete?.();
        } catch (e) {
          toast({
            title: "Restore failed",
            description: e instanceof Error ? e.message : "Could not read or import file",
            variant: "destructive",
          });
        } finally {
          setLoading(false);
        }
      })
      .build();

    picker.setVisible(true);
  }

  async function onClick() {
    setLoading(true);
    try {
      await loadGooglePickerApi();
      await loadGoogleIdentity();

      if (!window.google?.accounts?.oauth2) {
        throw new Error("Google Identity script did not load");
      }

      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: "https://www.googleapis.com/auth/drive.file",
        callback: (resp) => {
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
            openPicker(resp.access_token);
          } catch (e) {
            toast({
              title: "Could not open picker",
              description: e instanceof Error ? e.message : "Unknown error",
              variant: "destructive",
            });
            setLoading(false);
          }
        },
      });

      tokenClient.requestAccessToken();
    } catch (e) {
      toast({
        title: "Could not start Drive restore",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
      setLoading(false);
    }
  }

  return (
    <Button type="button" variant="outline" onClick={onClick} disabled={disabled || loading}>
      {loading ? <LoaderCircle className="h-4 w-4 animate-spin mr-2" /> : <FolderOpen className="h-4 w-4 mr-2" />}
      Restore from Google Drive
    </Button>
  );
}
