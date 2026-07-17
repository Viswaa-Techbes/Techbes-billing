'use client';

import React from 'react';
import ProformaInvoiceEditor from '@/components/ProformaInvoiceEditor';

interface EditProformaInvoicePageProps {
  params: {
    id: string;
  };
}

export default function EditProformaInvoicePage({ params }: EditProformaInvoicePageProps) {
  return <ProformaInvoiceEditor key={params.id} mode="edit" documentId={params.id} />;
}
