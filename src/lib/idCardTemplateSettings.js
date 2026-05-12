export const ID_CARD_SETTINGS_KEY = 'idCardTemplateSettings';
export const ID_CARD_TEMPLATE_PRESETS_KEY = 'idCardTemplatePresets';

/** Magic templateFile values → MongoDB blobs per profile */
export const STORED_TEMPLATE_FILE_BY_PROFILE = {
  default: 'stored-template',
  guest: 'stored-guest',
  vip: 'stored-vip',
};

/** @deprecated use STORED_TEMPLATE_FILE_BY_PROFILE.default */
export const STORED_ID_CARD_TEMPLATE_FILE = STORED_TEMPLATE_FILE_BY_PROFILE.default;

export const ID_CARD_PROFILE_KEYS = /** @type {const} */ (['default', 'guest', 'vip']);

export function normalizeTemplateFileKey(templateFile) {
  return String(templateFile || '')
    .trim()
    .replace(/^\/+/, '')
    .replace(/\\/g, '/');
}

/** Maps Excel/API guestType to template profile (guest profile = normal attendees). */
export function profileKeyFromGuestType(guestType) {
  return String(guestType || 'normal').toLowerCase() === 'vip' ? 'vip' : 'guest';
}

export function normalizeProfileKey(p) {
  const s = String(p || '').trim().toLowerCase();
  if (s === 'guest' || s === 'normal') return 'guest';
  if (s === 'vip') return 'vip';
  return 'default';
}

/**
 * Stable `key` value stored on every template row. If Atlas has a unique index on `key`,
 * multiple rows cannot all omit `key` (null) — that blocked guest/VIP uploads after default.
 * Legacy default used `key: "current"`; we still read that in getStoredIdCardTemplateLean.
 */
export function mongoTemplateAssetSlotKey(profileKey) {
  const k = normalizeProfileKey(profileKey);
  return `__idcard_template_slot__${k}`;
}

export function profileFromStoredTemplateFile(templateFile) {
  const t = normalizeTemplateFileKey(templateFile);
  if (t === STORED_TEMPLATE_FILE_BY_PROFILE.default || t === 'stored-template') return 'default';
  if (t === STORED_TEMPLATE_FILE_BY_PROFILE.guest) return 'guest';
  if (t === STORED_TEMPLATE_FILE_BY_PROFILE.vip) return 'vip';
  return null;
}

export function isStoredIdCardTemplateFile(templateFile) {
  return profileFromStoredTemplateFile(templateFile) != null;
}

export function templateFileForStoredProfile(profileKey) {
  const k = normalizeProfileKey(profileKey);
  return STORED_TEMPLATE_FILE_BY_PROFILE[k] || STORED_TEMPLATE_FILE_BY_PROFILE.default;
}

/** Public URL for <img src> (filesystem under /public or DB-backed API). */
export function getIdCardTemplateImageSrc(templateFile) {
  const t = normalizeTemplateFileKey(templateFile);
  if (!t) return '';
  const profile = profileFromStoredTemplateFile(t);
  if (profile != null) {
    const q = profile === 'default' ? '' : `?profile=${encodeURIComponent(profile)}`;
    return `/api/template/stored${q}`;
  }
  return `/${t}`;
}

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

  const templateFileRaw = typeof source.templateFile === 'string' ? normalizeTemplateFileKey(source.templateFile) : '';
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

export function getDefaultIdCardProfiles() {
  return {
    default: normalizeIdCardSettings({ ...DEFAULT_ID_CARD_SETTINGS }),
    guest: normalizeIdCardSettings({ ...DEFAULT_ID_CARD_SETTINGS }),
    vip: normalizeIdCardSettings({ ...DEFAULT_ID_CARD_SETTINGS }),
  };
}

/**
 * Normalize full localStorage blob: either legacy single settings object or { default, guest, vip }.
 */
export function normalizeAllProfiles(input) {
  const base = getDefaultIdCardProfiles();
  if (!input || typeof input !== 'object') return base;

  if (
    input.default !== undefined &&
    input.guest !== undefined &&
    input.vip !== undefined &&
    typeof input.default === 'object'
  ) {
    return {
      default: normalizeIdCardSettings(input.default),
      guest: normalizeIdCardSettings(input.guest),
      vip: normalizeIdCardSettings(input.vip),
    };
  }

  const single = normalizeIdCardSettings(input);
  return {
    default: single,
    guest: normalizeIdCardSettings({ ...DEFAULT_ID_CARD_SETTINGS, ...input }),
    vip: normalizeIdCardSettings({ ...DEFAULT_ID_CARD_SETTINGS, ...input }),
  };
}

export function getDefaultProfileSettingsFromStorageRaw(rawJson) {
  if (!rawJson) return undefined;
  try {
    const parsed = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
    const profiles = normalizeAllProfiles(parsed);
    return profiles.default;
  } catch {
    return undefined;
  }
}

export function getProfileSettingsFromStorageRaw(rawJson, profileKey) {
  if (!rawJson) return undefined;
  try {
    const parsed = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
    const profiles = normalizeAllProfiles(parsed);
    const k = normalizeProfileKey(profileKey);
    return profiles[k];
  } catch {
    return undefined;
  }
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
/** Stable %-strings so SSR and browser hydration match (no long float drift). */
function pctOf(part, whole) {
  const p = (part / Math.max(1, whole)) * 100;
  return `${Number(p.toFixed(4))}%`;
}

export function getQrSlotPercentStyle(placement, imageWidth, imageHeight) {
  const w = Math.max(1, imageWidth);
  const h = Math.max(1, imageHeight);
  const qw = placement.qrWidth;
  const x = placement.qrX;
  const y = placement.qrY;
  return {
    width: pctOf(qw, w),
    height: pctOf(qw, h),
    left: pctOf(x, w),
    top: pctOf(y, h),
  };
}
