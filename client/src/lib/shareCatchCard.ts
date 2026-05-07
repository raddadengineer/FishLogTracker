import { getFishSpeciesById } from "@/lib/fishSpecies";
import { formatSize } from "@/lib/utils";
import { getPhotoUrl, hasPhotos } from "@/lib/photoUtils";

type CatchLike = {
  species?: string;
  size?: number | string;
  lakeName?: string | null;
  catchDate?: string;
  createdAt?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  user?: { username?: string } | null;
  username?: string;
  photoData?: any;
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

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

export async function generateCatchShareImage(catchData: CatchLike): Promise<Blob> {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, "#0ea5e9");
  grad.addColorStop(0.55, "#22c55e");
  grad.addColorStop(1, "#f59e0b");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Glass card
  const pad = 64;
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

  // Photo area
  const photoX = cardX + 40;
  const photoY = cardY + 40;
  const photoW = cardW - 80;
  const photoH = 640;
  roundRect(ctx, photoX, photoY, photoW, photoH, 36);
  ctx.save();
  ctx.clip();
  ctx.fillStyle = "#e5e7eb";
  ctx.fillRect(photoX, photoY, photoW, photoH);

  if (hasPhotos(catchData)) {
    const src = getPhotoUrl(catchData as any, 0);
    if (src) {
      try {
        const img = await loadImage(src);
        // cover fit
        const scale = Math.max(photoW / img.width, photoH / img.height);
        const iw = img.width * scale;
        const ih = img.height * scale;
        const ix = photoX + (photoW - iw) / 2;
        const iy = photoY + (photoH - ih) / 2;
        ctx.drawImage(img, ix, iy, iw, ih);
      } catch {
        // fall back to placeholder
      }
    }
  }

  if (!hasPhotos(catchData)) {
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.font = "700 72px system-ui, -apple-system, Segoe UI, Roboto";
    ctx.textAlign = "center";
    ctx.fillText("🎣", photoX + photoW / 2, photoY + photoH / 2 - 20);
    ctx.font = "600 40px system-ui, -apple-system, Segoe UI, Roboto";
    ctx.fillText("No photo yet", photoX + photoW / 2, photoY + photoH / 2 + 40);
  }
  ctx.restore();

  const speciesId = String(catchData.species ?? "");
  const speciesName = getFishSpeciesById(speciesId)?.name || speciesId || "Catch";
  const sizeNum = Number(catchData.size);
  const sizeText = Number.isFinite(sizeNum) ? formatSize(sizeNum) : String(catchData.size ?? "");
  const lake = catchData.lakeName ? String(catchData.lakeName) : "";
  const who = catchData.user?.username || catchData.username || "Angler";

  // Title
  ctx.fillStyle = "#0f172a";
  ctx.textAlign = "left";
  ctx.font = "800 72px system-ui, -apple-system, Segoe UI, Roboto";
  ctx.fillText(speciesName, cardX + 56, photoY + photoH + 120);

  ctx.fillStyle = "rgba(15, 23, 42, 0.78)";
  ctx.font = "600 44px system-ui, -apple-system, Segoe UI, Roboto";
  ctx.fillText(sizeText, cardX + 56, photoY + photoH + 190);

  // Meta
  ctx.font = "500 34px system-ui, -apple-system, Segoe UI, Roboto";
  const metaY = photoY + photoH + 260;
  const meta = [lake ? `📍 ${lake}` : "", `👤 ${who}`].filter(Boolean).join("   ");
  ctx.fillText(meta, cardX + 56, metaY);

  // Footer branding
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(15, 23, 42, 0.65)";
  ctx.font = "700 34px system-ui, -apple-system, Segoe UI, Roboto";
  ctx.fillText("FishTracker", cardX + cardW - 56, cardY + cardH - 56);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Failed to render image"))), "image/png", 0.95);
  });
}

export async function shareCatchCard(params: {
  catchData: CatchLike;
  filename?: string;
}): Promise<"shared" | "downloaded"> {
  const blob = await generateCatchShareImage(params.catchData);
  const file = new File([blob], params.filename || "fishtracker-catch.png", { type: "image/png" });

  // Web Share API (mobile)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nav: any = navigator;
  if (nav?.share && nav?.canShare?.({ files: [file] })) {
    await nav.share({
      title: "FishTracker catch",
      text: "Check out this catch!",
      files: [file],
    });
    return "shared";
  }

  // Fallback: download
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "downloaded";
}

