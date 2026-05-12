import mongoose from 'mongoose';

/** Singleton doc: JSON calibration for default / guest / VIP templates (server-side bulk + backup). */
const IdCardProfileConfigSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'singleton' },
    profiles: {
      default: { type: mongoose.Schema.Types.Mixed },
      guest: { type: mongoose.Schema.Types.Mixed },
      vip: { type: mongoose.Schema.Types.Mixed },
    },
  },
  { timestamps: true }
);

export default mongoose.models.IdCardProfileConfig ||
  mongoose.model('IdCardProfileConfig', IdCardProfileConfigSchema);
