import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { mongoFailureHint } from '@/lib/mongoDiagnostics';
import { normalizeProfileKey, templateFileForStoredProfile } from '@/lib/idCardTemplateSettings';
import { contentTypeFromExtension, upsertStoredIdCardTemplate } from '@/lib/idCardTemplateFromDb';

/** BSON document cap ~16MB; stay under with metadata overhead */
const MAX_TEMPLATE_BYTES = 15 * 1024 * 1024;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'id-templates');
const ALLOWED_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp']);

function isEphemeralServerFilesystem() {
  return (
    process.env.VERCEL === '1' ||
    !!process.env.AWS_LAMBDA_FUNCTION_NAME ||
    String(process.env.NETLIFY || '').toLowerCase() === 'true'
  );
}

/** Disk writes under public/ are not deployable and vanish on serverless / new instances — only allow as a local-dev fallback. */
function allowFilesystemTemplateFallback() {
  return !isEphemeralServerFilesystem() && process.env.NODE_ENV !== 'production';
}

/** Browsers open URLs with GET — explain POST-only so this is not mistaken for a broken route. */
export async function GET() {
  return NextResponse.json({
    message: 'This URL only accepts POST (multipart upload). A browser address bar uses GET, which is why you may have seen HTTP 405 before.',
    method: 'POST',
    contentType: 'multipart/form-data',
    formFields: {
      file: 'PNG, JPEG, or WebP',
      profile: 'default | guest | vip (Settings “Website registration” tab = default)',
    },
    tip: 'Upload from your app’s /settings page, or use curl: curl -X POST -F "file=@template.png" -F "profile=default" https://YOUR_DOMAIN/api/template/upload',
    maxBytes: MAX_TEMPLATE_BYTES,
    healthChecks: {
      pingOnly: 'GET /api/health/mongo',
      pingAndWrite: 'GET /api/health/mongo?checkWrite=1 (add &key=... if MONGO_HEALTH_CHECK_KEY is set)',
    },
  });
}

export async function POST(req) {
  try {
    const form = await req.formData();
    const file = form.get('file');
    const profileKey = normalizeProfileKey(form.get('profile'));

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
    if (buf.length > MAX_TEMPLATE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          code: 'TEMPLATE_TOO_LARGE',
          message: `Image is too large (${Math.round(buf.length / 1024 / 1024)}MB). Max ~${Math.round(MAX_TEMPLATE_BYTES / 1024 / 1024)}MB for MongoDB storage — compress or resize the file.`,
        },
        { status: 413 }
      );
    }

    const contentType = contentTypeFromExtension(ext);

    try {
      await upsertStoredIdCardTemplate({
        profile: profileKey,
        data: buf,
        contentType,
        originalName,
      });
      return NextResponse.json(
        {
          success: true,
          templateFile: templateFileForStoredProfile(profileKey),
          profile: profileKey,
          storage: 'database',
          originalName,
        },
        { status: 200 }
      );
    } catch (dbError) {
      console.warn('Template MongoDB store failed:', dbError?.message || dbError);
      if (!allowFilesystemTemplateFallback()) {
        const hint = mongoFailureHint(dbError);
        const mongoErrorCode = typeof dbError?.code === 'number' ? dbError.code : undefined;
        const mongoErrorName = typeof dbError?.name === 'string' ? dbError.name : undefined;
        return NextResponse.json(
          {
            success: false,
            code: 'MONGO_TEMPLATE_STORE_FAILED',
            message:
              'Could not save the template to MongoDB. On production or serverless, templates must be stored in the database. Set MONGODB_URI on the server, open Atlas → Network Access for your host IPs, redeploy, then upload again in Settings.',
            hint,
            ...(mongoErrorCode !== undefined ? { mongoErrorCode } : {}),
            ...(mongoErrorName ? { mongoErrorName } : {}),
          },
          { status: 503 }
        );
      }
    }

    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    const outName = `tpl-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
    const outPath = path.join(UPLOAD_DIR, outName);
    await fs.writeFile(outPath, buf);

    return NextResponse.json(
      { success: true, templateFile: `id-templates/${outName}`, storage: 'filesystem', originalName },
      { status: 200 }
    );
  } catch (error) {
    console.error('Template upload error:', error);
    return NextResponse.json({ success: false, message: 'Failed to upload template' }, { status: 500 });
  }
}

