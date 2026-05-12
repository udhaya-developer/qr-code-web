import path from 'path';
import connectDB from '@/lib/mongodb';
import IdCardTemplateAsset from '@/models/IdCardTemplateAsset';
import { mongoTemplateAssetSlotKey, normalizeProfileKey } from '@/lib/idCardTemplateSettings';

const ALLOWED_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp']);

export function contentTypeFromExtension(ext) {
  const e = String(ext || '').toLowerCase();
  const map = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
  };
  return map[e] || 'application/octet-stream';
}

export function extensionFromStoredDoc(doc) {
  if (!doc) return '.png';
  const fromName = path.extname(String(doc.originalName || '')).toLowerCase();
  if (ALLOWED_EXT.has(fromName)) return fromName;
  const ct = String(doc.contentType || '').toLowerCase();
  if (ct.includes('png')) return '.png';
  if (ct.includes('webp')) return '.webp';
  if (ct.includes('jpeg') || ct.includes('jpg')) return '.jpg';
  return '.png';
}

/**
 * Mongo lean() / driver may return Buffer, Uint8Array, or BSON Binary — normalize for Sharp & NextResponse.
 */
export function normalizeMongoBinaryField(raw) {
  if (raw == null) return null;
  if (Buffer.isBuffer(raw)) return raw;
  if (raw instanceof Uint8Array) return Buffer.from(raw);
  if (raw instanceof ArrayBuffer) return Buffer.from(raw);

  if (typeof raw === 'object') {
    if (raw.type === 'Buffer' && Array.isArray(raw.data)) {
      return Buffer.from(raw.data);
    }
    if (raw.$binary?.base64) {
      return Buffer.from(String(raw.$binary.base64), 'base64');
    }
    const bsonName = raw._bsontype || raw.constructor?.name;
    if (bsonName === 'Binary') {
      const v = raw.buffer ?? raw.value;
      if (Buffer.isBuffer(v)) return v;
      if (v instanceof Uint8Array) return Buffer.from(v);
      if (typeof v === 'string') return Buffer.from(v, 'base64');
    }
    if (typeof raw.subarray === 'function' && raw.buffer instanceof ArrayBuffer) {
      return Buffer.from(raw);
    }
  }

  try {
    return Buffer.from(raw);
  } catch {
    return null;
  }
}

export function bufferFromStoredDoc(doc) {
  if (!doc?.data) return null;
  return normalizeMongoBinaryField(doc.data);
}

export async function getStoredIdCardTemplateLean(profileKey = 'default') {
  const profile = normalizeProfileKey(profileKey);
  await connectDB();
  const slot = mongoTemplateAssetSlotKey(profile);
  let doc = await IdCardTemplateAsset.findOne({ profile }).lean();
  if (!doc) {
    doc = await IdCardTemplateAsset.findOne({ key: slot }).lean();
  }
  if (!doc && profile === 'default') {
    doc = await IdCardTemplateAsset.findOne({ key: 'current' }).lean();
  }
  return doc;
}

/**
 * Which of the three template profiles have image bytes in MongoDB (no full buffer loaded).
 * One logical row per profile: `default` | `guest` | `vip` (default may still be legacy `key: 'current'`).
 */
