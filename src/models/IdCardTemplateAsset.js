import mongoose from 'mongoose';

/** One MongoDB document per profile: `default` (website), `guest` (Excel normal), `vip` (Excel VIP). */
const IdCardTemplateAssetSchema = new mongoose.Schema(
  {
    profile: {
      type: String,
      enum: ['default', 'guest', 'vip'],
      sparse: true,
      unique: true,
      index: true,
    },
    /** @deprecated Legacy slot; new rows use mongoTemplateAssetSlotKey(profile). */
    key: { type: String, sparse: true },
    data: { type: Buffer, required: true },
    contentType: { type: String, default: 'image/png' },
    originalName: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.models.IdCardTemplateAsset ||
  mongoose.model('IdCardTemplateAsset', IdCardTemplateAssetSchema);
