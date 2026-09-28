/**
 * Optional Node bake (needs pngjs). Prefer:
 *   powershell -File tools/bake_alpha.ps1
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PNG } from "pngjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FILES = [
  "assets/heroes/trex.png",
  "assets/heroes/ptero.png",
  "assets/heroes/parasau.png",
  "assets/heroes/stego.png",
  "assets/enemies/grunt.png",
];

function isKey(r, g, b) {
  if (r > 160 && b > 160 && g < 100) return true;
  const dr = r - 255,
    dg = g,
    db = b - 255;
  return dr * dr + dg * dg + db * db < 12000;
}

for (const rel of FILES) {
  const full = path.join(ROOT, rel);
  const png = PNG.sync.read(fs.readFileSync(full));
  const d = png.data;
  for (let i = 0; i < d.length; i += 4) {
    if (isKey(d[i], d[i + 1], d[i + 2])) d[i + 3] = 0;
  }
  fs.writeFileSync(full, PNG.sync.write(png));
  console.log("OK", rel, "cornerA=" + d[3]);
}
