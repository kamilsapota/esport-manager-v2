
import React from 'react';
import { Team, GameView } from '../types';
import { DollarSign, Users, Calendar, ChevronRight } from 'lucide-react';

interface HeaderProps {
  team: Team;
  currentView: GameView;
  setView: (view: GameView) => void;
  currentDate: Date;
  onAdvanceDay: () => void;
}

export const Header: React.FC<HeaderProps> = ({ team, currentView, setView, currentDate, onAdvanceDay }) => {
  const formattedDate = currentDate.toLocaleDateString('en-US', { 
    weekday: 'short', 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });

  return (
    <header className="h-16 bg-cs-dark border-b border-gray-800 flex items-center justify-between px-6 sticky top-0 z-50 shadow-md">
      <div className="flex items-center gap-6">
        <h1 className="text-2xl font-black tracking-tighter italic text-white hidden md:block">
          <span className="text-cs-yellow">CS</span>:MANAGER
        </h1>
        <nav className="flex gap-1 bg-gray-900 p-1 rounded-lg overflow-x-auto">
          {[
            { id: GameView.DASHBOARD, label: 'DASHBOARD' },
            { id: GameView.LEAGUE, label: 'LEAGUE' },
            { id: GameView.SCHEDULE, label: 'SCHEDULE' },
            { id: GameView.RANKINGS, label: 'RANKINGS' },
            { id: GameView.MARKET, label: 'MARKET' },
            { id: GameView.MATCH_LOBBY, label: 'PLAY' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`px-3 md:px-4 py-1.5 rounded text-xs md:text-sm font-bold transition-colors whitespace-nowrap ${
                currentView === item.id 
                  ? 'bg-gray-700 text-white shadow-sm' 
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-4 md:gap-6">
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-gray-300 bg-gray-800 px-3 py-1 rounded border border-gray-700 hidden sm:flex">
                <Calendar size={14} className="text-cs-yellow" />
                <span className="text-sm font-mono">{formattedDate}</span>
            </div>
            <button 
                onClick={onAdvanceDay}
                className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
                title="Simulate Next Day"
            >
                <ChevronRight size={16} />
            </button>
        </div>

        <div className="h-6 w-px bg-gray-700 hidden md:block"></div>

        <div className="flex items-center gap-2 text-green-400 bg-green-900/20 px-3 py-1 rounded-full border border-green-900/50">
          <DollarSign size={14} />
          <span className="font-mono font-bold text-sm">{team.budget.toLocaleString()}</span>
        </div>
        
        <div className="hidden md:flex items-center gap-2 text-gray-400">
          <Users size={14} />
          <span className="font-mono text-sm">{team.players.length}/5</span>
        </div>
      </div>
    </header>
  );
};
