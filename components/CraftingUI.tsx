import React from 'react';
import { InventoryItem, Recipe } from '../types';
import { RECIPES, ITEM_COLORS } from '../constants';
import { Hammer, X, ArrowRight, Check } from 'lucide-react';

interface Props {
  inventory: InventoryItem[];
  isOpen: boolean;
  onToggle: () => void;
  onCraft: (recipe: Recipe) => void;
}

export const CraftingUI: React.FC<Props> = ({ inventory, isOpen, onToggle, onCraft }) => {
  if (!isOpen) return null;

  const getItemCount = (type: string) => inventory.find(i => i.type === type)?.count || 0;
  const canCraft = (recipe: Recipe) => recipe.ingredients.every(ing => getItemCount(ing.type) >= ing.count);

  return (
    <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-40">
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/50 p-4 rounded-2xl shadow-2xl w-96 text-slate-100 animate-in fade-in slide-in-from-bottom-4 zoom-in-95">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-700/50">
          <h2 className="text-lg font-bold flex items-center gap-2 text-orange-400">
            <Hammer size={20} />
            Crafting
          </h2>
        </div>
        
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
          {RECIPES.map((recipe) => {
            const craftable = canCraft(recipe);
            
            return (
              <div 
                key={recipe.id} 
                className={`p-3 rounded-xl border transition-all ${
                  craftable 
                    ? 'bg-slate-800 border-slate-600 hover:border-orange-500/50 shadow-sm' 
                    : 'bg-slate-800/50 border-slate-800 opacity-60 grayscale-[0.5]'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                      <div 
                          className="w-10 h-10 rounded-lg shadow-inner flex items-center justify-center text-lg font-bold"
                          style={{ backgroundColor: ITEM_COLORS[recipe.result], color: '#fff' }}
                      >
                        {recipe.result[0]}
                      </div>
                      <div>
                          <h3 className="font-bold text-sm text-slate-200 leading-tight">{recipe.name}</h3>
                          <p className="text-[10px] text-slate-400">{recipe.description}</p>
                      </div>
                  </div>
                </div>
                
                {/* Ingredients */}
                <div className="bg-slate-950/30 rounded-lg p-2 mb-3 grid grid-cols-2 gap-2">
                  {recipe.ingredients.map(ing => {
                    const has = getItemCount(ing.type);
                    const hasEnough = has >= ing.count;
                    return (
                      <div key={ing.type} className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 flex items-center gap-1.5">
                           <div className="w-2 h-2 rounded-full" style={{ background: ITEM_COLORS[ing.type] }} />
                           {ing.type}
                        </span>
                        <span className={`font-mono ${hasEnough ? "text-green-400" : "text-red-400"}`}>
                          {has}/{ing.count}
                        </span>
                      </div>
                    )
                  })}
                </div>

                <button
                  onClick={() => craftable && onCraft(recipe)}
                  disabled={!craftable}
                  className={`w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    craftable 
                      ? 'bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white shadow-lg' 
                      : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {craftable ? <>Craft Item <Hammer size={12} /></> : 'Missing Ingredients'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};