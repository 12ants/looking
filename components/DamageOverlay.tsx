
import React, { useEffect, useState } from 'react';

export const DamageOverlay: React.FC = () => {
    const [opacity, setOpacity] = useState(0);

    useEffect(() => {
        const handleDamage = () => {
            setOpacity(0.8);
        };
        window.addEventListener('GAME_DAMAGE', handleDamage);
        return () => window.removeEventListener('GAME_DAMAGE', handleDamage);
    }, []);

    useEffect(() => {
        if (opacity > 0) {
            const timer = requestAnimationFrame(() => {
                setOpacity(prev => Math.max(0, prev - 0.05));
            });
            return () => cancelAnimationFrame(timer);
        }
    }, [opacity]);

    if (opacity <= 0) return null;

    return (
        <div 
            className="absolute inset-0 z-40 bg-red-600 pointer-events-none transition-opacity duration-75" 
            style={{ opacity }} 
        />
    );
};

export const triggerDamageFlash = () => {
    window.dispatchEvent(new CustomEvent('GAME_DAMAGE'));
};
