'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import SalesOrderEditor from '@/components/SalesOrderEditor';

export default function EditSalesOrderRoutePage() {
  const { id } = useParams();
  return <SalesOrderEditor key={id} initialId={id as string} />;
}
