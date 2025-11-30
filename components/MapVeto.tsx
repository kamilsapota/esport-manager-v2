
import React, { useState, useEffect } from 'react';
import { Team } from '../types';
import { Shield, Ban, CheckCircle, Play, Check } from 'lucide-react';

interface MapVetoProps {
    userTeam: Team;
    enemyTeam: Team;
    onComplete: (maps: string[]) => void;
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

// SEQUENCE: BAN (User) -> BAN (Enemy) -> PICK (User) -> PICK (Enemy) -> BAN (User) -> BAN (Enemy) -> DECIDER
type VetoStep = 'BAN' | 'PICK' | 'DECIDER';

export const MapVeto: React.FC<MapVetoProps> = ({ userTeam, enemyTeam, onComplete }) => {
    const [bannedMaps, setBannedMaps] = useState<string[]>([]);
    const [pickedMaps, setPickedMaps] = useState<string[]>([]); // [UserPick, EnemyPick, Decider]
    const [turn, setTurn] = useState<'user' | 'enemy'>('user');
    const [stepIndex, setStepIndex] = useState(0); // 0 to 6
    const [actionLog, setActionLog] = useState<string[]>([]);

    const getStats = (team: Team, mapId: string) => team.mapStats?.[mapId] || 0;

    // 0: User Ban
    // 1: Enemy Ban
    // 2: User Pick
    // 3: Enemy Pick
    // 4: User Ban
    // 5: Enemy Ban
    // 6: Decider (Auto)

    useEffect(() => {
        if (stepIndex === 6) {
            // Auto Decider
            const remaining = MAP_POOL.find(m => !bannedMaps.includes(m.id) && !pickedMaps.includes(m.id));
            if (remaining) {
                const finalMaps = [...pickedMaps, remaining.id];
                setPickedMaps(finalMaps);
                setActionLog(prev => [`${remaining.name} remains as the DECIDER map`, ...prev]);
                // Brief delay before showing start button or finishing
            }
            return;
        }

        if (turn === 'enemy') {
            const timer = setTimeout(() => {
                handleAiTurn();
            }, 1200);
            return () => clearTimeout(timer);
        }
    }, [turn, stepIndex, bannedMaps, pickedMaps]);

    const handleAiTurn = () => {
        const availableMaps = MAP_POOL.filter(m => !bannedMaps.includes(m.id) && !pickedMaps.includes(m.id));
        const currentAction = (stepIndex === 0 || stepIndex === 1 || stepIndex === 4 || stepIndex === 5) ? 'BAN' : 'PICK';

        let selectedMap: typeof MAP_POOL[0] | undefined;

        if (currentAction === 'BAN') {
            // Ban map with highest User Win % or User Advantage
            // Also prioritize banning own permaban
            if (enemyTeam.permaban && !bannedMaps.includes(enemyTeam.permaban) && !pickedMaps.includes(enemyTeam.permaban)) {
                selectedMap = availableMaps.find(m => m.id === enemyTeam.permaban);
            }

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
            // PICK: Pick best available map for Enemy
            let maxStrength = -Infinity;
            availableMaps.forEach(m => {
                const enemyStat = getStats(enemyTeam, m.id);
                // Also consider if user is bad at it
                const userStat = getStats(userTeam, m.id);
                const strength = enemyStat - (userStat * 0.5); 
                if (strength > maxStrength) {
                    maxStrength = strength;
                    selectedMap = m;
                }
            });
        }

        if (!selectedMap) selectedMap = availableMaps[0];

        if (selectedMap) {
            if (currentAction === 'BAN') {
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
        if (turn !== 'user') return;
        const currentAction = (stepIndex === 0 || stepIndex === 1 || stepIndex === 4 || stepIndex === 5) ? 'BAN' : 'PICK';

        if (currentAction === 'BAN') {
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
        
        // Sequence: U(0), E(1), U(2), E(3), U(4), E(5)
        if (nextStep === 1 || nextStep === 3 || nextStep === 5) {
            setTurn('enemy');
        } else {
            setTurn('user');
        }
    };

    const currentActionText = () => {
        if (stepIndex === 6) return "Decider Map";
        const isBan = (stepIndex === 0 || stepIndex === 1 || stepIndex === 4 || stepIndex === 5);
        return isBan ? 'BAN PHASE' : 'PICK PHASE';
    };

    const canComplete = pickedMaps.length === 3;

    return (
        <div className="min-h-full bg-fm-bg p-6 flex flex-col items-center animate-fade-in">
            <div className="text-center mb-6">
                <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter mb-2">Map Veto (Bo3)</h2>
                <p className="text-fm-muted text-sm">Ban-Ban-Pick-Pick-Ban-Ban-Decider</p>
            </div>

            {/* STATUS BAR */}
            <div className="w-full max-w-5xl bg-fm-card border border-fm-border rounded-xl p-4 mb-8 flex justify-between items-center shadow-lg">
                <div className={`flex items-center gap-3 ${turn === 'user' && !canComplete ? 'opacity-100' : 'opacity-50'}`}>
                    <Shield className="text-fm-accent" />
                    <div className="text-left">
                        <div className="text-[10px] text-fm-muted uppercase font-bold">Your Team</div>
                        <div className={`font-bold text-sm ${turn === 'user' && !canComplete ? 'text-white' : 'text-fm-muted'}`}>
                            {turn === 'user' && !canComplete ? (stepIndex === 2 ? 'Your Pick' : 'Your Ban') : 'Waiting...'}
                        </div>
                    </div>
                </div>
                
                <div className="flex flex-col items-center">
                    <div className="text-lg font-black text-white uppercase tracking-widest">{currentActionText()}</div>
                    <div className="flex gap-1 mt-1">
                        {Array.from({length: 7}).map((_, i) => (
                            <div key={i} className={`w-2 h-2 rounded-full ${i < stepIndex ? 'bg-fm-green' : 'bg-fm-bg border border-fm-border'}`}></div>
                        ))}
                    </div>
                </div>

                <div className={`flex items-center gap-3 ${turn === 'enemy' && !canComplete ? 'opacity-100' : 'opacity-50'}`}>
                    <div className="text-right">
                        <div className="text-[10px] text-fm-muted uppercase font-bold">{enemyTeam.name}</div>
                        <div className={`font-bold text-sm ${turn === 'enemy' && !canComplete ? 'text-fm-red' : 'text-fm-muted'}`}>
                            {turn === 'enemy' && !canComplete ? (stepIndex === 3 ? 'Enemy Pick' : 'Enemy Ban') : 'Waiting...'}
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
                    const pickIndex = pickedMaps.indexOf(map.id);
                    const isDecider = pickIndex === 2;

                    const userStat = getStats(userTeam, map.id);
                    const enemyStat = getStats(enemyTeam, map.id);
                    const isUserAdvantage = userStat >= enemyStat;

                    // Interaction Logic
                    const isBanPhase = (stepIndex === 0 || stepIndex === 1 || stepIndex === 4 || stepIndex === 5);
                    const isInteractive = turn === 'user' && !isBanned && !isPicked && !canComplete;

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
                                        ? `border-fm-border cursor-pointer hover:scale-105 ${isBanPhase ? 'hover:border-fm-red' : 'hover:border-fm-accent'}` 
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
                                        {isDecider ? <Shield size={32} /> : <CheckCircle size={32} />}
                                        {isDecider ? 'Decider' : `Map ${pickIndex + 1}`}
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

            {canComplete && (
                <div className="animate-fade-in flex flex-col items-center gap-4">
                    <div className="text-xl text-fm-muted flex gap-4">
                        {pickedMaps.map((mid, idx) => (
                             <span key={idx} className="flex items-center gap-1 font-bold text-white">
                                 <span className="text-fm-muted text-xs mr-1">{idx+1}.</span> {MAP_POOL.find(m => m.id === mid)?.name}
                             </span>
                        ))}
                    </div>
                    <button 
                        onClick={() => onComplete(pickedMaps)}
                        className="px-12 py-4 bg-fm-green hover:bg-fm-green/90 text-white font-black uppercase tracking-widest rounded-xl shadow-lg text-xl flex items-center gap-2 transition-transform hover:scale-105"
                    >
                        <Play size={24} className="fill-current" />
                        Start Match Series
                    </button>
                </div>
            )}

            {/* LOGS */}
            {actionLog.length > 0 && (
                <div className="mt-8 w-full max-w-xl">
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
