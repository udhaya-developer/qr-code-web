import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getNextMockTicketNumber, getNextTicketNumber } from '@/lib/nextTicketNumber';
import Attendee from '@/models/Attendee';

export async function POST(req) {
  try {
    const data = await req.json();

    try {
      await connectDB();

      const ticketNumber = await getNextTicketNumber();
      const registrationId = `SRG-${ticketNumber.toString().padStart(4, '0')}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

      const attendee = await Attendee.create({
        ...data,
        registrationId,
        ticketNumber,
      });

      return NextResponse.json({ success: true, data: attendee }, { status: 201 });
    } catch (dbError) {
      if (dbError.code === 11000) {
        return NextResponse.json(
          { success: false, message: 'Email already registered.' },
          { status: 400 }
        );
      }
      if (dbError.name === 'ValidationError') {
        return NextResponse.json(
          { success: false, message: dbError.message },
          { status: 400 }
        );
      }

      const allowMock = String(process.env.ALLOW_MOCK_MODE || '').toLowerCase() === 'true';
      if (allowMock) {
        console.warn('MongoDB connection failed, falling back to Mock mode:', dbError?.message || dbError);
        const ticketNumber = getNextMockTicketNumber();
        const registrationId = `MOCK-${Math.floor(1000 + Math.random() * 9000)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
        return NextResponse.json(
          {
            success: true,
            data: { ...data, registrationId, ticketNumber, _id: 'mock-id' },
            message: 'Running in demo mode (MongoDB not connected)',
          },
          { status: 201 }
        );
      }

      console.error('MongoDB connection failed during registration:', dbError);
      return NextResponse.json(
        {
          success: false,
          message: 'Database unavailable. Registration was not saved.',
          ...(process.env.NODE_ENV !== 'production'
            ? { debug: { error: dbError?.message || String(dbError) } }
            : {}),
        },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error('Registration Error:', error);
    if (error.code === 11000) {
      return NextResponse.json({ success: false, message: 'Email already registered.' }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
