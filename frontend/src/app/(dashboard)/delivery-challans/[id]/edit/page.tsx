'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import DeliveryChallanEditor from '@/components/DeliveryChallanEditor';

export default function EditDeliveryChallanRoutePage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  return <DeliveryChallanEditor key={id} initialId={id as string} />;
}
