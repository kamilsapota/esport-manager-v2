
import React, { useState, useEffect } from 'react';
import { Team } from '../types';
import { Shield, Ban, CheckCircle, Play, Check, Flame } from 'lucide-react';

interface MapVetoProps {
    userTeam: Team;
    enemyTeam: Team;
    onComplete: (maps: string[]) => void;
    bestOf: 1 | 3;
}

const MAP_POOL = [
    { id: 'Dust2', name: 'Dust 2', img: 'https://www.hltv.org/img/static/statsmatchmaps/dust2.png' },
    { id: 'Mirage', name: 'Mirage', img: 'https://www.hltv.org/img/static/statsmatchmaps/mirage.png' },
    { id: 'Inferno', name: 'Inferno', img: 'https://www.hltv.org/img/static/statsmatchmaps/inferno.png' },
    { id: 'Nuke', name: 'Nuke', img: 'https://www.hltv.org/img/static/statsmatchmaps/nuke.png' },
    { id: 'Train', name: 'Train', img: 'https://www.hltv.org/img/static/statsmatchmaps/train.png' },
    { id: 'Overpass', name: 'Overpass', img: 'https://www.hltv.org/img/static/statsmatchmaps/overpass.png' },
    { id: 'Ancient', name: 'Ancient', img: 'https://www.hltv.org/img/static/statsmatchmaps/ancient.png' }
];

