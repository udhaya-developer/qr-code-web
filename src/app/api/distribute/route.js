import { NextResponse } from 'next/server';
import { distributeIdCard } from '@/lib/distributeIdCard';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const body = await req.json();
    const registrationId = String(body.registrationId || body.id || '').trim();
    if (!registrationId) {
      return NextResponse.json({ success: false, message: 'registrationId is required' }, { status: 400 });
    }

    const customMessage = typeof body.message === 'string' ? body.message : '';
    const settings = body.settings;
    const placement = body.placement;
    const slotPercent = body.slotPercent;

    const fallbackAttendee = body.attendee && typeof body.attendee === 'object' ? body.attendee : null;
    const fallbackFromBody =
      fallbackAttendee ||
      (body.fullName || body.email || body.phone || body.squad || body.ticketNumber
        ? {
            fullName: body.fullName,
            email: body.email,
            phone: body.phone,
            squad: body.squad,
            ticketNumber: body.ticketNumber,
          }
        : null);

    const out = await distributeIdCard({
      registrationId,
      message: customMessage,
      settings,
      placement,
      slotPercent,
      attendeeFallback: fallbackFromBody,
      qrValue: body.qrValue,
      excelRowGuestType: body.excelRowGuestType,
    });

    if (!out.success) {
      return NextResponse.json({ success: false, message: out.message }, { status: out.status || 500 });
    }

    return NextResponse.json(out, { status: 200 });
  } catch (error) {
    console.error('Distribution error:', error);
    return NextResponse.json({ success: false, message: 'Failed to distribute ID card' }, { status: 500 });
  }
}

