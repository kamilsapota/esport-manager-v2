import React, { useState } from 'react';
import { WORLD_RANKING } from '../data/realTeams';
import { Player } from '../types';
import { PlayerCard } from './PlayerCard';
import { Trophy, Globe, X } from 'lucide-react';
import { CountryFlag } from './CountryFlag';

export const RankingsView: React.FC = () => {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  return (
    <div className="p-6 max-w-6xl mx-auto relative animate-fade-in">
      <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-fm-card border border-fm-border rounded-xl text-fm-accent shadow-lg">
              <Globe size={32} />
          </div>
          <div>
              <h2 className="text-3xl font-bold text-white">World Ranking</h2>
              <p className="text-fm-muted text-sm">Global HLTV Team Standings. These are the best teams in the world.</p>
          </div>
      </div>

      <div className="space-y-6">
        {WORLD_RANKING.map((team, index) => (
          <div key={team.id} className="bg-fm-card border border-fm-border rounded-xl overflow-hidden shadow-md hover:shadow-lg hover:border-fm-accent transition-all group">
            <div className="flex flex-col md:flex-row items-stretch">
                {/* Rank & Name */}
                <div className="w-full md:w-72 bg-fm-card-hover p-6 flex flex-col justify-center border-r border-fm-border relative">
                    <div className="absolute top-2 left-4 text-5xl font-black text-fm-bg select-none z-0 group-hover:text-fm-accent/10 transition-colors">#{index + 1}</div>
                    <div className="relative z-10">
                        <h3 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                            {team.name}
                        </h3>
                        <div className="text-xs font-mono text-fm-accent mb-3 uppercase tracking-widest font-bold">
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
                            className="bg-fm-bg p-3 rounded-lg border border-fm-border flex flex-col items-center justify-center text-center hover:bg-fm-card-hover hover:border-fm-accent hover:scale-105 transition-all cursor-pointer group/player"
                        >
                             <div className="mb-2 w-9 h-9 rounded-lg bg-fm-card border border-fm-border flex items-center justify-center text-xs font-bold text-fm-muted group-hover/player:text-white group-hover/player:bg-fm-accent transition-colors">
                                {player.alias.charAt(0)}
                             </div>
                             <div className="text-sm font-bold text-white leading-tight group-hover/player:text-fm-accent transition-colors">{player.alias}</div>
                             <div className="mt-1">
                                <CountryFlag countryCode={player.country} className="h-2.5" />
                             </div>
                             <div className={`text-[9px] uppercase font-bold mt-1.5 tracking-wider ${
                                 player.role.includes('IGL') ? 'text-fm-yellow' : 
                                 player.role.includes('AWP') ? 'text-fm-red' : 'text-fm-green'
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
              <div className="max-w-sm w-full bg-fm-bg border border-fm-border rounded-xl shadow-2xl relative overflow-hidden" onClick={e => e.stopPropagation()}>
                  <div className="bg-fm-card p-3 flex justify-between items-center border-b border-fm-border">
                      <span className="text-xs font-bold uppercase tracking-widest text-fm-muted">Scouting Report</span>
                      <button onClick={() => setSelectedPlayer(null)} className="text-fm-muted hover:text-white">
                          <X size={20} />
                      </button>
                  </div>
                  <div className="p-6 bg-fm-bg">
                      <div className="w-full">
                          <PlayerCard player={selectedPlayer} isCompact={false} />
                      </div>
                      <div className="mt-4 text-center pt-4 border-t border-fm-border">
                         <div className="text-[10px] text-fm-muted uppercase tracking-widest mb-1">Estimated Value</div>
                         <div className="text-2xl font-mono font-bold text-fm-green">${selectedPlayer.marketValue.toLocaleString()}</div>
                         <p className="text-[10px] text-fm-muted mt-2 italic opacity-60">
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