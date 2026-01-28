import React from 'react';
import { Quest } from '../types';
import { Scroll, CheckCircle2, Circle } from 'lucide-react';

interface Props {
  quests: Quest[];
  isOpen: boolean;
  onToggle: () => void;
}

export const QuestLog: React.FC<Props> = ({ quests, isOpen, onToggle }) => {
  return (
    <div className="fixed top-4 left-4 z-40 flex flex-col items-start pointer-events-auto">
      <button 
        onClick={onToggle}
        className="bg-slate-800 hover:bg-slate-700 text-white p-3 rounded-full shadow-lg transition-all border-2 border-yellow-600/50 flex items-center justify-center mb-2 group"
        title="Quest Log"
      >
        <Scroll size={24} className="text-yellow-500 group-hover:text-yellow-400" />
      </button>

      {isOpen && (
        <div className="bg-slate-900/95 backdrop-blur-md border border-yellow-600/30 p-4 rounded-xl shadow-2xl w-72 text-slate-100 transition-all animate-in fade-in slide-in-from-left-4">
          <h2 className="text-lg font-bold mb-4 border-b border-slate-700 pb-2 flex items-center gap-2 text-yellow-500">
            <Scroll size={18} />
            Current Quests
          </h2>
          
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {quests.map((quest) => (
              <div 
                key={quest.id} 
                className={`p-3 rounded-lg border transition-colors ${
                  quest.completed 
                    ? 'bg-slate-800/50 border-green-900/50' 
                    : 'bg-slate-800 border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <h3 className={`font-bold text-sm ${quest.completed ? 'text-green-400' : 'text-slate-200'}`}>
                    {quest.title}
                  </h3>
                  {quest.completed ? (
                    <CheckCircle2 size={16} className="text-green-500 mt-0.5" />
                  ) : (
                    <Circle size={16} className="text-slate-500 mt-0.5" />
                  )}
                </div>
                
                <p className="text-xs text-slate-400 mb-2">{quest.description}</p>
                
                {/* Progress Bar */}
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${quest.completed ? 'bg-green-500' : 'bg-yellow-600'}`}
                    style={{ width: `${Math.min(100, (quest.currentCount / quest.requiredCount) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-end mt-1">
                  <span className="text-[10px] font-mono text-slate-500">
                    {quest.currentCount} / {quest.requiredCount}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};