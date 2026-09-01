'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import SalesOrderEditor from '@/components/SalesOrderEditor';

export default function EditSalesOrderRoutePage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  return <SalesOrderEditor key={id} initialId={id as string} />;
}
