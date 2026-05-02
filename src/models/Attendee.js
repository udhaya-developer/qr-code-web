import mongoose from 'mongoose';

const AttendeeSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Please provide your full name.'],
  },
  email: {
    type: String,
    required: [true, 'Please provide your email.'],
    unique: true,
  },
  phone: {
    type: String,
    required: [true, 'Please provide your phone number.'],
  },
  referredBy: {
    type: String,
    default: 'None',
  },
  squad: {
    type: String,
    required: [true, 'Please select your squad.'],
  },
  registrationId: {
    type: String,
    unique: true,
  },
  /** Encoded in QR as plain digits (1, 2, 3…). Sparse for legacy docs without a ticket. */
  ticketNumber: {
    type: Number,
    unique: true,
    sparse: true,
  },
  checkedIn: {
    type: Boolean,
    default: false,
  },
  checkedInAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.Attendee || mongoose.model('Attendee', AttendeeSchema);
