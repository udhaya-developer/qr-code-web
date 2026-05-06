import path from 'path';
import { readFile } from 'fs/promises';
import sharp from 'sharp';
import QRCode from 'qrcode';
import { getScaledQrPlacement, normalizeIdCardSettings } from '@/lib/idCardTemplateSettings';

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

/**
 * Generate an ID-card PNG buffer by compositing a QR on top of a template image in /public.
 * Returns { buffer, placement, templateWidth, templateHeight }.
 */
export async function generateIdCardPng({
  registrationId,
  qrValue,
  settings,
  slotPercent,
  placement,
  allowAutoDetectWhiteRegion = true,
}) {
  const qrPayload =
    qrValue != null && String(qrValue).trim() !== '' ? String(qrValue).trim() : registrationId;

  if (!qrPayload) {
    const err = new Error('qrValue or registrationId is required');
    err.statusCode = 400;
    throw err;
  }

  const normalizedSettings = normalizeIdCardSettings(settings);

  const templateBasename = path.basename(normalizedSettings.templateFile);
  const extension = path.extname(templateBasename).toLowerCase();
  const allowedExts = new Set(['.png', '.jpg', '.jpeg', '.webp']);
  if (!allowedExts.has(extension)) {
    const err = new Error('Invalid template file type');
    err.statusCode = 400;
    throw err;
  }

  const templatePath = path.join(process.cwd(), 'public', templateBasename);
  const templateBuffer = await readFile(templatePath);
  const templateMetadata = await sharp(templateBuffer).metadata();
  const templateWidth = templateMetadata.width;
  const templateHeight = templateMetadata.height;

  if (!templateWidth || !templateHeight) {
    const err = new Error('Unable to read template dimensions');
    err.statusCode = 400;
    throw err;
  }

  const safeSlotPercent =
    slotPercent && typeof slotPercent === 'object'
      ? {
          leftPct: Number(slotPercent.leftPct),
          topPct: Number(slotPercent.topPct),
          sizePct: Number(slotPercent.sizePct),
        }
      : null;

  const placementFromPercent =
    safeSlotPercent &&
    Number.isFinite(safeSlotPercent.leftPct) &&
    Number.isFinite(safeSlotPercent.topPct) &&
    Number.isFinite(safeSlotPercent.sizePct)
      ? {
          qrX: Math.max(0, Math.round(safeSlotPercent.leftPct * templateWidth)),
          qrY: Math.max(0, Math.round(safeSlotPercent.topPct * templateHeight)),
          qrWidth: Math.max(64, Math.round(safeSlotPercent.sizePct * templateWidth)),
        }
      : null;

  const directPlacement =
    placement && typeof placement === 'object'
      ? {
          qrX: Math.max(0, Math.round(Number(placement.qrX) || 0)),
          qrY: Math.max(0, Math.round(Number(placement.qrY) || 0)),
          qrWidth: Math.max(64, Math.round(Number(placement.qrWidth) || 0)),
        }
      : null;

  let finalPlacement =
    placementFromPercent ||
    directPlacement ||
    getScaledQrPlacement(normalizedSettings, templateWidth, templateHeight);

  const clientProvidedPlacement = Boolean(placementFromPercent || directPlacement);
  if (!clientProvidedPlacement && allowAutoDetectWhiteRegion) {
    const whiteRegion = await detectLargestWhiteRegion(templateBuffer);
    if (whiteRegion) {
      const maxWidthInBox = Math.min(whiteRegion.boxW, whiteRegion.boxH);
      const qrWidth = Math.min(finalPlacement.qrWidth, maxWidthInBox);
      const maxX = whiteRegion.maxX - qrWidth + 1;
      const maxY = whiteRegion.maxY - qrWidth + 1;
      finalPlacement = {
        qrWidth,
        qrX: Math.min(Math.max(finalPlacement.qrX, whiteRegion.minX), maxX),
        qrY: Math.min(Math.max(finalPlacement.qrY, whiteRegion.minY), maxY),
      };
    }
  }

  const qrBuffer = await QRCode.toBuffer(qrPayload, {
    errorCorrectionLevel: 'H',
    margin: 0,
    width: finalPlacement.qrWidth,
    color: { dark: '#000000', light: '#FFFFFF' },
  });

  const buffer = await sharp(templateBuffer)
    .composite([{ input: qrBuffer, left: finalPlacement.qrX, top: finalPlacement.qrY }])
    .png()
    .toBuffer();

  return {
    buffer,
    placement: finalPlacement,
    templateWidth,
    templateHeight,
  };
}

