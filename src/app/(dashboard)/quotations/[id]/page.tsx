'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import PageHeader from '@/components/PageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Modal from '@/components/ui/Modal';

export default function QuotationDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const { showToast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  const [document, setDocument] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Status transition state
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState('');

  const fetchDocumentDetails = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/documents/${id}`);
      if (response.data?.success) {
        setDocument(response.data.data);
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to retrieve quotation details.', 'error');
      router.push('/quotations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchDocumentDetails();
    }
  }, [id]);

  const handleStatusTransition = async (status: string) => {
    setUpdatingStatus(true);
    try {
      const response = await api.patch(`/documents/${id}/status`, { status });
      if (response.data?.success) {
        showToast(`Document marked as ${status} successfully.`, 'success');
        setStatusModalOpen(false);
        fetchDocumentDetails();
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to update document status.', 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="card-panel p-16 rounded-xl flex items-center justify-center min-h-[300px]">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (!document) return null;

  const displayOptions = document.displayOptions || {
    showHsnSac: true,
    showTaxSummary: true,
    showItemDescriptions: true,
    showTotalQuantity: true,
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      DRAFT: 'bg-slate-105 text-slate-700 border-slate-200',
      SENT: 'bg-blue-50 text-blue-700 border-blue-100',
      VIEWED: 'bg-purple-50 text-purple-700 border-purple-100',
      ACCEPTED: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      REJECTED: 'bg-rose-50 text-rose-700 border-rose-100',
      EXPIRED: 'bg-amber-50 text-amber-705 border-amber-100',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${styles[status] || 'bg-slate-100'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6 text-slate-800">
      {/* Page Actions Bar */}
      <PageHeader
        title={document.documentNumber}
        subtitle="Review estimate calculations, current status, and print document view."
        actions={
          <div className="flex flex-wrap gap-2 print:hidden">
            <Link
              href="/quotations"
              className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-semibold transition-colors"
            >
              Back to List
            </Link>
            
            {document.status === 'DRAFT' && (
              <Link
                href={`/quotations/${document._id}/edit`}
                className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-semibold transition-colors"
              >
                Edit Quotation
              </Link>
            )}

            {/* Status Transition buttons */}
            {document.status === 'DRAFT' && (
              <button
                onClick={() => {
                  setTargetStatus('SENT');
                  setStatusModalOpen(true);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
              >
                Mark Sent
              </button>
            )}

            {document.status === 'SENT' && (
              <>
                <button
                  onClick={() => {
                    setTargetStatus('ACCEPTED');
                    setStatusModalOpen(true);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                >
                  Mark Accepted
                </button>
                <button
                  onClick={() => {
                    setTargetStatus('REJECTED');
                    setStatusModalOpen(true);
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                >
                  Mark Rejected
                </button>
              </>
            )}

            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print / PDF
            </button>
          </div>
        }
      />

      {/* Main Container */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
        {/* Printable Card Area */}
        <div 
          ref={printRef}
          className="xl:col-span-3 card-panel rounded-xl p-12 bg-white print:p-0 print:border-none print:shadow-none space-y-8 text-xs text-slate-850 font-sans border border-slate-200"
        >
          {/* Top Invoice Header */}
          <div className="flex justify-between items-start border-b border-slate-200 pb-6">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-900">QUOTATION</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">{document.businessSnapshot.businessName}</p>

              <div className="mt-5 space-y-1 text-slate-650 font-medium">
                <p className="font-bold text-slate-900 text-sm">{document.businessSnapshot.businessName}</p>
                <p>Email: {document.businessSnapshot.email || '—'}</p>
                <p>Phone: {document.businessSnapshot.phone || '—'}</p>
                {document.businessSnapshot.gstin && <p className="font-mono">GSTIN: {document.businessSnapshot.gstin}</p>}
                {document.businessSnapshot.address?.addressLine1 && (
                  <p className="max-w-xs mt-1 leading-relaxed text-slate-600 font-normal">
                    {document.businessSnapshot.address.addressLine1}, {document.businessSnapshot.address.city}, {document.businessSnapshot.address.state} - {document.businessSnapshot.address.pincode}
                  </p>
                )}
              </div>
            </div>

            <div className="text-right space-y-1.5 font-mono text-slate-650">
              <div>
                <span className="font-bold text-slate-900">Doc No: </span>
                <span className="font-semibold text-brand-primary">{document.documentNumber}</span>
              </div>
              <p><span className="font-bold text-slate-900">Issue Date:</span> {new Date(document.issueDate).toLocaleDateString('en-IN')}</p>
              <p>
                <span className="font-bold text-slate-900">Valid Till:</span>{' '}
                {document.validTill ? new Date(document.validTill).toLocaleDateString('en-IN') : '—'}
              </p>
              {document.poNumber && <p><span className="font-bold text-slate-900">PO Ref:</span> {document.poNumber}</p>}
              <div className="pt-2 print:hidden">
                {getStatusBadge(document.status)}
              </div>
            </div>
          </div>

          {/* Client & Shipping Details */}
          <div className="grid grid-cols-2 gap-8 border-b border-slate-200 pb-6">
            <div>
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">QUOTATION FOR</h3>
              <div className="space-y-1.5 text-slate-650">
                <p className="font-bold text-slate-900">
                  {document.clientSnapshot.businessName || document.clientSnapshot.clientName}
                </p>
                {document.clientSnapshot.businessName && <p>Attn: {document.clientSnapshot.clientName}</p>}
                <p>Email: {document.clientSnapshot.email || '—'}</p>
                <p>Phone: {document.clientSnapshot.phone || '—'}</p>
                {document.clientSnapshot.gstin && <p className="font-mono">GSTIN: {document.clientSnapshot.gstin}</p>}
                {document.clientSnapshot.billingAddress?.addressLine1 && (
                  <p className="max-w-xs mt-1 leading-relaxed text-slate-600 font-normal">
                    {document.clientSnapshot.billingAddress.addressLine1}, {document.clientSnapshot.billingAddress.city}, {document.clientSnapshot.billingAddress.state} - {document.clientSnapshot.billingAddress.pincode}
                  </p>
                )}
              </div>
            </div>

            {document.shippingAddress && document.shippingAddress.addressLine1 && (
              <div>
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">SHIPPING DETAILS</h3>
                <div className="space-y-1 text-slate-655 leading-relaxed text-slate-600 font-normal">
                  <p>{document.shippingAddress.addressLine1}</p>
                  {document.shippingAddress.addressLine2 && <p>{document.shippingAddress.addressLine2}</p>}
                  <p>{document.shippingAddress.city}, {document.shippingAddress.state} - {document.shippingAddress.pincode}</p>
                  <p>{document.shippingAddress.country}</p>
                </div>
              </div>
            )}
          </div>

          {/* Table Items */}
          <div>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-300 font-semibold text-slate-500">
                  <th className="py-2.5">Item Details</th>
                  {displayOptions.showHsnSac && <th className="py-2.5 w-[100px] text-center">HSN/SAC</th>}
                  <th className="py-2.5 w-[80px] text-center">Qty</th>
                  <th className="py-2.5 w-[95px] text-right">Rate</th>
                  <th className="py-2.5 w-[110px] text-right">Discount</th>
                  <th className="py-2.5 w-[80px] text-center">GST %</th>
                  <th className="py-2.5 w-[110px] text-right">Total (INR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {document.items.map((item: any, idx: number) => (
                  <tr key={idx} className="align-top py-2.5">
                    <td className="py-2.5">
                      <p className="font-semibold text-slate-900">{item.itemName}</p>
                      {displayOptions.showItemDescriptions && item.description && (
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed font-normal">{item.description}</p>
                      )}
                    </td>
                    {displayOptions.showHsnSac && (
                      <td className="py-2.5 text-center font-mono text-[11px] text-slate-600">{item.hsnSac || '—'}</td>
                    )}
                    <td className="py-2.5 text-center font-medium">
                      {item.quantity} <span className="text-[10px] text-slate-500 font-normal">{item.unit}</span>
                    </td>
                    <td className="py-2.5 text-right font-mono">₹{item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="py-2.5 text-right text-slate-500 font-mono">
                      {item.discountType === 'PERCENTAGE' ? (
                        `%${item.discountValue} (-₹${item.itemDiscountAmount.toLocaleString('en-IN')})`
                      ) : item.discountType === 'FIXED' ? (
                        `-₹${item.itemDiscountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-2.5 text-center text-slate-650">{item.gstRate}%</td>
                    <td className="py-2.5 text-right font-bold text-slate-850 font-mono">
                      ₹{item.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Calculations */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-6 border-t border-slate-200 pt-6">
            <div className="max-w-md space-y-4">
              {displayOptions.showTaxSummary && (
                <div className="space-y-1 text-[10px] text-slate-600 font-mono">
                  <p className="font-bold text-slate-500 uppercase tracking-wider mb-1 text-[9px]">Tax Summary</p>
                  <p>Taxable Base Sum: ₹{document.taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                  {document.gstMode === 'INTRA_STATE' ? (
                    <>
                      <p>CGST Total: ₹{document.cgstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                      <p>SGST Total: ₹{document.sgstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                    </>
                  ) : (
                    <p>IGST Total: ₹{document.igstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                  )}
                </div>
              )}
            </div>

            <div className="w-full md:w-80 space-y-2.5 text-slate-750">
              <div className="flex justify-between items-center text-slate-500">
                <span>Subtotal</span>
                <span>₹{document.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              {document.documentDiscountAmount > 0 && (
                <div className="flex justify-between items-center text-rose-600 font-semibold">
                  <span>Document Discount</span>
                  <span>-₹{document.documentDiscountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-slate-500">
                <span>Taxable Amount</span>
                <span>₹{document.taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              {document.gstMode === 'INTRA_STATE' ? (
                <div className="flex justify-between items-center text-slate-500">
                  <span>CGST + SGST</span>
                  <span>₹{(document.cgstTotal + document.sgstTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              ) : (
                <div className="flex justify-between items-center text-slate-500">
                  <span>IGST</span>
                  <span>₹{document.igstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              {document.additionalChargesTotal > 0 && (
                <div className="flex justify-between items-center text-slate-500">
                  <span>Additional Charges</span>
                  <span>+₹{document.additionalChargesTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              {Math.abs(document.roundOff) > 0 && (
                <div className="flex justify-between items-center text-slate-500">
                  <span>Round Off</span>
                  <span>₹{document.roundOff.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-sm font-bold text-slate-900 border-t border-slate-200 pt-2">
                <span>Grand Total</span>
                <span className="text-brand-primary text-base font-black">
                  ₹{document.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 italic text-right mt-1 font-semibold leading-relaxed font-sans">
                In Words: {document.grandTotalInWords}
              </div>
            </div>
          </div>

          {/* Custom clauses/metadata and signature */}
          <div className="border-t border-slate-200 pt-6 grid grid-cols-1 md:grid-cols-2 gap-8 text-[11px] text-slate-650 font-sans">
            <div className="space-y-4">
              {document.terms && (
                <div>
                  <p className="font-bold text-slate-500 uppercase text-[9px] mb-1 tracking-wider">Terms & Conditions</p>
                  <p className="whitespace-pre-wrap leading-relaxed">{document.terms}</p>
                </div>
              )}
              {document.notes && (
                <div>
                  <p className="font-bold text-slate-500 uppercase text-[9px] mb-1 tracking-wider">Remarks / Notes</p>
                  <p className="whitespace-pre-wrap leading-relaxed">{document.notes}</p>
                </div>
              )}
            </div>

            <div className="flex flex-col justify-end items-end space-y-6 pt-6">
              {document.signatoryName && (
                <div className="text-center font-medium text-slate-700 min-w-[150px]">
                  <div className="h-10 border-b border-slate-200 mb-2" />
                  <p className="font-bold text-slate-900">{document.signatoryName}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wider font-bold">Authorized Signatory</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Side Audit Log/Meta Panel (Hidden during print) */}
        <div className="card-panel p-6 rounded-xl space-y-6 bg-white text-xs text-slate-750 print:hidden">
          <h3 className="font-bold text-sm text-slate-900 pb-2 border-b border-slate-100">Details & Audit</h3>
          
          <div className="space-y-3.5">
            <div>
              <span className="font-semibold text-slate-500 block mb-1">Status</span>
              {getStatusBadge(document.status)}
            </div>

            <div>
              <span className="font-semibold text-slate-500 block">GST Classification</span>
              <span className="font-semibold text-slate-900">
                {document.gstMode === 'INTRA_STATE' ? 'Intra-state CGST+SGST' : 'Inter-state IGST'}
              </span>
            </div>

            <div>
              <span className="font-semibold text-slate-500 block">Place of Supply</span>
              <span className="font-medium text-slate-800">
                {document.placeOfSupply?.state} ({document.placeOfSupply?.stateCode})
              </span>
            </div>

            <div className="border-t border-slate-100 pt-3.5 space-y-2">
              <p>
                <span className="font-semibold text-slate-500">Created:</span>{' '}
                <span className="text-slate-700">{new Date(document.createdAt).toLocaleString('en-IN')}</span>
              </p>
              <p>
                <span className="font-semibold text-slate-500">Last Updated:</span>{' '}
                <span className="text-slate-700">{new Date(document.updatedAt).toLocaleString('en-IN')}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Transition Modal */}
      <Modal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title={`Change Quotation Status to ${targetStatus}`}
        footer={
          <>
            <button
              onClick={() => setStatusModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => handleStatusTransition(targetStatus)}
              disabled={updatingStatus}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
            >
              {updatingStatus ? 'Updating...' : 'Confirm Status Change'}
            </button>
          </>
        }
      >
        <p className="text-xs text-slate-650">
          Are you sure you want to transition this quotation to <span className="font-bold text-slate-900">{targetStatus}</span>?
        </p>
        <p className="mt-2 text-[10px] text-slate-500 leading-relaxed">
          {targetStatus === 'SENT' && 'This locks direct drafting mode edits. Future updates must represent status acceptances or rejections.'}
          {targetStatus === 'ACCEPTED' && 'This confirms customer agreement. You can reference this quotation to issue Proforma or standard invoices in subsequent workflows.'}
        </p>
      </Modal>
    </div>
  );
}
