import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingScreenProps {
  onFinished: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onFinished }) => {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('Initializing...');

  useEffect(() => {
    // Simulate loading stages
    const steps = [
      { p: 20, text: 'Generating Terrain...' },
      { p: 40, text: 'Simulating Ecology...' },
      { p: 60, text: 'Building Towns...' },
      { p: 80, text: 'Loading Assets...' },
      { p: 100, text: 'Ready!' },
    ];

    let currentStep = 0;

    const interval = setInterval(() => {
      if (currentStep >= steps.length) {
        clearInterval(interval);
        setTimeout(onFinished, 500); // Small delay at 100%
        return;
      }

      const step = steps[currentStep];
      setProgress(step.p);
      setStage(step.text);
      currentStep++;
    }, 400); // 2 seconds total load time roughly

    return () => clearInterval(interval);
  }, [onFinished]);

  return (
    <div className="absolute inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center text-white">
      <div className="w-64 mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2 text-yellow-400 tracking-wider">TOWN EXPLORER</h1>
        <p className="text-slate-500 text-sm">Procedural Generation Engine</p>
      </div>

      <div className="relative w-64 h-2 bg-slate-800 rounded-full overflow-hidden mb-4">
        <div 
          className="absolute top-0 left-0 h-full bg-yellow-500 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center gap-2 text-slate-400 text-sm font-mono h-6">
        {progress < 100 && <Loader2 className="animate-spin" size={14} />}
        <span>{stage}</span>
      </div>
    </div>
  );
};