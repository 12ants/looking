import React, { useState } from 'react';
import { Game } from './components/Game';
import { LoadingScreen } from './components/LoadingScreen';
import { soundManager } from './utils/SoundManager';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);

  const handleLoadFinish = () => {
    setIsLoading(false);
    // Try to initialize sound context on first interaction, 
    // but we pre-load here
    soundManager.init();
  };

  return (
    <div className="w-full h-full bg-slate-900 overflow-hidden relative">
      {isLoading && <LoadingScreen onFinished={handleLoadFinish} />}
      {!isLoading && <Game />}
    </div>
  );
};

export default App;