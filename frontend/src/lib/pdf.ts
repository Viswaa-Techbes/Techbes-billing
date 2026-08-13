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

  const loadHtml2Pdf = async () => {
    const existing = (window as any).html2pdf;
    if (existing) return existing;

    try {
      const dynamicImport = new Function('specifier', 'return import(specifier)');
      const module = await dynamicImport('html2pdf.js');
      return module.default || module;
    } catch {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('PDF generator could not be loaded.'));
        document.head.appendChild(script);
      });
      return (window as any).html2pdf;
    }
  };

  const waitForImages = async (root: HTMLElement) => {
    const images = Array.from(root.querySelectorAll('img'));
    await Promise.all(images.map((image) => {
      if (image.complete && image.naturalWidth > 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
        image.onload = () => resolve();
        image.onerror = () => resolve();
      });
    }));
  };

  const html2pdf = await loadHtml2Pdf();
  const clone = node.cloneNode(true) as HTMLElement;
  clone.classList.add('pdf-export-document');
  clone.querySelectorAll('.invoice-doc-page-footer, .page-number').forEach((el) => el.remove());

  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.position = 'absolute';
  host.style.left = '0';
  host.style.top = '0';
  host.style.width = '210mm';
  host.style.minHeight = '297mm';
  host.style.background = '#ffffff';
  host.style.zIndex = '-1';
  host.style.pointerEvents = 'none';
  host.style.overflow = 'visible';

  clone.classList.remove('card-panel', 'rounded-xl', 'shadow-[0_8px_30px_rgba(15,23,42,0.06)]', 'border', 'border-slate-200', 'mx-auto');
  clone.style.width = '210mm';
  clone.style.maxWidth = '210mm';
  clone.style.minHeight = '297mm';
  clone.style.margin = '0';
  clone.style.border = '0';
  clone.style.borderRadius = '0';
  clone.style.boxShadow = 'none';
  clone.style.background = '#ffffff';

  host.appendChild(clone);
  document.body.appendChild(host);

  try {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
    await waitForImages(clone);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

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
          logging: false,
          windowWidth: clone.scrollWidth,
          windowHeight: clone.scrollHeight,
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', '.print-avoid-break'] },
      })
      .from(clone)
      .save();
  } finally {
    host.remove();
  }
};