export const MapVeto: React.FC<MapVetoProps> = ({ userTeam, enemyTeam, onComplete, bestOf = 1 }) => {
    const [bannedMaps, setBannedMaps] = useState<string[]>([]);
    const [pickedMaps, setPickedMaps] = useState<string[]>([]); // BO3: [UserPick, EnemyPick, Decider] | BO1: [PlayedMap]
    const [turn, setTurn] = useState<'user' | 'enemy'>('user');
    const [stepIndex, setStepIndex] = useState(0); 
    const [actionLog, setActionLog] = useState<string[]>([]);
    const [isComplete, setIsComplete] = useState(false);

    const getStats = (team: Team, mapId: string) => team.mapStats?.[mapId] || 0;

    // --- LOGIC HELPERS ---
    
    // BO1: 6 steps (0-5) are all BANs. Step 6 is auto-decide.
    // BO3: Steps 0,1,4,5 are BANS. Steps 2,3 are PICKS. Step 6 is auto-decide.
    
    const getCurrentPhaseType = (step: number): 'BAN' | 'PICK' | 'DECIDER' => {
        if (bestOf === 1) {
            return step < 6 ? 'BAN' : 'DECIDER';
        } else {
            if (step === 6) return 'DECIDER';
            if (step === 2 || step === 3) return 'PICK';
            return 'BAN';
        }
    };

    const currentPhase = getCurrentPhaseType(stepIndex);

    useEffect(() => {
        // AUTO DECIDER LOGIC (Happens at step 6 for both BO1 and BO3)
        if (stepIndex === 6 && !isComplete) {
            const remaining = MAP_POOL.find(m => !bannedMaps.includes(m.id) && !pickedMaps.includes(m.id));
            
            if (remaining) {
                let finalMaps: string[] = [];
                if (bestOf === 1) {
                    finalMaps = [remaining.id];
                    setActionLog(prev => [`${remaining.name} is the map to be played`, ...prev]);
                } else {
                    finalMaps = [...pickedMaps, remaining.id];
                    setActionLog(prev => [`${remaining.name} remains as the DECIDER map`, ...prev]);
                }
                setPickedMaps(finalMaps);
                setIsComplete(true);
            }
            return;
        }

        if (turn === 'enemy' && !isComplete) {
            const timer = setTimeout(() => {
                handleAiTurn();
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [turn, stepIndex, bannedMaps, pickedMaps, isComplete, bestOf]);

    const handleAiTurn = () => {
        const availableMaps = MAP_POOL.filter(m => !bannedMaps.includes(m.id) && !pickedMaps.includes(m.id));
        let selectedMap: typeof MAP_POOL[0] | undefined;

        if (currentPhase === 'BAN') {
            // BAN LOGIC: 
            // 1. If enemy has a permaban available, ban it.
            if (enemyTeam.permaban && !bannedMaps.includes(enemyTeam.permaban) && !pickedMaps.includes(enemyTeam.permaban)) {
                selectedMap = availableMaps.find(m => m.id === enemyTeam.permaban);
            }

            // 2. Otherwise ban map where User has biggest advantage
            if (!selectedMap) {
                let maxDanger = -Infinity;
                availableMaps.forEach(m => {
                    const userStat = getStats(userTeam, m.id);
                    const enemyStat = getStats(enemyTeam, m.id);
                    const danger = userStat - enemyStat;
                    if (danger > maxDanger) {
                        maxDanger = danger;
                        selectedMap = m;
                    }
                });
            }
        } else {
            // PICK LOGIC (Only BO3): Pick best available map for Enemy
            let maxStrength = -Infinity;
            availableMaps.forEach(m => {
                const enemyStat = getStats(enemyTeam, m.id);
                const userStat = getStats(userTeam, m.id);
                // Strength = My stat minus user stat (weighted)
                const strength = enemyStat - (userStat * 0.5); 
                if (strength > maxStrength) {
                    maxStrength = strength;
                    selectedMap = m;
                }
            });
        }

        // Fallback
        if (!selectedMap) selectedMap = availableMaps[0];

        if (selectedMap) {
            if (currentPhase === 'BAN') {
                setBannedMaps(prev => [...prev, selectedMap!.id]);
                setActionLog(prev => [`${enemyTeam.name} BANNED ${selectedMap!.name}`, ...prev]);
            } else {
                setPickedMaps(prev => [...prev, selectedMap!.id]);
                setActionLog(prev => [`${enemyTeam.name} PICKED ${selectedMap!.name}`, ...prev]);
            }
            advanceTurn();
        }
    };

    const handleUserAction = (mapId: string) => {
        if (turn !== 'user' || isComplete) return;
        if (bannedMaps.includes(mapId) || pickedMaps.includes(mapId)) return;

        if (currentPhase === 'BAN') {
            setBannedMaps(prev => [...prev, mapId]);
            setActionLog(prev => [`You BANNED ${MAP_POOL.find(m => m.id === mapId)?.name}`, ...prev]);
        } else {
            setPickedMaps(prev => [...prev, mapId]);
            setActionLog(prev => [`You PICKED ${MAP_POOL.find(m => m.id === mapId)?.name}`, ...prev]);
        }
        advanceTurn();
    };

    const advanceTurn = () => {
        const nextStep = stepIndex + 1;
        setStepIndex(nextStep);
        
        // BO1 Sequence: 0(U), 1(E), 2(U), 3(E), 4(U), 5(E)
        // BO3 Sequence: 0(U), 1(E), 2(U-Pick), 3(E-Pick), 4(U), 5(E)
        
        // Simple modulo for turn doesn't work perfectly if logic changes, but standard is strict alternation
        if (nextStep % 2 !== 0) {
            setTurn('enemy');
        } else {
            setTurn('user');
        }
    };

    return (
        <div className="min-h-full bg-fm-bg p-6 flex flex-col items-center animate-fade-in pb-20">
            <div className="text-center mb-6">
                <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter mb-2">
                    Map Veto ({bestOf === 1 ? 'Bo1' : 'Bo3'})
                </h2>
                <p className="text-fm-muted text-sm">
                    {bestOf === 1 ? 'Ban until one map remains.' : 'Ban-Ban-Pick-Pick-Ban-Ban-Decider.'}
                </p>
            </div>

            {/* STATUS BAR */}
            <div className="w-full max-w-5xl bg-fm-card border border-fm-border rounded-xl p-4 mb-8 flex justify-between items-center shadow-lg sticky top-0 z-20">
                <div className={`flex items-center gap-3 ${turn === 'user' && !isComplete ? 'opacity-100' : 'opacity-50'}`}>
                    <Shield className="text-fm-accent" />
                    <div className="text-left">
                        <div className="text-[10px] text-fm-muted uppercase font-bold">Your Team</div>
                        <div className={`font-bold text-sm ${turn === 'user' && !isComplete ? 'text-white' : 'text-fm-muted'}`}>
                            {turn === 'user' && !isComplete ? (currentPhase === 'PICK' ? 'Your Pick' : 'Your Ban') : 'Waiting...'}
                        </div>
                    </div>
                </div>
                
                <div className="flex flex-col items-center">
                    <div className="text-lg font-black text-white uppercase tracking-widest">
                        {isComplete ? 'VETO COMPLETE' : `${currentPhase} PHASE`}
                    </div>
                    <div className="flex gap-1 mt-1">
                        {Array.from({length: 6}).map((_, i) => (
                            <div key={i} className={`w-2 h-2 rounded-full ${i < stepIndex ? 'bg-fm-green' : 'bg-fm-bg border border-fm-border'}`}></div>
                        ))}
                    </div>
                </div>

                <div className={`flex items-center gap-3 ${turn === 'enemy' && !isComplete ? 'opacity-100' : 'opacity-50'}`}>
                    <div className="text-right">
                        <div className="text-[10px] text-fm-muted uppercase font-bold">{enemyTeam.name}</div>
                        <div className={`font-bold text-sm ${turn === 'enemy' && !isComplete ? 'text-fm-red' : 'text-fm-muted'}`}>
                            {turn === 'enemy' && !isComplete ? (currentPhase === 'PICK' ? 'Enemy Pick' : 'Enemy Ban') : 'Waiting...'}
                        </div>
                    </div>
                    <Shield className="text-fm-red" />
                </div>
            </div>

            {/* MAP GRID */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-6xl w-full mb-8">
                {MAP_POOL.map(map => {
                    const isBanned = bannedMaps.includes(map.id);
                    const isPicked = pickedMaps.includes(map.id);
                    
                    // Logic for display stats
                    const userStat = getStats(userTeam, map.id);
                    const enemyStat = getStats(enemyTeam, map.id);
                    const isUserAdvantage = userStat >= enemyStat;

                    // Interaction Logic
                    const isInteractive = turn === 'user' && !isBanned && !isPicked && !isComplete;

                    return (
                        <div 
                            key={map.id} 
                            onClick={() => isInteractive ? handleUserAction(map.id) : null}
                            className={`relative h-48 rounded-xl overflow-hidden border-2 transition-all ${
                                isBanned 
                                ? 'border-fm-red/30 opacity-30 grayscale cursor-not-allowed' 
                                : isPicked 
                                    ? 'border-fm-green scale-105 ring-4 ring-fm-green/20 z-10 shadow-2xl' 
                                    : isInteractive 
                                        ? `border-fm-border cursor-pointer hover:scale-105 ${currentPhase === 'BAN' ? 'hover:border-fm-red' : 'hover:border-fm-accent'}` 
                                        : 'border-fm-border opacity-80'
                            }`}
                        >
                            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${map.img})` }}></div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>

                            {/* Map Name */}
                            <div className="absolute top-3 left-3 font-black text-2xl text-white italic uppercase tracking-tighter drop-shadow-md">
                                {map.name}
                            </div>

                            {isBanned && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                                    <div className="transform -rotate-12 border-4 border-fm-red text-fm-red font-black text-3xl uppercase px-4 py-2 tracking-widest">
                                        BANNED
                                    </div>
                                </div>
                            )}
                            
                            {isPicked && (
                                <div className="absolute inset-0 flex items-center justify-center bg-fm-green/20">
                                    <div className="flex flex-col items-center gap-2 text-fm-green font-bold text-lg uppercase tracking-widest animate-pulse">
                                        {bestOf === 1 ? (
                                            <>
                                                <Flame size={32} />
                                                PLAYING
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle size={32} />
                                                PICKED
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Stats Footer (Only visible if not banned) */}
                            {!isBanned && (
                                <div className="absolute bottom-0 left-0 right-0 bg-black/90 p-2 flex justify-between items-center text-xs font-mono">
                                    <div className="text-fm-accent flex flex-col">
                                        <span className="text-[9px] text-gray-500 uppercase">Your Prof.</span>
                                        <span className="font-bold text-sm">{userStat}%</span>
                                    </div>
                                    <div className={`font-bold ${isUserAdvantage ? 'text-fm-green' : 'text-fm-red'}`}>
                                        {isUserAdvantage ? '+' : ''}{userStat - enemyStat}%
                                    </div>
                                    <div className="text-fm-red flex flex-col text-right">
                                        <span className="text-[9px] text-gray-500 uppercase">Enemy Prof.</span>
                                        <span className="font-bold text-sm">{enemyStat}%</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {isComplete && (
                <div className="animate-fade-in flex flex-col items-center gap-4 fixed bottom-6 z-30 bg-black/80 backdrop-blur p-6 rounded-2xl border border-fm-green/50 shadow-2xl">
                    <div className="text-xl text-fm-muted flex gap-4">
                        {bestOf === 3 ? (
                            pickedMaps.map((mid, idx) => (
                                <span key={idx} className="flex items-center gap-1 font-bold text-white">
                                    <span className="text-fm-muted text-xs mr-1">{idx+1}.</span> {MAP_POOL.find(m => m.id === mid)?.name}
                                </span>
                            ))
                        ) : (
                            <span className="flex items-center gap-1 font-bold text-white">
                                Playing: {MAP_POOL.find(m => m.id === pickedMaps[0])?.name}
                            </span>
                        )}
                    </div>
                    <button 
                        onClick={() => onComplete(pickedMaps)}
                        className="px-12 py-4 bg-fm-green hover:bg-fm-green/90 text-white font-black uppercase tracking-widest rounded-xl shadow-lg text-xl flex items-center gap-2 transition-transform hover:scale-105"
                    >
                        <Play size={24} className="fill-current" />
                        Start Match {bestOf === 3 ? 'Series' : ''}
                    </button>
                </div>
            )}

            {/* LOGS */}
            {actionLog.length > 0 && (
                <div className="mt-8 w-full max-w-xl pb-12">
                    <div className="text-[10px] font-bold text-fm-muted uppercase tracking-widest mb-2 text-center">Veto History</div>
                    <div className="space-y-2 flex flex-col items-center">
                        {actionLog.slice(0, 3).map((log, i) => (
                            <div key={i} className="text-sm text-gray-400 animate-fade-in">{log}</div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