export async function getStoredTemplateProfilesStatus() {
  await connectDB();
  const coll = IdCardTemplateAsset.collection;

  const projectStage = {
    $project: {
      updatedAt: 1,
      profile: 1,
      key: 1,
      byteLength: {
        $cond: [{ $ne: ['$data', null] }, { $binarySize: '$data' }, 0],
      },
    },
  };

  const runAgg = async (pipeline) => {
    try {
      const rows = await coll.aggregate(pipeline).toArray();
      const r = rows[0];
      return {
        stored: (r?.byteLength ?? 0) > 0,
        byteLength: r?.byteLength ?? 0,
        updatedAt: r?.updatedAt ? new Date(r.updatedAt).toISOString() : null,
        legacyKeyCurrent: r?.key === 'current' && r?.profile !== 'default',
      };
    } catch {
      return null;
    }
  };

  const defaultMeta = await runAgg([
    {
      $match: {
        $or: [{ profile: 'default' }, { key: 'current' }, { key: mongoTemplateAssetSlotKey('default') }],
      },
    },
    { $addFields: { _p: { $cond: [{ $eq: ['$profile', 'default'] }, 0, 1] } } },
    { $sort: { _p: 1 } },
    { $limit: 1 },
    projectStage,
  ]);

  const guestMeta = await runAgg([
    { $match: { $or: [{ profile: 'guest' }, { key: mongoTemplateAssetSlotKey('guest') }] } },
    { $limit: 1 },
    projectStage,
  ]);
  const vipMeta = await runAgg([
    { $match: { $or: [{ profile: 'vip' }, { key: mongoTemplateAssetSlotKey('vip') }] } },
    { $limit: 1 },
    projectStage,
  ]);

  if (defaultMeta && guestMeta && vipMeta) {
    return { default: defaultMeta, guest: guestMeta, vip: vipMeta };
  }

  const fallback = async (profile) => {
    const doc = await getStoredIdCardTemplateLean(profile);
    const buf = bufferFromStoredDoc(doc);
    const len = buf?.length ?? 0;
    return {
      stored: len > 0,
      byteLength: len,
      updatedAt: doc?.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
      legacyKeyCurrent: !!(doc?.key === 'current' && profile === 'default'),
    };
  };

  return {
    default: defaultMeta ?? (await fallback('default')),
    guest: guestMeta ?? (await fallback('guest')),
    vip: vipMeta ?? (await fallback('vip')),
  };
}

export async function upsertStoredIdCardTemplate({ profile: profileKey = 'default', data, contentType, originalName }) {
  const profile = normalizeProfileKey(profileKey);
  await connectDB();

  const coll = IdCardTemplateAsset.collection;
  const now = new Date();
  const originalNameStr = String(originalName || '');
  const slotKey = mongoTemplateAssetSlotKey(profile);
  const setBlob = {
    data,
    contentType,
    originalName: originalNameStr,
    updatedAt: now,
    key: slotKey,
  };

  /**
   * Avoid E11000 duplicate key on `profile` when a legacy row uses `key: 'current'` instead of
   * `profile: 'default'` — a blind upsert can try to INSERT a second "default" row.
   * Always set `key` to mongoTemplateAssetSlotKey(profile) so a unique index on `key` never
   * collides on multiple documents with missing/null `key` (which blocked guest/VIP uploads).
   */
  if (profile === 'default') {
    const byProfile = await coll.findOne({ profile: 'default' });
    if (byProfile) {
      await coll.updateOne({ _id: byProfile._id }, { $set: { ...setBlob } });
      return IdCardTemplateAsset.findOne({ profile: 'default' }).exec();
    }
    const legacy = await coll.findOne({ key: 'current' });
    if (legacy) {
      await coll.updateOne({ _id: legacy._id }, { $set: { profile: 'default', ...setBlob } });
      return IdCardTemplateAsset.findOne({ profile: 'default' }).exec();
    }
  } else {
    const existing = (await coll.findOne({ profile })) || (await coll.findOne({ key: slotKey }));
    if (existing) {
      await coll.updateOne({ _id: existing._id }, { $set: { profile, ...setBlob } });
      return IdCardTemplateAsset.findOne({ profile }).exec();
    }
  }

  try {
    await coll.updateOne(
      { profile },
      {
        $set: { profile, ...setBlob },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    );
  } catch (err) {
    if (err?.code === 11000) {
      const row =
        (await coll.findOne({ profile })) ||
        (await coll.findOne({ key: slotKey })) ||
        (profile === 'default' ? await coll.findOne({ key: 'current' }) : null);
      if (row) {
        await coll.updateOne({ _id: row._id }, { $set: { profile, ...setBlob } });
      } else {
        throw err;
      }
    } else {
      throw err;
    }
  }

  return IdCardTemplateAsset.findOne({ profile }).exec();
}
