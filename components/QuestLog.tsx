import React from 'react';
import { Quest } from '../types';
import { Scroll, CheckCircle2, Circle } from 'lucide-react';

interface Props {
  quests: Quest[];
  isOpen: boolean;
  onToggle: () => void;
}

export const QuestLog: React.FC<Props> = ({ quests, isOpen, onToggle }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-40">
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/50 p-4 rounded-2xl shadow-2xl w-80 text-slate-100 animate-in fade-in slide-in-from-bottom-4 zoom-in-95">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-700/50">
          <h2 className="text-lg font-bold flex items-center gap-2 text-yellow-500">
            <Scroll size={20} />
            Active Quests
          </h2>
          <span className="text-xs bg-yellow-900/30 text-yellow-500 px-2 py-1 rounded-md font-mono">
            {quests.filter(q => q.completed).length}/{quests.length}
          </span>
        </div>
        
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
          {quests.map((quest) => (
            <div 
              key={quest.id} 
              className={`p-3 rounded-xl border transition-all ${
                quest.completed 
                  ? 'bg-slate-800/50 border-green-900/30 opacity-80' 
                  : 'bg-slate-800 border-slate-700 shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between mb-1">
                <h3 className={`font-bold text-sm ${quest.completed ? 'text-green-400 line-through' : 'text-slate-100'}`}>
                  {quest.title}
                </h3>
                {quest.completed ? (
                  <CheckCircle2 size={16} className="text-green-500 mt-0.5" />
                ) : (
                  <Circle size={16} className="text-slate-600 mt-0.5" />
                )}
              </div>
              
              <p className="text-xs text-slate-400 mb-3 leading-relaxed">{quest.description}</p>
              
              <div className="relative">
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                    <div 
                        className={`h-full transition-all duration-700 ease-out ${quest.completed ? 'bg-green-500' : 'bg-yellow-500'}`}
                        style={{ width: `${Math.min(100, (quest.currentCount / quest.requiredCount) * 100)}%` }}
                    />
                </div>
                <div className="flex justify-between mt-1.5 items-center">
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{quest.completed ? 'Completed' : 'In Progress'}</span>
                    <span className="text-[10px] font-mono text-slate-300 bg-slate-900 px-1.5 py-0.5 rounded">
                        {quest.currentCount} / {quest.requiredCount}
                    </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};