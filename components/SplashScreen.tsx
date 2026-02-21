import React, { useState } from 'react';
import { BiomeType, PlayerConfig, GameSettings } from '../types';
import { Minimize2, Maximize2, Box, Palette, Globe, Settings, User } from 'lucide-react';
import { DEFAULT_GRID_SIZE } from '../constants';

interface SplashScreenProps {
  onStart: (settings: { biome: BiomeType; seed: number; worldSize: number; playerConfig: PlayerConfig; gameSettings: Partial<GameSettings> }) => void;
}

const COLORS = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', 
    '#06b6d4', '#3b82f6', '#6366f1', '#a855f7', '#d946ef', 
    '#f43f5e', '#1e293b', '#475569', '#94a3b8', '#e2e8f0'
];

const SKIN_TONES = [
    '#fca5a5', '#fdba74', '#e2e8f0', '#78350f', '#451a03', '#fcd34d'
];

export const SplashScreen: React.FC<SplashScreenProps> = ({ onStart }) => {
  const [tab, setTab] = useState<'WORLD' | 'CHARACTER'>('WORLD');
  
  // World State
  const [seedInput, setSeedInput] = useState<string>('');
  const [worldSize, setWorldSize] = useState<number>(DEFAULT_GRID_SIZE);
  const [enemyDensity, setEnemyDensity] = useState<'LOW'|'MEDIUM'|'HIGH'>('MEDIUM');
  const [daySpeed, setDaySpeed] = useState<number>(0.2);

  // Character State
  const [playerConfig, setPlayerConfig] = useState<PlayerConfig>({
      skinColor: '#e2e8f0',
      shirtColor: '#3b82f6',
      pantsColor: '#1e293b'
  });

  const handleStart = () => {
    const seed = seedInput ? parseInt(seedInput) || Math.random() * 100 : Math.random() * 100;
    onStart({ 
        biome: BiomeType.FOREST, // Force forest
        seed, 
        worldSize, 
        playerConfig,
        gameSettings: {
            daySpeed,
            enemyDensity
        }
    });
  };

  return (
    <div className="absolute inset-0 z-50 bg-slate-900 flex flex-col items-center justify-center text-white p-4">
      <div className="max-w-2xl w-full bg-slate-800/80 backdrop-blur-xl rounded-3xl border border-slate-700 shadow-2xl animate-in fade-in zoom-in duration-500 overflow-hidden flex flex-col md:flex-row">
        
        {/* Sidebar / Tabs */}
        <div className="w-full md:w-48 bg-slate-900/50 p-4 flex flex-row md:flex-col gap-2 border-b md:border-b-0 md:border-r border-slate-700">
            <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400 mb-6 hidden md:block">
                EXPLORER
            </h1>
            
            <button 
                onClick={() => setTab('WORLD')}
                className={`flex-1 md:flex-none p-3 rounded-xl flex items-center justify-center md:justify-start gap-3 transition-all ${tab === 'WORLD' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-700 text-slate-400'}`}
            >
                <Globe size={18} />
                <span className="font-bold text-sm">World</span>
            </button>
            <button 
                onClick={() => setTab('CHARACTER')}
                className={`flex-1 md:flex-none p-3 rounded-xl flex items-center justify-center md:justify-start gap-3 transition-all ${tab === 'CHARACTER' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-700 text-slate-400'}`}
            >
                <User size={18} />
                <span className="font-bold text-sm">Character</span>
            </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 md:p-8 flex flex-col">
            
            {tab === 'WORLD' && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">World Size</label>
                        <div className="grid grid-cols-3 gap-3">
                            {[80, 120, 160].map((s) => (
                                <button 
                                    key={s}
                                    onClick={() => setWorldSize(s)}
                                    className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${worldSize === s ? 'bg-blue-900/40 border-blue-500 text-blue-300' : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                                >
                                    {s === 80 ? <Minimize2 size={16} /> : (s === 120 ? <Box size={16} /> : <Maximize2 size={16} />)}
                                    <span className="text-xs font-bold">{s === 80 ? 'Standard' : (s === 120 ? 'Large' : 'Huge')}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                             <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Enemy Density</label>
                             <select 
                                value={enemyDensity}
                                onChange={(e) => setEnemyDensity(e.target.value as any)}
                                className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
                             >
                                 <option value="LOW">Low (Chill)</option>
                                 <option value="MEDIUM">Medium (Normal)</option>
                                 <option value="HIGH">High (Danger)</option>
                             </select>
                        </div>
                         <div className="space-y-2">
                             <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Day Speed</label>
                             <input 
                                type="range" 
                                min="0.05" max="1.0" step="0.05"
                                value={daySpeed}
                                onChange={(e) => setDaySpeed(parseFloat(e.target.value))}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 mt-3"
                             />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Seed</label>
                        <input 
                            type="number" 
                            placeholder="Random Seed" 
                            value={seedInput}
                            onChange={(e) => setSeedInput(e.target.value)}
                            className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-blue-500 transition-colors font-mono"
                        />
                    </div>
                </div>
            )}

            {tab === 'CHARACTER' && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 h-full flex flex-col">
                    
                    {/* Preview (Simplified representation) */}
                    <div className="flex-1 bg-slate-950/50 rounded-2xl border border-slate-700 flex items-center justify-center p-8 mb-4 relative overflow-hidden">
                        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-700 via-slate-900 to-black"></div>
                        <div className="relative z-10 flex flex-col items-center">
                            {/* Head */}
                            <div className="w-12 h-12 rounded-lg shadow-lg mb-1" style={{ backgroundColor: playerConfig.skinColor }}></div>
                            {/* Body */}
                            <div className="w-16 h-20 rounded-lg shadow-lg mb-1 flex items-center justify-center" style={{ backgroundColor: playerConfig.shirtColor }}>
                                <div className="w-8 h-10 bg-black/10 rounded"></div>
                            </div>
                            {/* Legs */}
                            <div className="flex gap-1">
                                <div className="w-6 h-20 rounded-lg shadow-lg" style={{ backgroundColor: playerConfig.pantsColor }}></div>
                                <div className="w-6 h-20 rounded-lg shadow-lg" style={{ backgroundColor: playerConfig.pantsColor }}></div>
                            </div>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                             <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Skin Tone</label>
                             <div className="flex flex-wrap gap-2">
                                {SKIN_TONES.map(c => (
                                    <button 
                                        key={c}
                                        onClick={() => setPlayerConfig(p => ({ ...p, skinColor: c }))}
                                        className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${playerConfig.skinColor === c ? 'border-white scale-110 shadow-lg' : 'border-transparent'}`}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                             </div>
                        </div>
                        <div className="space-y-2">
                             <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Shirt Color</label>
                             <div className="flex flex-wrap gap-2">
                                {COLORS.map(c => (
                                    <button 
                                        key={c}
                                        onClick={() => setPlayerConfig(p => ({ ...p, shirtColor: c }))}
                                        className={`w-6 h-6 rounded-md border-2 transition-transform hover:scale-110 ${playerConfig.shirtColor === c ? 'border-white scale-110 shadow-lg' : 'border-transparent'}`}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                             </div>
                        </div>
                        <div className="space-y-2">
                             <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Pants Color</label>
                             <div className="flex flex-wrap gap-2">
                                {COLORS.map(c => (
                                    <button 
                                        key={c}
                                        onClick={() => setPlayerConfig(p => ({ ...p, pantsColor: c }))}
                                        className={`w-6 h-6 rounded-md border-2 transition-transform hover:scale-110 ${playerConfig.pantsColor === c ? 'border-white scale-110 shadow-lg' : 'border-transparent'}`}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                             </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="mt-auto pt-6">
                <button 
                    onClick={handleStart}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-500 hover:to-green-500 rounded-xl font-bold text-lg shadow-lg shadow-blue-900/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                >
                    Start Adventure
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};