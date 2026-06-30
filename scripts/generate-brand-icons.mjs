import sharp from "sharp";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const src = join(root, "public", "Gemini_Generated_Image_dw8dmsdw8dmsdw8d.png");
const outDir = join(root, "public");

async function removeWhiteBackground(inputPath) {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const threshold = 235;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const isWhite = r >= threshold && g >= threshold && b >= threshold;
    const isBlack = r <= 25 && g <= 25 && b <= 25;
    if (isWhite || isBlack) {
      data[i + 3] = 0;
    } else if (r > 210 && g > 210 && b > 210) {
      const fade = Math.min(255, (r + g + b) / 3 - 210);
      data[i + 3] = Math.max(0, 255 - fade * 6);
    }
  }

  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  }).png();
}

async function main() {
  const transparent = await removeWhiteBackground(src);
  const trimmed = transparent.trim();

  await trimmed.clone().toFile(join(outDir, "logo.png"));
  console.log("✓ public/logo.png");

  const exports = [
    ["icon-192.png", 192],
    ["icon-512.png", 512],
    ["apple-touch-icon.png", 180],
    ["favicon-32.png", 32],
    ["favicon-16.png", 16],
  ];

  for (const [name, size] of exports) {
    await trimmed
      .clone()
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(join(outDir, name));
    console.log(`✓ public/${name}`);
  }

  await trimmed
    .clone()
    .resize(32, 32, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(join(outDir, "favicon.ico"));

  console.log("✓ public/favicon.ico");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
