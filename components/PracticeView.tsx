
import React, { useState, useEffect } from 'react';
import { Team, MapPracticeStats, Player, PlayerStats, TrainingIntensity, ScheduledMatch } from '../types';
import { Target, Swords, Zap, Brain, CheckCircle, Lock, Activity, Users, AlertTriangle, Flame, Crosshair, Shield, Dumbbell, ChevronRight, Battery, Calendar, BatteryWarning, BatteryCharging, Smile } from 'lucide-react';
import { CountryFlag } from './CountryFlag';

interface PracticeViewProps {
  team: Team;
  schedule: ScheduledMatch[];
  currentDate: Date;
  onTrain: (mapId: string, skill: keyof MapPracticeStats) => void;
  onIndividualTrain: (playerId: string, drillType: DrillType) => void;
  onUpdateSchedule: (dayIndex: number, intensity: TrainingIntensity) => void;
  onSetupComplete: (permaban: string, firstPick: string, focusMaps: string[]) => void;
  dailyActivities: { mapTraining: boolean; individualDrills: number };
  isDailyTrainingComplete?: boolean;
}

// Drill Types
export type DrillType = 'DEATHMATCH' | 'RETAKE' | 'GRENADE' | 'DEMO' | 'SCRIM' | 'REACTION';

const DRILLS: { id: DrillType, name: string, main: keyof PlayerStats, sub: keyof PlayerStats, desc: string }[] = [
    { id: 'DEATHMATCH', name: 'Deathmatch Session', main: 'aim', sub: 'reflex', desc: '+Aim, +Reflex' },
    { id: 'RETAKE', name: 'Retake Scenarios', main: 'clutch', sub: 'strategy', desc: '+Clutch, +Strategy' },
    { id: 'GRENADE', name: 'Grenade Lineups', main: 'utility', sub: 'strategy', desc: '+Utility, +Strategy' },
    { id: 'DEMO', name: 'Demo Review', main: 'strategy', sub: 'teamwork', desc: '+Strategy, +Teamwork' },
    { id: 'SCRIM', name: '5vs5 Scrim', main: 'teamwork', sub: 'clutch', desc: '+Teamwork, +Mental' },
    { id: 'REACTION', name: 'Reaction Test', main: 'reflex', sub: 'aim', desc: '+Reflex, +Aim' },
];

// HLTV static images for maps
const MAP_POOL = [
    { id: 'Dust2', name: 'Dust 2', img: 'https://www.hltv.org/img/static/statsmatchmaps/dust2.png', desc: 'The classic. Aim heavy, simple layout.', logoColor: 'text-yellow-500' },
    { id: 'Mirage', name: 'Mirage', img: 'https://www.hltv.org/img/static/statsmatchmaps/mirage.png', desc: 'Balanced middle. Execution heavy.', logoColor: 'text-orange-500' },
    { id: 'Inferno', name: 'Inferno', img: 'https://www.hltv.org/img/static/statsmatchmaps/inferno.png', desc: 'Narrow chokepoints. Utility king.', logoColor: 'text-blue-500' },
    { id: 'Nuke', name: 'Nuke', img: 'https://www.hltv.org/img/static/statsmatchmaps/nuke.png', desc: 'Vertical gameplay. Rotation speed.', logoColor: 'text-yellow-400' },
    { id: 'Train', name: 'Train', img: 'https://www.hltv.org/img/static/statsmatchmaps/train.png', desc: 'Long angles. AWP dominance.', logoColor: 'text-green-600' },
    { id: 'Overpass', name: 'Overpass', img: 'https://www.hltv.org/img/static/statsmatchmaps/overpass.png', desc: 'Complex rotations. CT Aggression.', logoColor: 'text-orange-400' },
    { id: 'Ancient', name: 'Ancient', img: 'https://www.hltv.org/img/static/statsmatchmaps/ancient.png', desc: 'Green maze. Close quarters.', logoColor: 'text-green-500' }
];

