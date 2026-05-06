import { NextResponse } from 'next/server';
import { generateIdCardPng } from '@/lib/generateIdCardPng';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const payload = await req.json();
    const { registrationId } = payload;
    const { buffer } = await generateIdCardPng({
      registrationId,
      qrValue: payload.qrValue,
      settings: payload.settings,
      slotPercent: payload.slotPercent,
      placement: payload.placement,
      allowAutoDetectWhiteRegion: true,
    });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        // Keep this response as raw image bytes; client handles the single download action.
        'Content-Disposition': 'inline',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('ID card image generation failed:', error);
    const status = Number(error?.statusCode) || 500;
    const message = status === 500 ? 'Failed to generate ID card image' : String(error?.message || 'Bad Request');
    return NextResponse.json({ success: false, message }, { status });
  }
}
