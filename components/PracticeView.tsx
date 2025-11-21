import React, { useState } from 'react';
import { Team, MapPracticeStats } from '../types';
import { Target, Swords, Zap, Brain, CheckCircle, Lock, Activity, Users, AlertTriangle, Flame, Crosshair, Shield, Dumbbell } from 'lucide-react';

interface PracticeViewProps {
  team: Team;
  onTrain: (mapId: string, skill: keyof MapPracticeStats) => void;
  onSetupComplete: (permaban: string, firstPick: string, focusMaps: string[]) => void;
  isTrainingDoneToday: boolean;
}

// HLTV static images for maps
const MAP_POOL = [
    { 
        id: 'Dust2', 
        name: 'Dust 2', 
        img: 'https://www.hltv.org/img/static/statsmatchmaps/dust2.png', 
        desc: 'The classic. Aim heavy, simple layout.',
        logoColor: 'text-yellow-500'
    },
    { 
        id: 'Mirage', 
        name: 'Mirage', 
        img: 'https://www.hltv.org/img/static/statsmatchmaps/mirage.png', 
        desc: 'Balanced middle. Execution heavy.',
        logoColor: 'text-orange-500'
    },
    { 
        id: 'Inferno', 
        name: 'Inferno', 
        img: 'https://www.hltv.org/img/static/statsmatchmaps/inferno.png', 
        desc: 'Narrow chokepoints. Utility king.',
        logoColor: 'text-blue-500'
    },
    { 
        id: 'Nuke', 
        name: 'Nuke', 
        img: 'https://www.hltv.org/img/static/statsmatchmaps/nuke.png', 
        desc: 'Vertical gameplay. Rotation speed.',
        logoColor: 'text-yellow-400'
    },
    { 
        id: 'Train', 
        name: 'Train', 
        img: 'https://www.hltv.org/img/static/statsmatchmaps/train.png', 
        desc: 'Long angles. AWP dominance.',
        logoColor: 'text-green-600'
    },
    { 
        id: 'Overpass', 
        name: 'Overpass', 
        img: 'https://www.hltv.org/img/static/statsmatchmaps/overpass.png', 
        desc: 'Complex rotations. CT Aggression.',
        logoColor: 'text-orange-400'
    },
    { 
        id: 'Ancient', 
        name: 'Ancient', 
        img: 'https://www.hltv.org/img/static/statsmatchmaps/ancient.png', 
        desc: 'Green maze. Close quarters.',
        logoColor: 'text-green-500'
    }
];

