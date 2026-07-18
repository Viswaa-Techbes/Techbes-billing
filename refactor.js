const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, 'frontend/src/app/(dashboard)');

// 1. Read the gold standard invoice layout
const invoicePath = path.join(baseDir, 'invoices/[id]/page.tsx');
let invoiceCode = fs.readFileSync(invoicePath, 'utf-8');

const markerStart = '          <div\n            ref={printRef}\n            className={`invoice-print-shell';
const markerEnd = '          {/* Payment ledger history */}';
const startIndex = invoiceCode.indexOf(markerStart);
const endIndex = invoiceCode.indexOf(markerEnd);

if (startIndex === -1 || endIndex === -1) {
  console.error("Markers not found in invoice page");
  process.exit(1);
}

const replacementContent = invoiceCode.substring(startIndex, endIndex);

console.log("Found replacement content, length:", replacementContent.length);

const targets = [
  'quotations/[id]/page.tsx',
  'proforma-invoices/[id]/page.tsx',
  'sales-orders/[id]/page.tsx',
  'delivery-challans/[id]/page.tsx',
  'credit-notes/[id]/page.tsx'
];

for (const target of targets) {
  const filePath = path.join(baseDir, target);
  if (!fs.existsSync(filePath)) {
    console.log("Skipping", target, "(not found)");
    continue;
  }
  let code = fs.readFileSync(filePath, 'utf-8');
  
  const targetStartIndex = code.indexOf(markerStart);
  if (targetStartIndex === -1) {
    console.error("Start marker not found in", target);
    continue;
  }
  
  let targetEndIndex = code.indexOf('          {/* Batch Summary check */}', targetStartIndex);
  if (targetEndIndex === -1) {
    targetEndIndex = code.indexOf('          {/* Payment ledger history */}', targetStartIndex);
  }
  if (targetEndIndex === -1) {
    targetEndIndex = code.indexOf('          {/* Bottom repeated action toolbar */}', targetStartIndex);
  }
  
  if (targetEndIndex === -1) {
    console.error("Could not find end marker in", target);
    continue;
  }
  
  const newCode = code.substring(0, targetStartIndex) + replacementContent + code.substring(targetEndIndex);
  fs.writeFileSync(filePath, newCode, 'utf-8');
  console.log("Successfully updated", target);
}
