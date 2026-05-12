import connectDB from '@/lib/mongodb';
import Attendee from '@/models/Attendee';
import IdCard from '@/models/IdCard';
import { generateIdCardPng } from '@/lib/generateIdCardPng';
import { sendGraphEmail } from '@/lib/graphEmail';
import { sendMsg91WhatsAppTemplate } from '@/lib/msg91WhatsApp';
import { getProfileSettingsForDistribution } from '@/lib/idCardProfileSettingsServer';
import { normalizeIdCardSettings, profileKeyFromGuestType } from '@/lib/idCardTemplateSettings';

function buildPublicIdCardUrl(registrationId) {
  const base = process.env.PUBLIC_BASE_URL;
  if (!base) return '';
  return `${String(base).replace(/\/$/, '')}/api/id-card-public/${encodeURIComponent(registrationId)}`;
}

/**
 * Shared distribution logic for both single and bulk flows.
 * Returns: { success, emailStatus, whatsappStatus, registrationId, publicUrl, mode }
 */
export async function distributeIdCard({
  registrationId,
  message = '',
  settings,
  placement,
  slotPercent,
  attendeeFallback = null,
  qrValue: qrValueOverride,
  /** When set (Excel bulk only), pick guest vs VIP template. Omit for website registration flows. */
  excelRowGuestType,
}) {
  const regId = String(registrationId || '').trim();
  if (!regId) {
    return { success: false, status: 400, message: 'registrationId is required' };
  }

  const fallbackAttendee = attendeeFallback && typeof attendeeFallback === 'object' ? attendeeFallback : null;
  const fallbackName = String(fallbackAttendee?.fullName || '').trim();
  const fallbackEmail = String(fallbackAttendee?.email || '').trim();
  const fallbackPhone = String(fallbackAttendee?.phone || '').trim();
  const fallbackSquad = String(fallbackAttendee?.squad || '').trim();
  const fallbackTicketNumberRaw = fallbackAttendee?.ticketNumber ?? null;
  const fallbackTicketNumber = fallbackTicketNumberRaw == null ? null : Number(fallbackTicketNumberRaw);

  const qrValueFromFallback =
    Number.isFinite(fallbackTicketNumber) ? String(fallbackTicketNumber) : regId;
  const qrValueFromOverride =
    qrValueOverride != null && String(qrValueOverride).trim() !== '' ? String(qrValueOverride).trim() : '';

  let dbConnected = true;
  try {
    await connectDB();
  } catch {
    dbConnected = false;
  }

  const attendee = dbConnected ? await Attendee.findOne({ registrationId: regId }) : null;
  const effectiveAttendee = attendee || {
    fullName: fallbackName,
    email: fallbackEmail,
    phone: fallbackPhone,
    squad: fallbackSquad,
    registrationId: regId,
    ticketNumber: Number.isFinite(fallbackTicketNumber) ? fallbackTicketNumber : null,
    _id: null,
  };

  if (!effectiveAttendee.fullName) {
    return {
      success: false,
      status: dbConnected ? 404 : 400,
      message: dbConnected
        ? 'Attendee not found'
        : 'MongoDB is offline and attendee data was not provided. Provide attendeeFallback.',
      mode: dbConnected ? 'db' : 'mock',
    };
  }

  const qrValue = String(
    effectiveAttendee.ticketNumber != null
      ? effectiveAttendee.ticketNumber
      : (qrValueFromOverride || qrValueFromFallback)
  );

  let effectiveSettings;
  if (settings && typeof settings === 'object') {
    if (settings.default && settings.guest && settings.vip) {
      effectiveSettings = normalizeIdCardSettings(settings.default);
    } else {
      effectiveSettings = normalizeIdCardSettings(settings);
    }
  } else if (
    excelRowGuestType !== undefined &&
    excelRowGuestType !== null &&
    String(excelRowGuestType).trim() !== ''
  ) {
    const profile = profileKeyFromGuestType(excelRowGuestType);
    effectiveSettings = await getProfileSettingsForDistribution(profile);
  } else {
    effectiveSettings = await getProfileSettingsForDistribution('default');
  }

  const { buffer } = await generateIdCardPng({
    registrationId: effectiveAttendee.registrationId,
    qrValue,
    settings: effectiveSettings,
    placement,
    slotPercent,
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
  const waMessage = message || defaultWhatsAppMessage;

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
      console.error('Graph Email failed:', err?.response?.data || err?.message || err);
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
      console.error('MSG91 WhatsApp failed:', err?.response?.data || err?.message || err);
      whatsappStatus = 'failed';
    }
  }

  if (distDoc) {
    distDoc.emailStatus = emailStatus;
    distDoc.whatsappStatus = whatsappStatus;
    distDoc.status = emailStatus === 'failed' && whatsappStatus === 'failed' ? 'failed' : 'sent';
    await distDoc.save();
  }

  return {
    success: true,
    status: 200,
    message: 'Distribution complete',
    emailStatus,
    whatsappStatus,
    registrationId: effectiveAttendee.registrationId,
    publicUrl: publicUrl || null,
    id: distDoc ? String(distDoc._id) : null,
    mode: dbConnected ? 'db' : 'mock',
  };
}

