import React, { useEffect, useState } from 'react';
import { Team } from '../types';
import { Swords, Loader2 } from 'lucide-react';

interface MatchTransitionProps {
    userTeam: Team;
    enemyTeam: Team;
    mapName: string;
    mapImage: string;
}

export const MatchTransition: React.FC<MatchTransitionProps> = ({ userTeam, enemyTeam, mapName, mapImage }) => {
    const [step, setStep] = useState(0);
    const [loadingProgress, setLoadingProgress] = useState(0);

    useEffect(() => {
        // Timeline for animation sequence
        const timers: ReturnType<typeof setTimeout>[] = [];
        
        timers.push(setTimeout(() => setStep(1), 500));  // Team 1 Drops
        timers.push(setTimeout(() => setStep(2), 1500)); // VS Appears
        timers.push(setTimeout(() => setStep(3), 2500)); // Team 2 Drops

        // Simulate loading bar
        const interval = setInterval(() => {
            setLoadingProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    return 100;
                }
                return prev + Math.floor(Math.random() * 8);
            });
        }, 200);

        return () => {
            timers.forEach(clearTimeout);
            clearInterval(interval);
        };
    }, []);

    return (
        <div className="fixed inset-0 z-[60] bg-fm-bg flex items-center justify-center overflow-hidden">
            {/* MAP BACKGROUND */}
            <div className="absolute inset-0 bg-cover bg-center animate-[scale-in_20s_linear_infinite]" style={{ backgroundImage: `url(${mapImage})` }}></div>
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
            
            {/* GRID OVERLAY */}
            <div className="absolute inset-0 bg-stripes opacity-10"></div>

            <div className="relative z-10 w-full max-w-7xl mx-auto px-6 grid grid-cols-3 items-center">
                
                {/* LEFT: USER TEAM - DROPS IN AT STEP 1 */}
                <div className={`flex flex-col items-center md:items-end transition-opacity duration-300 ${step >= 1 ? 'opacity-100' : 'opacity-0'}`}>
                    <div className={`flex flex-col items-center md:items-end ${step >= 1 ? 'animate-drop-in' : ''}`}>
                        <div className="w-32 h-32 md:w-48 md:h-48 bg-fm-card border-4 border-fm-accent rounded-full shadow-[0_0_50px_rgba(217,70,239,0.4)] flex items-center justify-center mb-6 relative overflow-hidden">
                            <div className="text-5xl md:text-7xl font-black text-white italic tracking-tighter z-10">
                                {userTeam.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="absolute inset-0 bg-fm-accent/10"></div>
                        </div>
                        <h2 className="text-4xl md:text-6xl font-black text-white italic uppercase tracking-tighter drop-shadow-xl text-center md:text-right">
                            {userTeam.name}
                        </h2>
                        <div className="text-fm-accent font-bold uppercase tracking-widest mt-2 bg-fm-bg/50 px-4 py-1 rounded border border-fm-accent/30">
                            Rank #{userTeam.rankingPoints}
                        </div>
                    </div>
                </div>

                {/* CENTER: VS - ZOOMS IN AT STEP 2 */}
                <div className={`flex flex-col items-center justify-center transition-all duration-500 ${step >= 2 ? 'opacity-100 scale-100 animate-bounce-in' : 'opacity-0 scale-50'}`}>
                    <Swords size={64} className="text-white mb-4 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
                    <div className="text-8xl md:text-9xl font-black text-white italic leading-none drop-shadow-2xl">
                        VS
                    </div>
                    <div className="mt-8 bg-black/60 border border-white/10 px-6 py-2 rounded-full text-fm-muted font-mono text-sm uppercase tracking-widest backdrop-blur-md">
                        {mapName}
                    </div>
                </div>

                {/* RIGHT: ENEMY TEAM - DROPS IN AT STEP 3 */}
                <div className={`flex flex-col items-center md:items-start transition-opacity duration-300 ${step >= 3 ? 'opacity-100' : 'opacity-0'}`}>
                    <div className={`flex flex-col items-center md:items-start ${step >= 3 ? 'animate-drop-in' : ''}`}>
                        <div className="w-32 h-32 md:w-48 md:h-48 bg-fm-card border-4 border-fm-red rounded-full shadow-[0_0_50px_rgba(239,68,68,0.4)] flex items-center justify-center mb-6 relative overflow-hidden">
                            <div className="text-5xl md:text-7xl font-black text-white italic tracking-tighter z-10">
                                {enemyTeam.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="absolute inset-0 bg-fm-red/10"></div>
                        </div>
                        <h2 className="text-4xl md:text-6xl font-black text-white italic uppercase tracking-tighter drop-shadow-xl text-center md:text-left">
                            {enemyTeam.name}
                        </h2>
                        <div className="text-fm-red font-bold uppercase tracking-widest mt-2 bg-fm-bg/50 px-4 py-1 rounded border border-fm-red/30">
                            Rank #{enemyTeam.rankingPoints}
                        </div>
                    </div>
                </div>
            </div>

            {/* LOADING BAR BOTTOM */}
            <div className={`absolute bottom-12 left-0 right-0 flex flex-col items-center transition-opacity duration-1000 ${step >= 3 ? 'opacity-100' : 'opacity-0'}`}>
                 <div className="flex items-center gap-2 mb-2 text-fm-muted font-mono text-xs uppercase tracking-widest">
                    <Loader2 size={12} className="animate-spin" />
                    Connecting to Server... {Math.min(100, loadingProgress)}%
                 </div>
                 <div className="w-96 h-1 bg-gray-800 rounded-full overflow-hidden">
                     <div 
                        className="h-full bg-fm-accent transition-all duration-300 ease-out" 
                        style={{ width: `${Math.min(100, loadingProgress)}%` }}
                    ></div>
                 </div>
            </div>
        </div>
    );
};