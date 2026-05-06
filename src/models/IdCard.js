import mongoose from 'mongoose';

const IdCardSchema = new mongoose.Schema({
  registrationId: { type: String, required: true, index: true },
  attendeeId: { type: mongoose.Schema.Types.ObjectId, required: false, index: true },

  fileData: { type: Buffer, required: true },
  contentType: { type: String, default: 'image/png' },

  email: { type: String, default: '' },
  phone: { type: String, default: '' },

  emailStatus: { type: String, default: 'skipped' }, // sent|failed|skipped
  whatsappStatus: { type: String, default: 'skipped' }, // sent|failed|skipped
  status: { type: String, default: 'processing' }, // processing|sent|failed

  createdAt: { type: Date, default: Date.now },
});

IdCardSchema.index({ registrationId: 1, createdAt: -1 });

export default mongoose.models.IdCard || mongoose.model('IdCard', IdCardSchema);

