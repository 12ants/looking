import React, { useState } from 'react';
import { Game } from './components/Game';
import { LoadingScreen } from './components/LoadingScreen';
import { SplashScreen } from './components/SplashScreen';
import { soundManager } from './utils/SoundManager';
import { BiomeType } from './types';

type AppState = 'SPLASH' | 'LOADING' | 'GAME';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('SPLASH');
  const [gameSettings, setGameSettings] = useState<{ biome: BiomeType; seed: number; worldSize: number } | undefined>(undefined);

  const handleStartGame = (settings: { biome: BiomeType; seed: number; worldSize: number }) => {
      setGameSettings(settings);
      setAppState('LOADING');
      soundManager.init(); // Initialize audio context on user interaction
  };

  const handleLoadFinish = () => {
    setAppState('GAME');
  };
  
  const handleExitGame = () => {
      setAppState('SPLASH');
      setGameSettings(undefined);
  };

  return (
    <div className="w-full h-full bg-slate-900 overflow-hidden relative">
      {appState === 'SPLASH' && <SplashScreen onStart={handleStartGame} />}
      {appState === 'LOADING' && <LoadingScreen onFinished={handleLoadFinish} />}
      {appState === 'GAME' && <Game initialSettings={gameSettings} onExit={handleExitGame} />}
    </div>
  );
};

export default App;