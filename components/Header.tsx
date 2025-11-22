import React from 'react';
import { Team, GameView } from '../types';
import { Calendar, ChevronRight, DollarSign, Menu, Bell } from 'lucide-react';

interface HeaderProps {
  team: Team;
  currentView: GameView;
  currentDate: Date;
  onAdvanceDay: () => void;
  isMatchDay: boolean;
}

export const Header: React.FC<HeaderProps> = ({ team, currentView, currentDate, onAdvanceDay, isMatchDay }) => {
  const formattedDate = currentDate.toLocaleDateString('en-GB', { 
    weekday: 'short', 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  });

  const getPageTitle = (view: GameView) => {
      switch(view) {
          case GameView.DASHBOARD: return 'Manager Home';
          case GameView.LEAGUE: return 'Competitions Center';
          case GameView.MATCH_LOBBY: return 'Match Day Hub';
          case GameView.PRACTICE: return 'Training Ground';
          case GameView.SCHEDULE: return 'Fixture List';
          case GameView.MARKET: return 'Transfer Market';
          case GameView.RANKINGS: return 'World Scouting';
          default: return view;
      }
  };

  return (
    <header className="h-16 bg-fm-bg border-b border-fm-border flex items-center justify-between px-6 shrink-0 z-20">
      {/* LEFT: Context / Breadcrumbs */}
      <div className="flex items-center gap-4">
        <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-fm-muted tracking-wider">Current View</span>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
                {getPageTitle(currentView)}
            </h1>
        </div>
        <div className="h-8 w-px bg-fm-border mx-2"></div>
         <div className="flex items-center gap-3 bg-fm-card px-3 py-1.5 rounded-full border border-fm-border">
            <div className="w-2 h-2 rounded-full bg-fm-green animate-pulse"></div>
            <span className="text-xs font-bold text-white">{team.name}</span>
         </div>
      </div>

      {/* RIGHT: Status & Actions */}
      <div className="flex items-center gap-6">
        
        {/* Budget */}
        <div className="hidden md:flex flex-col items-end">
            <span className="text-[10px] uppercase font-bold text-fm-muted">Budget</span>
            <div className="flex items-center gap-1 text-fm-green font-mono font-bold">
                <DollarSign size={14} />
                {team.budget.toLocaleString()}
            </div>
        </div>

        {/* Date */}
        <div className="flex items-center gap-3 bg-fm-card px-4 py-2 rounded-lg border border-fm-border">
            <Calendar size={16} className="text-fm-accent" />
            <span className="text-sm font-bold text-white font-mono uppercase">{formattedDate}</span>
        </div>

        {/* Continue Button */}
        <button
          onClick={onAdvanceDay}
          disabled={isMatchDay}
          className={`
            group relative overflow-hidden rounded-md px-8 py-2.5 transition-all duration-300
            ${isMatchDay 
                ? 'bg-fm-card border border-fm-border cursor-not-allowed opacity-50' 
                : 'bg-fm-accent hover:bg-fm-accent-hover shadow-[0_0_20px_rgba(217,70,239,0.3)] hover:shadow-[0_0_30px_rgba(217,70,239,0.5)]'}
          `}
        >
            <div className="relative z-10 flex items-center gap-2">
                <span className={`text-sm font-black uppercase tracking-wider ${isMatchDay ? 'text-fm-muted' : 'text-white'}`}>
                    {isMatchDay ? 'Match Pending' : 'Continue'}
                </span>
                <ChevronRight size={16} className={isMatchDay ? 'text-fm-muted' : 'text-white'} />
            </div>
        </button>
      </div>
    </header>
  );
};