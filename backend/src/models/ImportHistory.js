const mongoose = require('mongoose');

const importHistorySchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BusinessProfile',
      required: true,
      index: true,
    },
    importType: {
      type: String,
      required: true,
      enum: ['CLIENT', 'QUOTATION', 'PROFORMA_INVOICE', 'INVOICE', 'PAYMENT_RECEIPT', 'SALES_ORDER', 'DELIVERY_CHALLAN', 'CREDIT_NOTE'],
    },
    originalFileName: {
      type: String,
      required: true,
    },
    sheetName: {
      type: String,
    },
    totalRows: {
      type: Number,
      default: 0,
    },
    validRecords: {
      type: Number,
      default: 0,
    },
    warningRecords: {
      type: Number,
      default: 0,
    },
    errorRecords: {
      type: Number,
      default: 0,
    },
    importedRecords: {
      type: Number,
      default: 0,
    },
    skippedRecords: {
      type: Number,
      default: 0,
    },
    duplicateRecords: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['UPLOADED', 'VALIDATING', 'READY', 'IMPORTING', 'COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED'],
      default: 'COMPLETED',
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: Date.now,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ImportHistory', importHistorySchema);
