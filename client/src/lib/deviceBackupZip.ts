import JSZip from "jszip";
import { clientAuthHeaders } from "@/lib/queryClient";
import { exportDeviceBackup, importDeviceBackup } from "@/lib/deviceBackup";
import { getCatchPhotos, putCatchPhotos } from "@/lib/offlinePhotoStore";

async function fetchCloudBackupJson(): Promise<object> {
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

export async function buildBackupZip(): Promise<Blob> {
  const zip = new JSZip();
  const cloud = await fetchCloudBackupJson();
  const device = exportDeviceBackup();

  zip.file("backup.json", JSON.stringify({ ...(cloud as object), device }, null, 2));

  const offlineCatches = Array.isArray((device as any).offlineCatches) ? ((device as any).offlineCatches as any[]) : [];
  const photosFolder = zip.folder("offline-photos");

  for (const c of offlineCatches) {
    const catchId = String(c?.id || "");
    const photosCount = Number(c?.photosCount || 0);
    if (!catchId || !Number.isFinite(photosCount) || photosCount <= 0) continue;

    const blobs = await getCatchPhotos(catchId);
    if (!blobs.length) continue;

    const cf = photosFolder?.folder(encodeURIComponent(catchId));
    blobs.forEach((b, i) => {
      const ext = b.type === "image/png" ? "png" : b.type === "image/webp" ? "webp" : "jpg";
      cf?.file(`${String(i + 1).padStart(2, "0")}.${ext}`, b);
    });
  }

  return await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
}

export async function restoreBackupZip(zipBlob: Blob): Promise<{
  imported: number;
  rowErrorCount: number;
  deviceRestored: { mySpots: number; offlineCatches: number; settings: boolean };
  photosRestored: number;
}> {
  const zip = await JSZip.loadAsync(zipBlob);
  const backupFile = zip.file("backup.json");
  if (!backupFile) throw new Error("ZIP is missing `backup.json`.");

  const text = await backupFile.async("text");
  const body = JSON.parse(text) as Record<string, unknown>;

  // Cloud merge import (same as DataBackupSection)
  const res = await fetch("/api/user/backup/import", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...clientAuthHeaders() },
    body: JSON.stringify({
      format: body.format,
      version: body.version ?? 1,
      mode: "merge",
      catches: body.catches ?? [],
    }),
  });
  const result = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((result as { message?: string }).message || res.statusText);
  }

  // Device restore (localStorage)
  const devicePayload = (body as any).device;
  const deviceRes = importDeviceBackup(devicePayload);

  // Offline photos restore (IndexedDB)
  let photosRestored = 0;
  const offlineCatches = Array.isArray((devicePayload as any)?.offlineCatches) ? ((devicePayload as any).offlineCatches as any[]) : [];
  for (const c of offlineCatches) {
    const catchId = String(c?.id || "");
    const photosCount = Number(c?.photosCount || 0);
    if (!catchId || !Number.isFinite(photosCount) || photosCount <= 0) continue;

    const folderPrefix = `offline-photos/${encodeURIComponent(catchId)}/`;
    const files = Object.keys(zip.files)
      .filter((p) => p.startsWith(folderPrefix) && !zip.files[p].dir)
      .sort((a, b) => a.localeCompare(b));
    if (!files.length) continue;

    const blobs: Blob[] = [];
    for (const p of files) {
      const ab = await zip.files[p].async("arraybuffer");
      const ext = p.split(".").pop()?.toLowerCase();
      const type = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
      blobs.push(new Blob([ab], { type }));
    }

    if (blobs.length) {
      await putCatchPhotos(catchId, blobs);
      photosRestored += blobs.length;
    }
  }

  return {
    imported: (result as any).imported ?? 0,
    rowErrorCount: (result as any).rowErrorCount ?? 0,
    deviceRestored: deviceRes.restored,
    photosRestored,
  };
}

