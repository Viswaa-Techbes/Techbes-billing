'use client';

import React from 'react';
import PageHeader from '@/components/PageHeader';

export default function DeliveryChallansPlaceholder() {
  return (
    <div className="space-y-6 text-slate-800">
      <PageHeader
        title="Delivery Challans"
        subtitle="Manage dispatch notes and delivery receipts for physical inventory."
      />
      <div className="card-panel p-16 rounded-xl text-center space-y-4 max-w-2xl mx-auto">
        <div className="w-12 h-12 rounded-full bg-blue-50 text-brand-primary flex items-center justify-center mx-auto">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-sm font-bold text-slate-800">Feature Coming Soon</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
          Delivery Challans management is part of the subsequent developmental stages. In the current stage, please focus on managing Clients & Prospects and Quotation & Estimates.
        </p>
      </div>
    </div>
  );
}
