import { getFishSpeciesById } from "@/lib/fishSpecies";
import { formatSize } from "@/lib/utils";

type SpotLike = {
  name: string;
  latitude: number;
  longitude: number;
  topSpecies?: string | null;
  catchCount?: number;
  biggest?: { species: string; size: number } | null;
};

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export async function generateSpotShareImage(spot: SpotLike): Promise<Blob> {
  const W = 1080;
  const H = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, "#0ea5e9");
  grad.addColorStop(0.55, "#22c55e");
  grad.addColorStop(1, "#111827");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  const pad = 72;
  const cardX = pad;
  const cardY = pad;
  const cardW = W - pad * 2;
  const cardH = H - pad * 2;

  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  roundRect(ctx, cardX, cardY, cardW, cardH, 44);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "#0f172a";
  ctx.textAlign = "left";
  ctx.font = "800 76px system-ui, -apple-system, Segoe UI, Roboto";
  ctx.fillText(spot.name || "My Spot", cardX + 56, cardY + 130);

  ctx.fillStyle = "rgba(15, 23, 42, 0.78)";
  ctx.font = "600 40px system-ui, -apple-system, Segoe UI, Roboto";
  ctx.fillText(`${spot.latitude.toFixed(4)}, ${spot.longitude.toFixed(4)}`, cardX + 56, cardY + 200);

  // Stats chips
  const lines: string[] = [];
  if (typeof spot.catchCount === "number") lines.push(`🎣 ${spot.catchCount} catches`);
  if (spot.topSpecies) {
    const nm = getFishSpeciesById(spot.topSpecies)?.name || spot.topSpecies;
    lines.push(`🐟 Top: ${nm}`);
  }
  if (spot.biggest) {
    const nm = getFishSpeciesById(spot.biggest.species)?.name || spot.biggest.species;
    lines.push(`🏆 Biggest: ${nm} ${formatSize(spot.biggest.size)}`);
  }

  ctx.font = "600 44px system-ui, -apple-system, Segoe UI, Roboto";
  let y = cardY + 320;
  for (const l of lines.slice(0, 4)) {
    ctx.fillText(l, cardX + 56, y);
    y += 76;
  }

  // Footer branding
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(15, 23, 42, 0.65)";
  ctx.font = "700 34px system-ui, -apple-system, Segoe UI, Roboto";
  ctx.fillText("FishTracker", cardX + cardW - 56, cardY + cardH - 56);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Failed to render image"))), "image/png", 0.95);
  });
}

export async function shareSpotCard(params: { spot: SpotLike; filename?: string }) {
  const blob = await generateSpotShareImage(params.spot);
  const file = new File([blob], params.filename || "fishtracker-spot.png", { type: "image/png" });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nav: any = navigator;
  if (nav?.share && nav?.canShare?.({ files: [file] })) {
    await nav.share({ title: "FishTracker spot", text: "Check out this spot!", files: [file] });
    return "shared" as const;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "downloaded" as const;
}

