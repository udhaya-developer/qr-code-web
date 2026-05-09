export const ID_CARD_SETTINGS_KEY = 'idCardTemplateSettings';
export const ID_CARD_TEMPLATE_PRESETS_KEY = 'idCardTemplatePresets';

export const DEFAULT_ID_CARD_SETTINGS = {
  templateFile: 'milezero-id-template.png',
  qrX: 142,
  qrY: 371,
  qrWidth: 390,
  templateWidth: 674,
  templateHeight: 1024,
  qrXPct: 0.2107,
  qrYPct: 0.3623,
  qrSizePct: 0.5786,
};

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export function   normalizeIdCardSettings(input) {
  const source = input && typeof input === 'object' ? input : {};

  const templateFileRaw = typeof source.templateFile === 'string' ? source.templateFile.trim() : '';
  const templateFile = templateFileRaw || DEFAULT_ID_CARD_SETTINGS.templateFile;

  const templateWidth = Math.max(1, Math.round(toNumber(source.templateWidth, DEFAULT_ID_CARD_SETTINGS.templateWidth)));
  const templateHeight = Math.max(1, Math.round(toNumber(source.templateHeight, DEFAULT_ID_CARD_SETTINGS.templateHeight)));
  const qrX = Math.max(0, Math.round(toNumber(source.qrX, DEFAULT_ID_CARD_SETTINGS.qrX)));
  const qrY = Math.max(0, Math.round(toNumber(source.qrY, DEFAULT_ID_CARD_SETTINGS.qrY)));
  const qrWidth = Math.max(64, Math.round(toNumber(source.qrWidth, DEFAULT_ID_CARD_SETTINGS.qrWidth)));

  // Always derive normalized values from pixel inputs so live form edits
  // (X/Y/Width) are reflected immediately in preview.
  const qrXPctRaw = qrX / templateWidth;
  const qrYPctRaw = qrY / templateHeight;
  const qrSizePctRaw = qrWidth / Math.min(templateWidth, templateHeight);

  return {
    templateFile,
    qrX,
    qrY,
    qrWidth,
    templateWidth,
    templateHeight,
    qrXPct: Math.min(1, Math.max(0, qrXPctRaw)),
    qrYPct: Math.min(1, Math.max(0, qrYPctRaw)),
    qrSizePct: Math.min(1, Math.max(0.02, qrSizePctRaw)),
  };
}

export function getScaledQrPlacement(settingsInput, targetWidth, targetHeight) {
  const settings = normalizeIdCardSettings(settingsInput);
  const safeTargetWidth = Math.max(1, Math.round(targetWidth || settings.templateWidth));
  const safeTargetHeight = Math.max(1, Math.round(targetHeight || settings.templateHeight));

  const baseMin = Math.min(safeTargetWidth, safeTargetHeight);
  const qrWidthFromPct = Math.round(settings.qrSizePct * baseMin);
  const qrXFromPct = Math.round(settings.qrXPct * safeTargetWidth);
  const qrYFromPct = Math.round(settings.qrYPct * safeTargetHeight);

  return {
    qrX: Math.max(0, qrXFromPct),
    qrY: Math.max(0, qrYFromPct),
    qrWidth: Math.max(64, qrWidthFromPct),
    targetWidth: safeTargetWidth,
    targetHeight: safeTargetHeight,
  };
}

/**
 * Absolute %-based slot for preview/print. Width and height percentages use different
 * bases (CSS), so both resolve to the same pixel size (qrWidth × qrWidth) — matching
 * Sharp composite at (qrX, qrY). Using one fraction for both axes makes a non-square
 * slot and flex-centering skews the QR vs the downloaded PNG.
 */
export function getQrSlotPercentStyle(placement, imageWidth, imageHeight) {
  const w = Math.max(1, imageWidth);
  const h = Math.max(1, imageHeight);
  const qw = placement.qrWidth;
  const x = placement.qrX;
  const y = placement.qrY;
  return {
    width: `${(qw / w) * 100}%`,
    height: `${(qw / h) * 100}%`,
    left: `${(x / w) * 100}%`,
    top: `${(y / h) * 100}%`,
  };
}
