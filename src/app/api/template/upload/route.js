import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

export const runtime = 'nodejs';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'id-templates');
const ALLOWED_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp']);

function sanitizeBaseName(name) {
  const raw = String(name || '').trim();
  const base = path.basename(raw);
  const withoutExt = base.replace(/\.[^.]+$/, '');
  const cleaned = withoutExt
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return cleaned || 'template';
}

export async function POST(req) {
  try {
    const form = await req.formData();
    const file = form.get('file');

    if (!file) {
      return NextResponse.json({ success: false, message: 'Missing file' }, { status: 400 });
    }

    const originalName = typeof file?.name === 'string' ? file.name : 'template.png';
    const ext = path.extname(originalName).toLowerCase();
    if (!ALLOWED_EXT.has(ext)) {
      return NextResponse.json(
        { success: false, message: `Unsupported file type (${ext || 'unknown'}). Use PNG/JPG/WEBP.` },
        { status: 415 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buf = Buffer.from(arrayBuffer);
    if (!buf?.length) {
      return NextResponse.json({ success: false, message: 'Empty file' }, { status: 400 });
    }

    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    const base = sanitizeBaseName(originalName);
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const rand = crypto.randomBytes(3).toString('hex');
    const outName = `${base}-${stamp}-${rand}${ext}`;
    const outPath = path.join(UPLOAD_DIR, outName);

    await fs.writeFile(outPath, buf);

    return NextResponse.json(
      { success: true, templateFile: `id-templates/${outName}`, originalName },
      { status: 200 }
    );
  } catch (error) {
    console.error('Template upload error:', error);
    return NextResponse.json({ success: false, message: 'Failed to upload template' }, { status: 500 });
  }
}

