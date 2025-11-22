import React from 'react';
import { Team, LeagueRoundResult } from '../types';
import { Shield, Calendar, Check, X, Trophy } from 'lucide-react';

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
    <div className="p-6 w-full max-w-7xl mx-auto animate-fade-in">
      <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-fm-card border border-fm-border rounded-xl flex items-center justify-center shadow-lg">
             <Trophy className="text-fm-accent" size={32} />
          </div>
          <div>
              <h2 className="text-3xl font-bold text-white">{myTeam.league}</h2>
              <p className="text-fm-muted text-sm">Current season standings. Top teams advance to playoffs.</p>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: Standings Table */}
          <div className="lg:col-span-2 bg-fm-card border border-fm-border rounded-xl overflow-hidden shadow-lg">
              <div className="bg-fm-card-hover px-4 py-3 border-b border-fm-border">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-white flex items-center gap-2">
                    <Shield size={14} className="text-fm-accent" /> Season Standings
                  </h3>
              </div>
              <table className="w-full">
                  <thead>
                      <tr className="bg-fm-bg/50 text-left border-b border-fm-border">
                          <th className="p-4 text-[10px] font-bold text-fm-muted uppercase tracking-wider w-16 text-center">Rank</th>
                          <th className="p-4 text-[10px] font-bold text-fm-muted uppercase tracking-wider">Team</th>
                          <th className="p-4 text-[10px] font-bold text-fm-muted uppercase tracking-wider text-center">M</th>
                          <th className="p-4 text-[10px] font-bold text-fm-muted uppercase tracking-wider text-center">W-L</th>
                          <th className="p-4 text-[10px] font-bold text-fm-muted uppercase tracking-wider text-center">RD</th>
                          <th className="p-4 text-[10px] font-bold text-fm-muted uppercase tracking-wider text-center">PTS</th>
                      </tr>
                  </thead>
                  <tbody>
                      {sortedTeams.map((team, idx) => {
                          const isMyTeam = team.id === myTeam.id;
                          return (
                              <tr key={team.id} className={`border-b border-fm-border/50 transition-colors ${isMyTeam ? 'bg-fm-accent/10' : 'hover:bg-fm-card-hover'}`}>
                                  <td className="p-3 text-center font-mono text-sm text-fm-muted">
                                      {idx + 1}
                                  </td>
                                  <td className="p-3">
                                      <div className={`font-bold text-sm ${isMyTeam ? 'text-fm-accent' : 'text-white'}`}>
                                          {team.name}
                                      </div>
                                  </td>
                                  <td className="p-3 text-center text-gray-400 font-mono text-sm">
                                      {team.matchesPlayed}
                                  </td>
                                  <td className="p-3 text-center text-gray-400 font-mono text-sm">
                                      <span className="text-fm-green">{team.wins}</span> - <span className="text-fm-red">{team.losses}</span>
                                  </td>
                                  <td className={`p-3 text-center font-mono text-sm ${team.roundDifference > 0 ? 'text-fm-green' : team.roundDifference < 0 ? 'text-fm-red' : 'text-gray-400'}`}>
                                      {team.roundDifference > 0 ? '+' : ''}{team.roundDifference}
                                  </td>
                                  <td className="p-3 text-center font-black text-white font-mono text-base">
                                      {team.leaguePoints}
                                  </td>
                              </tr>
                          );
                      })}
                  </tbody>
              </table>
          </div>

          {/* RIGHT: Latest Matches */}
          <div className="lg:col-span-1 space-y-6">
              <div className="bg-fm-card border border-fm-border rounded-xl overflow-hidden shadow-lg">
                  <div className="bg-fm-card-hover px-4 py-3 border-b border-fm-border flex items-center gap-2">
                      <Calendar size={14} className="text-fm-accent" />
                      <h3 className="text-xs font-bold uppercase tracking-widest text-white">Latest Results</h3>
                  </div>
                  <div className="p-0">
                      {roundResults && roundResults.length > 0 ? (
                        <div className="divide-y divide-fm-border/50">
                            {roundResults.map((match, idx) => {
                                const isUserMatch = match.teamA === myTeam.name || match.teamB === myTeam.name;
                                return (
                                    <div key={idx} className={`p-3 text-sm ${isUserMatch ? 'bg-fm-accent/5' : ''}`}>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className={`font-bold truncate w-5/12 text-right ${match.winner === match.teamA ? 'text-fm-green' : 'text-fm-muted'}`}>
                                                {match.teamA}
                                            </span>
                                            <div className="w-2/12 text-center bg-fm-bg border border-fm-border rounded px-1 py-0.5 font-mono text-white text-xs mx-1">
                                                {match.scoreA} : {match.scoreB}
                                            </div>
                                            <span className={`font-bold truncate w-5/12 text-left ${match.winner === match.teamB ? 'text-fm-green' : 'text-fm-muted'}`}>
                                                {match.teamB}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                      ) : (
                          <div className="p-8 text-center text-fm-muted text-sm italic">
                              No matches played yet this season.
                          </div>
                      )}
                  </div>
              </div>
              
              <div className="bg-fm-bg/50 border border-fm-border p-4 rounded-xl">
                   <h4 className="text-white font-bold mb-2 text-xs uppercase tracking-wide">Competition Format</h4>
                   <p className="text-xs text-fm-muted leading-relaxed">
                       Teams play a round-robin format. Top 8 teams advance to playoffs. Only 1 team wins promotion to the next division. Bottom 3 teams face relegation.
                   </p>
              </div>
          </div>
      </div>
    </div>
  );
};