import React from 'react';
import { InventoryItem, ItemType } from '../types';
import { ITEM_COLORS } from '../constants';
import { Package, X } from 'lucide-react';

interface Props {
  inventory: InventoryItem[];
  isOpen: boolean;
  onToggle: () => void;
}

export const InventoryUI: React.FC<Props> = ({ inventory, isOpen, onToggle }) => {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col items-end">
      <button 
        onClick={onToggle}
        className="bg-slate-800 hover:bg-slate-700 text-white p-3 rounded-full shadow-lg transition-all border-2 border-slate-600 flex items-center justify-center mb-2"
        title="Inventory"
      >
        {isOpen ? <X size={24} /> : <Package size={24} />}
      </button>

      {isOpen && (
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 p-4 rounded-xl shadow-2xl w-64 text-slate-100 transition-all animate-in fade-in slide-in-from-top-4">
          <h2 className="text-lg font-bold mb-4 border-b border-slate-700 pb-2 flex items-center gap-2">
            <Package size={18} />
            Inventory
          </h2>
          
          {inventory.length === 0 ? (
            <div className="text-slate-500 text-center py-4 italic text-sm">Empty... Go explore!</div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {inventory.map((item) => (
                <div key={item.type} className="flex items-center justify-between bg-slate-800 p-2 rounded-lg border border-slate-700">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded-full shadow-inner flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: ITEM_COLORS[item.type], color: '#fff', textShadow: '0px 1px 2px rgba(0,0,0,0.5)' }}
                    >
                      {item.type[0]}
                    </div>
                    <span className="font-medium text-sm">{item.type}</span>
                  </div>
                  <span className="bg-slate-700 px-2 py-0.5 rounded text-xs font-mono text-slate-300">x{item.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};