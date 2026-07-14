const xlsx = require('xlsx');
const Client = require('../models/Client');
const SalesDocument = require('../models/SalesDocument');
const PaymentReceipt = require('../models/PaymentReceipt');
const Counter = require('../models/Counter');
const BusinessProfile = require('../models/BusinessProfile');
const ImportHistory = require('../models/ImportHistory');
const documentService = require('./documentService');

// Column mapping aliases
const ALIASES = {
  clientName: ['client name', 'customer name', 'customer', 'client', 'party name', 'name', 'party'],
  companyName: ['company name', 'company', 'organization', 'org', 'business name', 'business'],
  email: ['email', 'email address', 'mail', 'mail id', 'email id'],
  phone: ['phone', 'mobile', 'mobile number', 'phone number', 'contact', 'contact number'],
  gstin: ['gstin', 'gst', 'gst number', 'tax id', 'gst registration'],
  addressLine1: ['address', 'address line 1', 'billing address', 'street', 'address 1'],
  city: ['city', 'town'],
  state: ['state', 'region'],
  pincode: ['pincode', 'pin', 'zip', 'zipcode', 'pin code'],
  country: ['country'],
  documentNumber: ['invoice number', 'invoice no', 'bill number', 'bill no', 'document number', 'document no', 'quotation number', 'quotation no', 'estimate number', 'estimate no', 'challan number', 'challan no', 'challan', 'order number', 'order no', 'receipt number', 'receipt no', 'receipt', 'credit note number', 'credit note no', 'note number', 'note no', 'no', 'number'],
  issueDate: ['invoice date', 'date', 'issue date', 'billing date', 'date of issue', 'document date', 'challan date', 'order date', 'receipt date'],
  validTill: ['valid till', 'due date', 'expiry date', 'validity', 'valid until'],
  poNumber: ['po number', 'po no', 'po ref', 'purchase order', 'reference'],
  itemName: ['item name', 'item', 'description', 'product name', 'product', 'service', 'item description'],
  description: ['item details', 'long description', 'notes', 'remarks'],
  hsnSac: ['hsn', 'sac', 'hsn/sac', 'hsn code', 'sac code'],
  gstRate: ['gst %', 'gst rate', 'tax %', 'tax rate', 'gst percentage'],
  quantity: ['quantity', 'qty', 'quantity/unit', 'units', 'volume'],
  rate: ['rate', 'price', 'unit price', 'rate (rs)', 'price (rs)'],
  discountType: ['discount type', 'disc type'],
  discountValue: ['discount', 'discount value', 'disc', 'item discount'],
  grandTotal: ['total', 'grand total', 'amount', 'invoice value', 'bill value', 'receipt amount', 'payment amount', 'amount paid', 'paid amount', 'paid'],
  paymentMethod: ['payment method', 'payment mode', 'mode', 'method'],
  referenceNumber: ['reference number', 'transaction id', 'reference no', 'ref no', 'ref number', 'txn id', 'transaction reference', 'ref'],
  reason: ['reason', 'return reason', 'credit reason'],
};

// Normalize string for alias matching
const normalize = (str) => String(str || '').trim().toLowerCase().replace(/[^a-z0-9]/g, ' ');

/**
 * Parses the Excel/CSV file from buffer
 */
const parseExcel = (buffer, sheetName = null) => {
  const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
  const sheetNames = workbook.SheetNames;
  const targetSheet = sheetName && sheetNames.includes(sheetName) ? sheetName : sheetNames[0];
  const worksheet = workbook.Sheets[targetSheet];
  
  // Extract headers
  const headers = [];
  const range = xlsx.utils.decode_range(worksheet['!ref'] || 'A1:A1');
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const cell = worksheet[xlsx.utils.encode_cell({ r: range.s.r, c: C })];
    if (cell && cell.v !== undefined) {
      headers.push(String(cell.v).trim());
    } else {
      headers.push(`Column_${C + 1}`);
    }
  }

  const rows = xlsx.utils.sheet_to_json(worksheet, { defval: '' });
  return { sheetNames, currentSheet: targetSheet, headers, rows };
};

/**
 * Auto-detect column mapping
 */
