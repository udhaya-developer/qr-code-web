import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import IdCard from '@/models/IdCard';

export const runtime = 'nodejs';

export async function GET(_req, { params }) {
  try {
    const registrationId = String(params?.registrationId || '').trim();
    if (!registrationId) {
      return NextResponse.json({ success: false, message: 'registrationId is required' }, { status: 400 });
    }

    await connectDB();
    const latest = await IdCard.findOne({ registrationId }).sort({ createdAt: -1 });
    if (!latest) {
      return NextResponse.json({ success: false, message: 'ID card not found' }, { status: 404 });
    }

    return new NextResponse(latest.fileData, {
      status: 200,
      headers: {
        'Content-Type': latest.contentType || 'image/png',
        'Cache-Control': 'no-store',
        'Content-Disposition': 'inline',
      },
    });
  } catch (error) {
    console.error('Public ID card fetch failed:', error);
    return NextResponse.json({ success: false, message: 'Server Error' }, { status: 500 });
  }
}

