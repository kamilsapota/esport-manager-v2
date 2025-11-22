import React from 'react';
import { GameView } from '../types';
import { LayoutDashboard, Trophy, Calendar, Users, ShoppingCart, Crosshair, BarChart2 } from 'lucide-react';

interface SidebarProps {
  currentView: GameView;
  setView: (view: GameView) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setView }) => {
  const navItems = [
    { id: GameView.DASHBOARD, label: 'Home', icon: LayoutDashboard },
    { id: GameView.MATCH_LOBBY, label: 'Play', icon: Crosshair },
    { id: GameView.LEAGUE, label: 'Competitions', icon: Trophy },
    { id: GameView.PRACTICE, label: 'Training', icon: Users }, // Using Users for Squad/Training metaphor
    { id: GameView.SCHEDULE, label: 'Schedule', icon: Calendar },
    { id: GameView.MARKET, label: 'Transfers', icon: ShoppingCart },
    { id: GameView.RANKINGS, label: 'Ranking', icon: BarChart2 },
  ];

  return (
    <div className="w-64 bg-fm-sidebar border-r border-fm-border flex flex-col shrink-0 h-full">
      <div className="p-6 flex items-center gap-2">
        <div className="w-8 h-8 bg-fm-accent rounded-lg flex items-center justify-center font-black italic text-white text-sm shadow-[0_0_15px_rgba(217,70,239,0.5)]">
          CS
        </div>
        <div className="font-bold text-lg tracking-tight text-white">MANAGER</div>
      </div>

      <div className="flex-1 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-md transition-all duration-200 group ${
              currentView === item.id
                ? 'bg-fm-card border-l-4 border-fm-accent text-white shadow-lg'
                : 'text-fm-muted hover:bg-fm-card hover:text-white border-l-4 border-transparent'
            }`}
          >
            <item.icon
              size={18}
              className={`transition-colors ${
                currentView === item.id ? 'text-fm-accent' : 'text-fm-muted group-hover:text-white'
              }`}
            />
            <span className="font-medium text-sm">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="p-4 border-t border-fm-border">
        <div className="text-[10px] text-fm-muted uppercase font-bold tracking-widest text-center">
            v1.2.1 • GEMINI POWERED
        </div>
      </div>
    </div>
  );
};