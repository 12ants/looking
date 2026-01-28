import React, { useState } from 'react';
import { InventoryItem, ItemType } from '../types';
import { ITEM_COLORS, ITEM_DETAILS } from '../constants';
import { Package, X, Trash2, Zap, Hand, Info } from 'lucide-react';

interface Props {
  inventory: InventoryItem[];
  isOpen: boolean;
  onToggle: () => void;
  onUseItem: (type: ItemType) => void;
  onDropItem: (type: ItemType) => void;
}

export const InventoryUI: React.FC<Props> = ({ inventory, isOpen, onToggle, onUseItem, onDropItem }) => {
  const [selectedType, setSelectedType] = useState<ItemType | null>(null);
  const [hoveredType, setHoveredType] = useState<ItemType | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  if (!isOpen) return null;

  const selectedItem = inventory.find(i => i.type === selectedType);
  
  const handleUse = () => {
    if (selectedType) {
      onUseItem(selectedType);
      // Deselect if used up
      const item = inventory.find(i => i.type === selectedType);
      if (item && item.count <= 1) setSelectedType(null);
    }
  };

  const handleDrop = () => {
    if (selectedType) {
      onDropItem(selectedType);
      const item = inventory.find(i => i.type === selectedType);
      if (item && item.count <= 1) setSelectedType(null);
    }
  };

  const isUsable = (type: ItemType) => {
      return type === ItemType.POTION;
  };

  const handleMouseEnter = (type: ItemType, e: React.MouseEvent) => {
      setHoveredType(type);
      setMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseLeave = () => {
      setHoveredType(null);
  };

  return (
    <>
        {/* Tooltip */}
        {hoveredType && (
            <div 
                className="fixed z-50 pointer-events-none w-64 p-3 bg-slate-950/95 border border-slate-600 rounded-xl shadow-2xl backdrop-blur-md text-slate-100 flex flex-col gap-2 animate-in fade-in zoom-in duration-150"
                style={{ 
                    top: mousePos.y - 10, 
                    left: mousePos.x, 
                    transform: 'translate(-50%, -100%)' 
                }}
            >
                <div className="flex justify-between items-start">
                    <h4 className="font-bold text-sm text-yellow-400">{ITEM_DETAILS[hoveredType].name}</h4>
                    <span className="text-[10px] uppercase font-mono bg-slate-800 px-1 rounded text-slate-400 border border-slate-700">
                        {ITEM_DETAILS[hoveredType].type}
                    </span>
                </div>
                <div className="h-px bg-slate-800 w-full" />
                <p className="text-xs text-slate-300 italic">"{ITEM_DETAILS[hoveredType].lore}"</p>
                {ITEM_DETAILS[hoveredType].usage && (
                    <div className="text-xs font-bold text-green-400 mt-1 flex items-center gap-1">
                        <Zap size={10} />
                        {ITEM_DETAILS[hoveredType].usage}
                    </div>
                )}
            </div>
        )}

        {/* Main Inventory Panel */}
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-40">
          <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/50 p-4 rounded-2xl shadow-2xl w-80 text-slate-100 animate-in fade-in slide-in-from-bottom-4 zoom-in-95 flex flex-col gap-4">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-700/50">
               <h2 className="text-lg font-bold flex items-center gap-2 text-blue-400">
                <Package size={20} />
                Inventory
              </h2>
              <div className="text-xs text-slate-500 font-mono">
                {inventory.length > 0 ? `${inventory.reduce((acc, i) => acc + i.count, 0)} Items` : 'Empty'}
              </div>
            </div>
            
            {/* Grid */}
            {inventory.length === 0 ? (
              <div className="text-slate-500 text-center py-8 italic text-sm flex flex-col items-center gap-2">
                <Package size={32} className="opacity-20" />
                Empty... Go explore!
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                {inventory.map((item) => (
                  <button 
                    key={item.type} 
                    onClick={() => setSelectedType(item.type)}
                    onMouseEnter={(e) => handleMouseEnter(item.type, e)}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    className={`bg-slate-800 p-2 rounded-xl border flex flex-col items-center gap-1 group transition-all relative ${selectedType === item.type ? 'border-blue-500 ring-2 ring-blue-500/20 bg-slate-700' : 'border-slate-700 hover:border-slate-500'}`}
                  >
                    <div 
                      className="w-10 h-10 rounded-full shadow-inner flex items-center justify-center text-sm font-bold mb-1 transition-transform group-hover:scale-110"
                      style={{ backgroundColor: ITEM_COLORS[item.type], color: '#fff', textShadow: '0px 1px 2px rgba(0,0,0,0.5)' }}
                    >
                      {item.type[0]}
                    </div>
                    {item.count > 1 && (
                        <span className="absolute top-1 right-1 bg-slate-900 px-1.5 py-0.5 rounded-full text-[9px] font-mono text-white border border-slate-600">
                            {item.count}
                        </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Selected Item Details */}
            {selectedItem && ITEM_DETAILS[selectedItem.type] && (
                <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800 animate-in fade-in duration-200">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-slate-200">{ITEM_DETAILS[selectedItem.type].name}</h3>
                                <span className="text-[10px] bg-slate-800 px-1 rounded text-slate-500 font-mono border border-slate-700">
                                    {ITEM_DETAILS[selectedItem.type].type}
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1 leading-snug">
                                {ITEM_DETAILS[selectedItem.type].description}
                            </p>
                        </div>
                    </div>
                    
                    <div className="bg-slate-900/50 rounded p-2 mb-3 border border-slate-800/50">
                        <div className="text-[10px] text-slate-500 italic mb-1">
                            {ITEM_DETAILS[selectedItem.type].lore}
                        </div>
                         {ITEM_DETAILS[selectedItem.type].usage && (
                            <div className="text-xs font-bold text-green-400 flex items-center gap-1 mt-1">
                                <Info size={10} />
                                {ITEM_DETAILS[selectedItem.type].usage}
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2">
                        {isUsable(selectedItem.type) && (
                            <button 
                                onClick={handleUse}
                                className="flex-1 bg-green-600 hover:bg-green-500 text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                            >
                                <Zap size={14} /> Use
                            </button>
                        )}
                        <button 
                            onClick={handleDrop}
                            className="flex-1 bg-slate-700 hover:bg-red-600/80 text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                        >
                            <Trash2 size={14} /> Drop
                        </button>
                    </div>
                </div>
            )}
          </div>
        </div>
    </>
  );
};