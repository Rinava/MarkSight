// Generates raster brand assets (icons + social images) from inline SVG using sharp.
// Run with: node scripts/generate-assets.mjs
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const GREEN = "#3f7d44";
const DARK = "#21381f";
const DARK2 = "#16241a";
const LIGHT = "#f5f8f2";
const SAGE = "#a8c0a0";

// Notepad glyph on a 24x24 grid (matches public/favicon.svg).
const NOTEPAD = `
  <path d="M8 2v3"/><path d="M16 2v3"/><path d="M3 10h18"/>
  <path d="M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>
  <path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/>
  <path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/>`;

function glyph(stroke, x, y, scale) {
  return `<g transform="translate(${x},${y}) scale(${scale})" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${NOTEPAD}</g>`;
}

function iconSvg({ size, bg, stroke, pad, rx = 0 }) {
  const scale = (size - 2 * pad) / 24;
  const bgRect = bg ? `<rect width="${size}" height="${size}" rx="${rx}" fill="${bg}"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${bgRect}${glyph(stroke, pad, pad, scale)}</svg>`;
}

const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${DARK}"/>
      <stop offset="1" stop-color="${DARK2}"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="0" y="0" width="1200" height="8" fill="${GREEN}"/>
  ${glyph(SAGE, 96, 150, 4.2)}
  <text x="232" y="252" font-family="Helvetica, Arial, sans-serif" font-size="92" font-weight="800" fill="${LIGHT}">MarkSight</text>
  <text x="98" y="370" font-family="Helvetica, Arial, sans-serif" font-size="40" font-weight="500" fill="${SAGE}">Markdown → Claude Agent Skill, in one click</text>
  <text x="98" y="430" font-family="Helvetica, Arial, sans-serif" font-size="30" font-weight="400" fill="#9fb39a">Browser-only editor · Built-in MCP server for Claude Code</text>
  <text x="98" y="560" font-family="Helvetica, Arial, sans-serif" font-size="26" font-weight="600" fill="${GREEN}">Open source · Free · marksight.laramateo.com</text>
</svg>`;

async function main() {
  await mkdir("public", { recursive: true });
  await mkdir("src/app", { recursive: true });

  const jobs = [
    // Manifest icon (transparent, "any")
    [iconSvg({ size: 512, bg: null, stroke: GREEN, pad: 110 }), "public/icon.png"],
    // Maskable icon (solid bg + generous safe padding)
    [iconSvg({ size: 512, bg: LIGHT, stroke: GREEN, pad: 150 }), "public/icon-maskable.png"],
    // Apple touch icon (rounded handled by iOS; light bg)
    [iconSvg({ size: 180, bg: LIGHT, stroke: GREEN, pad: 38, rx: 0 }), "src/app/apple-icon.png"],
    // Social images (file-convention → auto-injected by Next)
    [ogSvg, "src/app/opengraph-image.png"],
    [ogSvg, "src/app/twitter-image.png"],
  ];

  for (const [svg, out] of jobs) {
    await sharp(Buffer.from(svg)).png().toFile(out);
    console.log("wrote", out);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
