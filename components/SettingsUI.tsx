import React from 'react';
import { GameSettings } from '../types';
import { X, Volume2, Monitor, Sparkles, Settings, Terminal } from 'lucide-react';

interface Props {
  isOpen: boolean;
  settings: GameSettings;
  onClose: () => void;
  onUpdate: (settings: GameSettings) => void;
}

export const SettingsUI: React.FC<Props> = ({ isOpen, settings, onClose, onUpdate }) => {
  if (!isOpen) return null;

  const handleChange = (key: keyof GameSettings, value: any) => {
    onUpdate({ ...settings, [key]: value });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl w-full max-w-md relative animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings className="text-blue-400" />
            Settings
          </h2>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-6">
            
            {/* Audio Volume */}
            <div className="space-y-3">
                <div className="flex justify-between items-center text-slate-200">
                    <label className="text-sm font-bold flex items-center gap-2">
                        <Volume2 size={16} className="text-slate-400" />
                        Master Volume
                    </label>
                    <span className="text-xs font-mono bg-slate-800 px-2 py-1 rounded text-slate-400">
                        {Math.round(settings.audioVolume * 100)}%
                    </span>
                </div>
                <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.05"
                    value={settings.audioVolume}
                    onChange={(e) => handleChange('audioVolume', parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
            </div>

            <div className="h-px bg-slate-800 w-full my-4" />

            {/* Shadows Toggle */}
            <div className="flex items-center justify-between">
                 <div className="flex flex-col">
                    <label className="text-sm font-bold text-slate-200 flex items-center gap-2">
                        <Monitor size={16} className="text-slate-400" />
                        Shadows
                    </label>
                    <span className="text-xs text-slate-500">Enable for realism, disable for performance.</span>
                 </div>
                 <button 
                    onClick={() => handleChange('shadowsEnabled', !settings.shadowsEnabled)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${settings.shadowsEnabled ? 'bg-green-500' : 'bg-slate-700'}`}
                 >
                     <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.shadowsEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                 </button>
            </div>

            <div className="h-px bg-slate-800 w-full my-4" />

            {/* Particle Quality */}
             <div className="space-y-3">
                 <div className="flex flex-col">
                    <label className="text-sm font-bold text-slate-200 flex items-center gap-2">
                        <Sparkles size={16} className="text-slate-400" />
                        Particle Quality
                    </label>
                    <span className="text-xs text-slate-500">Number of visual effects particles.</span>
                 </div>
                 <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => handleChange('particleQuality', 'LOW')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${settings.particleQuality === 'LOW' ? 'bg-blue-900/40 border-blue-500 text-blue-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
                    >
                        Low (Performance)
                    </button>
                    <button
                        onClick={() => handleChange('particleQuality', 'HIGH')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${settings.particleQuality === 'HIGH' ? 'bg-blue-900/40 border-blue-500 text-blue-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
                    >
                        High (Visuals)
                    </button>
                 </div>
            </div>

            <div className="h-px bg-slate-800 w-full my-4" />

            {/* Debug Log Toggle */}
            <div className="flex items-center justify-between">
                 <div className="flex flex-col">
                    <label className="text-sm font-bold text-slate-200 flex items-center gap-2">
                        <Terminal size={16} className="text-slate-400" />
                        Debug Logs
                    </label>
                    <span className="text-xs text-slate-500">Show system event stream in HUD.</span>
                 </div>
                 <button 
                    onClick={() => handleChange('showDebugLog', !settings.showDebugLog)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${settings.showDebugLog ? 'bg-blue-500' : 'bg-slate-700'}`}
                 >
                     <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.showDebugLog ? 'translate-x-6' : 'translate-x-0'}`} />
                 </button>
            </div>

        </div>

        <div className="mt-8 pt-4 border-t border-slate-800 flex justify-end">
            <button 
                onClick={onClose}
                className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg text-sm font-bold transition-colors"
            >
                Close
            </button>
        </div>

      </div>
    </div>
  );
};