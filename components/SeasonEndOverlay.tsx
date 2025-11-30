

import React, { useEffect, useState } from 'react';
import { Trophy, XCircle, ArrowUpCircle, Crown } from 'lucide-react';
import { SeasonPhase } from '../types';

interface SeasonEndOverlayProps {
    rank: number;
    isPlayoffQualified: boolean;
    isPromotion?: boolean;
    seasonPhase?: SeasonPhase;
    onContinue: () => void;
    leagueName: string;
}

export const SeasonEndOverlay: React.FC<SeasonEndOverlayProps> = ({ rank, isPlayoffQualified, isPromotion, seasonPhase = 'REGULAR', onContinue, leagueName }) => {
    const [step, setStep] = useState(0);

    useEffect(() => {
        const t1 = setTimeout(() => setStep(1), 500); // BG fade
        const t2 = setTimeout(() => setStep(2), 1500); // Rank reveal
        const t3 = setTimeout(() => setStep(3), 3000); // Status reveal
        const t4 = setTimeout(() => setStep(4), 4500); // Button

        return () => {
            clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4);
        };
    }, []);

    const isChampion = isPromotion;
    const isEliminatedInPlayoffs = seasonPhase === 'PLAYOFFS' && !isChampion;

    // Rank Formatting
    let rankText = rank.toString();
    let suffix = "th";
    
    if (rank === 1) suffix = "st";
    else if (rank === 2) suffix = "nd";
    else if (rank === 3) {
        rankText = "3rd-4th";
        suffix = "";
    }
    else if (rank === 5) {
        rankText = "5th-8th";
        suffix = "";
    }
    // For regular single digits
    else if (rank % 10 === 1 && rank !== 11) suffix = "st";
    else if (rank % 10 === 2 && rank !== 12) suffix = "nd";
    else if (rank % 10 === 3 && rank !== 13) suffix = "rd";

    const getRoundName = () => {
        if (rank === 2) return "Grand Final";
        if (rank === 3) return "Semi-Finals";
        if (rank === 5) return "Quarter-Finals";
        return "Playoffs";
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md overflow-hidden">
            <div className="absolute inset-0 bg-stripes opacity-5"></div>
            
            {/* Background Flair */}
            <div className={`absolute inset-0 transition-opacity duration-1000 ${step >= 1 ? 'opacity-100' : 'opacity-0'}`}>
                <div className={`absolute top-0 left-0 w-full h-1/2 blur-[150px] ${isChampion ? 'bg-fm-green/20' : (isPlayoffQualified && !isEliminatedInPlayoffs) ? 'bg-fm-accent/20' : 'bg-gray-500/10'}`}></div>
            </div>

            <div className="relative z-10 text-center max-w-2xl px-6">
                {/* HEADLINE */}
                <h1 className={`text-4xl md:text-6xl font-black italic uppercase tracking-tighter text-white mb-2 transition-all duration-1000 transform ${step >= 1 ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                    {seasonPhase === 'PLAYOFFS' ? 'Playoff Run Ended' : 'Season Complete'}
                </h1>
                <div className={`text-fm-muted font-mono uppercase tracking-widest text-sm mb-12 transition-all duration-1000 delay-200 ${step >= 1 ? 'opacity-100' : 'opacity-0'}`}>
                    {leagueName} {seasonPhase === 'PLAYOFFS' ? 'Playoffs' : 'Regular Season'}
                </div>

                {/* RANK REVEAL */}
                <div className={`transition-all duration-700 transform ${step >= 2 ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
                    <div className="flex flex-col items-center justify-center mb-8">
                        <div className={`w-32 h-32 md:w-40 md:h-40 rounded-full flex items-center justify-center border-4 shadow-[0_0_60px_rgba(255,255,255,0.1)] mb-4 ${
                             isChampion ? 'bg-fm-green border-white text-white shadow-fm-green/50' :
                             (isPlayoffQualified && !isEliminatedInPlayoffs) ? 'bg-fm-accent border-white text-white shadow-fm-accent/50' : 
                             'bg-fm-card border-fm-border text-fm-muted'
                        }`}>
                            <div className="flex flex-col items-center leading-none">
                                <span className={`${rankText.length > 3 ? 'text-3xl' : 'text-6xl'} font-black`}>{rankText}</span>
                                {suffix && <span className="text-xl font-bold mt-1">{suffix}</span>}
                            </div>
                        </div>
                        <div className="text-sm font-bold text-fm-muted uppercase tracking-widest">Final Standing</div>
                    </div>
                </div>

                {/* STATUS MESSAGE */}
                <div className={`transition-all duration-700 transform ${step >= 3 ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                    {isChampion ? (
                        <div className="bg-fm-green/10 border border-fm-green p-6 rounded-xl mb-8">
                            <Crown size={48} className="text-fm-green mx-auto mb-4 animate-bounce" />
                            <h2 className="text-3xl font-black text-white uppercase italic mb-2">PROMOTION SECURED!</h2>
                            <p className="text-gray-300">You have conquered the division. Prepare for the next tier.</p>
                        </div>
                    ) : isEliminatedInPlayoffs ? (
                         <div className="bg-fm-card border border-fm-border p-6 rounded-xl mb-8">
                            <XCircle size={48} className="text-gray-500 mx-auto mb-4" />
                            <h2 className="text-3xl font-black text-gray-400 uppercase italic mb-2">ELIMINATED</h2>
                            <p className="text-gray-500">You fought hard but were eliminated in the <span className="text-white font-bold">{getRoundName()}</span>.</p>
                        </div>
                    ) : isPlayoffQualified ? (
                        <div className="bg-fm-accent/10 border border-fm-accent p-6 rounded-xl mb-8">
                            <Trophy size={48} className="text-fm-accent mx-auto mb-4 animate-pulse" />
                            <h2 className="text-3xl font-black text-white uppercase italic mb-2">PLAYOFF QUALIFIED</h2>
                            <p className="text-gray-300">You secured a Top 8 finish. Only <span className="text-white font-bold">ONE</span> team promotes.</p>
                        </div>
                    ) : (
                        <div className="bg-fm-card border border-fm-border p-6 rounded-xl mb-8">
                            <XCircle size={48} className="text-gray-500 mx-auto mb-4" />
                            <h2 className="text-3xl font-black text-gray-400 uppercase italic mb-2">SEASON OVER</h2>
                            <p className="text-gray-500">You failed to qualify for playoffs. Better luck next season.</p>
                        </div>
                    )}
                </div>

                {/* CONTINUE BUTTON */}
                <div className={`transition-all duration-500 ${step >= 4 ? 'opacity-100' : 'opacity-0'}`}>
                    <button 
                        onClick={onContinue}
                        className="bg-white text-black hover:bg-gray-200 px-8 py-4 rounded-full font-black uppercase tracking-widest text-lg shadow-xl transition-transform hover:scale-105"
                    >
                        {isChampion ? 'Enter New League' : 
                         isEliminatedInPlayoffs ? 'Begin Off-Season' :
                         isPlayoffQualified ? 'Enter Playoffs' : 
                         'Begin Off-Season'}
                    </button>
                </div>

            </div>
        </div>
    );
};