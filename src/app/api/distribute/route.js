import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Attendee from '@/models/Attendee';
import IdCard from '@/models/IdCard';
import { generateIdCardPng } from '@/lib/generateIdCardPng';
import { sendGraphEmail } from '@/lib/graphEmail';
import { sendMsg91WhatsAppTemplate } from '@/lib/msg91WhatsApp';
import { DEFAULT_ID_CARD_SETTINGS } from '@/lib/idCardTemplateSettings';

export const runtime = 'nodejs';

function buildPublicIdCardUrl(registrationId) {
  const base = process.env.PUBLIC_BASE_URL;
  if (!base) return '';
  return `${String(base).replace(/\/$/, '')}/api/id-card-public/${encodeURIComponent(registrationId)}`;
}

export async function POST(req) {
  try {
    const body = await req.json();
    const registrationId = String(body.registrationId || body.id || '').trim();
    if (!registrationId) {
      return NextResponse.json({ success: false, message: 'registrationId is required' }, { status: 400 });
    }

    const customMessage = typeof body.message === 'string' ? body.message : '';
    const settings = body.settings || DEFAULT_ID_CARD_SETTINGS;
    const placement = body.placement;
    const slotPercent = body.slotPercent;

    const fallbackAttendee = body.attendee && typeof body.attendee === 'object' ? body.attendee : null;

    const fallbackName = String(body.fullName || fallbackAttendee?.fullName || '').trim();
    const fallbackEmail = String(body.email || fallbackAttendee?.email || '').trim();
    const fallbackPhone = String(body.phone || fallbackAttendee?.phone || '').trim();
    const fallbackSquad = String(body.squad || fallbackAttendee?.squad || '').trim();
    const fallbackTicketNumberRaw = body.ticketNumber ?? fallbackAttendee?.ticketNumber ?? null;
    const fallbackTicketNumber =
      fallbackTicketNumberRaw == null ? null : Number(fallbackTicketNumberRaw);

    const qrValueFromBody =
      body.qrValue != null && String(body.qrValue).trim() !== ''
        ? String(body.qrValue).trim()
        : (Number.isFinite(fallbackTicketNumber) ? String(fallbackTicketNumber) : registrationId);

    let dbConnected = true;
    try {
      await connectDB();
    } catch (dbError) {
      dbConnected = false;
    }

    const attendee = dbConnected ? await Attendee.findOne({ registrationId }) : null;
    const effectiveAttendee = attendee || {
      fullName: fallbackName,
      email: fallbackEmail,
      phone: fallbackPhone,
      squad: fallbackSquad,
      registrationId,
      ticketNumber: Number.isFinite(fallbackTicketNumber) ? fallbackTicketNumber : null,
      _id: null,
    };

    if (!effectiveAttendee.fullName) {
      return NextResponse.json(
        {
          success: false,
          message: dbConnected
            ? 'Attendee not found'
            : 'MongoDB is offline and attendee data was not provided. Send { attendee: {...} } or fullName/email/phone.',
        },
        { status: dbConnected ? 404 : 400 }
      );
    }

    const qrValue = String(
      effectiveAttendee.ticketNumber != null ? effectiveAttendee.ticketNumber : qrValueFromBody
    );

    const { buffer } = await generateIdCardPng({
      registrationId: effectiveAttendee.registrationId,
      qrValue,
      settings,
      placement,
      slotPercent,
      // Keep consistent with the client "Download" flow which provides explicit placement
      // and should not be shifted by template heuristics.
      allowAutoDetectWhiteRegion: false,
    });

    const distDoc = dbConnected
      ? await IdCard.create({
          registrationId: effectiveAttendee.registrationId,
          attendeeId: attendee?._id,
          fileData: buffer,
          contentType: 'image/png',
          email: effectiveAttendee.email || '',
          phone: effectiveAttendee.phone || '',
          status: 'processing',
        })
      : null;

    const publicUrl = dbConnected ? buildPublicIdCardUrl(effectiveAttendee.registrationId) : '';
    const defaultWhatsAppMessage = `Hello ${effectiveAttendee.fullName}, your event ID card is ready.${publicUrl ? ` Download: ${publicUrl}` : ''}`;
    const waMessage = customMessage || defaultWhatsAppMessage;

    let emailStatus = 'skipped';
    let whatsappStatus = 'skipped';

    if (effectiveAttendee.email && String(effectiveAttendee.email).trim() !== '') {
      try {
        const base64Content = buffer.toString('base64');
        await sendGraphEmail({
          toEmail: effectiveAttendee.email,
          name: effectiveAttendee.fullName,
          subject: `Your Event ID Card - ${effectiveAttendee.fullName}`,
          html: `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
              <h2>Hello ${effectiveAttendee.fullName}!</h2>
              <p>Your event ID card is attached to this email.</p>
              ${publicUrl ? `<p>You can also download it here: <a href="${publicUrl}">${publicUrl}</a></p>` : ''}
              <br/>
              <p>Ticket: <b>${qrValue}</b></p>
              <p>Registration ID: <b>${effectiveAttendee.registrationId}</b></p>
            </div>
          `,
          attachmentFilename: `${String(effectiveAttendee.fullName || 'Attendee').replace(/\s+/g, '_')}_ID.png`,
          attachmentContentType: 'image/png',
          attachmentBase64: base64Content,
        });
        emailStatus = 'sent';
      } catch (err) {
        console.error('Graph Email failed:', err.response?.data || err.message);
        emailStatus = 'failed';
      }
    }

    if (effectiveAttendee.phone && String(effectiveAttendee.phone).trim() !== '') {
      try {
        await sendMsg91WhatsAppTemplate({
          phone: effectiveAttendee.phone,
          message: waMessage,
          mediaUrl: publicUrl || undefined,
        });
        whatsappStatus = 'sent';
      } catch (err) {
        console.error('MSG91 WhatsApp failed:', err.response?.data || err.message);
        whatsappStatus = 'failed';
      }
    }

    if (distDoc) {
      distDoc.emailStatus = emailStatus;
      distDoc.whatsappStatus = whatsappStatus;
      distDoc.status = emailStatus === 'failed' && whatsappStatus === 'failed' ? 'failed' : 'sent';
      await distDoc.save();
    }

    return NextResponse.json({
      success: true,
      message: 'Distribution complete',
      emailStatus,
      whatsappStatus,
      registrationId: effectiveAttendee.registrationId,
      publicUrl: publicUrl || null,
      id: distDoc ? String(distDoc._id) : null,
      mode: dbConnected ? 'db' : 'mock',
    });
  } catch (error) {
    console.error('Distribution error:', error);
    return NextResponse.json({ success: false, message: 'Failed to distribute ID card' }, { status: 500 });
  }
}

