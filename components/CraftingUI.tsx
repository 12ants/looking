import React from 'react';
import { InventoryItem, Recipe } from '../types';
import { RECIPES, ITEM_COLORS } from '../constants';
import { Hammer, X, ArrowRight } from 'lucide-react';

interface Props {
  inventory: InventoryItem[];
  isOpen: boolean;
  onToggle: () => void;
  onCraft: (recipe: Recipe) => void;
}

export const CraftingUI: React.FC<Props> = ({ inventory, isOpen, onToggle, onCraft }) => {
  const getItemCount = (type: string) => inventory.find(i => i.type === type)?.count || 0;

  const canCraft = (recipe: Recipe) => {
    return recipe.ingredients.every(ing => getItemCount(ing.type) >= ing.count);
  };

  return (
    <div className="fixed top-20 right-4 z-40 flex flex-col items-end pointer-events-auto">
      <button 
        onClick={onToggle}
        className="bg-slate-800 hover:bg-slate-700 text-white p-3 rounded-full shadow-lg transition-all border-2 border-orange-600/50 flex items-center justify-center mb-2 group"
        title="Crafting"
      >
        <Hammer size={24} className="text-orange-500 group-hover:text-orange-400" />
      </button>

      {isOpen && (
        <div className="bg-slate-900/95 backdrop-blur-md border border-orange-600/30 p-4 rounded-xl shadow-2xl w-80 text-slate-100 transition-all animate-in fade-in slide-in-from-right-4">
          <h2 className="text-lg font-bold mb-4 border-b border-slate-700 pb-2 flex items-center gap-2 text-orange-500">
            <Hammer size={18} />
            Crafting Station
          </h2>
          
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {RECIPES.map((recipe) => {
              const craftable = canCraft(recipe);
              
              return (
                <div 
                  key={recipe.id} 
                  className={`p-3 rounded-lg border transition-colors ${
                    craftable 
                      ? 'bg-slate-800 border-slate-700 hover:border-orange-500/50' 
                      : 'bg-slate-800/50 border-slate-800 opacity-75'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-sm text-slate-200">{recipe.name}</h3>
                    <div 
                        className="w-6 h-6 rounded-full shadow-inner flex items-center justify-center text-[10px] font-bold"
                        style={{ backgroundColor: ITEM_COLORS[recipe.result], color: '#fff' }}
                    >
                      {recipe.result[0]}
                    </div>
                  </div>
                  
                  <p className="text-xs text-slate-400 mb-3">{recipe.description}</p>
                  
                  {/* Ingredients */}
                  <div className="space-y-1 mb-3">
                    {recipe.ingredients.map(ing => {
                      const has = getItemCount(ing.type);
                      const hasEnough = has >= ing.count;
                      
                      return (
                        <div key={ing.type} className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 flex items-center gap-1">
                             <div className="w-2 h-2 rounded-full" style={{ background: ITEM_COLORS[ing.type] }} />
                             {ing.type}
                          </span>
                          <span className={hasEnough ? "text-green-400" : "text-red-400"}>
                            {has}/{ing.count}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  <button
                    onClick={() => craftable && onCraft(recipe)}
                    disabled={!craftable}
                    className={`w-full py-1.5 rounded text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      craftable 
                        ? 'bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-900/20' 
                        : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    Craft <ArrowRight size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};