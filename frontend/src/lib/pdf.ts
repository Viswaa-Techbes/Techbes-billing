export const getDocumentTitle = (documentType?: string) => {
  const titles: Record<string, string> = {
    QUOTATION: 'QUOTATION',
    PROFORMA_INVOICE: 'PROFORMA INVOICE',
    INVOICE: 'INVOICE',
    SALES_ORDER: 'SALES ORDER',
    DELIVERY_CHALLAN: 'DELIVERY CHALLAN',
    CREDIT_NOTE: 'CREDIT NOTE',
  };

  return titles[documentType || ''] || 'DOCUMENT';
};

export const formatImageSrc = (src?: string) => {
  const value = (src || '').trim();
  if (!value) return '';
  if (/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(value) || /^https?:\/\//i.test(value)) {
    return value;
  }
  if (/^[A-Za-z0-9+/=\s]+$/.test(value)) {
    return `data:image/png;base64,${value.replace(/\s/g, '')}`;
  }
  return '';
};

export const downloadDocumentPdf = async (
  node: HTMLElement | null,
  filename: string
) => {
  if (!node) {
    throw new Error('Document preview is not available.');
  }

  const html2pdf = (await import('html2pdf.js')).default;
  const clone = node.cloneNode(true) as HTMLElement;
  clone.classList.add('pdf-export-document');
  clone.querySelectorAll('.invoice-doc-page-footer, .page-number').forEach((el) => el.remove());

  await html2pdf()
    .set({
      filename,
      margin: [0, 0, 0, 0],
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', '.print-avoid-break'] },
    })
    .from(clone)
    .save();
};
