const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '../../..');

const filesToPatch = [
  {
    filePath: path.join(projectRoot, 'frontend/src/components/ProformaInvoiceEditor.tsx'),
    type: 'invoice_style',
  },
  {
    filePath: path.join(projectRoot, 'frontend/src/components/SalesOrderEditor.tsx'),
    type: 'so_style',
  },
  {
    filePath: path.join(projectRoot, 'frontend/src/components/DeliveryChallanEditor.tsx'),
    type: 'so_style',
  },
  {
    filePath: path.join(projectRoot, 'frontend/src/components/CreditNoteEditor.tsx'),
    type: 'so_style',
  },
  {
    filePath: path.join(projectRoot, 'frontend/src/app/(dashboard)/quotations/new/page.tsx'),
    type: 'invoice_style',
  },
  {
    filePath: path.join(projectRoot, 'frontend/src/app/(dashboard)/quotations/[id]/edit/page.tsx'),
    type: 'invoice_style',
  },
];

filesToPatch.forEach(({ filePath, type }) => {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Add Import
  if (!content.includes('import ItemAutocomplete')) {
    content = content.replace(
      "import { INDIAN_STATES } from '@/lib/constants';",
      "import { INDIAN_STATES } from '@/lib/constants';\nimport ItemAutocomplete from '@/components/ItemAutocomplete';"
    );
  }

  // 2. Add Footer & showFooter states
  if (type === 'invoice_style') {
    if (!content.includes('const [footer, setFooter]')) {
      content = content.replace(
        "const [notes, setNotes] = useState('');",
        "const [notes, setNotes] = useState('');\n  const [showFooterArea, setShowFooterArea] = useState(false);\n  const [footer, setFooter] = useState('');"
      );
    }
  } else if (type === 'so_style') {
    if (!content.includes('const [footerText, setFooterText]')) {
      content = content.replace(
        "const [notesText, setNotesText] = useState('');",
        "const [notesText, setNotesText] = useState('');\n  const [showFooter, setShowFooter] = useState(false);\n  const [footerText, setFooterText] = useState('');"
      );
    }
  }

  // 3. Auto-load Business defaults in loadInitialData (create mode)
  if (type === 'invoice_style') {
    const targetBlock = `if (mode === 'create') {
          setSignatureBase64(profile.signatureUrl || profile.signature || '');
          setSignatoryName(profile.signatoryName || '');
          setSignatoryDesignation(profile.designation || '');
          setShowSignatureArea(!!(profile.signatureUrl || profile.signature));
        }`;

    const replacementBlock = `if (mode === 'create') {
          setSignatureBase64(profile.signatureUrl || profile.signature || '');
          setSignatoryName(profile.signatoryName || '');
          setSignatoryDesignation(profile.designation || '');
          setShowSignatureArea(!!(profile.signatureUrl || profile.signature));
          
          if (profile.defaultTerms) {
            setTerms(profile.defaultTerms);
            setShowTermsArea(true);
          }
          if (profile.defaultNotes) {
            setNotes(profile.defaultNotes);
            setShowNotesArea(true);
          }
          if (profile.defaultFooter) {
            setFooter(profile.defaultFooter);
            setShowFooterArea(true);
          }
        }`;
    
    content = content.replace(targetBlock, replacementBlock);
  } else if (type === 'so_style') {
    // SO style has different layout, let's search for "setSignatureUrl(biz.signatureUrl || biz.signature || '');"
    const targetBlock = `if (biz.signatureUrl || biz.signature) {
            setShowSignature(true);
            setSignatureUrl(biz.signatureUrl || biz.signature || '');
            setSignatureLabel(biz.signatoryName || 'Authorised Signatory');
          }`;
    const replacementBlock = `if (biz.signatureUrl || biz.signature) {
            setShowSignature(true);
            setSignatureUrl(biz.signatureUrl || biz.signature || '');
            setSignatureLabel(biz.signatoryName || 'Authorised Signatory');
          }
          if (!initialId) {
            if (biz.defaultTerms) {
              setTermsText(biz.defaultTerms);
              setShowTerms(true);
            }
            if (biz.defaultNotes) {
              setNotesText(biz.defaultNotes);
              setShowRemarks(true);
            }
            if (biz.defaultFooter) {
              setFooterText(biz.defaultFooter);
              setShowFooter(true);
            }
          }`;
    content = content.replace(targetBlock, replacementBlock);
  }

  // 4. applyDocDataToState (edit mode)
  if (type === 'invoice_style') {
    const target = `setNotes(doc.notes || '');
    setShowNotesArea(!!doc.notes);`;
    const replacement = `setNotes(doc.notes || '');
    setShowNotesArea(!!doc.notes);
    setFooter(doc.footer || '');
    setShowFooterArea(!!doc.footer);`;
    content = content.replace(target, replacement);

    // Apply recovered state too
    const targetRec = `setNotes(data.notes || '');`;
    const replacementRec = `setNotes(data.notes || '');
    setFooter(data.footer || '');
    setShowFooterArea(!!data.footer);`;
    content = content.replace(targetRec, replacementRec);
  } else if (type === 'so_style') {
    const target = `setNotesText(doc.notes || '');
            setShowRemarks(!!doc.notes);`;
    const replacement = `setNotesText(doc.notes || '');
            setShowRemarks(!!doc.notes);
            setFooterText(doc.footer || '');
            setShowFooter(!!doc.footer);`;
    content = content.replace(target, replacement);
  }

  // 5. Payload binding
  if (type === 'invoice_style') {
    // Add to payload
    content = content.replace('notes,\n        attachments,', 'notes,\n        footer,\n        attachments,');
    content = content.replace('notes,\n          attachments,', 'notes,\n          footer,\n          attachments,');
    
    // Add to localStorage autosave if present
    content = content.replace('notes,\n          attachments,', 'notes,\n          footer,\n          attachments,');
    content = content.replace('notes, attachments,', 'notes, footer, attachments,');
    content = content.replace('notes, footer, attachments, additionalInfo, contactDetails, isRecurring,', 'notes, footer, attachments, additionalInfo, contactDetails, isRecurring,');
  } else if (type === 'so_style') {
    content = content.replace('notes: showRemarks ? notesText : undefined,', 'notes: showRemarks ? notesText : undefined,\n      footer: showFooter ? footerText : undefined,');
  }

  // 6. ItemAutocomplete replacement
  if (type === 'invoice_style') {
    const targetInput = `<input
                                type="text"
                                value={item.itemName}
                                onChange={(e) => handleUpdateItemRow(i, { itemName: e.target.value })}
                                placeholder="Item name / SKU"
                                className="w-full form-input text-xs font-semibold text-slate-900 bg-white"
                              />`;
    const replacementInput = `<ItemAutocomplete
                                value={item.itemName}
                                onChange={(val) => handleUpdateItemRow(i, { itemName: val })}
                                onSelect={(selected) => handleUpdateItemRow(i, {
                                  itemName: selected.itemName,
                                  description: selected.description,
                                  hsnSac: selected.hsnSac,
                                  gstRate: selected.gstRate,
                                  rate: selected.sellingPrice,
                                  unit: selected.unit,
                                })}
                                placeholder="Search item or type name..."
                              />`;
    content = content.replace(targetInput, replacementInput);
  } else if (type === 'so_style') {
    const targetInput = `<input
                              type="text"
                              value={item.itemName}
                              onChange={(e) => handleItemLineChange(idx, 'itemName', e.target.value)}
                              placeholder="Item name / SKU"
                              className="w-full form-input text-xs font-semibold text-slate-900 bg-white"
                            />`;
    const replacementInput = `<ItemAutocomplete
                              value={item.itemName}
                              onChange={(val) => handleItemLineChange(idx, 'itemName', val)}
                              onSelect={(selected) => {
                                handleItemLineChange(idx, 'itemName', selected.itemName);
                                handleItemLineChange(idx, 'description', selected.description);
                                handleItemLineChange(idx, 'hsnSac', selected.hsnSac);
                                handleItemLineChange(idx, 'gstRate', selected.gstRate);
                                handleItemLineChange(idx, 'rate', selected.sellingPrice);
                                handleItemLineChange(idx, 'unit', selected.unit);
                              }}
                              placeholder="Search item or type name..."
                            />`;
    content = content.replace(targetInput, replacementInput);
  }

  // 7. Render "+ Footer Text" option & input
  if (type === 'invoice_style') {
    const targetBtn = `<button
                    onClick={() => setShowNotesArea(!showNotesArea)}
                    className={\`p-3 rounded-xl border text-left font-bold transition-all \${
                      showNotesArea ? 'bg-blue-50/50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }\`}
                  >
                    + Remarks / Notes
                  </button>`;
    const replacementBtn = `<button
                    onClick={() => setShowNotesArea(!showNotesArea)}
                    className={\`p-3 rounded-xl border text-left font-bold transition-all \${
                      showNotesArea ? 'bg-blue-50/50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }\`}
                  >
                    + Remarks / Notes
                  </button>
                  <button
                    onClick={() => setShowFooterArea(!showFooterArea)}
                    className={\`p-3 rounded-xl border text-left font-bold transition-all \${
                      showFooterArea ? 'bg-blue-50/50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }\`}
                  >
                    + Footer Text
                  </button>`;
    content = content.replace(targetBtn, replacementBtn);

    const targetInput = `{showNotesArea && (
                <div className="space-y-2 animate-slideUp">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Remarks / Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter internal notes visible to client..."
                    rows={4}
                    className="w-full form-input text-xs text-slate-900 bg-white"
                  />
                </div>
              )}`;
    const replacementInput = `{showNotesArea && (
                <div className="space-y-2 animate-slideUp">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Remarks / Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter internal notes visible to client..."
                    rows={4}
                    className="w-full form-input text-xs text-slate-900 bg-white"
                  />
                </div>
              )}

              {showFooterArea && (
                <div className="space-y-2 animate-slideUp">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Footer Text</label>
                  <input
                    type="text"
                    value={footer}
                    onChange={(e) => setFooter(e.target.value)}
                    placeholder="e.g. This is a computer generated document."
                    className="w-full form-input text-xs text-slate-900 bg-white"
                  />
                </div>
              )}`;
    content = content.replace(targetInput, replacementInput);
  } else if (type === 'so_style') {
    const targetBtn = `<button
                    onClick={() => setShowRemarks(!showRemarks)}
                    className={\`p-3 rounded-xl border text-left font-bold transition-all \${
                      showRemarks ? 'bg-blue-50/50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }\`}
                  >
                    + Remarks / Notes
                  </button>`;
    const replacementBtn = `<button
                    onClick={() => setShowRemarks(!showRemarks)}
                    className={\`p-3 rounded-xl border text-left font-bold transition-all \${
                      showRemarks ? 'bg-blue-50/50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }\`}
                  >
                    + Remarks / Notes
                  </button>
                  <button
                    onClick={() => setShowFooter(!showFooter)}
                    className={\`p-3 rounded-xl border text-left font-bold transition-all \${
                      showFooter ? 'bg-blue-50/50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }\`}
                  >
                    + Footer Text
                  </button>`;
    content = content.replace(targetBtn, replacementBtn);

    const targetInput = `{showRemarks && (
                <div className="space-y-2 animate-slideUp">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Remarks / Notes</label>
                  <textarea
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    placeholder="Enter internal notes visible to client..."
                    rows={4}
                    className="w-full form-input text-xs text-slate-900 bg-white"
                  />
                </div>
              )}`;
    const replacementInput = `{showRemarks && (
                <div className="space-y-2 animate-slideUp">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Remarks / Notes</label>
                  <textarea
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    placeholder="Enter internal notes visible to client..."
                    rows={4}
                    className="w-full form-input text-xs text-slate-900 bg-white"
                  />
                </div>
              )}

              {showFooter && (
                <div className="space-y-2 animate-slideUp">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Footer Text</label>
                  <input
                    type="text"
                    value={footerText}
                    onChange={(e) => setFooterText(e.target.value)}
                    placeholder="e.g. This is a computer generated document."
                    className="w-full form-input text-xs text-slate-900 bg-white"
                  />
                </div>
              )}`;
    content = content.replace(targetInput, replacementInput);
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Successfully patched: ${filePath}`);
});
