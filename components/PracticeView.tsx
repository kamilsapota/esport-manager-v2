import React, { useState, useEffect } from 'react';
import { Team, MapPracticeStats, Player, PlayerStats, TrainingIntensity, ScheduledMatch, Coach, AutomationConfig, DRILLS, DrillType } from '../types';
import { Target, Swords, Zap, Brain, CheckCircle, Lock, Activity, Users, AlertTriangle, Flame, Crosshair, Shield, Dumbbell, ChevronRight, Battery, Calendar, BatteryCharging, Smile, Briefcase, UserPlus, Check, User, Clock, Loader2 } from 'lucide-react';
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
  onHireCoach?: (type: 'HEAD' | 'PERFORMANCE') => void;
  onAssignCoach?: (coachId: string, playerId: string) => void;
  onToggleAutomation?: (key: keyof AutomationConfig) => void;
  onCoachFocusChange?: (coachId: string, focus: 'LOWEST' | 'ROLE' | 'BALANCED') => void;
}

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

export const PracticeView: React.FC<PracticeViewProps> = ({ 
    team, 
    schedule, 
    currentDate, 
    onTrain, 
    onIndividualTrain, 
    onUpdateSchedule, 
    onSetupComplete, 
    dailyActivities, 
    isDailyTrainingComplete = false,
    onHireCoach,
    onAssignCoach,
    onToggleAutomation,
    onCoachFocusChange
}) => {
    const [activeTab, setActiveTab] = useState<'team' | 'individual' | 'schedule' | 'staff'>('team');
    const [selectedMap, setSelectedMap] = useState<string | null>(null);
    const [isProcessingSchedule, setIsProcessingSchedule] = useState(false);
    
    const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(team.players[0]?.id || null);
    const selectedPlayer = team.players.find(p => p.id === selectedPlayerId) || null;

    // Wizard State
    const [setupStep, setSetupStep] = useState<number>(0);
    const [permaban, setPermaban] = useState<string>('');
    const [firstPick, setFirstPick] = useState<string>('');
    const [focusMaps, setFocusMaps] = useState<string[]>([]);

    useEffect(() => {
        if (!selectedPlayerId && team.players.length > 0) {
            setSelectedPlayerId(team.players[0].id);
        }
    }, [team.players, selectedPlayerId]);

    const handleScheduleToggle = () => {
        if (!onToggleAutomation) return;
        
        if (!team.automationConfig.autoSchedule) {
            // If turning ON, show loading
            setIsProcessingSchedule(true);
            setTimeout(() => {
                onToggleAutomation('autoSchedule');
                setIsProcessingSchedule(false);
            }, 800); // Small delay to visualize "thinking"
        } else {
            // Immediate toggle off
            onToggleAutomation('autoSchedule');
        }
    };

    const getProficiency = (mapId: string) => {
        return team.mapStats ? Math.floor(team.mapStats[mapId] || 0) : 0;
    };

    const getSubStats = (mapId: string): MapPracticeStats => {
        return team.practiceStats?.[mapId] || { pistol: 0, ct: 0, t: 0, strat: 0 };
    };

    const getMapWarnings = (mapId: string) => {
        const warnings = [];
        const proficiency = getProficiency(mapId);
        
        if (proficiency >= 70) warnings.push({ type: 'hard', text: "Slow Progress (Level 3)" });
        else if (proficiency >= 50) warnings.push({ type: 'soft', text: "Normal Progress (Level 2)" });

        if (team.lastTrainedMapId === mapId && (team.consecutiveMapTrainCount || 0) >= 4) {
            warnings.push({ type: 'fatigue', text: "FATIGUE: Gains reduced by 50%" });
        }

        const isFirstPick = team.firstPickMap === mapId;
        if (!isFirstPick && proficiency >= 85) {
             warnings.push({ type: 'cap', text: "MAXED (85%). Only First Pick can go higher." });
        }

        return warnings;
    };

    // --- SCHEDULE UTILS ---
    const todayIndex = (currentDate.getDay() + 6) % 7; // Mon=0, Sun=6
    const todayIntensity = team.weeklySchedule[todayIndex] || TrainingIntensity.MEDIUM;
    const isRestDay = todayIntensity === TrainingIntensity.REST;
    
    const XPBar = ({ label, level, xp, requiredXp, color }: { label: string, level: number, xp: number, requiredXp: number, color: string }) => (
        <div className="mb-3">
            <div className="flex justify-between items-end mb-1">
                <span className="text-[10px] font-bold text-fm-muted uppercase tracking-wide">{label}</span>
                <div className="text-right">
                    <span className={`text-sm font-black ${color}`}>{level}</span>
                    <span className="text-[9px] text-fm-muted ml-1">OVR</span>
                </div>
            </div>
            <div className="w-full h-1.5 bg-fm-bg rounded-full overflow-hidden relative border border-fm-border/50">
                <div 
                    className={`h-full ${color.replace('text-', 'bg-')} transition-all duration-1000 ease-out`} 
                    style={{ width: `${(xp / requiredXp) * 100}%` }}
                ></div>
            </div>
            <div className="text-[9px] text-right text-fm-muted mt-0.5 font-mono">{Math.floor(xp)} / {Math.floor(requiredXp)} XP</div>
        </div>
    );

    const selectedMapWarnings = selectedMap ? getMapWarnings(selectedMap) : [];
    const isFirstPickSelected = selectedMap === team.firstPickMap;
    const isPermabanSelected = selectedMap === team.permaban;

    const drillsRemaining = 3 - dailyActivities.individualDrills;
    const mapTrainingRemaining = dailyActivities.mapTraining ? 0 : 1;
    
    // Derived States for Staff Tab
    const headCoach = team.coaches.find(c => c.type === 'HEAD');
    const performanceCoaches = team.coaches.filter(c => c.type === 'PERFORMANCE');

    if (!team.isMapPoolInitialized) {
        // ... Wizard code ...
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
                <div className="max-w-4xl w-full bg-fm-card border border-fm-border rounded-xl shadow-2xl p-8">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold text-white mb-2">Map Pool Strategy</h2>
                        <p className="text-fm-muted">
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
                            
                            let statusColor = "border-fm-border opacity-60";
                            let statusText = "";
                            
                            if (isPermaban) { statusColor = "border-fm-red opacity-100 ring-2 ring-fm-red/50"; statusText = "BANNED"; }
                            else if (isFirstPick) { statusColor = "border-fm-green opacity-100 ring-2 ring-fm-green/50"; statusText = "PICK"; }
                            else if (isFocus) { statusColor = "border-fm-accent opacity-100 ring-2 ring-fm-accent/50"; statusText = "FOCUS"; }
                            else if (setupStep === 0) { statusColor = "border-fm-border hover:border-fm-red cursor-pointer opacity-100"; }
                            else if (setupStep === 1 && !isPermaban) { statusColor = "border-fm-border hover:border-fm-green cursor-pointer opacity-100"; }
                            else if (setupStep === 2 && !isPermaban && !isFirstPick) { statusColor = "border-fm-border hover:border-fm-accent cursor-pointer opacity-100"; }

                            return (
                                <div 
                                    key={map.id}
                                    onClick={() => handleWizardSelect(map.id)}
                                    className={`relative h-32 rounded-lg overflow-hidden border-2 transition-all ${statusColor}`}
                                >
                                    <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${map.img})` }}></div>
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                        <span className="text-xs font-bold text-white uppercase">{map.name}</span>
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
                                className="px-6 py-3 text-fm-muted hover:text-white font-bold"
                            >
                                Back
                            </button>
                        )}
                        {setupStep === 2 && (
                             <button 
                                onClick={() => onSetupComplete(permaban, firstPick, focusMaps)}
                                disabled={!canProceed}
                                className={`px-8 py-3 rounded font-black uppercase tracking-widest transition-all ${canProceed ? 'bg-fm-accent hover:bg-fm-accent-hover text-white' : 'bg-fm-bg text-gray-600 cursor-not-allowed'}`}
                            >
                                Finalize Pool
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Filter available players for coach assignment
    const availablePlayers = team.players.filter(p => 
        // Available if no coach assigned OR assigned to THIS coach is handled in render map
        !team.coaches.some(c => c.assignedPlayerId === p.id)
    );
    
    return (
        <div className="p-6 max-w-7xl mx-auto animate-fade-in">
            {/* HEADER */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-fm-card border border-fm-border rounded-xl text-fm-accent">
                        <Target size={28} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-white">Training Ground</h2>
                        <p className="text-fm-muted text-sm">Develop player skills and master the map pool.</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-6">
                    {/* Daily Limits UI */}
                    <div className="flex gap-3">
                         <div className={`px-4 py-2 rounded-lg border flex flex-col items-center justify-center ${mapTrainingRemaining > 0 ? 'bg-fm-bg border-fm-green text-fm-green' : 'bg-fm-bg/50 border-fm-border text-fm-muted'}`}>
                             <span className="text-[10px] uppercase font-bold">Map Session</span>
                             <span className="font-mono font-bold text-lg leading-none">{mapTrainingRemaining}/1</span>
                         </div>
                         <div className={`px-4 py-2 rounded-lg border flex flex-col items-center justify-center ${drillsRemaining > 0 ? 'bg-fm-bg border-fm-accent text-fm-accent' : 'bg-fm-bg/50 border-fm-border text-fm-muted'}`}>
                             <span className="text-[10px] uppercase font-bold">Drill Slots</span>
                             <span className="font-mono font-bold text-lg leading-none">{drillsRemaining}/3</span>
                         </div>
                    </div>

                    <div className="flex bg-fm-bg p-1 rounded-lg border border-fm-border">
                        <button 
                            onClick={() => setActiveTab('team')}
                            className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'team' ? 'bg-fm-card text-white shadow-sm border border-fm-border' : 'text-fm-muted hover:text-white'}`}
                        >
                            <Swords size={14} /> Team
                        </button>
                        <button 
                            onClick={() => setActiveTab('individual')}
                            className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'individual' ? 'bg-fm-card text-white shadow-sm border border-fm-border' : 'text-fm-muted hover:text-white'}`}
                        >
                            <Dumbbell size={14} /> Individual
                        </button>
                        <button 
                            onClick={() => setActiveTab('schedule')}
                            className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'schedule' ? 'bg-fm-card text-white shadow-sm border border-fm-border' : 'text-fm-muted hover:text-white'}`}
                        >
                            <Calendar size={14} /> Weekly
                        </button>
                        <button 
                            onClick={() => setActiveTab('staff')}
                            className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'staff' ? 'bg-fm-card text-white shadow-sm border border-fm-border' : 'text-fm-muted hover:text-white'}`}
                        >
                            <Briefcase size={14} /> Staff
                        </button>
                    </div>
                </div>
            </div>
            
            {/* DAILY LOCK INDICATOR */}
            {drillsRemaining === 0 && mapTrainingRemaining === 0 && activeTab !== 'schedule' && activeTab !== 'staff' && (
                 <div className="mb-6 flex items-center gap-2 bg-fm-red/10 border border-fm-red/30 px-4 py-3 rounded-lg text-fm-red w-full animate-fade-in">
                    <Lock size={18} />
                    <span className="font-bold uppercase tracking-wider text-sm">Facility Closed for the Day (All Slots Used)</span>
                </div>
            )}
            
            {/* REST DAY INDICATOR (Team Tab) */}
            {isRestDay && activeTab === 'team' && (
                 <div className="mb-6 flex items-center gap-2 bg-fm-card border border-fm-border px-4 py-3 rounded-lg text-fm-muted w-full animate-fade-in shadow-lg">
                    <BatteryCharging size={18} />
                    <span className="font-bold uppercase tracking-wider text-sm">Scheduled Rest Day - Training Grounds are Open for Viewing Only</span>
                </div>
            )}

            {/* STAFF TAB */}
            {activeTab === 'staff' && (
                <div className="animate-fade-in grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* HEAD COACH SECTION */}
                    <div className="bg-fm-card border border-fm-border rounded-xl shadow-lg p-6">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-fm-accent/20 rounded-lg flex items-center justify-center text-fm-accent">
                                <Brain size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">Head Coach</h3>
                                <p className="text-sm text-fm-muted">Automates map training and weekly schedule.</p>
                            </div>
                        </div>

                        {headCoach ? (
                            <div className="bg-fm-bg p-4 rounded-lg border border-fm-border">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                        HC
                                    </div>
                                    <div>
                                        <div className="font-bold text-white">{headCoach.name}</div>
                                        <div className="text-[10px] text-fm-green uppercase font-bold">Active Contract</div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3 bg-fm-card rounded border border-fm-border">
                                        <div>
                                            <div className="text-xs font-bold text-white">Auto Map Training</div>
                                            <div className="text-[10px] text-gray-500">Automatically trains priority maps daily</div>
                                        </div>
                                        <button 
                                            onClick={() => onToggleAutomation && onToggleAutomation('autoMapTraining')}
                                            className={`w-12 h-6 rounded-full transition-colors relative ${team.automationConfig.autoMapTraining ? 'bg-fm-green' : 'bg-gray-600'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${team.automationConfig.autoMapTraining ? 'left-7' : 'left-1'}`}></div>
                                        </button>
                                    </div>
                                    
                                    <div className="flex items-center justify-between p-3 bg-fm-card rounded border border-fm-border">
                                        <div>
                                            <div className="text-xs font-bold text-white">Auto Weekly Schedule</div>
                                            <div className="text-[10px] text-gray-500">Optimizes rest before match days (Mental {'>'} 70%)</div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {isProcessingSchedule && <Loader2 size={16} className="text-fm-accent animate-spin" />}
                                            <button 
                                                onClick={handleScheduleToggle}
                                                disabled={isProcessingSchedule}
                                                className={`w-12 h-6 rounded-full transition-colors relative ${team.automationConfig.autoSchedule ? 'bg-fm-green' : 'bg-gray-600'} ${isProcessingSchedule ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${team.automationConfig.autoSchedule ? 'left-7' : 'left-1'}`}></div>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 bg-fm-bg border border-dashed border-fm-border rounded-lg">
                                <Brain size={48} className="mx-auto text-fm-muted mb-4 opacity-50" />
                                <h4 className="text-lg font-bold text-white mb-2">No Head Coach</h4>
                                <button 
                                    onClick={() => onHireCoach && onHireCoach('HEAD')}
                                    className="px-6 py-2 bg-fm-accent hover:bg-fm-accent-hover text-white font-bold uppercase rounded text-xs"
                                >
                                    Hire Head Coach (Free)
                                </button>
                            </div>
                        )}
                    </div>

                    {/* PERFORMANCE COACHES SECTION */}
                    <div className="bg-fm-card border border-fm-border rounded-xl shadow-lg p-6">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-400">
                                <Users size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">Performance Coaches</h3>
                                <p className="text-sm text-fm-muted">Automates individual player drills (Balanced Mode).</p>
                            </div>
                        </div>

                        <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                            {performanceCoaches.length > 0 ? performanceCoaches.map((coach, i) => (
                                <div key={coach.id} className="bg-fm-bg p-4 rounded-lg border border-fm-border">
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="font-bold text-white">{coach.name}</div>
                                        <div className="text-[10px] bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded border border-blue-800">Performance</div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-3 mb-2">
                                        <div>
                                            <div className="text-xs text-fm-muted uppercase font-bold mb-1">Assigned To:</div>
                                            <select 
                                                value={coach.assignedPlayerId || ''}
                                                onChange={(e) => onAssignCoach && onAssignCoach(coach.id, e.target.value)}
                                                className="w-full bg-fm-card border border-fm-border text-white text-xs rounded px-2 py-1 outline-none focus:border-fm-accent"
                                            >
                                                <option value="">-- Unassigned --</option>
                                                {/* Assigned Player Option (always visible if selected) */}
                                                {coach.assignedPlayerId && team.players.find(p => p.id === coach.assignedPlayerId) && (
                                                    <option value={coach.assignedPlayerId}>{team.players.find(p => p.id === coach.assignedPlayerId)?.alias}</option>
                                                )}
                                                {/* Available Players */}
                                                {availablePlayers.map(p => (
                                                    <option key={p.id} value={p.id}>{p.alias}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <div className="text-xs text-fm-muted uppercase font-bold mb-1">Focus:</div>
                                            <select 
                                                value={coach.focus || 'LOWEST'}
                                                onChange={(e) => onCoachFocusChange && onCoachFocusChange(coach.id, e.target.value as any)}
                                                className="w-full bg-fm-card border border-fm-border text-white text-xs rounded px-2 py-1 outline-none focus:border-fm-accent"
                                            >
                                                <option value="LOWEST">Lowest Stat</option>
                                                <option value="ROLE">Role Specific</option>
                                                <option value="BALANCED">Balanced</option>
                                            </select>
                                        </div>
                                    </div>

                                    {coach.assignedPlayerId && (
                                        <div className="mt-2 text-[10px] text-gray-500 flex items-center gap-1">
                                            <CheckCircle size={10} className="text-fm-green" />
                                            Developing: {coach.focus || 'LOWEST'} stats.
                                        </div>
                                    )}
                                </div>
                            )) : (
                                <div className="text-center py-6 text-fm-muted text-sm italic">No performance coaches hired.</div>
                            )}
                            
                            <button 
                                onClick={() => onHireCoach && onHireCoach('PERFORMANCE')}
                                className="w-full py-3 border border-dashed border-fm-border text-fm-muted hover:text-white hover:border-fm-accent rounded-lg flex items-center justify-center gap-2 transition-colors uppercase font-bold text-xs"
                            >
                                <UserPlus size={14} /> Hire Performance Coach
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* WEEKLY SCHEDULE PLANNER (Revised UI) */}
            {activeTab === 'schedule' && (
                <div className="animate-fade-in relative">
                    {/* AUTOMATION BANNER */}
                    {team.automationConfig.autoSchedule && (
                         <div className="bg-fm-card border border-fm-border p-4 rounded-xl shadow-md mb-4 flex items-center justify-between">
                             <div className="flex items-center gap-3">
                                 <Lock size={20} className="text-fm-accent" />
                                 <div>
                                     <h3 className="text-sm font-bold text-white">Schedule Locked</h3>
                                     <p className="text-xs text-fm-muted">Managed by Head Coach. Disable in Staff tab to edit.</p>
                                 </div>
                             </div>
                         </div>
                    )}
                    
                    <div className="bg-fm-card border border-fm-border rounded-xl shadow-xl p-8 mb-6">
                        <div className="flex justify-between items-start mb-8">
                            <div className="flex items-center gap-4">
                                <div className="bg-fm-accent/10 p-3 rounded-full">
                                    <Calendar className="text-fm-accent" size={20} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black italic text-white">Weekly Plan</h3>
                                    <p className="text-fm-muted text-sm">Review upcoming intensity. High intensity on Match Days incurs performance penalties.</p>
                                </div>
                            </div>
                        </div>

                        {/* MENTAL STATUS OVERVIEW */}
                        <div className="bg-fm-bg rounded-lg border border-fm-border mb-8 p-4">
                             <h4 className="text-xs font-bold text-fm-muted uppercase tracking-widest mb-3 flex items-center gap-2">
                                 <Smile size={14} /> Team Mental Status
                             </h4>
                             <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                 {team.players.map(p => {
                                     let color = 'text-fm-green bg-fm-green/10 border-fm-green/30';
                                     if (p.morale < 50) color = 'text-fm-red bg-fm-red/10 border-fm-red/30';
                                     else if (p.morale < 80) color = 'text-fm-yellow bg-fm-yellow/10 border-fm-yellow/30';

                                     return (
                                         <div key={p.id} className={`p-2 rounded border ${color} flex flex-col items-center justify-center text-center`}>
                                             <div className="text-[10px] font-bold text-white truncate w-full mb-1">{p.alias}</div>
                                             <div className="font-mono font-bold text-lg leading-none">
                                                 {p.morale}%
                                             </div>
                                             {p.morale < 50 && <span className="text-[8px] uppercase font-bold mt-1">TILTED</span>}
                                         </div>
                                     )
                                 })}
                             </div>
                        </div>

                        {/* PLANNER GRID */}
                        <div className="grid grid-cols-7 gap-2">
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayName, index) => {
                                // FIXED DATE LOGIC: Show Current Week from Mon-Sun based on currentDate
                                const currentDayIndex = (currentDate.getDay() + 6) % 7; // Mon=0, Sun=6
                                const dayDate = new Date(currentDate);
                                dayDate.setDate(currentDate.getDate() - currentDayIndex + index);
                                
                                const match = schedule.find(m => !m.isPlayed && new Date(m.date).toDateString() === dayDate.toDateString());
                                const isMatchDay = !!match;
                                const isToday = index === currentDayIndex;
                                const currentIntensity = team.weeklySchedule[index] || TrainingIntensity.MEDIUM;

                                // NEW COLOR PALETTE
                                // DEFAULT: REST (Dark)
                                let borderColor = "border-fm-border";
                                let headerColor = "text-fm-muted";
                                let icon = <BatteryCharging size={24} className="text-fm-muted opacity-50" />;
                                let xpText = "0 XP";
                                let menText = "+10 Men";
                                let intensityLabel = "REST";
                                let intensityColor = "text-fm-muted";

                                if (currentIntensity === TrainingIntensity.LIGHT) {
                                    borderColor = "border-fm-green";
                                    headerColor = "text-fm-green";
                                    icon = <Activity size={24} className="text-fm-green" />;
                                    xpText = "~40 XP";
                                    menText = "+5 Men";
                                    intensityLabel = "LIGHT";
                                    intensityColor = "text-fm-green";
                                } else if (currentIntensity === TrainingIntensity.MEDIUM) {
                                    borderColor = "border-blue-500";
                                    headerColor = "text-blue-500";
                                    icon = <Dumbbell size={24} className="text-blue-500" />;
                                    xpText = "~80 XP";
                                    menText = "-5 Men";
                                    intensityLabel = "MEDIUM";
                                    intensityColor = "text-blue-400";
                                } else if (currentIntensity === TrainingIntensity.HEAVY) {
                                    borderColor = "border-orange-500";
                                    headerColor = "text-orange-500";
                                    icon = <Flame size={24} className="text-orange-500" />;
                                    xpText = "~150 XP";
                                    menText = "-15 Men";
                                    intensityLabel = "HEAVY";
                                    intensityColor = "text-orange-400";
                                }

                                return (
                                    <div key={index} className={`relative flex flex-col h-full ${isToday ? 'opacity-100' : 'opacity-80 hover:opacity-100 transition-opacity'}`}>
                                        
                                        <div className={`bg-fm-bg border rounded-xl p-3 h-full flex flex-col transition-all hover:brightness-110 ${isToday ? 'ring-2 ring-fm-accent ring-offset-2 ring-offset-fm-bg shadow-xl z-10 border-fm-accent' : borderColor}`}>
                                            
                                            {/* Header */}
                                            <div className="flex justify-between items-center mb-3">
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${headerColor}`}>{dayName}</span>
                                                {isToday && <span className="text-[8px] font-bold bg-fm-accent text-white px-1.5 py-0.5 rounded">TODAY</span>}
                                            </div>

                                            {/* Center Icon */}
                                            <div className="flex-1 flex flex-col items-center justify-center gap-2 mb-2">
                                                {isMatchDay ? (
                                                     <div className="bg-fm-red w-full py-3 rounded flex flex-col items-center justify-center text-white shadow-lg animate-pulse">
                                                         <Swords size={20} className="mb-1" />
                                                         <span className="text-[10px] font-black uppercase">MATCH DAY</span>
                                                     </div>
                                                ) : (
                                                    <div className="h-12 flex items-center justify-center">
                                                        {icon}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Selector / Status */}
                                            <div className="flex flex-col gap-2 mt-auto">
                                                 <div className={`text-xs font-black text-center py-2 rounded bg-fm-card border border-fm-border uppercase tracking-widest ${intensityColor}`}>
                                                    {intensityLabel}
                                                 </div>
                                                 
                                                 {/* Edit Controls (Hidden if automated) */}
                                                 {!team.automationConfig.autoSchedule && (
                                                     <div className="grid grid-cols-4 gap-1 mt-1">
                                                         <button onClick={() => onUpdateSchedule(index, TrainingIntensity.REST)} className="h-1.5 bg-gray-600 rounded-full hover:bg-white transition-colors" title="Rest"></button>
                                                         <button onClick={() => onUpdateSchedule(index, TrainingIntensity.LIGHT)} className="h-1.5 bg-fm-green rounded-full hover:bg-white transition-colors" title="Light"></button>
                                                         <button onClick={() => onUpdateSchedule(index, TrainingIntensity.MEDIUM)} className="h-1.5 bg-blue-600 rounded-full hover:bg-white transition-colors" title="Medium"></button>
                                                         <button onClick={() => onUpdateSchedule(index, TrainingIntensity.HEAVY)} className="h-1.5 bg-orange-600 rounded-full hover:bg-white transition-colors" title="Heavy"></button>
                                                     </div>
                                                 )}
                                            </div>

                                            {/* Stats Footer */}
                                            <div className="mt-3 pt-2 border-t border-white/5 text-[9px] font-mono flex justify-between text-fm-muted">
                                                <span>{xpText}</span>
                                                <span className={menText.includes('+') ? 'text-fm-green' : 'text-fm-red'}>{menText}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* INDIVIDUAL TRAINING */}
            {activeTab === 'individual' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in relative">
                    {/* Player List */}
                    <div className="lg:col-span-1 bg-fm-card border border-fm-border rounded-xl overflow-hidden shadow-lg">
                        <div className="bg-fm-card-hover px-4 py-3 border-b border-fm-border">
                            <h3 className="text-xs font-bold text-white uppercase tracking-widest">Select Player</h3>
                        </div>
                        <div className="divide-y divide-fm-border/50">
                            {team.players.map(p => {
                                const coach = team.coaches.find(c => c.assignedPlayerId === p.id);
                                return (
                                    <button 
                                        key={p.id}
                                        onClick={() => setSelectedPlayerId(p.id)}
                                        className={`w-full p-4 flex items-center justify-between hover:bg-fm-card-hover transition-colors ${selectedPlayerId === p.id ? 'bg-fm-accent/10 border-l-2 border-fm-accent' : ''}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <CountryFlag countryCode={p.country} />
                                            <div className="text-left">
                                                <div className={`font-bold text-sm ${selectedPlayerId === p.id ? 'text-white' : 'text-fm-muted'}`}>{p.alias}</div>
                                                {coach && <div className="text-[9px] text-blue-400 font-bold flex items-center gap-1"><User size={8} /> {coach.name}</div>}
                                            </div>
                                        </div>
                                        <ChevronRight size={16} className={`transition-opacity ${selectedPlayerId === p.id ? 'opacity-100 text-fm-accent' : 'opacity-0'}`} />
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Drill Selection & Stats */}
                    <div className="lg:col-span-2 bg-fm-card border border-fm-border rounded-xl shadow-lg p-6 relative">
                        {selectedPlayer ? (
                            <>
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-fm-bg rounded-lg flex items-center justify-center font-bold text-xl text-fm-muted border border-fm-border overflow-hidden relative">
                                            {selectedPlayer.imageUrl ? (
                                                <img src={selectedPlayer.imageUrl} alt={selectedPlayer.alias} className="w-full h-full object-cover" />
                                            ) : (
                                                selectedPlayer.alias.charAt(0)
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black text-white">{selectedPlayer.alias}</h3>
                                            <div className="text-xs font-bold text-fm-accent uppercase tracking-wide">{selectedPlayer.role}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] text-fm-muted uppercase font-bold">Rating</div>
                                        <div className="text-2xl font-mono font-bold text-fm-green">
                                            {((selectedPlayer.stats.aim + selectedPlayer.stats.reflex + selectedPlayer.stats.strategy + selectedPlayer.stats.utility)/4).toFixed(0)}
                                        </div>
                                    </div>
                                </div>

                                {/* Stats/XP Overview - ALWAYS VISIBLE */}
                                <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-8 bg-fm-bg p-4 rounded-lg border border-fm-border">
                                    <XPBar label="Aim" level={selectedPlayer.stats.aim} xp={selectedPlayer.xp?.aim || 0} requiredXp={500 + (selectedPlayer.stats.aim * 50)} color="text-fm-yellow" />
                                    <XPBar label="Reflex" level={selectedPlayer.stats.reflex} xp={selectedPlayer.xp?.reflex || 0} requiredXp={500 + (selectedPlayer.stats.reflex * 50)} color="text-fm-red" />
                                    <XPBar label="Strategy" level={selectedPlayer.stats.strategy} xp={selectedPlayer.xp?.strategy || 0} requiredXp={500 + (selectedPlayer.stats.strategy * 50)} color="text-fm-accent" />
                                    <XPBar label="Utility" level={selectedPlayer.stats.utility} xp={selectedPlayer.xp?.utility || 0} requiredXp={500 + (selectedPlayer.stats.utility * 50)} color="text-blue-400" />
                                    <XPBar label="Teamwork" level={selectedPlayer.stats.teamwork} xp={selectedPlayer.xp?.teamwork || 0} requiredXp={500 + (selectedPlayer.stats.teamwork * 50)} color="text-fm-green" />
                                    <XPBar label="Clutch" level={selectedPlayer.stats.clutch} xp={selectedPlayer.xp?.clutch || 0} requiredXp={500 + (selectedPlayer.stats.clutch * 50)} color="text-purple-400" />
                                </div>

                                <h4 className="text-xs font-bold text-fm-muted uppercase tracking-widest mb-4 flex items-center justify-between">
                                    Assign Drill
                                    <span className={`${drillsRemaining > 0 ? 'text-fm-accent' : 'text-fm-red'} text-[10px]`}>{drillsRemaining} slots remaining</span>
                                </h4>
                                
                                {/* DRILL GRID WITH LOCK OVERLAY */}
                                <div className="relative">
                                    {team.coaches.some(c => c.assignedPlayerId === selectedPlayer.id) && (
                                         <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-[1px] flex items-center justify-center rounded-xl">
                                             <div className="bg-fm-card border border-fm-border p-4 rounded-xl shadow-2xl flex flex-col items-center gap-2">
                                                 <User size={24} className="text-blue-400" />
                                                 <div className="text-center">
                                                     <h3 className="text-sm font-bold text-white">Managed by Coach</h3>
                                                     <p className="text-[10px] text-fm-muted">Unassign coach to train manually.</p>
                                                 </div>
                                             </div>
                                         </div>
                                    )}
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {DRILLS.map(drill => (
                                            <button
                                                key={drill.id}
                                                onClick={() => onIndividualTrain(selectedPlayer.id, drill.id)}
                                                disabled={drillsRemaining <= 0}
                                                className={`p-4 border rounded-xl text-left transition-all relative overflow-hidden group
                                                    ${drillsRemaining <= 0 
                                                        ? 'bg-fm-bg border-fm-border opacity-50 cursor-not-allowed' 
                                                        : 'bg-fm-bg border-fm-border hover:border-fm-accent hover:bg-fm-card-hover'}`}
                                            >
                                                <div className="relative z-10">
                                                    <div className="font-bold text-white text-sm mb-1 group-hover:text-fm-accent transition-colors">{drill.name}</div>
                                                    <div className="text-[10px] text-fm-muted font-mono uppercase mb-2">{drill.desc}</div>
                                                    <div className="flex gap-2 mt-2">
                                                        <span className="text-[9px] bg-fm-card px-2 py-1 rounded border border-fm-border text-gray-300">
                                                            XP: 400-600
                                                        </span>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-fm-muted">
                                <p>Select a player to view development</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* MAP PRACTICE (TEAM) */}
            {activeTab === 'team' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in relative">
                    {/* MAP SELECTION GRID */}
                    <div className="lg:col-span-1 space-y-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                            <Swords className="text-fm-accent" size={18} /> Map Pool
                        </h3>
                        <div className="grid grid-cols-1 gap-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                            {MAP_POOL.map((map) => {
                                const proficiency = getProficiency(map.id);
                                const isSelected = selectedMap === map.id;
                                const isFP = team.firstPickMap === map.id;
                                const isPB = team.permaban === map.id;

                                return (
                                    <button 
                                        key={map.id}
                                        onClick={() => setSelectedMap(map.id)}
                                        className={`relative group h-16 rounded-lg overflow-hidden border transition-all shadow-md text-left flex items-center ${isSelected ? 'border-fm-accent ring-1 ring-fm-accent/50' : 'border-fm-border hover:border-gray-500'}`}
                                    >
                                        <div 
                                            className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105 opacity-30"
                                            style={{ backgroundImage: `url(${map.img})` }}
                                        ></div>
                                        <div className="absolute inset-0 bg-gradient-to-r from-fm-card via-fm-card/80 to-transparent"></div>
                                        
                                        <div className="relative z-10 pl-4 flex items-center justify-between w-full pr-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded bg-fm-bg flex items-center justify-center font-black text-sm border border-fm-border ${map.logoColor}`}>
                                                    {map.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-white uppercase tracking-tight flex items-center gap-2 text-sm">
                                                        {map.name}
                                                        {isFP && <span className="text-[8px] bg-fm-green/20 text-fm-green px-1 rounded border border-fm-green/50">PICK</span>}
                                                        {isPB && <span className="text-[8px] bg-fm-red/20 text-fm-red px-1 rounded border border-fm-red/50">BAN</span>}
                                                    </div>
                                                    <div className={`text-[10px] font-bold ${proficiency > 50 ? 'text-fm-green' : 'text-fm-muted'}`}>
                                                        {proficiency}% Mastery
                                                    </div>
                                                </div>
                                            </div>
                                            {isSelected && <CheckCircle size={16} className="text-fm-accent" />}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* TRAINING AREA */}
                    <div className="lg:col-span-2">
                        <div className="bg-fm-card border border-fm-border rounded-xl shadow-xl overflow-hidden h-full flex flex-col">
                            {selectedMap ? (
                                <>
                                    <div className="h-48 w-full bg-cover bg-center relative" style={{ backgroundImage: `url(${MAP_POOL.find(m => m.id === selectedMap)?.img})` }}>
                                         <div className="absolute inset-0 bg-gradient-to-b from-transparent via-fm-card/80 to-fm-card"></div>
                                         <div className="absolute bottom-0 left-0 p-6 w-full">
                                            <div className="flex justify-between items-end">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        {isFirstPickSelected && <span className="bg-fm-green text-black text-[10px] font-black px-2 py-0.5 rounded uppercase">First Pick</span>}
                                                        {isPermabanSelected && <span className="bg-fm-red text-white text-[10px] font-black px-2 py-0.5 rounded uppercase">Permaban</span>}
                                                    </div>
                                                    <h4 className="text-5xl font-black text-white italic uppercase tracking-tighter drop-shadow-lg">
                                                        {MAP_POOL.find(m => m.id === selectedMap)?.name}
                                                    </h4>
                                                    <p className="text-gray-300 text-xs max-w-md mt-1">{MAP_POOL.find(m => m.id === selectedMap)?.desc}</p>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-[10px] font-bold text-fm-muted uppercase tracking-widest mb-1">Proficiency</div>
                                                    <div className="text-4xl font-mono font-bold text-white">{getProficiency(selectedMap)}%</div>
                                                </div>
                                            </div>
                                         </div>
                                    </div>
                                    
                                    <div className="p-6">
                                        {selectedMapWarnings.length > 0 && (
                                            <div className="mb-6 flex flex-col gap-2">
                                                {selectedMapWarnings.map((w, i) => (
                                                    <div key={i} className={`p-2 rounded border flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide
                                                        ${w.type === 'fatigue' ? 'bg-fm-red/10 border-fm-red/50 text-fm-red' : 
                                                          w.type === 'cap' ? 'bg-fm-bg border-fm-border text-fm-muted' :
                                                          'bg-fm-yellow/10 border-fm-yellow/50 text-fm-yellow'}`}>
                                                        {w.type === 'fatigue' ? <Flame size={12} /> : <AlertTriangle size={12} />}
                                                        {w.text}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <h5 className="text-xs font-bold text-fm-muted uppercase tracking-widest mb-4 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Activity size={14} /> Training Modules
                                            </div>
                                            <span className={`${mapTrainingRemaining > 0 ? 'text-fm-green' : 'text-fm-red'} text-[10px]`}>{mapTrainingRemaining} session remaining</span>
                                        </h5>
                                        
                                        {/* TRAINING MODULES GRID WITH LOCK */}
                                        <div className="relative">
                                            {team.automationConfig.autoMapTraining && (
                                                 <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-[1px] flex items-center justify-center rounded-xl">
                                                     <div className="bg-fm-card border border-fm-border p-4 rounded-xl shadow-2xl flex flex-col items-center gap-2">
                                                         <Brain size={24} className="text-fm-accent" />
                                                         <div className="text-center">
                                                             <h3 className="text-sm font-bold text-white">Managed by Head Coach</h3>
                                                             <p className="text-[10px] text-fm-muted">Disable auto-training to manage manually.</p>
                                                         </div>
                                                     </div>
                                                 </div>
                                            )}

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {['pistol', 'ct', 't', 'strat'].map(type => (
                                                    <div key={type} className="bg-fm-bg p-4 rounded-lg border border-fm-border hover:border-gray-600 transition-colors">
                                                        <div className="flex justify-between items-center mb-3">
                                                            <div className="flex items-center gap-2">
                                                                {type === 'pistol' && <Crosshair size={16} className="text-gray-400" />}
                                                                {type === 'ct' && <Shield size={16} className="text-blue-400" />}
                                                                {type === 't' && <Swords size={16} className="text-fm-yellow" />}
                                                                {type === 'strat' && <Brain size={16} className="text-fm-accent" />}
                                                                
                                                                <span className="text-sm font-bold text-gray-200 capitalize">
                                                                    {type === 'strat' ? 'Analysis' : type === 'ct' ? 'CT Setup' : type === 't' ? 'T Executes' : 'Pistol Rounds'}
                                                                </span>
                                                            </div>
                                                            <span className="text-xs font-mono font-bold text-fm-muted">{getSubStats(selectedMap)[type as keyof MapPracticeStats]}%</span>
                                                        </div>
                                                        <button 
                                                            onClick={() => onTrain(selectedMap, type as keyof MapPracticeStats)} 
                                                            disabled={mapTrainingRemaining <= 0 || team.automationConfig.autoMapTraining || isRestDay} 
                                                            className={`w-full py-2 text-[10px] font-bold uppercase rounded flex items-center justify-center gap-2
                                                                ${mapTrainingRemaining <= 0 || team.automationConfig.autoMapTraining || isRestDay 
                                                                    ? 'bg-fm-card text-fm-muted cursor-not-allowed border border-fm-border' 
                                                                    : 'bg-fm-card-hover hover:bg-fm-accent hover:text-white text-fm-muted border border-fm-border'}`}
                                                        >
                                                            {isRestDay ? (
                                                                <>
                                                                    <Lock size={12} /> Scheduled Rest
                                                                </>
                                                            ) : (
                                                                "Train"
                                                            )}
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full p-12 text-fm-muted">
                                    <Target size={64} className="mb-4 opacity-10" />
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