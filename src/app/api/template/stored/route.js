import { NextResponse } from 'next/server';
import { bufferFromStoredDoc, getStoredIdCardTemplateLean } from '@/lib/idCardTemplateFromDb';
import { normalizeProfileKey } from '@/lib/idCardTemplateSettings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const profile = normalizeProfileKey(new URL(req.url).searchParams.get('profile'));
    const doc = await getStoredIdCardTemplateLean(profile);
    const buf = bufferFromStoredDoc(doc);
    if (!buf?.length) {
      return NextResponse.json({ message: 'No template uploaded yet' }, { status: 404 });
    }

    const ct = String(doc.contentType || 'image/png').split(';')[0].trim() || 'image/png';
    const body = new Uint8Array(buf);

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': ct,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('Stored template GET error:', error);
    return NextResponse.json({ message: 'Failed to load template' }, { status: 500 });
  }
}
