import { safeJsonParse } from "@/lib/utils";

export type DeviceBackupPayload = {
  version: 1;
  exportedAt: string;
  mySpots: unknown;
  offlineCatches: unknown;
  settings: unknown;
};

const KEY_MY_SPOTS = "fishtracker_my_spots";
const KEY_OFFLINE_CATCHES = "fishtracker_offline_catches";
const KEY_SETTINGS = "fishTrackerSettings";

export function exportDeviceBackup(): DeviceBackupPayload {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    mySpots: safeJsonParse(localStorage.getItem(KEY_MY_SPOTS) || "[]", []),
    offlineCatches: safeJsonParse(localStorage.getItem(KEY_OFFLINE_CATCHES) || "[]", []),
    settings: safeJsonParse(localStorage.getItem(KEY_SETTINGS) || "null", null),
  };
}

export function importDeviceBackup(raw: unknown): { restored: { mySpots: number; offlineCatches: number; settings: boolean } } {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  if (!o) throw new Error("Device backup payload is missing or invalid.");

  const mySpots = Array.isArray(o.mySpots) ? o.mySpots : [];
  const offlineCatches = Array.isArray(o.offlineCatches) ? o.offlineCatches : [];
  const settings = o.settings ?? null;

  localStorage.setItem(KEY_MY_SPOTS, JSON.stringify(mySpots));
  localStorage.setItem(KEY_OFFLINE_CATCHES, JSON.stringify(offlineCatches));
  if (settings == null) localStorage.removeItem(KEY_SETTINGS);
  else localStorage.setItem(KEY_SETTINGS, JSON.stringify(settings));

  return {
    restored: {
      mySpots: mySpots.length,
      offlineCatches: offlineCatches.length,
      settings: settings != null,
    },
  };
}

