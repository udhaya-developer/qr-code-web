import path from 'path';
import { access, readdir } from 'fs/promises';

const ALLOWED_EXT = ['.png', '.jpg', '.jpeg', '.webp'];

/**
 * Safe relative path under /public (POSIX-style, no leading slash, no "..").
 */
export function normalizeTemplatePublicRel(templateFile) {
  let rel = String(templateFile || '')
    .trim()
    .replace(/^\/+/, '')
    .replace(/\\/g, '/');
  if (!rel || rel.includes('..')) return null;
  return rel;
}

export async function resolveTemplatePublicPath(publicDir, templateFile) {
  const rel = normalizeTemplatePublicRel(templateFile);
  if (!rel) return null;

  const tryAccess = async (r) => {
    const full = path.join(publicDir, r);
    try {
      await access(full);
      return { rel: r.replace(/\\/g, '/'), full };
    } catch {
      return null;
    }
  };

  const direct = await tryAccess(rel);
  if (direct) return direct;

  const ext = path.extname(rel).toLowerCase();
  if (!ALLOWED_EXT.includes(ext)) {
    for (const e of ALLOWED_EXT) {
      const hit = await tryAccess(rel + e);
      if (hit) return hit;
    }
  }

  if (rel.startsWith('id-templates/')) {
    const base = path.basename(rel);
    const dir = path.join(publicDir, 'id-templates');
    let files = [];
    try {
      files = await readdir(dir);
    } catch {
      return null;
    }
    const matches = files.filter((f) => {
      const fe = path.extname(f).toLowerCase();
      if (!ALLOWED_EXT.includes(fe)) return false;
      const stem = f.slice(0, -fe.length);
      return stem.startsWith(base);
    });
    if (matches.length === 1) {
      const r = `id-templates/${matches[0]}`.replace(/\\/g, '/');
      return { rel: r, full: path.join(publicDir, r) };
    }
  }

  return null;
}
