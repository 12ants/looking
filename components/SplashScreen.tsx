import React, { useState } from 'react';
import { BiomeType } from '../types';
import { Map, Trees, Mountain, Sun, Minimize2, Maximize2, Box } from 'lucide-react';
import { DEFAULT_GRID_SIZE } from '../constants';

interface SplashScreenProps {
  onStart: (settings: { biome: BiomeType; seed: number; worldSize: number }) => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onStart }) => {
  const [biome, setBiome] = useState<BiomeType>(BiomeType.FOREST);
  const [seedInput, setSeedInput] = useState<string>('');
  const [worldSize, setWorldSize] = useState<number>(DEFAULT_GRID_SIZE);

  const handleStart = () => {
    const seed = seedInput ? parseInt(seedInput) || Math.random() * 100 : Math.random() * 100;
    onStart({ biome, seed, worldSize });
  };

  return (
    <div className="absolute inset-0 z-50 bg-slate-900 flex flex-col items-center justify-center text-white">
      <div className="max-w-md w-full p-8 bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-slate-700 shadow-2xl animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-8">
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400 mb-2">
                TOWN EXPLORER
            </h1>
            <p className="text-slate-400 text-sm tracking-widest uppercase">Procedural Realm Generator</p>
        </div>

        <div className="space-y-6">
            {/* Biome Selector */}
            <div className="space-y-3">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Select Biome</label>
                <div className="grid grid-cols-3 gap-3">
                    <button 
                        onClick={() => setBiome(BiomeType.FOREST)}
                        className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${biome === BiomeType.FOREST ? 'bg-green-900/40 border-green-500 text-green-300 ring-2 ring-green-500/20' : 'bg-slate-900/50 border-slate-700 text-slate-500 hover:border-slate-500'}`}
                    >
                        <Trees size={24} />
                        <span className="text-xs font-bold">Forest</span>
                    </button>
                    <button 
                        onClick={() => setBiome(BiomeType.DESERT)}
                        className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${biome === BiomeType.DESERT ? 'bg-yellow-900/40 border-yellow-500 text-yellow-300 ring-2 ring-yellow-500/20' : 'bg-slate-900/50 border-slate-700 text-slate-500 hover:border-slate-500'}`}
                    >
                        <Sun size={24} />
                        <span className="text-xs font-bold">Desert</span>
                    </button>
                    <button 
                        onClick={() => setBiome(BiomeType.ALPINE)}
                        className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${biome === BiomeType.ALPINE ? 'bg-blue-900/40 border-blue-500 text-blue-300 ring-2 ring-blue-500/20' : 'bg-slate-900/50 border-slate-700 text-slate-500 hover:border-slate-500'}`}
                    >
                        <Mountain size={24} />
                        <span className="text-xs font-bold">Alpine</span>
                    </button>
                </div>
            </div>

            {/* World Size Selector */}
            <div className="space-y-3">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">View Distance</label>
                <div className="grid grid-cols-3 gap-3">
                    <button 
                        onClick={() => setWorldSize(40)}
                        className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${worldSize === 40 ? 'bg-blue-900/40 border-blue-500 text-blue-300 ring-2 ring-blue-500/20' : 'bg-slate-900/50 border-slate-700 text-slate-500 hover:border-slate-500'}`}
                    >
                        <Minimize2 size={20} />
                        <span className="text-xs font-bold">Small</span>
                    </button>
                    <button 
                        onClick={() => setWorldSize(60)}
                        className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${worldSize === 60 ? 'bg-blue-900/40 border-blue-500 text-blue-300 ring-2 ring-blue-500/20' : 'bg-slate-900/50 border-slate-700 text-slate-500 hover:border-slate-500'}`}
                    >
                        <Box size={20} />
                        <span className="text-xs font-bold">Medium</span>
                    </button>
                    <button 
                        onClick={() => setWorldSize(80)}
                        className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${worldSize === 80 ? 'bg-blue-900/40 border-blue-500 text-blue-300 ring-2 ring-blue-500/20' : 'bg-slate-900/50 border-slate-700 text-slate-500 hover:border-slate-500'}`}
                    >
                        <Maximize2 size={20} />
                        <span className="text-xs font-bold">Large</span>
                    </button>
                </div>
            </div>

            {/* Seed Input */}
            <div className="space-y-3">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">World Seed (Optional)</label>
                <input 
                    type="number" 
                    placeholder="Random" 
                    value={seedInput}
                    onChange={(e) => setSeedInput(e.target.value)}
                    className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-blue-500 transition-colors font-mono"
                />
            </div>

            <button 
                onClick={handleStart}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl font-bold text-lg shadow-lg shadow-blue-900/20 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
                Generate World
            </button>
        </div>
      </div>
    </div>
  );
};