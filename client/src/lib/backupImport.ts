import { clientAuthHeaders } from "@/lib/queryClient";

export function parseFishlogBackupJson(text: string): Record<string, unknown> {
  let body: unknown;
  try {
    body = JSON.parse(text) as unknown;
  } catch {
    throw new Error("The file is not valid JSON.");
  }
  if (!body || typeof body !== "object") {
    throw new Error("Invalid backup file.");
  }
  const o = body as Record<string, unknown>;
  if (o.format !== "fishlogtracker-backup") {
    throw new Error("This file is not a FishLogTracker backup.");
  }
  return o;
}

export async function mergeImportBackupPayload(body: Record<string, unknown>): Promise<{
  imported: number;
  rowErrorCount: number;
}> {
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

  return {
    imported: (result as { imported?: number }).imported ?? 0,
    rowErrorCount: (result as { rowErrorCount?: number }).rowErrorCount ?? 0,
  };
}
