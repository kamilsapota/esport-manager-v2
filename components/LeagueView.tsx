import React from 'react';
import { Team, LeagueRoundResult } from '../types';
import { Shield, Calendar, Check, X } from 'lucide-react';

interface LeagueViewProps {
    myTeam: Team;
    opponents: Team[];
    roundResults?: LeagueRoundResult[];
}

export const LeagueView: React.FC<LeagueViewProps> = ({ myTeam, opponents, roundResults }) => {
  
  const allTeams = [myTeam, ...opponents];
  
  // Sort by Points (DESC), then RD (DESC), then Wins (DESC)
  const sortedTeams = allTeams.sort((a, b) => {
      if (b.leaguePoints !== a.leaguePoints) return b.leaguePoints - a.leaguePoints;
      if (b.roundDifference !== a.roundDifference) return b.roundDifference - a.roundDifference;
      return b.wins - a.wins;
  });

  return (
    <div className="p-6 w-full max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-cs-blue rounded-lg text-white">
              <Shield size={32} />
          </div>
          <div>
              <h2 className="text-3xl font-bold text-white">{myTeam.league}</h2>
              <p className="text-gray-400">Current season standings. Top teams advance to playoffs.</p>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: Standings Table */}
          <div className="lg:col-span-2 bg-cs-dark border border-gray-800 rounded-lg overflow-hidden shadow-xl">
              <div className="bg-gray-900 px-4 py-3 border-b border-gray-800">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">Season Standings</h3>
              </div>
              <table className="w-full">
                  <thead>
                      <tr className="bg-gray-900/50 text-left">
                          <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-16 text-center">Rank</th>
                          <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Team</th>
                          <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">M</th>
                          <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">W-L</th>
                          <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">RD</th>
                          <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">PTS</th>
                      </tr>
                  </thead>
                  <tbody>
                      {sortedTeams.map((team, idx) => {
                          const isMyTeam = team.id === myTeam.id;
                          return (
                              <tr key={team.id} className={`border-b border-gray-800 transition-colors ${isMyTeam ? 'bg-cs-blue/10' : 'hover:bg-gray-800/50'}`}>
                                  <td className="p-4 text-center font-mono text-gray-400">
                                      {idx + 1}.
                                  </td>
                                  <td className="p-4">
                                      <div className={`font-bold ${isMyTeam ? 'text-cs-yellow' : 'text-white'}`}>
                                          {team.name}
                                      </div>
                                  </td>
                                  <td className="p-4 text-center text-gray-300 font-mono">
                                      {team.matchesPlayed}
                                  </td>
                                  <td className="p-4 text-center text-gray-300 font-mono">
                                      <span className="text-green-400">{team.wins}</span> - <span className="text-red-400">{team.losses}</span>
                                  </td>
                                  <td className={`p-4 text-center font-mono ${team.roundDifference > 0 ? 'text-green-400' : team.roundDifference < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                                      {team.roundDifference > 0 ? '+' : ''}{team.roundDifference}
                                  </td>
                                  <td className="p-4 text-center font-bold text-white font-mono text-lg">
                                      {team.leaguePoints}
                                  </td>
                              </tr>
                          );
                      })}
                  </tbody>
              </table>
          </div>

          {/* RIGHT: Latest Matches */}
          <div className="lg:col-span-1">
              <div className="bg-cs-dark border border-gray-800 rounded-lg overflow-hidden shadow-xl">
                  <div className="bg-gray-900 px-4 py-3 border-b border-gray-800 flex items-center gap-2">
                      <Calendar size={16} className="text-cs-yellow" />
                      <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">Latest Matchday Results</h3>
                  </div>
                  <div className="p-0">
                      {roundResults && roundResults.length > 0 ? (
                        <div className="divide-y divide-gray-800">
                            {roundResults.map((match, idx) => {
                                const isUserMatch = match.teamA === myTeam.name || match.teamB === myTeam.name;
                                return (
                                    <div key={idx} className={`p-3 text-sm ${isUserMatch ? 'bg-blue-900/10' : ''}`}>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className={`font-bold truncate w-5/12 text-right ${match.winner === match.teamA ? 'text-green-400' : 'text-gray-400'}`}>
                                                {match.teamA}
                                            </span>
                                            <div className="w-2/12 text-center bg-gray-800 rounded px-1 py-0.5 font-mono text-white text-xs mx-1">
                                                {match.scoreA} : {match.scoreB}
                                            </div>
                                            <span className={`font-bold truncate w-5/12 text-left ${match.winner === match.teamB ? 'text-green-400' : 'text-gray-400'}`}>
                                                {match.teamB}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                      ) : (
                          <div className="p-8 text-center text-gray-500 italic">
                              No matches played yet this season.
                          </div>
                      )}
                  </div>
              </div>
              
              <div className="mt-6 bg-blue-900/20 border border-blue-900/50 p-4 rounded-lg">
                   <h4 className="text-white font-bold mb-1 text-sm">Format</h4>
                   <p className="text-xs text-gray-400">
                       Teams play a round-robin format. Top teams promote to the next division. Bottom teams are relegated.
                   </p>
              </div>
          </div>
      </div>
    </div>
  );
};