const autoMapColumns = (headers) => {
  const mapping = {};
  for (const field of Object.keys(ALIASES)) {
    const aliasList = ALIASES[field];
    const match = headers.find(h => {
      const normH = normalize(h);
      return aliasList.some(alias => normalize(alias) === normH || normH.includes(normalize(alias)));
    });
    if (match) {
      mapping[field] = match;
    }
  }
  return mapping;
};

/**
 * Run non-mutating validation, client matching, and duplicate checks
 */
const validateImport = async (businessId, importType, rows, columnMapping) => {
  const business = await BusinessProfile.findById(businessId);
  if (!business) throw new Error('Business profile not found');

  const valid = [];
  const warnings = [];
  const errors = [];
  const duplicates = [];

  // Helper: map a raw row to TechBes fields
  const mapRow = (row) => {
    const mapped = {};
    for (const [tbField, excelHeader] of Object.entries(columnMapping)) {
      if (excelHeader && row[excelHeader] !== undefined) {
        mapped[tbField] = row[excelHeader];
      }
    }
    return mapped;
  };

  if (importType === 'CLIENT') {
    for (let idx = 0; idx < rows.length; idx++) {
      const rowNum = idx + 2;
      const rawData = mapRow(rows[idx]);
      
      if (!rawData.clientName) {
        errors.push({ rowNumber: rowNum, status: 'MISSING_CLIENT_NAME', message: 'Client Name is required.', data: rawData });
        continue;
      }

      // Check duplicates
      const dupQuery = { businessId, isDeleted: false };
      const orConditions = [];
      if (rawData.gstin) orConditions.push({ gstin: rawData.gstin.trim().toUpperCase() });
      if (rawData.email) orConditions.push({ email: rawData.email.trim().toLowerCase() });
      if (rawData.phone) orConditions.push({ phone: rawData.phone.trim() });
      orConditions.push({ clientName: { $regex: new RegExp(`^${rawData.clientName.trim()}$`, 'i') } });
      
      dupQuery.$or = orConditions;
      const existingClient = await Client.findOne(dupQuery);

      if (existingClient) {
        duplicates.push({ rowNumber: rowNum, status: 'DUPLICATE_CLIENT', message: `Possible duplicate client matches: ${existingClient.clientName}`, data: rawData });
      } else {
        valid.push({ rowNumber: rowNum, status: 'VALID', data: rawData });
      }
    }
  } else if (importType === 'PAYMENT_RECEIPT') {
    for (let idx = 0; idx < rows.length; idx++) {
      const rowNum = idx + 2;
      const rawData = mapRow(rows[idx]);

      if (!rawData.documentNumber) {
        errors.push({ rowNumber: rowNum, status: 'MISSING_RECEIPT_NUMBER', message: 'Receipt number is required.', data: rawData });
        continue;
      }
      if (!rawData.grandTotal || isNaN(parseFloat(rawData.grandTotal))) {
        errors.push({ rowNumber: rowNum, status: 'INVALID_AMOUNT', message: 'Payment Amount must be a valid number.', data: rawData });
        continue;
      }

      // Check duplicates
      const existingReceipt = await PaymentReceipt.findOne({ businessId, receiptNumber: rawData.documentNumber });
      
      // Match client
      let client = null;
      if (rawData.clientName) {
        client = await Client.findOne({
          businessId,
          isDeleted: false,
          clientName: { $regex: new RegExp(`^${rawData.clientName.trim()}$`, 'i') }
        });
      }

      // Match invoice
      let invoice = null;
      if (rawData.referenceNumber) {
        invoice = await SalesDocument.findOne({
          businessId,
          documentType: 'INVOICE',
          documentNumber: rawData.referenceNumber
        });
      }

      const statusDetails = { rowNumber: rowNum, data: rawData };
      if (existingReceipt) {
        duplicates.push({ ...statusDetails, status: 'DUPLICATE_RECEIPT', message: `Receipt ${rawData.documentNumber} already exists.` });
      } else if (!client) {
        errors.push({ ...statusDetails, status: 'CLIENT_MATCH_CONFLICT', message: `Client '${rawData.clientName}' not found.` });
      } else {
        if (rawData.referenceNumber && !invoice) {
          warnings.push({ ...statusDetails, status: 'LINKED_INVOICE_NOT_FOUND', message: `Linked invoice ${rawData.referenceNumber} not found in this tenant.` });
        }
        valid.push({ ...statusDetails, status: 'VALID', clientId: client._id });
      }
    }
  } else {
    // SALES DOCUMENTS (QUOTATION, INVOICE, PROFORMA_INVOICE, SALES_ORDER, DELIVERY_CHALLAN, CREDIT_NOTE)
    // 1. Group rows by documentNumber
    const groups = {};
    for (let idx = 0; idx < rows.length; idx++) {
      const rowNum = idx + 2;
      const rawData = mapRow(rows[idx]);
      const docNum = String(rawData.documentNumber || '').trim();

      if (!docNum) {
        errors.push({ rowNumber: rowNum, status: 'MISSING_DOCUMENT_NUMBER', message: 'Document Number is required.', data: rawData });
        continue;
      }

      if (!groups[docNum]) {
        groups[docNum] = {
          documentNumber: docNum,
          rows: [],
          firstRowNum: rowNum,
        };
      }
      groups[docNum].rows.push(rawData);
    }

    // 2. Validate grouped documents
    for (const [docNum, group] of Object.entries(groups)) {
      const firstRow = group.rows[0];
      const items = [];
      let totalExcelGrandTotal = 0;

      // Group fields check
      let hasConflictingHeaders = false;
      const clientName = firstRow.clientName;
      const issueDate = firstRow.issueDate;

      for (const row of group.rows) {
        if (row.clientName !== clientName || String(row.issueDate) !== String(issueDate)) {
          hasConflictingHeaders = true;
        }

        const qty = parseFloat(row.quantity) || 1;
        const rate = parseFloat(row.rate) || 0;
        const gstRate = parseFloat(row.gstRate) || 0;

        items.push({
          itemName: row.itemName || 'Item Details',
          description: row.description || '',
          hsnSac: row.hsnSac || '',
          gstRate,
          quantity: qty,
          rate,
          unit: 'PCS',
        });

        totalExcelGrandTotal += parseFloat(row.grandTotal) || (qty * rate * (1 + gstRate / 100));
      }

      if (hasConflictingHeaders) {
        errors.push({
          rowNumber: group.firstRowNum,
          status: 'VALIDATION_CONFLICT',
          message: `Document ${docNum} rows contain conflicting client details or dates.`,
          data: firstRow,
        });
        continue;
      }

      // Check duplicate document
      const existingDoc = await SalesDocument.findOne({ businessId, documentType: importType, documentNumber: docNum });

      // Match client
      let client = null;
      if (clientName) {
        client = await Client.findOne({
          businessId,
          isDeleted: false,
          clientName: { $regex: new RegExp(`^${clientName.trim()}$`, 'i') }
        });
      }

      const statusDetails = {
        rowNumber: group.firstRowNum,
        documentNumber: docNum,
        clientName,
        itemsCount: items.length,
        data: {
          ...firstRow,
          items,
        },
      };

      if (existingDoc) {
        duplicates.push({ ...statusDetails, status: 'DUPLICATE_DOCUMENT', message: `${importType} ${docNum} already exists.` });
      } else if (!client) {
        errors.push({ ...statusDetails, status: 'CLIENT_MATCH_CONFLICT', message: `Client '${clientName}' not found.` });
      } else {
        // Run pricing calculation verification
        const calculations = documentService.calculateDocumentTotals({
          items,
          placeOfSupply: client.billingAddress || business.address,
          gstEnabled: true,
        }, business.address?.stateCode || 'DL');

        const calculatedTotal = calculations.grandTotal;
        const excelTotal = parseFloat(firstRow.grandTotal) || totalExcelGrandTotal;

        if (Math.abs(calculatedTotal - excelTotal) > 1.0) {
          warnings.push({
            ...statusDetails,
            status: 'TOTAL_MISMATCH',
            message: `Grand Total mismatch. Excel: ₹${excelTotal.toFixed(2)}, System: ₹${calculatedTotal.toFixed(2)}`,
            clientId: client._id,
            calculatedTotals: calculations,
          });
        } else {
          valid.push({
            ...statusDetails,
            status: 'VALID',
            clientId: client._id,
            calculatedTotals: calculations,
          });
        }
      }
    }
  }

  return { valid, warnings, errors, duplicates };
};

