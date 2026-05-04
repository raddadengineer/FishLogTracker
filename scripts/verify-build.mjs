/**
 * Post-build smoke check: ensures expected artifacts exist (no DB / server required).
 */
import { existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const checks = [
  ["dist/index.js", "bundled server"],
  ["dist/public/index.html", "Vite HTML shell"],
  ["dist/public/assets", "Vite assets directory"],
];

let failed = false;
for (const [rel, label] of checks) {
  const abs = join(root, rel);
  const ok = existsSync(abs);
  if (!ok) {
    console.error(`FAIL: missing ${label}: ${rel}`);
    failed = true;
  } else {
    console.log(`ok: ${label}`);
  }
}

if (failed) {
  process.exit(1);
}
console.log("verify-build: all checks passed");
process.exit(0);
