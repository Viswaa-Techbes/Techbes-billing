'use client';

import React, { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import Modal from '@/components/ui/Modal';

interface ItemAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (item: {
    itemName: string;
    description: string;
    hsnSac: string;
    gstRate: number;
    sellingPrice: number;
    unit: string;
  }) => void;
  placeholder?: string;
  className?: string;
}

export default function ItemAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Search item...',
  className = '',
}: ItemAutocompleteProps) {
  const { showToast } = useToast();
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Modal form states
  const [newItem, setNewItem] = useState({
    itemName: '',
    sku: '',
    description: '',
    hsnSac: '',
    gstRate: 18,
    unit: 'PCS',
    sellingPrice: 0,
    category: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState('');

  // Handle outside click to close suggestions dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch suggestions with debounce
  useEffect(() => {
    if (!value || value.trim().length < 1 || !showDropdown) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await api.get(`/items?search=${encodeURIComponent(value)}&limit=8`);
        if (response.data?.success) {
          setSuggestions(response.data.data.items || []);
        }
      } catch (err) {
        console.error('Error fetching autocomplete items:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [value, showDropdown]);

  const handleSelectItem = (item: any) => {
    onSelect({
      itemName: item.itemName,
      description: item.description || '',
      hsnSac: item.hsnSac || '',
      gstRate: item.gstRate || 0,
      sellingPrice: item.sellingPrice || 0,
      unit: item.unit || 'PCS',
    });
    setShowDropdown(false);
  };

  const handleOpenCreateModal = () => {
    setNewItem({
      itemName: value,
      sku: '',
      description: '',
      hsnSac: '',
      gstRate: 18,
      unit: 'PCS',
      sellingPrice: 0,
      category: '',
    });
    setDuplicateWarning('');
    setIsModalOpen(true);
    setShowDropdown(false);
  };

  const handleSaveNewItem = async (e: React.FormEvent, ignoreDuplicateCheck = false) => {
    e.preventDefault();
    if (!newItem.itemName.trim()) {
      showToast('Item Name is required', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = { ...newItem, ignoreDuplicateCheck };
      const response = await api.post('/items', payload);
      
      if (response.data?.success) {
        showToast('Item created and added to document!', 'success');
        setIsModalOpen(false);
        // Select the newly created item
        const item = response.data.data;
        onSelect({
          itemName: item.itemName,
          description: item.description || '',
          hsnSac: item.hsnSac || '',
          gstRate: item.gstRate || 0,
          sellingPrice: item.sellingPrice || 0,
          unit: item.unit || 'PCS',
        });
      } else if (response.data?.duplicateWarning) {
        setDuplicateWarning(response.data.message);
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to create item.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => setShowDropdown(true)}
        placeholder={placeholder}
        className={`w-full form-input text-xs font-semibold text-slate-900 bg-white ${className}`}
      />

      {showDropdown && (
        <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-55 max-h-60 overflow-y-auto divide-y divide-slate-100 min-w-[280px]">
          {loading && (
            <div className="px-4 py-3 text-xs text-slate-400 flex items-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Searching items...
            </div>
          )}

          {!loading && suggestions.map((item) => (
            <button
              key={item._id}
              type="button"
              onClick={() => handleSelectItem(item)}
              className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors flex justify-between items-start gap-2 text-xs"
            >
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-800 truncate">{item.itemName}</div>
                {item.description && (
                  <div className="text-[10px] text-slate-450 truncate">{item.description}</div>
                )}
                <div className="flex gap-2 text-[9px] text-slate-400 mt-1 font-mono">
                  {item.sku && <span>SKU: {item.sku}</span>}
                  {item.hsnSac && <span>HSN: {item.hsnSac}</span>}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="font-bold text-blue-600">₹{item.sellingPrice}</div>
                <div className="text-[9px] text-slate-400">GST: {item.gstRate}%</div>
              </div>
            </button>
          ))}

          {!loading && suggestions.length === 0 && value.trim() && (
            <div className="px-4 py-2.5 text-xs text-slate-400 italic">No matches found</div>
          )}

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="w-full text-left px-4 py-2.5 hover:bg-blue-50 text-blue-600 font-bold text-xs flex items-center gap-1.5 transition-colors sticky bottom-0 bg-white border-t border-slate-150"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Create "{value || 'New Item'}" in Master
          </button>
        </div>
      )}

      {/* CREATE MINI DIALOG MODAL */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Quick Create Item Master">
        <form onSubmit={(e) => handleSaveNewItem(e, false)} className="space-y-4 text-slate-800 p-2">
          {duplicateWarning && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-850 rounded-lg text-xs space-y-2">
              <p className="font-semibold text-amber-800 flex items-center gap-1">⚠ Duplicate Check Warning</p>
              <p className="text-[11px] leading-relaxed">{duplicateWarning}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={(e) => handleSaveNewItem(e, true)}
                  className="px-2 py-1 text-[10px] font-bold text-white bg-amber-600 hover:bg-amber-700 rounded"
                >
                  Yes, Save Anyway
                </button>
                <button
                  type="button"
                  onClick={() => setDuplicateWarning('')}
                  className="px-2 py-1 text-[10px] font-bold text-slate-700 bg-white border border-slate-200 rounded"
                >
                  No, Edit Details
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Item Name *</label>
              <input
                type="text"
                value={newItem.itemName}
                onChange={(e) => setNewItem({ ...newItem, itemName: e.target.value })}
                className="w-full form-input text-xs text-slate-900 bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">SKU (Part Number)</label>
              <input
                type="text"
                value={newItem.sku}
                onChange={(e) => setNewItem({ ...newItem, sku: e.target.value })}
                className="w-full form-input text-xs text-slate-900 bg-white"
                placeholder="e.g. CCTV-5MP-01"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">HSN/SAC Code</label>
              <input
                type="text"
                value={newItem.hsnSac}
                onChange={(e) => setNewItem({ ...newItem, hsnSac: e.target.value })}
                className="w-full form-input text-xs text-slate-900 bg-white"
                placeholder="e.g. 8525"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Selling Price (₹) *</label>
              <input
                type="number"
                value={newItem.sellingPrice || ''}
                onChange={(e) => setNewItem({ ...newItem, sellingPrice: parseFloat(e.target.value) || 0 })}
                className="w-full form-input text-xs text-slate-900 bg-white"
                min="0"
                step="0.01"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Default GST Rate (%)</label>
              <select
                value={newItem.gstRate}
                onChange={(e) => setNewItem({ ...newItem, gstRate: parseInt(e.target.value) || 0 })}
                className="w-full form-input text-xs text-slate-900 bg-white"
              >
                {[0, 5, 12, 18, 28].map(r => (
                  <option key={r} value={r}>{r}%</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Item Description</label>
            <textarea
              value={newItem.description}
              onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
              className="w-full form-input text-xs text-slate-900 bg-white resize-none"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-white bg-blue-600 hover:bg-blue-700 text-xs font-semibold rounded-xl disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create & Select'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
