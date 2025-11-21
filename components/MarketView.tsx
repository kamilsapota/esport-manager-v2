import React from 'react';
import { Hammer, HardHat, Construction } from 'lucide-react';
import { Player } from '../types';

interface MarketViewProps {
  budget: number;
  onHire: (player: Player) => void;
  currentRosterCount: number;
}

export const MarketView: React.FC<MarketViewProps> = ({ budget }) => {
  return (
    <div className="p-6 w-full max-w-7xl mx-auto h-[80vh] flex flex-col items-center justify-center relative overflow-hidden">
      
      {/* Background decorative elements */}
      <div className="absolute inset-0 bg-[url('https://www.hltv.org/img/static/scoreboard/weapons/ak47.png')] opacity-5 bg-repeat rotate-12 scale-150 pointer-events-none"></div>
      
      <div className="relative z-10 bg-cs-dark border border-gray-800 p-12 rounded-2xl shadow-2xl text-center max-w-2xl animate-fade-in">
        <div className="flex justify-center mb-6">
          <div className="bg-yellow-500/20 p-6 rounded-full border-2 border-dashed border-yellow-500/50 relative">
            <Hammer size={48} className="text-cs-yellow animate-bounce" />
            <HardHat size={24} className="text-white absolute -bottom-2 -right-2 drop-shadow-lg" />
          </div>
        </div>

        <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter mb-4">
          Market Closed
        </h2>
        
        <div className="w-24 h-1 bg-cs-yellow mx-auto mb-6 rounded-full"></div>

        <p className="text-gray-400 text-lg mb-8 leading-relaxed">
          The transfer market is currently undergoing a <span className="text-white font-bold">complete overhaul</span>. 
          Agents are renegotiating contracts and the scouting network is being rebuilt.
        </p>

        <div className="inline-flex items-center gap-2 bg-gray-900/80 px-6 py-3 rounded border border-gray-700 text-sm text-gray-500 font-mono uppercase tracking-widest">
          <Construction size={16} />
          Work in Progress
        </div>
      </div>
    </div>
  );
};