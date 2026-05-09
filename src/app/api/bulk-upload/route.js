import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import connectDB from '@/lib/mongodb';
import Attendee from '@/models/Attendee';
import { getNextMockTicketNumber, getNextTicketNumber } from '@/lib/nextTicketNumber';
import { distributeIdCard } from '@/lib/distributeIdCard';

export const runtime = 'nodejs';

function normalizeGuestType(v) {
  const raw = String(v ?? '').trim().toLowerCase();
  if (!raw) return 'normal';
  if (raw === 'vip' || raw.includes('vip')) return 'vip';
  if (raw === 'normal' || raw.includes('normal')) return 'normal';
  return 'normal';
}

function normalizeHeaderKey(k) {
  return String(k || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}

function pick(obj, keys) {
  for (const k of keys) {
    if (obj[k] != null && String(obj[k]).trim() !== '') return obj[k];
  }
  return '';
}

export async function POST(req) {
  try {
    const form = await req.formData();
    const file = form.get('file');
    const shouldDistribute = String(form.get('distribute') ?? 'true').toLowerCase() !== 'false';

    if (!file) {
      return NextResponse.json({ success: false, message: 'Missing file' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buf = Buffer.from(arrayBuffer);

    let rows = [];
    try {
      const workbook = XLSX.read(buf, { type: 'buffer' });
      const sheetName = workbook.SheetNames?.[0];
      if (!sheetName) {
        return NextResponse.json({ success: false, message: 'Empty Excel file' }, { status: 400 });
      }
      const sheet = workbook.Sheets[sheetName];
      rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    } catch (e) {
      // Fallback for CSV uploads where auto-detection may fail in some environments.
      const asText = buf.toString('utf8');
      const workbook = XLSX.read(asText, { type: 'string' });
      const sheetName = workbook.SheetNames?.[0];
      if (!sheetName) {
        return NextResponse.json({ success: false, message: 'Empty CSV file' }, { status: 400 });
      }
      const sheet = workbook.Sheets[sheetName];
      rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ success: false, message: 'No rows found' }, { status: 400 });
    }

    const allowMock = String(process.env.ALLOW_MOCK_MODE || '').toLowerCase() === 'true';
    let dbConnected = true;
    try {
      await connectDB();
    } catch (dbError) {
      dbConnected = false;
      if (!allowMock) {
        return NextResponse.json(
          {
            success: false,
            message: 'Database unavailable. Add your IP to MongoDB Atlas Network Access, or set ALLOW_MOCK_MODE=true for demo testing.',
            ...(process.env.NODE_ENV !== 'production'
              ? { debug: { error: dbError?.message || String(dbError) } }
              : {}),
          },
          { status: 503 }
        );
      }
      console.warn('Bulk upload: MongoDB unavailable, using Mock mode:', dbError?.message || dbError);
    }

    const results = [];
    let created = 0;
    let duplicates = 0;
    let invalid = 0;

    for (let i = 0; i < rows.length; i++) {
      const rawRow = rows[i] || {};

      // Normalize keys so we can accept "Name" or "full name" etc.
      const row = {};
      for (const [k, v] of Object.entries(rawRow)) {
        row[normalizeHeaderKey(k)] = v;
      }

      const fullName = String(pick(row, ['name', 'fullname', 'full_name']) || '').trim();
      const email = String(pick(row, ['email', 'mail', 'emailid', 'emailaddress']) || '').trim();
      const phone = String(pick(row, ['number', 'phone', 'phonenumber', 'mobile', 'mobilenumber']) || '').trim();
      const guestType = normalizeGuestType(pick(row, ['prefers', 'prefer', 'guesttype', 'type', 'category']));

      if (!fullName || !email || !phone) {
        invalid++;
        results.push({
          row: i + 2, // header is row 1 in excel
          status: 'invalid',
          message: 'Missing required fields (name, email, number)',
          data: { fullName, email, phone, guestType },
        });
        continue;
      }

      if (dbConnected) {
        // Skip if this email is already registered (to avoid changing ticket numbers)
        const existing = await Attendee.findOne({ email });
        if (existing) {
          duplicates++;
          results.push({
            row: i + 2,
            status: 'duplicate',
            message: 'Email already registered',
            registrationId: existing.registrationId,
            ticketNumber: existing.ticketNumber ?? null,
            guestType: existing.guestType ?? 'normal',
          });
          continue;
        }
      }

      const ticketNumber = dbConnected ? await getNextTicketNumber() : getNextMockTicketNumber();
      const registrationId = `SRG-${ticketNumber.toString().padStart(4, '0')}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

      const attendeePayload = {
        fullName,
        email,
        phone,
        referredBy: 'Excel Import',
        squad: 'Guest',
        guestType,
        registrationId,
        ticketNumber,
      };

      const attendee = dbConnected ? await Attendee.create(attendeePayload) : attendeePayload;
      created++;

      let distribution = { skipped: true };
      if (shouldDistribute) {
        try {
          distribution = await distributeIdCard({
            registrationId,
            attendeeFallback: attendeePayload,
          });
        } catch (e) {
          distribution = { success: false, message: e?.message || String(e) };
        }
      }

      results.push({
        row: i + 2,
        status: 'created',
        registrationId: attendee.registrationId,
        ticketNumber: attendee.ticketNumber ?? null,
        guestType: attendee.guestType ?? guestType,
        emailStatus: distribution?.emailStatus ?? (shouldDistribute ? 'failed' : 'skipped'),
        whatsappStatus: distribution?.whatsappStatus ?? (shouldDistribute ? 'failed' : 'skipped'),
      });
    }

    return NextResponse.json({
      success: true,
      summary: { total: rows.length, created, duplicates, invalid, distributed: shouldDistribute },
      results,
      mode: dbConnected ? 'db' : 'mock',
    });
  } catch (error) {
    console.error('Bulk upload error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Bulk upload failed',
        ...(process.env.NODE_ENV !== 'production'
          ? { debug: { error: error?.message || String(error) } }
          : {}),
      },
      { status: 500 }
    );
  }
}

