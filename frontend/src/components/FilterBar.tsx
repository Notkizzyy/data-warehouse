import React, { useEffect, useState, useRef } from 'react';
import { useAppStore } from '../store';
import { fetchOptions } from '../api';
import { Filter, X, CheckSquare, Square, ChevronDown } from 'lucide-react';

const MultiSelectDropdown = ({ label, options, selected, onToggle }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm hover:bg-white/10 transition text-gray-200 capitalize"
      >
        <span>{selected.length === 0 ? `Semua ${label}` : `${selected.length} ${label} dipilih`}</span>
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 top-full left-0 mt-2 w-48 max-h-64 overflow-y-auto bg-primary border border-white/10 rounded-lg shadow-xl p-2">
          {options?.map((opt: string) => {
            const isSelected = selected.includes(opt.toString());
            return (
              <div 
                key={opt}
                onClick={() => onToggle(opt.toString())}
                className="flex items-center gap-3 p-2 hover:bg-white/5 rounded cursor-pointer transition-colors"
              >
                {isSelected ? <CheckSquare size={16} className="text-secondary" /> : <Square size={16} className="text-gray-500" />}
                <span className="text-sm text-gray-200">{opt}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const FilterBar = () => {
  const { filters, toggleFilterValue, clearFilters } = useAppStore();
  const [options, setOptions] = useState<any>({});

  useEffect(() => {
    fetchOptions().then(setOptions).catch(console.error);
  }, []);

  // Compute active dimensions (at least one checkbox selected)
  const activeDimensions = Object.values(filters).filter(v => v.length > 0).length;
  let olapOperation = 'Lihat Semua (No Filter)';
  if (activeDimensions === 1) olapOperation = 'Slice (1 Dimensi)';
  if (activeDimensions > 1) olapOperation = `Dice (${activeDimensions} Dimensi)`;

  const keys = ['tahun', 'bulan', 'outlet', 'kategori', 'metode_pembayaran'];

  return (
    <div className="glass-card mb-6 p-4 relative z-50">
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2 mr-2 text-secondary">
          <Filter size={18} />
          <span className="font-semibold text-sm">Global Filters:</span>
        </div>
        
        {keys.map(key => {
            let opts = options[key] || [];
            if (key === 'bulan' && opts.length === 0) {
               opts = Array.from({length: 12}, (_, i) => i + 1);
            }
            return (
              <MultiSelectDropdown 
                key={key}
                label={key.replace('_', ' ')}
                options={opts}
                selected={(filters as any)[key]}
                onToggle={(val: string) => toggleFilterValue(key as any, val)}
              />
            );
        })}

        <button 
          onClick={clearFilters}
          className="ml-auto text-xs text-gray-400 hover:text-white flex items-center gap-1 bg-white/5 px-2 py-1 rounded transition-colors"
        >
          <X size={14} /> Clear
        </button>
      </div>
      
      <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2">
        <span className="text-xs text-gray-400 uppercase tracking-widest font-bold">OLAP Operation:</span>
        <span className={`text-xs font-mono px-2 py-1 rounded ${activeDimensions > 0 ? 'bg-secondary/20 text-secondary border border-secondary/30' : 'bg-white/5 text-gray-400'}`}>
          {olapOperation}
        </span>
        <span className="text-xs text-gray-500 ml-2 italic">
          (Menggunakan Checkbox (IN Array) untuk fitur Dice Multi-dimensi)
        </span>
      </div>
    </div>
  );
};
