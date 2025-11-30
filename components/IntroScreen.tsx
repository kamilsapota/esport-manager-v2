import React, { useEffect, useState } from 'react';
import { Crosshair } from 'lucide-react';

interface IntroScreenProps {
    onComplete: () => void;
}

export const IntroScreen: React.FC<IntroScreenProps> = ({ onComplete }) => {
    const [step, setStep] = useState(0);

    useEffect(() => {
        // Timeline:
        // 0s: Start
        // 0.5s: Logo appears
        // 1.5s: Text appears
        // 3.5s: Button appears
        const timer1 = setTimeout(() => setStep(1), 500);
        const timer2 = setTimeout(() => setStep(2), 1500);
        const timer3 = setTimeout(() => setStep(3), 3500);

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
            clearTimeout(timer3);
        };
    }, []);

    const handleScreenClick = () => {
        if (step >= 3) {
            onComplete();
        }
    };

    return (
        <div 
            onClick={handleScreenClick}
            className={`fixed inset-0 z-[100] bg-fm-bg flex flex-col items-center justify-center overflow-hidden select-none transition-cursor duration-300 ${step >= 3 ? 'cursor-pointer' : 'cursor-default'}`}
        >
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-fm-card/50 via-fm-bg to-black opacity-60 pointer-events-none"></div>
            <div className="absolute top-0 left-0 w-full h-1/2 bg-fm-accent/5 blur-[150px] pointer-events-none"></div>

            <div className="relative z-10 flex flex-col items-center pointer-events-none">
                {/* LOGO */}
                <div className={`transition-all duration-1000 transform ${step >= 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
                    <div className="w-32 h-32 bg-fm-accent rounded-2xl flex items-center justify-center shadow-[0_0_60px_rgba(217,70,239,0.4)] mb-8 border-4 border-white/10 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent"></div>
                        <Crosshair size={64} className="text-white drop-shadow-lg" />
                    </div>
                </div>

                {/* TEXT */}
                <div className={`text-center transition-all duration-1000 transform ${step >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                    <h1 className="text-7xl font-black italic tracking-tighter text-white mb-2 drop-shadow-2xl">
                        <span className="text-fm-accent">CS</span>:MANAGER
                    </h1>
                    <div className="h-1 w-24 bg-fm-accent mx-auto rounded-full mb-4 shadow-[0_0_20px_rgba(217,70,239,0.8)]"></div>
                    <p className="text-fm-muted font-mono tracking-[0.3em] text-sm uppercase">Tactical Esports Simulator</p>
                </div>
            </div>

            {/* CLICK TO START */}
            <div className={`absolute bottom-24 transition-all duration-700 pointer-events-none ${step >= 3 ? 'opacity-100' : 'opacity-0'}`}>
                <div className="flex flex-col items-center gap-2 group">
                    <span className="text-white font-bold text-lg uppercase tracking-widest animate-pulse group-hover:text-fm-accent transition-colors">
                        Click Anywhere to Start
                    </span>
                    <div className="w-1.5 h-1.5 bg-fm-accent rounded-full group-hover:scale-150 transition-transform duration-300"></div>
                </div>
            </div>
            
            {/* Disclaimer */}
            <div className="absolute bottom-6 text-[10px] text-gray-700 font-mono uppercase tracking-widest pointer-events-none">
                v1.2.1 • Powered by Gemini
            </div>
        </div>
    );
};