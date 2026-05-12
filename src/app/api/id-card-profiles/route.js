import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import IdCardProfileConfig from '@/models/IdCardProfileConfig';
import { normalizeAllProfiles, normalizeIdCardSettings } from '@/lib/idCardTemplateSettings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const body = await req.json();
    const merged = normalizeAllProfiles(body.profiles || body);
    const normalized = {
      default: normalizeIdCardSettings(merged.default),
      guest: normalizeIdCardSettings(merged.guest),
      vip: normalizeIdCardSettings(merged.vip),
    };

    await connectDB();
    await IdCardProfileConfig.findOneAndUpdate(
      { key: 'singleton' },
      { $set: { profiles: normalized } },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('id-card-profiles sync error:', error);
    return NextResponse.json({ success: false, message: 'Failed to save profiles' }, { status: 500 });
  }
}
