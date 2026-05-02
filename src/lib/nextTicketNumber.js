import connectDB from '@/lib/mongodb';
import Counter from '@/models/Counter';

let mockTicketSeq = 0;

/** Next sequential ticket for demo mode when MongoDB is unavailable. */
export function getNextMockTicketNumber() {
  mockTicketSeq += 1;
  return mockTicketSeq;
}

/** Atomic sequential ticket number for QR payloads (1, 2, 3, …). */
export async function getNextTicketNumber() {
  await connectDB();
  const doc = await Counter.findOneAndUpdate(
    { _id: 'ticketNumber' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return doc.seq;
}
