// scripts/generate-png-icons.js
import fs from "fs";
import path from "path";
import zlib from "zlib";

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c;
    }
  }
  let c = -1;
  for (let i = 0; i < buf.length; i++) {
    c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ -1) >>> 0;
}

function createPngBuffer(width, height, getPixelRgba) {
  // Raw scanlines: for each row, 1 byte filter (0) + width * 4 bytes RGBA
  const rowLength = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowLength);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowLength;
    rawData[rowOffset] = 0; // Filter 0 (None)
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = getPixelRgba(x, y, width, height);
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData, { level: 9 });

  // PNG structure
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth: 8
  ihdrData[9] = 6; // Color type: 6 (RGBA)
  ihdrData[10] = 0; // Compression: Deflate
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace: None

  const ihdrChunk = Buffer.alloc(12 + 13);
  ihdrChunk.writeUInt32BE(13, 0);
  ihdrChunk.write("IHDR", 4);
  ihdrData.copy(ihdrChunk, 8);
  const ihdrCrc = crc32(ihdrChunk.subarray(4, 21));
  ihdrChunk.writeUInt32BE(ihdrCrc, 21);

  // IDAT
  const idatChunk = Buffer.alloc(12 + deflated.length);
  idatChunk.writeUInt32BE(deflated.length, 0);
  idatChunk.write("IDAT", 4);
  deflated.copy(idatChunk, 8);
  const idatCrc = crc32(idatChunk.subarray(4, 8 + deflated.length));
  idatChunk.writeUInt32BE(idatCrc, 8 + deflated.length);

  // IEND
  const iendChunk = Buffer.alloc(12);
  iendChunk.writeUInt32BE(0, 0);
  iendChunk.write("IEND", 4);
  const iendCrc = crc32(iendChunk.subarray(4, 8));
  iendChunk.writeUInt32BE(iendCrc, 8);

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Point in polygon helper
function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function renderVirtuoIcon(isMaskable = false) {
  const size = 1024;
  const scale = isMaskable ? 0.78 : 0.92;
  const cx = size / 2;
  const cy = size / 2;

  // Símbolo V oficial geometry
  // Top left: 330, 200 -> 395, 200 -> 512, 600 -> 465, 600
  // Top right: 694, 200 -> 629, 200 -> 512, 600 -> 559, 600 with curve
  const vScale = scale;
  const tx = cx;
  const ty = cy + (isMaskable ? 10 : 0);

  function transformPt([px, py]) {
    return [
      tx + (px - 512) * vScale,
      ty + (py - 512) * vScale
    ];
  }

  const leftStem = [
    [310, 180],
    [380, 180],
    [512, 620],
    [455, 620]
  ].map(transformPt);

  // Approximate curved right stem with segmented polygon
  const rightStem = [];
  rightStem.push(transformPt([714, 180]));
  rightStem.push(transformPt([644, 180]));
  // Inner curve: from (644, 180) down to (512, 620)
  for (let t = 0.1; t <= 0.9; t += 0.1) {
    // Bezier control point: c1: (600, 280), c2: (545, 460)
    const u = 1 - t;
    const px = u*u*u*644 + 3*u*u*t*600 + 3*u*t*t*545 + t*t*t*512;
    const py = u*u*u*180 + 3*u*u*t*280 + 3*u*t*t*460 + t*t*t*620;
    rightStem.push(transformPt([px, py]));
  }
  rightStem.push(transformPt([512, 620]));
  rightStem.push(transformPt([569, 620]));
  // Outer line: back up to (714, 180)
  for (let t = 0.9; t >= 0.1; t -= 0.1) {
    const u = 1 - t;
    const px = u*569 + t*714;
    const py = u*620 + t*180;
    rightStem.push(transformPt([px, py]));
  }

  const centerFacet = [
    [455, 620],
    [512, 620],
    [569, 620],
    [512, 670]
  ].map(transformPt);

  return createPngBuffer(size, size, (x, y) => {
    // 1. Base dark background #07101F
    let r = 7;
    let g = 16;
    let b = 31;
    let a = 255;

    // 2. Horizon Glow (Luz Azul no horizonte sob o V)
    const hx = (x - cx) / (340 * scale);
    const hy = (y - (ty + 130 * scale)) / (90 * scale);
    const hDist2 = hx * hx + hy * hy;
    if (hDist2 < 1.0) {
      const factor = Math.cos(Math.sqrt(hDist2) * (Math.PI / 2));
      const glow = factor * 0.65;
      r = Math.min(255, Math.round(r + (126 - r) * glow));
      g = Math.min(255, Math.round(g + (231 - g) * glow));
      b = Math.min(255, Math.round(b + (255 - b) * glow));
    }

    // Secondary deep center glow
    const cxDist = Math.hypot((x - cx) / (480 * scale), (y - ty) / (480 * scale));
    if (cxDist < 1.0) {
      const cFactor = Math.pow(1.0 - cxDist, 2) * 0.28;
      r = Math.min(255, Math.round(r + (14 - r) * cFactor));
      g = Math.min(255, Math.round(g + (45 - g) * cFactor));
      b = Math.min(255, Math.round(b + (85 - b) * cFactor));
    }

    // 3. Render V symbol
    if (pointInPoly(x, y, leftStem)) {
      // Left stem metallic gradient (white -> celestial blue -> steel blue)
      const prog = Math.max(0, Math.min(1, (y - (ty - 330 * scale)) / (500 * scale)));
      const mr = Math.round(255 * (1 - prog * 0.85));
      const mg = Math.round(245 * (1 - prog * 0.6) + 126 * prog * 0.4);
      const mb = Math.round(255 * (1 - prog * 0.3) + 255 * prog * 0.3);
      r = mr;
      g = mg;
      b = mb;
    } else if (pointInPoly(x, y, rightStem)) {
      // Right stem metallic gradient (bright cyan -> deep ocean)
      const prog = Math.max(0, Math.min(1, (y - (ty - 330 * scale)) / (500 * scale)));
      const mr = Math.round(232 * (1 - prog * 0.88) + 14 * prog);
      const mg = Math.round(248 * (1 - prog * 0.65) + 45 * prog);
      const mb = Math.round(255 * (1 - prog * 0.45) + 68 * prog);
      r = mr;
      g = mg;
      b = mb;
    } else if (pointInPoly(x, y, centerFacet)) {
      // Center facet (vertex with bright cyan highlight)
      const prog = Math.max(0, Math.min(1, (y - (ty + 100 * scale)) / (60 * scale)));
      r = Math.round(255 * (1 - prog * 0.7) + 30 * prog);
      g = Math.round(255 * (1 - prog * 0.2) + 82 * prog);
      b = Math.round(255);
    }

    return [r, g, b, a];
  });
}

const brandingDir = path.join(process.cwd(), "assets", "branding");
if (!fs.existsSync(brandingDir)) {
  fs.mkdirSync(brandingDir, { recursive: true });
}

console.log("Gerando assets/branding/icon-1024.png...");
const iconBuf = renderVirtuoIcon(false);
fs.writeFileSync(path.join(brandingDir, "icon-1024.png"), iconBuf);

console.log("Gerando assets/branding/icon-maskable-1024.png...");
const maskableBuf = renderVirtuoIcon(true);
fs.writeFileSync(path.join(brandingDir, "icon-maskable-1024.png"), maskableBuf);

console.log("✓ Ícones 1024 PNG gerados com sucesso!");
