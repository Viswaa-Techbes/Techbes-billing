const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BusinessProfile',
      required: true,
      index: true,
    },
    itemName: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
    },
    sku: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    hsnSac: {
      type: String,
      trim: true,
      default: '',
    },
    gstRate: {
      type: Number,
      default: 0,
    },
    unit: {
      type: String,
      default: 'PCS',
      trim: true,
    },
    sellingPrice: {
      type: Number,
      required: [true, 'Selling price is required'],
      default: 0,
    },
    purchasePrice: {
      type: Number,
      default: null,
    },
    category: {
      type: String,
      trim: true,
      default: '',
    },
    brand: {
      type: String,
      trim: true,
      default: '',
    },
    discount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
    },
    usageFrequency: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Compound index for scoped lookup, sorting, and duplicate prevention
itemSchema.index({ businessId: 1, status: 1, usageFrequency: -1 });
itemSchema.index({ businessId: 1, itemName: 1, sku: 1 }, { unique: true });

// Text index for advanced search matching
itemSchema.index({ itemName: 'text', sku: 'text', description: 'text' });

module.exports = mongoose.model('Item', itemSchema);
