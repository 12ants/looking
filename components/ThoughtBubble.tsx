import React, { useEffect, useState } from 'react';

interface Props {
    thought: string | null;
}

export const ThoughtBubble: React.FC<Props> = ({ thought }) => {
    const [visibleThought, setVisibleThought] = useState<string | null>(null);
    const [isFading, setIsFading] = useState(false);

    useEffect(() => {
        if (thought) {
            setIsFading(false);
            setVisibleThought(thought);
        } else {
            setIsFading(true);
            const timer = setTimeout(() => {
                setVisibleThought(null);
                setIsFading(false);
            }, 1000); // Fade out duration
            return () => clearTimeout(timer);
        }
    }, [thought]);

    if (!visibleThought) return null;

    return (
        <div className={`absolute bottom-32 left-1/2 transform -translate-x-1/2 z-20 pointer-events-none transition-opacity duration-1000 ${isFading ? 'opacity-0' : 'opacity-100'}`}>
            <div className="bg-black/40 backdrop-blur-sm px-6 py-3 rounded-full border border-white/10 text-center shadow-lg">
                <p className="text-slate-200 text-sm font-medium italic tracking-wide font-serif">
                    "{visibleThought}"
                </p>
            </div>
        </div>
    );
};