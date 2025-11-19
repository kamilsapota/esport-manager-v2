
import React, { useState } from 'react';
import { WORLD_RANKING } from '../data/realTeams';
import { Player } from '../types';
import { PlayerCard } from './PlayerCard';
import { Trophy, Globe, X } from 'lucide-react';

export const RankingsView: React.FC = () => {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  return (
    <div className="p-6 max-w-6xl mx-auto relative">
      <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-cs-yellow rounded-lg text-black">
              <Globe size={32} />
          </div>
          <div>
              <h2 className="text-3xl font-bold text-white">World Ranking</h2>
              <p className="text-gray-400">Global HLTV Team Standings. These are the best teams in the world.</p>
          </div>
      </div>

      <div className="space-y-6">
        {WORLD_RANKING.map((team, index) => (
          <div key={team.id} className="bg-cs-dark border border-gray-800 rounded-xl overflow-hidden shadow-lg hover:border-cs-blue/30 transition-all group">
            <div className="flex flex-col md:flex-row items-stretch">
                {/* Rank & Name */}
                <div className="w-full md:w-72 bg-gray-900/80 p-6 flex flex-col justify-center border-r border-gray-800 relative">
                    <div className="absolute top-2 left-4 text-5xl font-black text-gray-800 select-none z-0 group-hover:text-gray-700 transition-colors">#{index + 1}</div>
                    <div className="relative z-10">
                        <h3 className="text-2xl font-bold text-white mb-1">{team.name}</h3>
                        <div className="text-xs font-mono text-cs-yellow mb-3">
                            {team.rankingPoints} pts
                        </div>
                    </div>
                </div>
                
                {/* Roster */}
                <div className="flex-1 p-4 grid grid-cols-2 md:grid-cols-5 gap-3">
                    {team.players.map(player => (
                        <button 
                            key={player.id} 
                            onClick={() => setSelectedPlayer(player)}
                            className="bg-gray-800/40 p-3 rounded border border-gray-800/50 flex flex-col items-center justify-center text-center hover:bg-gray-700 hover:border-cs-yellow/50 hover:scale-105 transition-all cursor-pointer group/player"
                        >
                             <div className="mb-2 w-10 h-10 rounded-full bg-gradient-to-t from-gray-800 to-gray-700 border border-gray-600 flex items-center justify-center text-xs font-bold text-gray-300 shadow-inner group-hover/player:border-cs-yellow transition-colors">
                                {player.alias.charAt(0)}
                             </div>
                             <div className="text-sm font-bold text-white leading-tight group-hover/player:text-cs-yellow transition-colors">{player.alias}</div>
                             <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-1 bg-black/20 px-2 py-0.5 rounded-full">
                                <span>{player.country}</span>
                             </div>
                             <div className={`text-[9px] uppercase font-bold mt-1.5 tracking-wider ${
                                 player.role.includes('IGL') ? 'text-yellow-500' : 
                                 player.role.includes('AWP') ? 'text-red-400' : 'text-blue-400'
                             }`}>
                                 {player.role}
                             </div>
                        </button>
                    ))}
                </div>
            </div>
          </div>
        ))}
      </div>

      {/* Player Detail Modal */}
      {selectedPlayer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedPlayer(null)}>
              <div className="max-w-md w-full bg-cs-darker border border-gray-700 rounded-xl shadow-2xl relative overflow-hidden" onClick={e => e.stopPropagation()}>
                  <div className="bg-gray-900 p-3 flex justify-between items-center border-b border-gray-800">
                      <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Scouting Report</span>
                      <button onClick={() => setSelectedPlayer(null)} className="text-gray-400 hover:text-white">
                          <X size={20} />
                      </button>
                  </div>
                  <div className="p-6">
                      <PlayerCard player={selectedPlayer} />
                      <div className="mt-4 text-center">
                         <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Estimated Contract Value</div>
                         <div className="text-2xl font-mono font-bold text-green-400">${selectedPlayer.marketValue.toLocaleString()}</div>
                         <p className="text-xs text-gray-600 mt-2 italic">
                            *Stats are estimated based on recent world performance.
                         </p>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
