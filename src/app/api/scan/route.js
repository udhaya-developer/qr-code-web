import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Attendee from '@/models/Attendee';

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
    referredBy: o.referredBy ?? '',
    squad: o.squad ?? '',
    registrationId: o.registrationId ?? '',
    ticketNumber: o.ticketNumber ?? null,
    checkedIn: !!o.checkedIn,
    checkedInAt: o.checkedInAt ? new Date(o.checkedInAt).toISOString() : null,
    createdAt: o.createdAt ? new Date(o.createdAt).toISOString() : null,
  };
}

/** Resolve QR payload: numeric ticket (e.g. "42") or legacy registration id string. */
function lookupFilterFromScan(scanned) {
  const trimmed = String(scanned ?? '').trim();
  if (!trimmed) return null;
  const asNum = Number(trimmed);
  if (
    Number.isSafeInteger(asNum) &&
    asNum >= 1 &&
    String(asNum) === trimmed
  ) {
    return { ticketNumber: asNum };
  }
  return { registrationId: trimmed };
}

export async function POST(req) {
  try {
    const body = await req.json();
    const scanned = body.registrationId ?? body.code ?? '';

    const filter = lookupFilterFromScan(scanned);
    if (!filter) {
      return NextResponse.json({ success: false, message: 'Invalid QR Code' }, { status: 400 });
    }

    try {
      await connectDB();
      const attendee = await Attendee.findOne(filter);

      if (!attendee) {
        return NextResponse.json({ success: false, message: 'Attendee not found' }, { status: 404 });
      }

      if (attendee.checkedIn) {
        return NextResponse.json({
          success: false,
          message: 'Already Checked In',
          attendee: serializeAttendee(attendee),
        }, { status: 400 });
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
      console.warn('Scan DB failure, using Mock mode');
      const registrationId = typeof scanned === 'string' ? scanned : String(scanned);
      if (registrationId.includes('ALREADY')) {
        return NextResponse.json({ success: false, message: 'Already Checked In' }, { status: 400 });
      }
      if (registrationId.includes('INVALID')) {
        return NextResponse.json({ success: false, message: 'Attendee not found' }, { status: 404 });
      }

      const ticketMatch = /^\d+$/.test(registrationId.trim());
      const now = new Date().toISOString();
      return NextResponse.json({
        success: true,
        message: 'Access Granted (Mock)',
        attendee: {
          fullName: 'Mock Attendee',
          email: 'demo@example.com',
          phone: '+1 000 000 0000',
          referredBy: 'None',
          squad: 'SURGE',
          registrationId,
          ticketNumber: ticketMatch ? Number(registrationId.trim()) : null,
          checkedIn: true,
          checkedInAt: now,
          createdAt: now,
        },
      });
    }

  } catch (error) {
    console.error('Scan Error:', error);
    return NextResponse.json({ success: false, message: 'Server Error' }, { status: 500 });
  }
}
