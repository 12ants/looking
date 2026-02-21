
import React, { useEffect, useState, useRef } from 'react';

interface Props {
    onSuccess: () => void;
    onFail: () => void;
    difficulty?: number; // 1 (Easy) to 3 (Hard)
}

export const FishingUI: React.FC<Props> = ({ onSuccess, onFail, difficulty = 1 }) => {
    const [barPos, setBarPos] = useState(50);
    const [targetPos, setTargetPos] = useState(50);
    const [direction, setDirection] = useState(1);
    const [gameActive, setGameActive] = useState(true);
    
    const requestRef = useRef<number>(0);
    const speedRef = useRef(1.0 + difficulty * 0.5); 
    const targetWidth = 20 - (difficulty * 2); 

    useEffect(() => {
        const animate = () => {
            if (!gameActive) return;

            setBarPos(prev => {
                let next = prev + speedRef.current * direction;
                if (next >= 100 || next <= 0) {
                    setDirection(d => -d);
                    next = Math.max(0, Math.min(100, next));
                }
                return next;
            });
            requestRef.current = requestAnimationFrame(animate);
        };
        requestRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(requestRef.current);
    }, [direction, gameActive, difficulty]);

    // Randomize target once on mount
    useEffect(() => {
        setTargetPos(20 + Math.random() * 60);
    }, []);

    const handleClick = () => {
        if (!gameActive) return;
        setGameActive(false);
        cancelAnimationFrame(requestRef.current);

        const min = targetPos - targetWidth/2;
        const max = targetPos + targetWidth/2;

        if (barPos >= min && barPos <= max) {
            onSuccess();
        } else {
            onFail();
        }
    };

    return (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 flex flex-col items-center animate-in zoom-in duration-200">
            <div className="bg-slate-900 border-4 border-slate-700 rounded-xl p-2 shadow-2xl relative w-80">
                <h3 className="text-center text-white font-bold mb-2 uppercase tracking-widest text-xs">Reel It In!</h3>
                
                {/* Progress Bar Container */}
                <div 
                    className="relative w-full h-8 bg-slate-800 rounded-full overflow-hidden border-2 border-slate-600 cursor-pointer"
                    onClick={handleClick}
                >
                    {/* Target Zone */}
                    <div 
                        className="absolute top-0 bottom-0 bg-green-500/50 border-x-2 border-green-400"
                        style={{ 
                            left: `${targetPos - targetWidth/2}%`, 
                            width: `${targetWidth}%` 
                        }}
                    />

                    {/* Moving Bar */}
                    <div 
                        className="absolute top-0 bottom-0 w-2 bg-white border-x border-slate-400 shadow-[0_0_10px_rgba(255,255,255,0.8)]"
                        style={{ left: `${barPos}%` }}
                    />
                </div>

                <div className="mt-2 text-center text-[10px] text-slate-400">
                    CLICK WHEN WHITE BAR IS IN GREEN ZONE
                </div>
            </div>
            
            {/* Visual Line to player would go here ideally */}
        </div>
    );
};
