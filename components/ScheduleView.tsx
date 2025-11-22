import React from 'react';
import { Tournament, Team, ScheduledMatch } from '../types';
import { Trophy, Calendar, Play, ChevronLeft, ChevronRight, Swords, Lock } from 'lucide-react';

interface ScheduleViewProps {
  tournaments: Tournament[];
  currentDate: Date;
  team: Team;
  schedule: ScheduledMatch[];
  onQualify: (tournamentId: string) => void;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({ tournaments, currentDate, team, schedule, onQualify }) => {
  
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanksArray = Array.from({ length: firstDay }, (_, i) => i);

  const isSameDay = (d1: Date, d2: Date) => {
      return d1.getDate() === d2.getDate() && 
             d1.getMonth() === d2.getMonth() && 
             d1.getFullYear() === d2.getFullYear();
  };

  const getMatchForDate = (day: number) => {
      const checkDate = new Date(currentYear, currentMonth, day);
      return schedule.find(m => isSameDay(new Date(m.date), checkDate));
  };

  const getTournamentForDate = (day: number) => {
      const checkDate = new Date(currentYear, currentMonth, day);
      return tournaments.find(t => isSameDay(new Date(t.startDate), checkDate));
  };

  return (
    <div className="p-6 w-full max-w-7xl mx-auto animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* CALENDAR SECTION */}
          <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Calendar className="text-fm-accent" />
                        {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </h2>
                    <p className="text-fm-muted text-sm">Current Date: <span className="text-white font-bold">{currentDate.toLocaleDateString()}</span></p>
                </div>
                <div className="flex gap-2">
                    <button className="p-2 bg-fm-card border border-fm-border rounded text-fm-muted cursor-not-allowed"><ChevronLeft size={20} /></button>
                    <button className="p-2 bg-fm-card border border-fm-border rounded text-fm-muted cursor-not-allowed"><ChevronRight size={20} /></button>
                </div>
              </div>

              <div className="bg-fm-card border border-fm-border rounded-xl overflow-hidden shadow-2xl">
                  {/* Days Header */}
                  <div className="grid grid-cols-7 bg-fm-card-hover border-b border-fm-border">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                          <div key={d} className="py-3 text-center text-[10px] font-bold uppercase text-fm-muted tracking-widest">
                              {d}
                          </div>
                      ))}
                  </div>

                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 bg-fm-border gap-px">
                      {blanksArray.map(i => (
                          <div key={`blank-${i}`} className="bg-fm-bg h-28 md:h-32"></div>
                      ))}
                      
                      {daysArray.map(day => {
                          const dateObj = new Date(currentYear, currentMonth, day);
                          const isToday = isSameDay(dateObj, currentDate);
                          const match = getMatchForDate(day);
                          const tournament = getTournamentForDate(day);
                          const isPast = dateObj < currentDate && !isToday;

                          return (
                              <div key={day} className={`bg-fm-bg h-28 md:h-32 p-2 relative transition-colors group ${isToday ? 'bg-fm-accent/5 shadow-inner ring-1 ring-inset ring-fm-accent/50' : 'hover:bg-fm-card-hover'}`}>
                                  <span className={`text-xs font-bold ${isToday ? 'text-fm-accent' : isPast ? 'text-fm-muted/50' : 'text-fm-muted'}`}>
                                      {day}
                                  </span>
                                  
                                  {isToday && (
                                      <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-fm-accent rounded-full animate-pulse"></span>
                                  )}

                                  <div className="mt-2 space-y-1">
                                      {match && (
                                          <div className={`text-[9px] p-1 rounded border truncate flex items-center gap-1 ${
                                              match.isPlayed 
                                                ? 'bg-fm-bg border-fm-border text-gray-600 line-through' 
                                                : isToday 
                                                    ? 'bg-fm-green/20 border-fm-green text-fm-green font-bold' 
                                                    : 'bg-fm-card border-fm-border text-white'
                                          }`}>
                                              <Swords size={10} />
                                              {match.type === 'LEAGUE' && match.leagueName ? match.leagueName : 'Match Day'}
                                          </div>
                                      )}
                                      {tournament && (
                                          <div className="text-[9px] p-1 rounded border border-fm-yellow/50 bg-fm-yellow/20 text-fm-yellow truncate flex items-center gap-1">
                                              <Trophy size={10} />
                                              {tournament.name}
                                          </div>
                                      )}
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              </div>
          </div>

          {/* UPCOMING EVENTS LIST */}
          <div className="space-y-6">
              <div className="bg-fm-card border border-fm-border rounded-xl p-5 shadow-lg">
                 <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2 uppercase tracking-wide">
                    <Trophy size={14} className="text-fm-accent" /> 
                    Major Events
                 </h3>
                 <div className="space-y-3">
                    {tournaments.filter(t => new Date(t.startDate) >= currentDate).slice(0, 5).map(t => {
                        const daysUntil = Math.ceil((new Date(t.startDate).getTime() - currentDate.getTime()) / (1000 * 3600 * 24));
                        return (
                            <div key={t.id} className="bg-fm-bg p-3 rounded border border-fm-border hover:border-fm-muted transition-colors">
                                <div className="text-sm font-bold text-white">{t.name}</div>
                                <div className="flex justify-between items-center mt-1">
                                    <span className="text-xs text-fm-muted">Prize: ${(t.prizePool/1000)}k</span>
                                    <span className="text-xs font-mono text-fm-accent">{daysUntil} days</span>
                                </div>
                                {daysUntil > 0 && (
                                     <button 
                                        disabled={true}
                                        className="w-full mt-2 py-1.5 bg-fm-card border border-fm-border text-[10px] text-fm-muted rounded cursor-not-allowed uppercase font-bold flex items-center justify-center gap-2"
                                     >
                                        <Lock size={10} /> 
                                        Qualifiers Coming Soon
                                     </button>
                                )}
                            </div>
                        )
                    })}
                    {tournaments.filter(t => new Date(t.startDate) >= currentDate).length === 0 && (
                        <div className="text-center text-fm-muted text-sm py-4 italic">No upcoming majors this season.</div>
                    )}
                 </div>
              </div>

              {/* Upcoming Matches List */}
              <div className="bg-fm-card border border-fm-border rounded-xl p-5 shadow-lg">
                 <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2 uppercase tracking-wide">
                    <Calendar size={14} className="text-fm-accent" /> 
                    Next Matches
                 </h3>
                 <div className="space-y-3">
                    {schedule.filter(m => !m.isPlayed).slice(0, 5).map(m => (
                        <div key={m.id} className="flex justify-between items-center bg-fm-bg p-3 rounded border border-fm-border">
                             <div className="flex flex-col">
                                <span className="text-[10px] text-fm-muted font-mono uppercase">{new Date(m.date).toLocaleDateString()}</span>
                                <span className="text-sm font-bold text-white">{m.type === 'LEAGUE' ? m.leagueName : 'Match'}</span>
                             </div>
                             <div className="text-[9px] uppercase font-bold bg-fm-card text-fm-muted px-2 py-1 rounded border border-fm-border">Pending</div>
                        </div>
                    ))}
                    {schedule.filter(m => !m.isPlayed).length === 0 && (
                        <div className="text-fm-muted text-xs italic">Season Complete.</div>
                    )}
                 </div>
              </div>
          </div>

      </div>
    </div>
  );
};