export const PracticeView: React.FC<PracticeViewProps> = ({ team, onTrain, onSetupComplete, isTrainingDoneToday }) => {
    const [activeTab, setActiveTab] = useState<'team' | 'individual'>('team');
    const [selectedMap, setSelectedMap] = useState<string | null>(null);

    // Wizard State
    const [setupStep, setSetupStep] = useState<number>(0); // 0: Permaban, 1: First Pick, 2: Focus
    const [permaban, setPermaban] = useState<string>('');
    const [firstPick, setFirstPick] = useState<string>('');
    const [focusMaps, setFocusMaps] = useState<string[]>([]);

    if (!team.isMapPoolInitialized) {
        // WIZARD RENDER
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
        if (proficiency >= 70) warnings.push({ type: 'hard', text: "Diminished Returns: +0.2% gain" });
        else if (proficiency >= 50) warnings.push({ type: 'soft', text: "Diminished Returns: +0.5% gain" });

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

    const SkillBar = ({ label, value, icon: Icon, color, onTrainClick, isDisabled }: { label: string, value: number, icon: any, color: string, onTrainClick: () => void, isDisabled: boolean }) => (
        <div className="bg-gray-900/50 p-4 rounded border border-gray-800 hover:border-gray-700 transition-colors">
            <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded bg-gray-800 ${color}`}>
                        <Icon size={16} />
                    </div>
                    <span className="text-sm font-bold text-gray-200">{label}</span>
                </div>
                <span className="text-xs font-mono font-bold text-gray-400">{value}%</span>
            </div>
            <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden mb-3">
                <div className={`h-full rounded-full ${color.replace('text-', 'bg-')}`} style={{ width: `${value}%` }}></div>
            </div>
            <button 
                onClick={onTrainClick}
                disabled={isDisabled}
                className={`w-full py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-colors ${
                    isDisabled 
                    ? 'bg-gray-800 text-gray-600 cursor-not-allowed' 
                    : 'bg-gray-700 hover:bg-cs-yellow hover:text-black text-white'
                }`}
            >
                Train
            </button>
        </div>
    );

    const selectedMapWarnings = selectedMap ? getMapWarnings(selectedMap) : [];
    const isFirstPickSelected = selectedMap === team.firstPickMap;
    const isPermabanSelected = selectedMap === team.permaban;

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
                </div>
            </div>
            
            {/* DAILY LOCK INDICATOR */}
            {isTrainingDoneToday && (
                 <div className="mb-6 flex items-center gap-2 bg-red-900/20 border border-red-800/50 px-4 py-3 rounded-lg text-red-400 w-full animate-fade-in">
                    <Lock size={18} />
                    <span className="font-bold uppercase tracking-wider">Facility Closed for the Day (Practice Complete)</span>
                </div>
            )}

            {/* INDIVIDUAL TRAINING (LOCKED) */}
            {activeTab === 'individual' && (
                <div className="flex flex-col items-center justify-center h-[400px] bg-cs-dark border border-gray-800 rounded-xl shadow-xl p-8 relative overflow-hidden animate-fade-in">
                    <div className="absolute inset-0 bg-[url('https://www.hltv.org/img/static/statsmatchmaps/train.png')] bg-cover bg-center opacity-5 grayscale pointer-events-none"></div>
                    
                    <div className="bg-gray-900/80 p-6 rounded-full border-2 border-dashed border-gray-700 mb-6">
                        <Lock size={48} className="text-gray-500" />
                    </div>
                    
                    <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Individual Training Locked</h3>
                    <p className="text-gray-400 text-center max-w-md mb-6">
                        This facility is under renovation. You will soon be able to assign specific aim routines and utility drills to individual players.
                    </p>
                    
                    <div className="text-xs font-bold text-gray-600 uppercase tracking-widest border border-gray-800 px-4 py-2 rounded bg-gray-900">
                        Coming Soon
                    </div>
                </div>
            )}

            {/* MAP PRACTICE (EXISTING LOGIC) */}
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

                                        <h5 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <Activity size={16} /> Training Modules
                                        </h5>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <SkillBar 
                                                label="Pistol Rounds" 
                                                value={getSubStats(selectedMap).pistol} 
                                                icon={Crosshair} 
                                                color="text-gray-300" 
                                                onTrainClick={() => onTrain(selectedMap, 'pistol')}
                                                isDisabled={isTrainingDoneToday}
                                            />
                                            <SkillBar 
                                                label="CT Side Setup" 
                                                value={getSubStats(selectedMap).ct} 
                                                icon={Shield} 
                                                color="text-blue-400" 
                                                onTrainClick={() => onTrain(selectedMap, 'ct')}
                                                isDisabled={isTrainingDoneToday}
                                            />
                                            <SkillBar 
                                                label="T Side Executes" 
                                                value={getSubStats(selectedMap).t} 
                                                icon={Swords} 
                                                color="text-cs-yellow" 
                                                onTrainClick={() => onTrain(selectedMap, 't')}
                                                isDisabled={isTrainingDoneToday}
                                            />
                                            <SkillBar 
                                                label="Analyze Top Teams" 
                                                value={getSubStats(selectedMap).strat} 
                                                icon={Brain} 
                                                color="text-purple-400" 
                                                onTrainClick={() => onTrain(selectedMap, 'strat')}
                                                isDisabled={isTrainingDoneToday}
                                            />
                                        </div>
                                        <div className="mt-6 bg-blue-900/20 border border-blue-800/50 p-4 rounded-lg text-xs text-center text-gray-400 italic">
                                            <p className="mb-1">
                                                <span className="font-bold text-blue-400">Pro Tip:</span> Rotate your map training.
                                            </p>
                                            Training the same map 5 days in a row causes Fatigue (50% reduced gains).
                                            Proficiency gains slow down significantly after 50% and 70%.
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