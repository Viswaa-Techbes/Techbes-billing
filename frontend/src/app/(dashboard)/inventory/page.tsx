'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import PageHeader from '@/components/PageHeader';
import Modal from '@/components/ui/Modal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface ItemType {
  _id: string;
  itemName: string;
  sku: string;
  description: string;
  hsnSac: string;
  gstRate: number;
  unit: string;
  sellingPrice: number;
  purchasePrice?: number;
  category: string;
  brand: string;
  discount: number;
  status: 'ACTIVE' | 'INACTIVE';
  usageFrequency: number;
  createdAt: string;
}

export default function InventoryPage() {
  const { showToast } = useToast();
  const [items, setItems] = useState<ItemType[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'INACTIVE' | 'ALL'>('ACTIVE');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ItemType | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    itemName: '',
    sku: '',
    description: '',
    hsnSac: '',
    gstRate: 18,
    unit: 'PCS',
    sellingPrice: 0,
    purchasePrice: '',
    category: '',
    brand: '',
    discount: 0,
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateWarningMsg, setDuplicateWarningMsg] = useState('');

  // Fetch items
  const fetchItems = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      queryParams.append('status', statusFilter);
      if (categoryFilter) queryParams.append('category', categoryFilter);
      queryParams.append('page', page.toString());
      queryParams.append('limit', '15');

      const response = await api.get(`/items?${queryParams.toString()}`);
      if (response.data?.success) {
        setItems(response.data.data.items || []);
        setTotalPages(Math.ceil((response.data.data.total || 0) / 15) || 1);
        
        // Extract categories for filter list from loaded items
        const rawItems = response.data.data.items || [];
        const uniqueCats = Array.from(new Set(rawItems.map((i: any) => i.category).filter(Boolean))) as string[];
        if (uniqueCats.length > 0) {
          setCategories(prev => Array.from(new Set([...prev, ...uniqueCats])));
        }
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to load items.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchItems();
    }, 350);

    return () => clearTimeout(delayDebounceFn);
  }, [search, statusFilter, categoryFilter, page]);

  // Handle Form Input Change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'sellingPrice' || name === 'gstRate' || name === 'discount' ? parseFloat(value) || 0 : value,
    }));
  };

  // Open Create Modal
  const openCreateModal = () => {
    setFormData({
      itemName: '',
      sku: '',
      description: '',
      hsnSac: '',
      gstRate: 18,
      unit: 'PCS',
      sellingPrice: 0,
      purchasePrice: '',
      category: '',
      brand: '',
      discount: 0,
      status: 'ACTIVE',
    });
    setDuplicateWarningMsg('');
    setIsCreateOpen(true);
  };

  // Save Item
  const handleSaveItem = async (e: React.FormEvent, ignoreDuplicateCheck = false) => {
    e.preventDefault();
    if (!formData.itemName.trim()) {
      showToast('Item Name is required', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        purchasePrice: formData.purchasePrice ? parseFloat(formData.purchasePrice) : undefined,
        ignoreDuplicateCheck,
      };

      const response = await api.post('/items', payload);
      if (response.data?.success) {
        showToast('Item created successfully!', 'success');
        setIsCreateOpen(false);
        fetchItems();
      } else if (response.data?.duplicateWarning) {
        setDuplicateWarningMsg(response.data.message);
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to create item.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (item: ItemType) => {
    setSelectedItem(item);
    setFormData({
      itemName: item.itemName,
      sku: item.sku || '',
      description: item.description || '',
      hsnSac: item.hsnSac || '',
      gstRate: item.gstRate || 0,
      unit: item.unit || 'PCS',
      sellingPrice: item.sellingPrice || 0,
      purchasePrice: item.purchasePrice ? String(item.purchasePrice) : '',
      category: item.category || '',
      brand: item.brand || '',
      discount: item.discount || 0,
      status: item.status || 'ACTIVE',
    });
    setIsEditOpen(true);
  };

  // Update Item
  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.itemName.trim()) {
      showToast('Item Name is required', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        purchasePrice: formData.purchasePrice ? parseFloat(formData.purchasePrice) : undefined,
      };

      const response = await api.put(`/items/${selectedItem?._id}`, payload);
      if (response.data?.success) {
        showToast('Item updated successfully!', 'success');
        setIsEditOpen(false);
        fetchItems();
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to update item.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Item status
  const handleToggleStatus = async (item: ItemType) => {
    const newStatus = item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const response = await api.put(`/items/${item._id}`, {
        itemName: item.itemName,
        sellingPrice: item.sellingPrice,
        status: newStatus,
      });

      if (response.data?.success) {
        showToast(`Item status updated to ${newStatus}.`, 'success');
        fetchItems();
      }
    } catch (err: any) {
      showToast('Failed to update status.', 'error');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Item Master & Inventory"
        subtitle="Manage products and services catalog, default prices, and tax configuration rules."
        actions={
          <div className="flex gap-2">
            <Link
              href="/settings/import?type=ITEM"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-500 bg-white rounded-xl shadow-sm transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Import Excel
            </Link>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New Item Master
            </button>
          </div>
        }
      />

      {/* Filters Bar */}
      <div className="card-panel p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Name, SKU, Description..."
            className="w-full form-input pl-9 text-xs text-slate-800 placeholder:text-slate-400"
          />
          <svg
            className="w-4 h-4 text-slate-400 absolute left-3 top-2.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="form-input text-xs bg-white text-slate-850"
          >
            <option value="ACTIVE">Status: Active</option>
            <option value="INACTIVE">Status: Inactive</option>
            <option value="ALL">Status: All</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="form-input text-xs bg-white text-slate-850"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Items Table / List */}
      <div className="card-panel rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 flex justify-center">
            <LoadingSpinner size="md" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-3">
            <svg className="w-12 h-12 mx-auto text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p className="text-xs font-semibold">No items match your query.</p>
            <p className="text-[10px] text-slate-350">Try creating a new item master or importing a CSV template.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="px-4 py-3">Item Details</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">HSN/SAC</th>
                  <th className="px-4 py-3">GST Rate</th>
                  <th className="px-4 py-3 text-right">Selling Price</th>
                  <th className="px-4 py-3 text-right">Purchase Price</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Popularity</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {items.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-900">{item.itemName}</div>
                      {item.description && <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{item.description}</div>}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-[10px] text-slate-600">{item.sku || '-'}</td>
                    <td className="px-4 py-3.5 font-mono text-[10px] text-slate-600">{item.hsnSac || '-'}</td>
                    <td className="px-4 py-3.5">{item.gstRate}%</td>
                    <td className="px-4 py-3.5 text-right font-semibold text-slate-900">₹{item.sellingPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3.5 text-right text-slate-500">
                      {item.purchasePrice !== null && item.purchasePrice !== undefined ? `₹${item.purchasePrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                    </td>
                    <td className="px-4 py-3.5">
                      {item.category ? (
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]">
                          {item.category}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3.5 text-slate-400 font-medium">
                      {item.usageFrequency > 0 ? (
                        <span className="flex items-center gap-1 text-blue-600">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zm6-4a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm6-3a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                          </svg>
                          {item.usageFrequency}x
                        </span>
                      ) : '0'}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        item.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-150 text-slate-600'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${item.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {item.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(item)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleStatus(item)}
                        className={`text-xs font-semibold ${item.status === 'ACTIVE' ? 'text-rose-500 hover:text-rose-600' : 'text-emerald-600 hover:text-emerald-700'}`}
                      >
                        {item.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PAGINATION */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-[11px] font-medium text-slate-500">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* CREATE MODAL */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create New Item Master">
        <form onSubmit={(e) => handleSaveItem(e, false)} className="space-y-4 text-slate-800 p-2">
          {duplicateWarningMsg && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-850 rounded-lg text-xs space-y-2">
              <div className="font-semibold flex items-center gap-1.5 text-amber-800">
                <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Duplicate Warning
              </div>
              <p className="text-[11px] leading-relaxed">{duplicateWarningMsg}</p>
              <div className="flex gap-2 pt-1.5">
                <button
                  type="button"
                  onClick={(e) => handleSaveItem(e, true)}
                  className="px-2.5 py-1 text-[10px] font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-md"
                >
                  Yes, Save Anyway
                </button>
                <button
                  type="button"
                  onClick={() => setDuplicateWarningMsg('')}
                  className="px-2.5 py-1 text-[10px] font-bold text-slate-700 bg-white border border-slate-250 hover:bg-slate-50 rounded-md"
                >
                  No, Edit Details
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-650 mb-1">Item Name *</label>
              <input
                type="text"
                name="itemName"
                value={formData.itemName}
                onChange={handleChange}
                className="w-full form-input text-xs text-slate-900 bg-white"
                placeholder="e.g. CCTV Camera 5MP"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-650 mb-1">SKU</label>
              <input
                type="text"
                name="sku"
                value={formData.sku}
                onChange={handleChange}
                className="w-full form-input text-xs text-slate-900 bg-white"
                placeholder="e.g. CCTV-5MP-01"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-650 mb-1">HSN/SAC Code</label>
              <input
                type="text"
                name="hsnSac"
                value={formData.hsnSac}
                onChange={handleChange}
                className="w-full form-input text-xs text-slate-900 bg-white"
                placeholder="e.g. 8525"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-650 mb-1">Selling Price (₹) *</label>
              <input
                type="number"
                name="sellingPrice"
                value={formData.sellingPrice}
                onChange={handleChange}
                className="w-full form-input text-xs text-slate-900 bg-white"
                placeholder="0.00"
                min="0"
                step="0.01"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-650 mb-1">Purchase Price (₹, Optional)</label>
              <input
                type="number"
                name="purchasePrice"
                value={formData.purchasePrice}
                onChange={handleChange}
                className="w-full form-input text-xs text-slate-900 bg-white"
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-650 mb-1">Default GST Rate (%)</label>
              <select
                name="gstRate"
                value={formData.gstRate}
                onChange={handleChange}
                className="w-full form-input text-xs text-slate-900 bg-white font-medium"
              >
                {[0, 5, 12, 18, 28].map(r => (
                  <option key={r} value={r}>{r}%</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-650 mb-1">Default Unit</label>
              <input
                type="text"
                name="unit"
                value={formData.unit}
                onChange={handleChange}
                className="w-full form-input text-xs text-slate-900 bg-white"
                placeholder="e.g. PCS, BOX, MTR"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-650 mb-1">Category</label>
              <input
                type="text"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full form-input text-xs text-slate-900 bg-white"
                placeholder="e.g. Surveillance"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-650 mb-1">Brand</label>
              <input
                type="text"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                className="w-full form-input text-xs text-slate-900 bg-white"
                placeholder="e.g. Hikvision"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-650 mb-1">Default Discount (%)</label>
              <input
                type="number"
                name="discount"
                value={formData.discount}
                onChange={handleChange}
                className="w-full form-input text-xs text-slate-900 bg-white"
                placeholder="0"
                min="0"
                max="100"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-650 mb-1">Item Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full form-input text-xs text-slate-900 bg-white resize-none"
              rows={2}
              placeholder="Provide a detailed description of the item..."
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 border border-slate-350 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-white bg-blue-600 hover:bg-blue-700 text-xs font-semibold rounded-xl shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Item'}
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT MODAL */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Item Master Record">
        <form onSubmit={handleUpdateItem} className="space-y-4 text-slate-800 p-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-650 mb-1">Item Name *</label>
              <input
                type="text"
                name="itemName"
                value={formData.itemName}
                onChange={handleChange}
                className="w-full form-input text-xs text-slate-900 bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-650 mb-1">SKU</label>
              <input
                type="text"
                name="sku"
                value={formData.sku}
                onChange={handleChange}
                className="w-full form-input text-xs text-slate-900 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-650 mb-1">HSN/SAC Code</label>
              <input
                type="text"
                name="hsnSac"
                value={formData.hsnSac}
                onChange={handleChange}
                className="w-full form-input text-xs text-slate-900 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-650 mb-1">Selling Price (₹) *</label>
              <input
                type="number"
                name="sellingPrice"
                value={formData.sellingPrice}
                onChange={handleChange}
                className="w-full form-input text-xs text-slate-900 bg-white"
                min="0"
                step="0.01"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-650 mb-1">Purchase Price (₹, Optional)</label>
              <input
                type="number"
                name="purchasePrice"
                value={formData.purchasePrice}
                onChange={handleChange}
                className="w-full form-input text-xs text-slate-900 bg-white"
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-650 mb-1">Default GST Rate (%)</label>
              <select
                name="gstRate"
                value={formData.gstRate}
                onChange={handleChange}
                className="w-full form-input text-xs text-slate-900 bg-white font-medium"
              >
                {[0, 5, 12, 18, 28].map(r => (
                  <option key={r} value={r}>{r}%</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-650 mb-1">Default Unit</label>
              <input
                type="text"
                name="unit"
                value={formData.unit}
                onChange={handleChange}
                className="w-full form-input text-xs text-slate-900 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-650 mb-1">Category</label>
              <input
                type="text"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full form-input text-xs text-slate-900 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-650 mb-1">Brand</label>
              <input
                type="text"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                className="w-full form-input text-xs text-slate-900 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-650 mb-1">Default Discount (%)</label>
              <input
                type="number"
                name="discount"
                value={formData.discount}
                onChange={handleChange}
                className="w-full form-input text-xs text-slate-900 bg-white"
                min="0"
                max="100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-650 mb-1">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full form-input text-xs text-slate-900 bg-white"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-650 mb-1">Item Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full form-input text-xs text-slate-900 bg-white resize-none"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              className="px-4 py-2 border border-slate-350 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-white bg-blue-600 hover:bg-blue-700 text-xs font-semibold rounded-xl shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Updating...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
