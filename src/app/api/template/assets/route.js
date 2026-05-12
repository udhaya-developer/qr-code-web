import { NextResponse } from 'next/server';
import { getStoredTemplateProfilesStatus } from '@/lib/idCardTemplateFromDb';
import { ID_CARD_PROFILE_KEYS, templateFileForStoredProfile } from '@/lib/idCardTemplateSettings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET — which template image blobs exist in MongoDB (default / guest / vip).
 * Does not return image bytes; safe to call from Settings for status chips.
 */
export async function GET() {
  try {
    const profiles = await getStoredTemplateProfilesStatus();
    const summary = {
      allStored: ID_CARD_PROFILE_KEYS.every((k) => profiles[k]?.stored),
      profiles: {},
    };
    for (const k of ID_CARD_PROFILE_KEYS) {
      const p = profiles[k] || { stored: false, byteLength: 0, updatedAt: null };
      summary.profiles[k] = {
        ...p,
        templateFile: templateFileForStoredProfile(k),
      };
    }
    return NextResponse.json(summary);
  } catch (e) {
    console.error('[template/assets]', e?.message || e);
    return NextResponse.json(
      { ok: false, message: 'Could not read template storage status', hint: e?.message || String(e) },
      { status: 503 }
    );
  }
}
