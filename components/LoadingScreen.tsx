
import React, { useEffect, useState } from 'react';
import { Loader2, Play } from 'lucide-react';

interface LoadingScreenProps {
  onFinished: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onFinished }) => {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('Initializing...');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Simulate loading stages - Slower duration for asset pre-warming
    const steps = [
      { p: 10, text: 'Initializing Engine...' },
      { p: 30, text: 'Generating Terrain...' },
      { p: 50, text: 'Simulating Ecology...' },
      { p: 70, text: 'Building Towns...' },
      { p: 85, text: 'Loading Textures...' },
      { p: 95, text: 'Finalizing...' },
      { p: 100, text: 'Ready!' },
    ];

    let currentStep = 0;

    const interval = setInterval(() => {
      if (currentStep >= steps.length) {
        clearInterval(interval);
        setReady(true);
        return;
      }

      const step = steps[currentStep];
      setProgress(step.p);
      setStage(step.text);
      currentStep++;
    }, 800); // Increased to ~5.6 seconds total load time

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center text-white">
      <div className="w-64 mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2 text-yellow-400 tracking-wider">TOWN EXPLORER</h1>
        <p className="text-slate-500 text-sm">Procedural Generation Engine</p>
      </div>

      {!ready ? (
        <>
            <div className="relative w-64 h-2 bg-slate-800 rounded-full overflow-hidden mb-4">
                <div 
                className="absolute top-0 left-0 h-full bg-yellow-500 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
                />
            </div>

            <div className="flex items-center gap-2 text-slate-400 text-sm font-mono h-6">
                <Loader2 className="animate-spin" size={14} />
                <span>{stage}</span>
            </div>
        </>
      ) : (
        <button 
            onClick={onFinished}
            className="group relative px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold rounded-full transition-all hover:scale-105 shadow-[0_0_20px_rgba(234,179,8,0.3)] hover:shadow-[0_0_30px_rgba(234,179,8,0.6)] flex items-center gap-2 animate-in zoom-in duration-300"
        >
            <Play size={18} className="fill-slate-900" />
            ENTER WORLD
        </button>
      )}
    </div>
  );
};
