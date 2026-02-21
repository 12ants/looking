
import React, { useState } from 'react';
import { Game } from './components/Game';
import { LoadingScreen } from './components/LoadingScreen';
import { SplashScreen } from './components/SplashScreen';
import { soundManager } from './utils/SoundManager';
import { BiomeType, PlayerConfig, GameSettings } from './types';

type AppState = 'SPLASH' | 'LOADING' | 'GAME';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('SPLASH');
  const [gameData, setGameData] = useState<{ 
      biome: BiomeType; 
      seed: number; 
      worldSize: number;
      playerConfig: PlayerConfig;
      gameSettings: Partial<GameSettings>;
  } | undefined>(undefined);

  const handleStartGame = (settings: { 
      biome: BiomeType; 
      seed: number; 
      worldSize: number;
      playerConfig: PlayerConfig;
      gameSettings: Partial<GameSettings>;
  }) => {
      setGameData(settings);
      setAppState('LOADING');
      soundManager.init(); // Initialize audio context on user interaction
  };

  const handleLoadFinish = () => {
    setAppState('GAME');
  };
  
  const handleExitGame = () => {
      setAppState('SPLASH');
      setGameData(undefined);
  };

  return (
    <div className="w-full h-full bg-slate-900 overflow-hidden relative">
      {appState === 'SPLASH' && <SplashScreen onStart={handleStartGame} />}
      
      {/* Mount Game during LOADING (hidden) and GAME (visible) to pre-load assets */}
      {(appState === 'LOADING' || appState === 'GAME') && (
          <Game 
            initialSettings={gameData} 
            onExit={handleExitGame} 
            gameStarted={appState === 'GAME'}
          />
      )}
      
      {/* Overlay LoadingScreen during LOADING */}
      {appState === 'LOADING' && <LoadingScreen onFinished={handleLoadFinish} />}
    </div>
  );
};

export default App;
