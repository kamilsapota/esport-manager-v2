
import React, { useState } from 'react';
import { Team, GameView } from '../types';
import { Calendar, ChevronRight, DollarSign, Menu, Bell, Zap } from 'lucide-react';

interface HeaderProps {
  team: Team;
  currentView: GameView;
  currentDate: Date;
  onAdvanceDay: () => void;
  onSimToMatch?: () => void;
  isMatchDay: boolean;
  isAnalyzing?: boolean;
  unreadCount?: number;
}

export const Header: React.FC<HeaderProps> = ({ team, currentView, currentDate, onAdvanceDay, onSimToMatch, isMatchDay, isAnalyzing = false, unreadCount = 0 }) => {
  const [showNotifications, setShowNotifications] = useState(false);

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

  const isDisabled = isMatchDay || isAnalyzing;

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
        
        {/* Date */}
        <div className="flex items-center gap-3 bg-fm-card px-4 py-2 rounded-lg border border-fm-border">
            <Calendar size={16} className="text-fm-accent" />
            <span className="text-sm font-bold text-white font-mono uppercase">{formattedDate}</span>
        </div>

        {/* Notification Center */}
        <div className="relative">
            <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="w-10 h-10 flex items-center justify-center bg-fm-card border border-fm-border rounded-lg hover:bg-fm-card-hover hover:border-fm-accent transition-all relative"
            >
                <Bell size={18} className={unreadCount > 0 ? 'text-white' : 'text-fm-muted'} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-fm-red rounded-full border border-fm-bg"></span>
                )}
            </button>
            
            {showNotifications && (
                <div className="absolute top-12 right-0 w-64 bg-fm-card border border-fm-border rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in">
                    <div className="p-3 border-b border-fm-border bg-fm-card-hover">
                        <span className="text-xs font-bold uppercase text-fm-muted">Notifications</span>
                    </div>
                    <div className="p-0">
                        {unreadCount > 0 ? (
                            <div className="p-4 flex items-start gap-3 hover:bg-white/5 cursor-pointer border-b border-fm-border/50 last:border-0">
                                <div className="w-2 h-2 rounded-full bg-fm-accent mt-1.5 shrink-0"></div>
                                <div>
                                    <div className="text-sm font-bold text-white">Unread Messages</div>
                                    <div className="text-xs text-fm-muted mt-0.5">You have {unreadCount} unread message{unreadCount !== 1 ? 's' : ''}.</div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-6 text-center text-xs text-fm-muted italic">
                                No new notifications.
                            </div>
                        )}
                    </div>
                </div>
            )}
            {/* Backdrop to close */}
            {showNotifications && (
                <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)}></div>
            )}
        </div>

        {/* Budget */}
        <div className="hidden md:flex flex-col items-end">
            <span className="text-[10px] uppercase font-bold text-fm-muted">Budget</span>
            <div className="flex items-center gap-1 text-fm-green font-mono font-bold">
                <DollarSign size={14} />
                {team.budget.toLocaleString()}
            </div>
        </div>

        {/* Dev Action: Sim to Match */}
        {!isMatchDay && onSimToMatch && (
            <button
                onClick={onSimToMatch}
                className="bg-fm-card border border-fm-border hover:bg-fm-card-hover text-fm-muted p-2.5 rounded-md transition-colors"
                title="Sim to Match Day"
            >
                <Zap size={16} />
            </button>
        )}

        {/* Continue Button */}
        <button
          onClick={onAdvanceDay}
          disabled={isDisabled}
          className={`
            group relative overflow-hidden rounded-md px-8 py-2.5 transition-all duration-300
            ${isDisabled 
                ? 'bg-fm-card border border-fm-border cursor-not-allowed opacity-50' 
                : 'bg-fm-accent hover:bg-fm-accent-hover shadow-[0_0_20px_rgba(217,70,239,0.3)] hover:shadow-[0_0_30px_rgba(217,70,239,0.5)]'}
          `}
        >
            <div className="relative z-10 flex items-center gap-2">
                <span className={`text-sm font-black uppercase tracking-wider ${isDisabled ? 'text-fm-muted' : 'text-white'}`}>
                    {isMatchDay ? 'Match Pending' : isAnalyzing ? 'Analyzing...' : 'Continue'}
                </span>
                <ChevronRight size={16} className={isDisabled ? 'text-fm-muted' : 'text-white'} />
            </div>
        </button>
      </div>
    </header>
  );
};
