'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import CreditNoteEditor from '@/components/CreditNoteEditor';

export default function EditCreditNoteRoutePage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  return <CreditNoteEditor key={id} initialId={id as string} />;
}
