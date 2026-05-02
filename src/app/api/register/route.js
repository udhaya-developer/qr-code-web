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
      console.warn('MongoDB connection failed, falling back to Mock mode:', dbError.message);

      const ticketNumber = getNextMockTicketNumber();
      const registrationId = `MOCK-${Math.floor(1000 + Math.random() * 9000)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

      return NextResponse.json({
        success: true,
        data: { ...data, registrationId, ticketNumber, _id: 'mock-id' },
        message: 'Running in demo mode (MongoDB not connected)',
      }, { status: 201 });
    }
  } catch (error) {
    console.error('Registration Error:', error);
    if (error.code === 11000) {
      return NextResponse.json({ success: false, message: 'Email already registered.' }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
