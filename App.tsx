import React from 'react';
import { Game } from './components/Game';

const App: React.FC = () => {
  return (
    <div className="w-full h-full bg-slate-900">
      <Game />
    </div>
  );
};

export default App;