/**
 * Execute actual batch import to database
 */
const executeImport = async (businessId, userId, importType, rows, columnMapping, duplicatePolicy, calculatePolicy) => {
  const business = await BusinessProfile.findById(businessId);
  const businessSnapshot = business.toObject();
  businessSnapshot.logo = business.logoUrl || business.logo;
  businessSnapshot.signature = business.signatureUrl || business.signature;

  const validation = await validateImport(businessId, importType, rows, columnMapping);
  
  let importedCount = 0;
  let skippedCount = 0;
  let duplicateCount = 0;

  // 1. Process duplicates based on policy
  const toImport = [];
  
  // Combine valid and warnings as importable
  const importableList = [...validation.valid, ...validation.warnings];

  if (duplicatePolicy === 'SKIP') {
    duplicateCount += validation.duplicates.length;
    skippedCount += validation.duplicates.length;
  } else if (duplicatePolicy === 'OVERWRITE') {
    // We will delete existing documents matching the duplicates before saving
    for (const dup of validation.duplicates) {
      if (importType === 'CLIENT') {
        await Client.deleteMany({ businessId, clientName: dup.data.clientName, isDeleted: false });
      } else if (importType === 'PAYMENT_RECEIPT') {
        await PaymentReceipt.deleteMany({ businessId, receiptNumber: dup.documentNumber });
      } else {
        await SalesDocument.deleteMany({ businessId, documentType: importType, documentNumber: dup.documentNumber });
      }
    }
    importableList.push(...validation.duplicates);
  }

  // 2. Perform database writes
  if (importType === 'CLIENT') {
    for (const rec of importableList) {
      const d = rec.data;
      await Client.create({
        businessId,
        clientName: d.clientName,
        companyName: d.companyName || '',
        email: d.email || '',
        phone: d.phone || '',
        gstin: d.gstin || '',
        billingAddress: {
          addressLine1: d.addressLine1 || '',
          city: d.city || '',
          state: d.state || '',
          pincode: d.pincode || '',
          country: d.country || 'India',
        },
        createdBy: userId,
        status: 'ACTIVE',
      });
      importedCount++;
    }
  } else if (importType === 'PAYMENT_RECEIPT') {
    for (const rec of importableList) {
      const d = rec.data;
      const client = await Client.findById(rec.clientId);
      const clientSnapshot = client.toObject();

      const receiptAmount = parseFloat(d.grandTotal);
      
      const receipt = await PaymentReceipt.create({
        receiptNumber: d.documentNumber,
        businessId,
        businessSnapshot,
        clientId: client._id,
        clientSnapshot,
        receiptDate: d.issueDate ? new Date(d.issueDate) : new Date(),
        paymentRecords: [{
          paymentMethod: d.paymentMethod ? d.paymentMethod.toUpperCase() : 'BANK_TRANSFER',
          amountReceived: receiptAmount,
          referenceId: d.referenceNumber || '',
          notes: d.notes || '',
        }],
        totals: {
          amountReceived: receiptAmount,
          availableForSettlement: receiptAmount,
          allocatedToInvoices: 0,
          advancePayment: receiptAmount,
        },
        status: 'FINALIZED',
        createdBy: userId,
      });

      // Recalculate linked invoice balance
      if (d.referenceNumber) {
        const invoice = await SalesDocument.findOne({
          businessId,
          documentType: 'INVOICE',
          documentNumber: d.referenceNumber,
        });

        if (invoice) {
          const outstanding = invoice.balanceDue ?? invoice.grandTotal;
          const settleAmount = Math.min(outstanding, receiptAmount);

          invoice.amountPaid = (invoice.amountPaid || 0) + settleAmount;
          invoice.balanceDue = Math.max(0, outstanding - settleAmount);
          invoice.paymentStatus = invoice.balanceDue === 0 ? 'PAID' : 'PARTIALLY_PAID';
          
          invoice.linkedDocuments = invoice.linkedDocuments || [];
          invoice.linkedDocuments.push({
            documentId: receipt._id,
            documentType: 'PAYMENT_RECEIPT',
            documentNumber: receipt.receiptNumber,
            relationType: 'PAYMENT_RECEIPT',
          });
          await invoice.save();

          receipt.totals.allocatedToInvoices = settleAmount;
          receipt.totals.advancePayment = receiptAmount - settleAmount;
          receipt.settlements.push({
            invoiceId: invoice._id,
            invoiceNumberSnapshot: invoice.documentNumber,
            invoiceTotalSnapshot: invoice.grandTotal,
            outstandingBefore: outstanding,
            settlementAmount: settleAmount,
            outstandingAfter: invoice.balanceDue,
          });
          await receipt.save();
        }
      }
      importedCount++;
    }
  } else {
    // SALES DOCUMENTS (QUOTATION, INVOICE, PROFORMA_INVOICE, etc.)
    let maxCounterSeq = 0;

    for (const rec of importableList) {
      const d = rec.data;
      const client = await Client.findById(rec.clientId);
      const clientSnapshot = client.toObject();

      let calcs = rec.calculatedTotals;
      // If calculatePolicy is System, we use calculations from calculations service.
      // If policy is Excel, we override the grandTotal with the Excel grand total
      if (calculatePolicy === 'EXCEL') {
        const excelTotal = parseFloat(d.grandTotal) || calcs.grandTotal;
        calcs.grandTotal = excelTotal;
        calcs.balanceDue = excelTotal;
      }

      await SalesDocument.create({
        businessId,
        clientId: client._id,
        documentType: importType,
        documentNumber: rec.documentNumber,
        issueDate: d.issueDate ? new Date(d.issueDate) : new Date(),
        validTill: d.validTill ? new Date(d.validTill) : undefined,
        poNumber: d.poNumber || '',
        clientSnapshot,
        businessSnapshot,
        placeOfSupply: {
          state: client.billingAddress?.state || business.address?.state || 'Delhi',
          stateCode: client.billingAddress?.stateCode || business.address?.stateCode || 'DL',
        },
        gstMode: calcs.gstMode || 'INTRA_STATE',
        items: d.items,
        ...calcs,
        status: 'ISSUED',
        createdBy: userId,
        importSource: 'EXCEL',
      });

      // Counter Sync: parse the seq from documentNumber to check if we need to advance the counter
      const match = rec.documentNumber.match(/(\d+)(?!.*\d)/);
      if (match) {
        const seqVal = parseInt(match[1], 10);
        if (seqVal > maxCounterSeq) {
          maxCounterSeq = seqVal;
        }
      }
      importedCount++;
    }

    // Safely advance counter if maximum sequence of imported docs is higher than existing counter
    if (maxCounterSeq > 0) {
      const counterId = `${businessId.toString()}_${importType}`;
      const existingCounter = await Counter.findById(counterId);
      if (!existingCounter || existingCounter.seq < maxCounterSeq) {
        await Counter.findByIdAndUpdate(
          counterId,
          { $set: { seq: maxCounterSeq } },
          { new: true, upsert: true }
        );
      }
    }
  }

  // Create import history record
  const history = await ImportHistory.create({
    businessId,
    importType,
    originalFileName: 'historical_import_data.xlsx',
    sheetName: 'Sheet1',
    totalRows: rows.length,
    validRecords: validation.valid.length,
    warningRecords: validation.warnings.length,
    errorRecords: validation.errors.length,
    importedRecords: importedCount,
    skippedRecords: skippedCount,
    duplicateRecords: duplicateCount,
    status: validation.errors.length > 0 ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED',
    createdBy: userId,
  });

  return {
    success: true,
    history,
    imported: importedCount,
    skipped: skippedCount,
    duplicates: duplicateCount,
    errors: validation.errors.length,
  };
};

module.exports = {
  parseExcel,
  autoMapColumns,
  validateImport,
  executeImport,
};
