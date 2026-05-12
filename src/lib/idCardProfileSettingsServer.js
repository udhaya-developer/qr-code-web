import connectDB from '@/lib/mongodb';
import IdCardProfileConfig from '@/models/IdCardProfileConfig';
import {
  getDefaultIdCardProfiles,
  normalizeIdCardSettings,
  normalizeProfileKey,
} from '@/lib/idCardTemplateSettings';

/** Template calibration JSON for server-side Excel distribution (MongoDB). */
export async function getProfileSettingsForDistribution(profileKey) {
  const k = normalizeProfileKey(profileKey);
  const defaults = getDefaultIdCardProfiles();
  try {
    await connectDB();
    const doc = await IdCardProfileConfig.findOne({ key: 'singleton' }).lean();
    const raw = doc?.profiles?.[k];
    if (raw && typeof raw === 'object') {
      return normalizeIdCardSettings(raw);
    }
  } catch {
    // DB unavailable — fall back to code defaults
  }
  return normalizeIdCardSettings(defaults[k]);
}
