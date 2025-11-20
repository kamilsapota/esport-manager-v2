
import React from 'react';
import { Team, Player, PlayerRole } from '../types';
import { Trophy, Shield, Swords, Play } from 'lucide-react';
import { CountryFlag } from './CountryFlag';

interface MatchLobbyProps {
  myTeam: Team;
  opponent: Team;
  leagueOpponents: Team[]; // Needed to calculate ranks
  onStartMatch: () => void;
}

export const MatchLobby: React.FC<MatchLobbyProps> = ({ myTeam, opponent, leagueOpponents, onStartMatch }) => {
  
  // Calculate Rankings
  const allTeams = [myTeam, ...leagueOpponents];
  const sortedTeams = allTeams.sort((a, b) => {
      if (b.leaguePoints !== a.leaguePoints) return b.leaguePoints - a.leaguePoints;
      if (b.roundDifference !== a.roundDifference) return b.roundDifference - a.roundDifference;
      return b.wins - a.wins;
  });

  const getRank = (teamId: string) => sortedTeams.findIndex(t => t.id === teamId) + 1;
  
  const myRank = getRank(myTeam.id);
  const oppRank = getRank(opponent.id);

  const getDisplayRating = (p: Player, isPlayerTeam: boolean) => {
      // 1. If user team, try to use actual season history
      if (isPlayerTeam && p.matchHistory && p.matchHistory.length > 0) {
          const total = p.matchHistory.reduce((acc, curr) => acc + curr.rating, 0);
          return (total / p.matchHistory.length).toFixed(2);
      }
      
      // If user team player hasn't played yet
      if (isPlayerTeam) return "-";

      // 2. AI Team: Calculate synthetic rating based on stats
      // Mapping: 50 Stat -> 1.00 Rating. 90 Stat -> 1.40 Rating.
      const avgStat = (p.stats.aim + p.stats.reflex + p.stats.strategy + p.stats.utility) / 4;
      
      // Formula: 1.00 + (Stat - 50) * 0.01
      let simulatedRating = 1.00 + (avgStat - 50) * 0.01;
      
      // Add deterministic noise based on alias so it's consistent for the same player
      const noise = (p.alias.length % 5) * 0.01; // 0.00 to 0.05
      if (p.id.charCodeAt(0) % 2 === 0) simulatedRating += noise;
      else simulatedRating -= noise;

      return Math.max(0.4, simulatedRating).toFixed(2);
  };

  const TeamColumn = ({ team, rank, isPlayer }: { team: Team, rank: number, isPlayer: boolean }) => (
    <div className={`flex-1 bg-cs-dark border ${isPlayer ? 'border-cs-blue/30' : 'border-t-red/30'} rounded-xl overflow-hidden shadow-2xl flex flex-col`}>
        {/* Header */}
        <div className={`p-6 ${isPlayer ? 'bg-gradient-to-b from-cs-blue/20 to-transparent' : 'bg-gradient-to-b from-t-red/20 to-transparent'} text-center border-b border-gray-800`}>
            <div className="flex justify-center mb-2">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center border-4 ${isPlayer ? 'border-cs-blue bg-cs-blue/10 text-cs-blue' : 'border-t-red bg-t-red/10 text-t-red'}`}>
                    <Shield size={40} />
                </div>
            </div>
            <h2 className="text-3xl font-black text-white tracking-tight mb-1">{team.name}</h2>
            <div className="flex justify-center items-center gap-4 text-sm font-bold font-mono">
                <span className="text-gray-400">Rank #{rank}</span>
                <span className="text-gray-600">|</span>
                <span className="text-gray-300">{team.wins}W - {team.losses}L</span>
            </div>
        </div>

        {/* Roster List - Adjusted height to fit 5 players cleanly */}
        <div className="p-4 bg-gray-900/30">
            <table className="w-full border-collapse">
                <thead>
                    <tr className="text-left text-[10px] uppercase font-bold text-gray-500 border-b border-gray-800">
                        <th className="pb-3 pl-2">Player</th>
                        <th className="pb-3">Role</th>
                        <th className="pb-3 text-right pr-2">{isPlayer ? 'Season Rtg' : 'Est. Rating'}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                    {team.players.map(p => {
                         const displayRating = getDisplayRating(p, isPlayer);
                         const numericRating = parseFloat(displayRating === "-" ? "0" : displayRating);
                         
                         let ratingColor = 'text-gray-400';
                         if (numericRating >= 1.30) ratingColor = 'text-yellow-400';
                         else if (numericRating >= 1.10) ratingColor = 'text-green-400';
                         else if (numericRating > 0 && numericRating < 0.95) ratingColor = 'text-red-400';

                        return (
                            <tr key={p.id} className="hover:bg-gray-800/50 transition-colors h-14">
                                <td className="pl-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 flex justify-center">
                                             <CountryFlag countryCode={p.country} className="h-4 shadow-sm" />
                                        </div>
                                        <span className="font-bold text-gray-200 text-sm md:text-base">{p.alias}</span>
                                    </div>
                                </td>
                                <td>
                                    <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider ${
                                        p.role === PlayerRole.AWPER ? 'bg-red-900/20 text-red-400' : 
                                        p.role === PlayerRole.IGL ? 'bg-yellow-900/20 text-yellow-400' : 
                                        'bg-gray-800 text-gray-400'
                                    }`}>
                                        {p.role}
                                    </span>
                                </td>
                                <td className={`text-right pr-2 font-mono font-bold text-lg ${ratingColor}`}>
                                    {displayRating}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
        
        {/* Spacer to push footer down if needed */}
        <div className="flex-1 bg-gray-900/30"></div>

        {/* Team Avg Stats */}
        <div className="bg-gray-900/80 p-4 border-t border-gray-800 flex justify-between items-center text-xs font-mono text-gray-400">
             <span>AVG AGE: {(team.players.reduce((a,b) => a + b.age, 0) / 5).toFixed(1)}</span>
             {isPlayer && (
                 <span className="text-[10px] uppercase tracking-widest text-gray-600">
                     Last {myTeam.matchesPlayed} Matches
                 </span>
             )}
        </div>
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col max-w-7xl mx-auto p-4 md:p-6">
        {/* Match Header */}
        <div className="text-center mb-8 shrink-0">
            <div className="flex items-center justify-center gap-2 mb-2 text-cs-yellow font-bold uppercase tracking-widest text-sm">
                <Trophy size={16} /> {myTeam.league} Matchday
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white italic tracking-tighter drop-shadow-lg">
                MATCH LOBBY
            </h1>
        </div>

        {/* Comparison Grid */}
        <div className="flex-1 flex flex-col lg:flex-row gap-8 items-stretch min-h-0 mb-8">
            <TeamColumn team={myTeam} rank={myRank} isPlayer={true} />
            
            <div className="flex flex-col items-center justify-center shrink-0 lg:w-24 gap-4">
                 <div className="w-px h-12 lg:h-32 bg-gradient-to-b from-transparent via-gray-600 to-transparent hidden lg:block"></div>
                 <div className="text-5xl font-black text-white/20 italic select-none">VS</div>
                 <div className="w-px h-12 lg:h-32 bg-gradient-to-b from-transparent via-gray-600 to-transparent hidden lg:block"></div>
            </div>

            <TeamColumn team={opponent} rank={oppRank} isPlayer={false} />
        </div>

        {/* Action Footer */}
        <div className="shrink-0 flex justify-center pb-6">
            <button 
                onClick={onStartMatch}
                className="group relative px-20 py-5 bg-cs-yellow hover:bg-yellow-400 text-black font-black text-xl uppercase tracking-widest rounded-lg shadow-[0_0_25px_rgba(222,155,53,0.3)] hover:shadow-[0_0_40px_rgba(222,155,53,0.6)] transition-all transform hover:-translate-y-1 flex items-center gap-4 overflow-hidden"
            >
                <span className="absolute inset-0 w-full h-full bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 skew-x-12"></span>
                <Swords size={28} />
                START MATCH
                <Play size={28} className="fill-black" />
            </button>
        </div>
    </div>
  );
};
