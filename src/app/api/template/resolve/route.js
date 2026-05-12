import { NextResponse } from 'next/server';
import path from 'path';
import { resolveTemplatePublicPath } from '@/lib/templateAssetPath';
import { bufferFromStoredDoc, getStoredIdCardTemplateLean } from '@/lib/idCardTemplateFromDb';
import {
  isStoredIdCardTemplateFile,
  profileFromStoredTemplateFile,
  templateFileForStoredProfile,
} from '@/lib/idCardTemplateSettings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req) {
  const q = new URL(req.url).searchParams.get('q');

  if (isStoredIdCardTemplateFile(q)) {
    try {
      const profile = profileFromStoredTemplateFile(q) || 'default';
      const doc = await getStoredIdCardTemplateLean(profile);
      if (bufferFromStoredDoc(doc)?.length) {
        return NextResponse.json({ ok: true, templateFile: templateFileForStoredProfile(profile) });
      }
    } catch {
      // fall through to 404
    }
    return NextResponse.json({ ok: false, message: 'Template not found' }, { status: 404 });
  }

  const publicDir = path.join(process.cwd(), 'public');
  const resolved = await resolveTemplatePublicPath(publicDir, q);
  if (!resolved) {
    return NextResponse.json({ ok: false, message: 'Template not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, templateFile: resolved.rel });
}
