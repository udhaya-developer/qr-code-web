import { NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';
import sharp from 'sharp';
import QRCode from 'qrcode';
import { getScaledQrPlacement, normalizeIdCardSettings } from '@/lib/idCardTemplateSettings';

export const runtime = 'nodejs';

async function detectLargestWhiteRegion(templateBuffer) {
  const { data, info } = await sharp(templateBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const width = info.width;
  const height = info.height;
  const channels = info.channels;

  const mask = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = (y * width + x) * channels;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];
      if (a > 240 && r > 235 && g > 235 && b > 235) {
        mask[y * width + x] = 1;
      }
    }
  }

  const seen = new Uint8Array(width * height);
  const queueX = [];
  const queueY = [];
  let best = null;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const startIdx = y * width + x;
      if (!mask[startIdx] || seen[startIdx]) continue;

      let head = 0;
      let tail = 0;
      queueX[tail] = x;
      queueY[tail] = y;
      tail += 1;
      seen[startIdx] = 1;

      let size = 0;
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;

      while (head < tail) {
        const cx = queueX[head];
        const cy = queueY[head];
        head += 1;
        size += 1;

        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        const neighbors = [
          [cx + 1, cy],
          [cx - 1, cy],
          [cx, cy + 1],
          [cx, cy - 1],
        ];

        for (const [nx, ny] of neighbors) {
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const nidx = ny * width + nx;
          if (mask[nidx] && !seen[nidx]) {
            seen[nidx] = 1;
            queueX[tail] = nx;
            queueY[tail] = ny;
            tail += 1;
          }
        }
      }

      const boxW = maxX - minX + 1;
      const boxH = maxY - minY + 1;
      const isCandidate = boxW >= 120 && boxH >= 120;
      if (!isCandidate) continue;

      if (!best || size > best.size) {
        best = { size, minX, minY, maxX, maxY, boxW, boxH };
      }
    }
  }

  return best;
}

export async function POST(req) {
  try {
    const payload = await req.json();
    const { registrationId } = payload;
    const qrPayload =
      payload.qrValue != null && String(payload.qrValue).trim() !== ''
        ? String(payload.qrValue).trim()
        : registrationId;
    const settings = normalizeIdCardSettings(payload.settings);
    const slotPercent = payload.slotPercent && typeof payload.slotPercent === 'object'
      ? {
          leftPct: Number(payload.slotPercent.leftPct),
          topPct: Number(payload.slotPercent.topPct),
          sizePct: Number(payload.slotPercent.sizePct),
        }
      : null;
    const directPlacement = payload.placement && typeof payload.placement === 'object'
      ? {
          qrX: Math.max(0, Math.round(Number(payload.placement.qrX) || 0)),
          qrY: Math.max(0, Math.round(Number(payload.placement.qrY) || 0)),
          qrWidth: Math.max(64, Math.round(Number(payload.placement.qrWidth) || 0)),
        }
      : null;

    if (!qrPayload) {
      return NextResponse.json({ success: false, message: 'qrValue or registrationId is required' }, { status: 400 });
    }

    const templateBasename = path.basename(settings.templateFile);
    const extension = path.extname(templateBasename).toLowerCase();
    const allowedExts = new Set(['.png', '.jpg', '.jpeg', '.webp']);
    if (!allowedExts.has(extension)) {
      return NextResponse.json({ success: false, message: 'Invalid template file type' }, { status: 400 });
    }

    const templatePath = path.join(process.cwd(), 'public', templateBasename);
    const templateBuffer = await readFile(templatePath);
    const templateMetadata = await sharp(templateBuffer).metadata();
    const templateWidth = templateMetadata.width;
    const templateHeight = templateMetadata.height;

    if (!templateWidth || !templateHeight) {
      return NextResponse.json({ success: false, message: 'Unable to read template dimensions' }, { status: 400 });
    }

    const placementFromPercent =
      slotPercent &&
      Number.isFinite(slotPercent.leftPct) &&
      Number.isFinite(slotPercent.topPct) &&
      Number.isFinite(slotPercent.sizePct)
        ? {
            qrX: Math.max(0, Math.round(slotPercent.leftPct * templateWidth)),
            qrY: Math.max(0, Math.round(slotPercent.topPct * templateHeight)),
            qrWidth: Math.max(64, Math.round(slotPercent.sizePct * templateWidth)),
          }
        : null;

    let placement = placementFromPercent || directPlacement || getScaledQrPlacement(settings, templateWidth, templateHeight);

    const clientProvidedPlacement = Boolean(placementFromPercent || directPlacement);
    if (!clientProvidedPlacement) {
      const whiteRegion = await detectLargestWhiteRegion(templateBuffer);
      if (whiteRegion) {
        const maxWidthInBox = Math.min(whiteRegion.boxW, whiteRegion.boxH);
        const qrWidth = Math.min(placement.qrWidth, maxWidthInBox);
        const maxX = whiteRegion.maxX - qrWidth + 1;
        const maxY = whiteRegion.maxY - qrWidth + 1;
        placement = {
          qrWidth,
          qrX: Math.min(Math.max(placement.qrX, whiteRegion.minX), maxX),
          qrY: Math.min(Math.max(placement.qrY, whiteRegion.minY), maxY),
        };
      }
    }

    const qrBuffer = await QRCode.toBuffer(qrPayload, {
      errorCorrectionLevel: 'H',
      margin: 0,
      width: placement.qrWidth,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    const cardBuffer = await sharp(templateBuffer)
      .composite([
        {
          input: qrBuffer,
          left: placement.qrX,
          top: placement.qrY,
        },
      ])
      .png()
      .toBuffer();

    return new NextResponse(cardBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        // Keep this response as raw image bytes; client handles the single download action.
        'Content-Disposition': 'inline',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('ID card image generation failed:', error);
    return NextResponse.json({ success: false, message: 'Failed to generate ID card image' }, { status: 500 });
  }
}
