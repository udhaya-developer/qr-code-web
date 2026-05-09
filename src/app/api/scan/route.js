import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Attendee from '@/models/Attendee';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Public attendee snapshot for scan UI (no internal Mongo fields). */
function serializeAttendee(attendee) {
  if (!attendee) return null;
  const o =
    typeof attendee.toObject === 'function'
      ? attendee.toObject({ getters: true })
      : { ...attendee };
  return {
    fullName: o.fullName ?? '',
    email: o.email ?? '',
    phone: o.phone ?? '',
    guestType: o.guestType ?? 'normal',
    referredBy: o.referredBy ?? '',
    squad: o.squad ?? '',
    registrationId: o.registrationId ?? '',
    ticketNumber: o.ticketNumber ?? null,
    checkedIn: !!o.checkedIn,
    checkedInAt: o.checkedInAt ? new Date(o.checkedInAt).toISOString() : null,
    createdAt: o.createdAt ? new Date(o.createdAt).toISOString() : null,
  };
}

function normalizeGateType(v) {
  const raw = String(v ?? '').trim().toLowerCase();
  if (!raw) return '';
  if (raw === 'vip' || raw.includes('vip')) return 'vip';
  if (raw === 'normal' || raw.includes('normal')) return 'normal';
  return '';
}

/** Resolve QR payload: numeric ticket (e.g. "42") or legacy registration id string. */
function lookupFilterFromScan(scanned) {
  const trimmed = String(scanned ?? '').trim();
  if (!trimmed) return null;

  // Accept ticket numbers with minor decoration like "#3"
  const ticketLike = trimmed.replace(/^\s*#\s*/, '').trim();
  const asNum = Number(ticketLike);
  if (
    Number.isSafeInteger(asNum) &&
    asNum >= 1 &&
    String(asNum) === ticketLike
  ) {
    return { ticketNumber: asNum };
  }
  return { registrationId: trimmed };
}

export async function POST(req) {
  try {
    const body = await req.json();
    const scanned = body.registrationId ?? body.code ?? '';
    const gateType = normalizeGateType(body.gateType ?? body.gate ?? '');

    const filter = lookupFilterFromScan(scanned);
    if (!filter) {
      return NextResponse.json({ success: false, message: 'Invalid QR Code' }, { status: 400 });
    }

    // Cold starts / transient DNS hiccups can cause the very first request to fail.
    // Retry once before treating it as a service outage.
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        await connectDB();
        const attendee = await Attendee.findOne(filter);

        if (!attendee) {
          return NextResponse.json(
            {
              success: false,
              message: 'Attendee not found',
              ...(process.env.NODE_ENV !== 'production'
                ? { debug: { scanned: String(scanned ?? ''), filter } }
                : {}),
            },
            { status: 404 }
          );
        }

        if (gateType && String(attendee.guestType || 'normal') !== gateType) {
          return NextResponse.json(
            {
              success: false,
              reason: 'gate_mismatch',
              message: gateType === 'vip' ? 'VIP gate only. This is a Normal guest.' : 'Normal gate only. This is a VIP guest.',
              attendee: serializeAttendee(attendee),
            },
            { status: 403 }
          );
        }

        if (attendee.checkedIn) {
          return NextResponse.json(
            {
              success: false,
              reason: 'already_checked_in',
              message: 'Already Checked In',
              attendee: serializeAttendee(attendee),
            },
            { status: 400 }
          );
        }

        attendee.checkedIn = true;
        attendee.checkedInAt = new Date();
        await attendee.save();

        return NextResponse.json({
          success: true,
          message: 'Access Granted',
          attendee: serializeAttendee(attendee),
        });
      } catch (dbError) {
        console.warn(`Scan DB failure (attempt ${attempt}/2)`, dbError?.message || dbError);
        if (attempt === 1) {
          await sleep(350);
          continue;
        }
        return NextResponse.json(
          {
            success: false,
            message: 'Database unavailable. Please retry scan.',
          },
          { status: 503 }
        );
      }
    }

  } catch (error) {
    console.error('Scan Error:', error);
    return NextResponse.json({ success: false, message: 'Server Error' }, { status: 500 });
  }
}