export const PracticeView: React.FC<PracticeViewProps> = ({ team, schedule, currentDate, onTrain, onIndividualTrain, onUpdateSchedule, onSetupComplete, dailyActivities, isDailyTrainingComplete = false }) => {
    const [activeTab, setActiveTab] = useState<'team' | 'individual' | 'schedule'>('team');
    const [selectedMap, setSelectedMap] = useState<string | null>(null);
    
    // Use ID to always derive fresh player state from props
    const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(team.players[0]?.id || null);
    const selectedPlayer = team.players.find(p => p.id === selectedPlayerId) || null;

    // Wizard State
    const [setupStep, setSetupStep] = useState<number>(0); // 0: Permaban, 1: First Pick, 2: Focus
    const [permaban, setPermaban] = useState<string>('');
    const [firstPick, setFirstPick] = useState<string>('');
    const [focusMaps, setFocusMaps] = useState<string[]>([]);

    // Ensure we have a selected player if the roster changes
    useEffect(() => {
        if (!selectedPlayerId && team.players.length > 0) {
            setSelectedPlayerId(team.players[0].id);
        }
    }, [team.players, selectedPlayerId]);

    if (!team.isMapPoolInitialized) {
        // WIZARD RENDER (Same as before)
        const handleWizardSelect = (mapId: string) => {
            if (setupStep === 0) {
                setPermaban(mapId);
                setSetupStep(1);
            } else if (setupStep === 1) {
                if (mapId === permaban) return;
                setFirstPick(mapId);
                setSetupStep(2);
            } else if (setupStep === 2) {
                if (mapId === permaban || mapId === firstPick) return;
                if (focusMaps.includes(mapId)) {
                    setFocusMaps(prev => prev.filter(m => m !== mapId));
                } else if (focusMaps.length < 2) {
                    setFocusMaps(prev => [...prev, mapId]);
                }
            }
        };

        const canProceed = setupStep === 2 && focusMaps.length === 2;

        return (
            <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-6">
                <div className="max-w-4xl w-full bg-cs-dark border border-gray-800 rounded-xl shadow-2xl p-8">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold text-white mb-2">Map Pool Strategy</h2>
                        <p className="text-gray-400">
                            {setupStep === 0 && "Select your team's PERMABAN (This map will start at 0% mastery)."}
                            {setupStep === 1 && "Select your FIRST PICK (This is the ONLY map that can reach 100% mastery. Starts at 45%)."}
                            {setupStep === 2 && "Select 2 FOCUS MAPS (These start at 35%). All others will start at 20%."}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        {MAP_POOL.map(map => {
                            const isPermaban = permaban === map.id;
                            const isFirstPick = firstPick === map.id;
                            const isFocus = focusMaps.includes(map.id);
                            
                            let statusColor = "border-gray-800 opacity-60";
                            let statusText = "";
                            
                            if (isPermaban) { statusColor = "border-red-500 opacity-100 ring-2 ring-red-500/50"; statusText = "BANNED"; }
                            else if (isFirstPick) { statusColor = "border-green-500 opacity-100 ring-2 ring-green-500/50"; statusText = "PICK"; }
                            else if (isFocus) { statusColor = "border-cs-blue opacity-100 ring-2 ring-cs-blue/50"; statusText = "FOCUS"; }
                            else if (setupStep === 0) { statusColor = "border-gray-600 hover:border-red-500 cursor-pointer opacity-100"; }
                            else if (setupStep === 1 && !isPermaban) { statusColor = "border-gray-600 hover:border-green-500 cursor-pointer opacity-100"; }
                            else if (setupStep === 2 && !isPermaban && !isFirstPick) { statusColor = "border-gray-600 hover:border-cs-blue cursor-pointer opacity-100"; }

                            return (
                                <div 
                                    key={map.id}
                                    onClick={() => handleWizardSelect(map.id)}
                                    className={`relative h-32 rounded-lg overflow-hidden border-2 transition-all ${statusColor}`}
                                >
                                    <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${map.img})` }}></div>
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                        <span className="font-bold text-white uppercase">{map.name}</span>
                                    </div>
                                    {statusText && (
                                        <div className="absolute top-2 right-2 bg-black/80 px-2 py-0.5 text-[10px] font-bold text-white rounded">
                                            {statusText}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    <div className="flex justify-end gap-4">
                        {setupStep > 0 && (
                             <button 
                                onClick={() => {
                                    if (setupStep === 2) setFocusMaps([]);
                                    else if (setupStep === 1) setFirstPick('');
                                    setSetupStep(prev => prev - 1);
                                }}
                                className="px-6 py-3 text-gray-400 hover:text-white font-bold"
                            >
                                Back
                            </button>
                        )}
                        {setupStep === 2 && (
                             <button 
                                onClick={() => onSetupComplete(permaban, firstPick, focusMaps)}
                                disabled={!canProceed}
                                className={`px-8 py-3 rounded font-black uppercase tracking-widest transition-all ${canProceed ? 'bg-cs-yellow hover:bg-yellow-400 text-black' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
                            >
                                Finalize Pool
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    const getProficiency = (mapId: string) => {
        return team.mapStats ? Math.floor(team.mapStats[mapId] || 0) : 0;
    };

    const getSubStats = (mapId: string): MapPracticeStats => {
        return team.practiceStats?.[mapId] || { pistol: 0, ct: 0, t: 0, strat: 0 };
    };

    const getMapWarnings = (mapId: string) => {
        const warnings = [];
        const proficiency = getProficiency(mapId);
        
        // Diminishing Returns Warning
        if (proficiency >= 70) warnings.push({ type: 'hard', text: "Slow Progress (Level 3)" });
        else if (proficiency >= 50) warnings.push({ type: 'soft', text: "Normal Progress (Level 2)" });

        // Fatigue Warning
        if (team.lastTrainedMapId === mapId && (team.consecutiveMapTrainCount || 0) >= 4) {
            warnings.push({ type: 'fatigue', text: "FATIGUE: Gains reduced by 50%" });
        }

        // Cap Warning
        const isFirstPick = team.firstPickMap === mapId;
        if (!isFirstPick && proficiency >= 85) {
             warnings.push({ type: 'cap', text: "MAXED (85%). Only First Pick can go higher." });
        }

        return warnings;
    };

    const XPBar = ({ label, level, xp, requiredXp, color }: { label: string, level: number, xp: number, requiredXp: number, color: string }) => (
        <div className="mb-3">
            <div className="flex justify-between items-end mb-1">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">{label}</span>
                <div className="text-right">
                    <span className={`text-sm font-black ${color}`}>{level}</span>
                    <span className="text-[10px] text-gray-500 ml-1">OVR</span>
                </div>
            </div>
            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden relative">
                {/* ANIMATED BAR */}
                <div 
                    className={`h-full ${color.replace('text-', 'bg-')} transition-all duration-1000 ease-out`} 
                    style={{ width: `${(xp / requiredXp) * 100}%` }}
                ></div>
            </div>
            <div className="text-[10px] text-right text-gray-600 mt-0.5 font-mono">{Math.floor(xp)} / {Math.floor(requiredXp)} XP</div>
        </div>
    );

    const selectedMapWarnings = selectedMap ? getMapWarnings(selectedMap) : [];
    const isFirstPickSelected = selectedMap === team.firstPickMap;
    const isPermabanSelected = selectedMap === team.permaban;

    const drillsRemaining = 3 - dailyActivities.individualDrills;
    const mapTrainingRemaining = dailyActivities.mapTraining ? 0 : 1;

    // HELPER: Check if next X days has match
    // NOTE: This logic now assumes dayIndex 0 = MONDAY.
    const getNextMatchInfo = (dayIndex: number) => {
        // Create a date for the next occurrence of dayIndex
        const targetDate = new Date(currentDate);
        
        // Convert JS getDay() (0=Sun) to our Mon=0 system
        const todayIndex = (targetDate.getDay() + 6) % 7; 
        
        // Find days until next 'dayIndex'
        let daysUntil = (dayIndex - todayIndex + 7) % 7;
        
        targetDate.setDate(targetDate.getDate() + daysUntil);
        
        // Check if any match matches this date
        const match = schedule.find(m => !m.isPlayed && new Date(m.date).toDateString() === targetDate.toDateString());
        
        return {
            isMatchDay: !!match,
            matchName: match ? (match.type === 'LEAGUE' ? match.leagueName : 'Tournament') : '',
            isToday: daysUntil === 0
        }
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* HEADER */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-600/20 text-green-500 rounded-lg border border-green-500/30">
                        <Target size={32} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-white">Practice Facility</h2>
                        <p className="text-gray-400">Develop player skills and master the map pool.</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-6">
                    {/* Daily Limits UI */}
                    <div className="flex gap-3">
                         <div className={`px-4 py-2 rounded border flex flex-col items-center justify-center ${mapTrainingRemaining > 0 ? 'bg-gray-900 border-green-900/50 text-green-400' : 'bg-gray-900/50 border-gray-800 text-gray-600'}`}>
                             <span className="text-[10px] uppercase font-bold">Map Session</span>
                             <span className="font-mono font-bold text-lg leading-none">{mapTrainingRemaining}/1</span>
                         </div>
                         <div className={`px-4 py-2 rounded border flex flex-col items-center justify-center ${drillsRemaining > 0 ? 'bg-gray-900 border-blue-900/50 text-blue-400' : 'bg-gray-900/50 border-gray-800 text-gray-600'}`}>
                             <span className="text-[10px] uppercase font-bold">Drill Slots</span>
                             <span className="font-mono font-bold text-lg leading-none">{drillsRemaining}/3</span>
                         </div>
                    </div>

                    <div className="flex bg-gray-900 p-1 rounded-lg border border-gray-800">
                        <button 
                            onClick={() => setActiveTab('team')}
                            className={`px-4 py-2 rounded text-sm font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'team' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            <Swords size={16} /> Team Practice
                        </button>
                        <button 
                            onClick={() => setActiveTab('individual')}
                            className={`px-4 py-2 rounded text-sm font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'individual' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            <Dumbbell size={16} /> Individual Training
                        </button>
                        <button 
                            onClick={() => setActiveTab('schedule')}
                            className={`px-4 py-2 rounded text-sm font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'schedule' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            <Calendar size={16} /> Weekly Plan
                        </button>
                    </div>
                </div>
            </div>
            
            {/* DAILY LOCK INDICATOR */}
            {drillsRemaining === 0 && mapTrainingRemaining === 0 && activeTab !== 'schedule' && (
                 <div className="mb-6 flex items-center gap-2 bg-red-900/20 border border-red-800/50 px-4 py-3 rounded-lg text-red-400 w-full animate-fade-in">
                    <Lock size={18} />
                    <span className="font-bold uppercase tracking-wider">Facility Closed for the Day (All Slots Used)</span>
                </div>
            )}

            {/* WEEKLY SCHEDULE PLANNER */}
            {activeTab === 'schedule' && (
                <div className="animate-fade-in">
                    <div className="bg-cs-dark border border-gray-800 rounded-xl shadow-xl p-6 mb-6">
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-4">
                                <div className="bg-purple-500/20 p-3 rounded-full">
                                    <Calendar className="text-purple-400" size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">Weekly Training Schedule</h3>
                                    <p className="text-gray-400 text-sm">Manage fatigue. High intensity on Match Day reduces performance significantly.</p>
                                </div>
                            </div>
                        </div>

                        {/* MENTAL STATUS OVERVIEW */}
                        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-800 mb-6">
                             <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                 <Smile size={14} /> Team Mental Status
                             </h4>
                             <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                 {team.players.map(p => {
                                     let color = 'text-green-400 bg-green-900/20 border-green-800';
                                     if (p.morale < 50) color = 'text-red-400 bg-red-900/20 border-red-800';
                                     else if (p.morale < 80) color = 'text-yellow-400 bg-yellow-900/20 border-yellow-800';

                                     return (
                                         <div key={p.id} className={`p-2 rounded border ${color} flex flex-col items-center justify-center text-center`}>
                                             <div className="text-xs font-bold text-white truncate w-full mb-1">{p.alias}</div>
                                             <div className="font-mono font-bold text-lg leading-none">
                                                 {p.morale}%
                                             </div>
                                             {p.morale < 50 && <span className="text-[9px] uppercase font-bold mt-1">TILTED</span>}
                                         </div>
                                     )
                                 })}
                             </div>
                        </div>

                        {/* Updated Grid: More Responsive and Bigger Tiles */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
                            {/* Changed Order: Monday first */}
                            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((dayName, index) => {
                                const currentIntensity = team.weeklySchedule[index] || TrainingIntensity.MEDIUM;
                                const { isMatchDay, matchName, isToday } = getNextMatchInfo(index);

                                let intensityColor = 'bg-gray-800 border-gray-700 text-gray-500';
                                if (currentIntensity === TrainingIntensity.LIGHT) intensityColor = 'bg-green-900/20 border-green-800 text-green-400';
                                if (currentIntensity === TrainingIntensity.MEDIUM) intensityColor = 'bg-yellow-900/20 border-yellow-800 text-yellow-400';
                                if (currentIntensity === TrainingIntensity.HEAVY) intensityColor = 'bg-red-900/20 border-red-800 text-red-400';

                                return (
                                    <div key={index} className={`border rounded-xl p-5 flex flex-col justify-between gap-4 ${intensityColor} relative overflow-hidden transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] min-h-[280px] ${isToday ? 'ring-2 ring-cs-blue ring-offset-2 ring-offset-[#15151a]' : ''}`}>
                                        {isToday && <div className="absolute top-0 left-0 right-0 h-1 bg-cs-blue"></div>}
                                        
                                        {/* Match Indicator */}
                                        {isMatchDay && (
                                            <div className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-black uppercase text-white bg-red-600 px-2 py-1 rounded animate-pulse shadow-sm">
                                                <Swords size={12} /> Match
                                            </div>
                                        )}

                                        <div>
                                            <div className="font-black uppercase tracking-widest text-lg text-center mb-3 flex justify-center items-center gap-2 text-white">
                                                {dayName}
                                                {isToday && <span className="text-[8px] bg-cs-blue text-white px-1.5 py-0.5 rounded align-middle">TODAY</span>}
                                            </div>
                                            
                                            <div className="flex flex-col gap-2 z-10">
                                                {Object.values(TrainingIntensity).map((intensity) => (
                                                    <button
                                                        key={intensity}
                                                        onClick={() => onUpdateSchedule(index, intensity)}
                                                        className={`text-xs font-bold py-2 px-2 rounded uppercase transition-colors text-center border
                                                            ${currentIntensity === intensity 
                                                                ? 'bg-black/40 border-white/20 text-white shadow-inner' 
                                                                : 'border-transparent hover:bg-black/20 text-white/50 hover:text-white hover:border-white/10'}`}
                                                    >
                                                        {intensity}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        
                                        {/* Info Badge */}
                                        <div className="text-center space-y-2 pt-2 border-t border-white/5">
                                            <div className="text-xs font-mono opacity-80 flex justify-between px-1">
                                                {/* XP is always green per request */}
                                                <span className="text-green-400 font-bold">
                                                    {currentIntensity === 'Rest' && '0 XP'}
                                                    {currentIntensity === 'Light' && '~40 XP'}
                                                    {currentIntensity === 'Medium' && '~80 XP'}
                                                    {currentIntensity === 'Heavy' && '~150 XP'}
                                                </span>
                                                <span className={`${currentIntensity === 'Rest' || currentIntensity === 'Light' ? 'text-green-400' : 'text-red-400'} font-bold`}>
                                                    {currentIntensity === 'Rest' && '+10 Men'}
                                                    {currentIntensity === 'Light' && '+5 Men'}
                                                    {currentIntensity === 'Medium' && '-5 Men'}
                                                    {currentIntensity === 'Heavy' && '-15 Men'}
                                                </span>
                                            </div>
                                            
                                            {/* MATCH DAY WARNINGS */}
                                            {isMatchDay && currentIntensity === TrainingIntensity.HEAVY && (
                                                <div className="text-[10px] font-bold bg-red-500/20 text-red-200 border border-red-500/50 p-1.5 rounded flex items-center justify-center gap-1 animate-pulse">
                                                    <AlertTriangle size={12} /> -20% PENALTY
                                                </div>
                                            )}
                                            {isMatchDay && currentIntensity === TrainingIntensity.MEDIUM && (
                                                <div className="text-[10px] font-bold bg-yellow-500/20 text-yellow-200 border border-yellow-500/50 p-1.5 rounded flex items-center justify-center gap-1">
                                                    <AlertTriangle size={12} /> -10% PENALTY
                                                </div>
                                            )}
                                            {isMatchDay && (currentIntensity === TrainingIntensity.LIGHT || currentIntensity === TrainingIntensity.REST) && (
                                                <div className="text-[10px] font-bold bg-green-500/20 text-green-200 border border-green-500/50 p-1.5 rounded flex items-center justify-center gap-1">
                                                    <CheckCircle size={12} /> MATCH READY
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        
                        <div className="mt-6 bg-blue-900/20 border border-blue-800/50 p-4 rounded-lg flex items-start gap-3">
                            <BatteryCharging className="text-blue-400 shrink-0 mt-0.5" size={18} />
                            <div>
                                <h4 className="text-sm font-bold text-blue-200 mb-1">Mental & Fatigue Management</h4>
                                <p className="text-xs text-blue-300/80">
                                    <span className="font-bold text-white">Match Day Fatigue:</span> High intensity training on Match Day tires players out immediately.
                                    <br/>
                                    • <span className="text-red-400 font-bold">Heavy:</span> -20% Team Power (Severe Fatigue)
                                    <br/>
                                    • <span className="text-yellow-400 font-bold">Medium:</span> -10% Team Power (Slight Fatigue)
                                    <br/>
                                    • <span className="text-green-400 font-bold">Light/Rest:</span> No Penalty (Fresh)
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* INDIVIDUAL TRAINING */}
            {activeTab === 'individual' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
                    {/* Player List */}
                    <div className="lg:col-span-1 bg-cs-dark border border-gray-800 rounded-xl overflow-hidden shadow-xl">
                        <div className="bg-gray-900 px-4 py-3 border-b border-gray-800">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Select Player</h3>
                        </div>
                        <div className="divide-y divide-gray-800">
                            {team.players.map(p => (
                                <button 
                                    key={p.id}
                                    onClick={() => setSelectedPlayerId(p.id)}
                                    className={`w-full p-4 flex items-center justify-between hover:bg-gray-800/50 transition-colors ${selectedPlayerId === p.id ? 'bg-cs-blue/10 border-l-4 border-cs-blue' : ''}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <CountryFlag countryCode={p.country} />
                                        <span className={`font-bold ${selectedPlayerId === p.id ? 'text-white' : 'text-gray-400'}`}>{p.alias}</span>
                                    </div>
                                    <ChevronRight size={16} className={`transition-opacity ${selectedPlayerId === p.id ? 'opacity-100 text-cs-blue' : 'opacity-0'}`} />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Drill Selection & Stats */}
                    <div className="lg:col-span-2 bg-cs-dark border border-gray-800 rounded-xl shadow-xl p-6">
                        {selectedPlayer ? (
                            <>
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center font-bold text-xl text-gray-500 border border-gray-700">
                                            {selectedPlayer.alias.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black text-white">{selectedPlayer.alias}</h3>
                                            <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">{selectedPlayer.role}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] text-gray-500 uppercase font-bold">Rating</div>
                                        <div className="text-2xl font-mono font-bold text-green-400">
                                            {((selectedPlayer.stats.aim + selectedPlayer.stats.reflex + selectedPlayer.stats.strategy + selectedPlayer.stats.utility)/4).toFixed(0)}
                                        </div>
                                    </div>
                                </div>

                                {/* Stats/XP Overview */}
                                <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-8 bg-black/20 p-4 rounded-lg border border-gray-800">
                                    <XPBar 
                                        label="Aim" 
                                        level={selectedPlayer.stats.aim} 
                                        xp={selectedPlayer.xp?.aim || 0} 
                                        requiredXp={500 + (selectedPlayer.stats.aim * 50)} 
                                        color="text-yellow-400" 
                                    />
                                    <XPBar 
                                        label="Reflex" 
                                        level={selectedPlayer.stats.reflex} 
                                        xp={selectedPlayer.xp?.reflex || 0} 
                                        requiredXp={500 + (selectedPlayer.stats.reflex * 50)} 
                                        color="text-orange-400" 
                                    />
                                    <XPBar 
                                        label="Strategy" 
                                        level={selectedPlayer.stats.strategy} 
                                        xp={selectedPlayer.xp?.strategy || 0} 
                                        requiredXp={500 + (selectedPlayer.stats.strategy * 50)} 
                                        color="text-blue-400" 
                                    />
                                    <XPBar 
                                        label="Utility" 
                                        level={selectedPlayer.stats.utility} 
                                        xp={selectedPlayer.xp?.utility || 0} 
                                        requiredXp={500 + (selectedPlayer.stats.utility * 50)} 
                                        color="text-purple-400" 
                                    />
                                    <XPBar 
                                        label="Teamwork" 
                                        level={selectedPlayer.stats.teamwork} 
                                        xp={selectedPlayer.xp?.teamwork || 0} 
                                        requiredXp={500 + (selectedPlayer.stats.teamwork * 50)} 
                                        color="text-green-400" 
                                    />
                                    <XPBar 
                                        label="Clutch" 
                                        level={selectedPlayer.stats.clutch} 
                                        xp={selectedPlayer.xp?.clutch || 0} 
                                        requiredXp={500 + (selectedPlayer.stats.clutch * 50)} 
                                        color="text-red-400" 
                                    />
                                </div>

                                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center justify-between">
                                    Assign Drill
                                    <span className={`${drillsRemaining > 0 ? 'text-blue-400' : 'text-red-500'} text-xs`}>{drillsRemaining} slots remaining</span>
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {DRILLS.map(drill => (
                                        <button
                                            key={drill.id}
                                            onClick={() => onIndividualTrain(selectedPlayer.id, drill.id)}
                                            disabled={drillsRemaining <= 0}
                                            className={`p-4 border rounded-lg text-left transition-all relative overflow-hidden group
                                                ${drillsRemaining <= 0 
                                                    ? 'bg-gray-800 border-gray-700 opacity-50 cursor-not-allowed' 
                                                    : 'bg-gray-900 border-gray-700 hover:border-cs-blue hover:bg-gray-800'}`}
                                        >
                                            <div className="relative z-10">
                                                <div className="font-bold text-white text-lg mb-1 group-hover:text-cs-blue transition-colors">{drill.name}</div>
                                                <div className="text-xs text-gray-400 font-mono uppercase mb-2">{drill.desc}</div>
                                                <div className="flex gap-2 mt-2">
                                                    <span className="text-[10px] bg-gray-800 px-2 py-1 rounded border border-gray-700 text-gray-300">
                                                        XP: 400-600
                                                    </span>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                <p>Select a player to view development</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* MAP PRACTICE (TEAM) */}
            {activeTab === 'team' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
                    {/* MAP SELECTION GRID */}
                    <div className="lg:col-span-1 space-y-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                            <Swords className="text-cs-yellow" size={18} /> Map Pool
                        </h3>
                        <div className="grid grid-cols-1 gap-3 max-h-[600px] overflow-y-auto pr-2">
                            {MAP_POOL.map((map) => {
                                const proficiency = getProficiency(map.id);
                                const isSelected = selectedMap === map.id;
                                const isFP = team.firstPickMap === map.id;
                                const isPB = team.permaban === map.id;

                                return (
                                    <button 
                                        key={map.id}
                                        onClick={() => setSelectedMap(map.id)}
                                        className={`relative group h-16 rounded-lg overflow-hidden border transition-all shadow-md text-left flex items-center ${isSelected ? 'border-cs-yellow ring-1 ring-cs-yellow/50' : 'border-gray-800 hover:border-gray-600'}`}
                                    >
                                        <div 
                                            className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105 opacity-40"
                                            style={{ backgroundImage: `url(${map.img})` }}
                                        ></div>
                                        <div className="absolute inset-0 bg-gradient-to-r from-cs-dark via-cs-dark/80 to-transparent"></div>
                                        
                                        <div className="relative z-10 pl-4 flex items-center justify-between w-full pr-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded bg-gray-900 flex items-center justify-center font-black text-sm border border-white/10 ${map.logoColor}`}>
                                                    {map.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-white uppercase tracking-tight flex items-center gap-2">
                                                        {map.name}
                                                        {isFP && <span className="text-[8px] bg-green-900 text-green-400 px-1 rounded border border-green-700">PICK</span>}
                                                        {isPB && <span className="text-[8px] bg-red-900 text-red-400 px-1 rounded border border-red-700">BAN</span>}
                                                    </div>
                                                    <div className={`text-[10px] font-bold ${proficiency > 50 ? 'text-green-400' : 'text-gray-500'}`}>
                                                        {proficiency}% Mastery
                                                    </div>
                                                </div>
                                            </div>
                                            {isSelected && <CheckCircle size={16} className="text-cs-yellow" />}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* TRAINING AREA */}
                    <div className="lg:col-span-2">
                        <div className="bg-cs-dark border border-gray-800 rounded-xl shadow-xl overflow-hidden h-full">
                            {selectedMap ? (
                                <>
                                    <div className="h-48 w-full bg-cover bg-center relative" style={{ backgroundImage: `url(${MAP_POOL.find(m => m.id === selectedMap)?.img})` }}>
                                         <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cs-dark/80 to-cs-dark"></div>
                                         <div className="absolute bottom-0 left-0 p-6 w-full">
                                            <div className="flex justify-between items-end">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        {isFirstPickSelected && <span className="bg-green-500 text-black text-xs font-black px-2 py-0.5 rounded uppercase">First Pick (Max 100%)</span>}
                                                        {isPermabanSelected && <span className="bg-red-500 text-white text-xs font-black px-2 py-0.5 rounded uppercase">Permaban</span>}
                                                    </div>
                                                    <h4 className="text-5xl font-black text-white italic uppercase tracking-tighter drop-shadow-lg shadow-black">
                                                        {MAP_POOL.find(m => m.id === selectedMap)?.name}
                                                    </h4>
                                                    <p className="text-gray-300 text-sm max-w-md mt-1">{MAP_POOL.find(m => m.id === selectedMap)?.desc}</p>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Overall Proficiency</div>
                                                    <div className="text-4xl font-mono font-bold text-white">{getProficiency(selectedMap)}%</div>
                                                </div>
                                            </div>
                                         </div>
                                    </div>
                                    
                                    <div className="p-6">
                                        {/* WARNINGS */}
                                        {selectedMapWarnings.length > 0 && (
                                            <div className="mb-6 flex flex-col gap-2">
                                                {selectedMapWarnings.map((w, i) => (
                                                    <div key={i} className={`p-2 rounded border flex items-center gap-2 text-xs font-bold uppercase tracking-wide
                                                        ${w.type === 'fatigue' ? 'bg-red-900/20 border-red-800 text-red-400' : 
                                                          w.type === 'cap' ? 'bg-gray-800 border-gray-700 text-gray-400' :
                                                          'bg-yellow-900/10 border-yellow-800/50 text-yellow-500'}`}>
                                                        {w.type === 'fatigue' ? <Flame size={14} /> : <AlertTriangle size={14} />}
                                                        {w.text}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <h5 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Activity size={16} /> Training Modules
                                            </div>
                                            <span className={`${mapTrainingRemaining > 0 ? 'text-green-400' : 'text-red-500'} text-xs`}>{mapTrainingRemaining} session remaining</span>
                                        </h5>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {['pistol', 'ct', 't', 'strat'].map(type => (
                                                <div key={type} className="bg-gray-900/50 p-4 rounded border border-gray-800 hover:border-gray-700 transition-colors">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <div className="flex items-center gap-2">
                                                            {type === 'pistol' && <Crosshair size={16} className="text-gray-400" />}
                                                            {type === 'ct' && <Shield size={16} className="text-blue-400" />}
                                                            {type === 't' && <Swords size={16} className="text-cs-yellow" />}
                                                            {type === 'strat' && <Brain size={16} className="text-purple-400" />}
                                                            
                                                            <span className="text-sm font-bold text-gray-200 capitalize">
                                                                {type === 'strat' ? 'Analysis' : type === 'ct' ? 'CT Setup' : type === 't' ? 'T Executes' : 'Pistol Rounds'}
                                                            </span>
                                                        </div>
                                                        <span className="text-xs font-mono font-bold text-gray-400">{getSubStats(selectedMap)[type as keyof MapPracticeStats]}%</span>
                                                    </div>
                                                    <button 
                                                        onClick={() => onTrain(selectedMap, type as keyof MapPracticeStats)} 
                                                        disabled={mapTrainingRemaining <= 0} 
                                                        className={`w-full py-1.5 text-xs font-bold uppercase rounded ${mapTrainingRemaining <= 0 ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-gray-700 hover:bg-cs-yellow hover:text-black text-white'}`}
                                                    >
                                                        Train
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full p-12 text-gray-500">
                                    <Target size={64} className="mb-4 opacity-20" />
                                    <p className="text-lg font-bold">Select a map to begin training</p>
                                    <p className="text-sm">Choose from the list on the left</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
