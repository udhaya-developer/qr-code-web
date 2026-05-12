import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import { mongoFailureHint } from '@/lib/mongoDiagnostics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HEALTH_PROBE_COLLECTION = '_qr_web_mongo_health';

/**
 * Verifies MongoDB from the same process as production APIs.
 *
 * - Default: `ping` only (connect + auth + network). Does NOT prove readWrite.
 * - Add `checkWrite=1` to run a tiny insert+delete in this database (needs readWrite).
 *
 * Optional: `MONGO_HEALTH_CHECK_KEY` — then require `?key=...` on all requests.
 */
export async function GET(request) {
  const requiredKey = String(process.env.MONGO_HEALTH_CHECK_KEY || '').trim();
  const url = new URL(request.url);
  if (requiredKey) {
    const key = url.searchParams.get('key') || '';
    if (key !== requiredKey) {
      return NextResponse.json({ ok: false, error: 'missing_or_invalid_key' }, { status: 401 });
    }
  }

  try {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ ok: false, mongo: 'no_db_handle', hint: 'Mongoose connected but db is missing.' }, { status: 503 });
    }
    await db.admin().command({ ping: 1 });

    const wantWriteCheck = url.searchParams.get('checkWrite') === '1';

    if (!wantWriteCheck) {
      return NextResponse.json({
        ok: true,
        mongo: 'reachable',
        pingOk: true,
        readyState: mongoose.connection.readyState,
        note:
          'Ping only. Template upload needs readWrite on this database. Call GET /api/health/mongo?checkWrite=1 (and key= if configured) to verify writes match template upload.',
      });
    }

    try {
      const coll = db.collection(HEALTH_PROBE_COLLECTION);
      const probeId = `probe-${Date.now()}`;
      await coll.insertOne({ _id: probeId, at: new Date() });
      await coll.deleteOne({ _id: probeId });
      return NextResponse.json({
        ok: true,
        mongo: 'reachable',
        pingOk: true,
        writeOk: true,
        readyState: mongoose.connection.readyState,
        note: 'Ping + insert/delete succeeded — same permission class as template upload (readWrite on this DB).',
      });
    } catch (writeErr) {
      console.warn('[health/mongo] write probe failed:', writeErr?.message || writeErr);
      const mongoErrorCode = typeof writeErr?.code === 'number' ? writeErr.code : undefined;
      return NextResponse.json(
        {
          ok: false,
          mongo: 'reachable',
          pingOk: true,
          writeOk: false,
          code: 'MONGO_WRITE_FAILED',
          hint: mongoFailureHint(writeErr),
          ...(mongoErrorCode !== undefined ? { mongoErrorCode } : {}),
        },
        { status: 503 }
      );
    }
  } catch (err) {
    console.warn('[health/mongo]', err?.message || err);
    return NextResponse.json(
      {
        ok: false,
        mongo: 'unreachable',
        code: 'MONGO_CONNECT_FAILED',
        hint: mongoFailureHint(err),
      },
      { status: 503 }
    );
  }
}
