
import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Sky, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { WeatherType } from '../types';

interface TimeControllerProps {
    initialTime?: number;
    daySpeed?: number;
    weather?: WeatherType;
    weatherIntensity?: number;
    onTimeUpdate?: (time: number) => void;
}

export const TimeController: React.FC<TimeControllerProps> = ({ 
    initialTime = 12, 
    daySpeed = 0.2, 
    weather = WeatherType.CLEAR, 
    weatherIntensity = 0,
    onTimeUpdate 
}) => {
    const timeRef = useRef(initialTime);
    const dirLightRef = useRef<THREE.DirectionalLight>(null);
    const ambientRef = useRef<THREE.AmbientLight>(null);
    const lastUpdateRef = useRef(0);

    // Colors
    const colors = useMemo(() => ({
        dawn: { ambient: new THREE.Color('#1e1b4b'), sun: new THREE.Color('#3b82f6') },
        day: { ambient: new THREE.Color('#ffffff'), sun: new THREE.Color('#fff7ed') },
        dusk: { ambient: new THREE.Color('#c026d3'), sun: new THREE.Color('#f97316') },
        night: { ambient: new THREE.Color('#0f172a'), sun: new THREE.Color('#1e3a8a') },
        storm: { ambient: new THREE.Color('#1e293b'), sun: new THREE.Color('#334155') }
    }), []);

    useFrame((state, delta) => {
        // Update Time
        timeRef.current = (timeRef.current + delta * daySpeed) % 24;
        
        // Notify parent occasionally (every 1 game-minute approx)
        // 1 game hour = 1/daySpeed seconds. 
        // If daySpeed is 0.2, 1 hour = 5 seconds. 1 minute = 0.08s.
        // Let's update UI every 0.5s real time.
        if (state.clock.elapsedTime - lastUpdateRef.current > 0.5) {
            lastUpdateRef.current = state.clock.elapsedTime;
            if (onTimeUpdate) onTimeUpdate(timeRef.current);
        }

        // Calculate Lighting
        const time = timeRef.current;
        let targetAmbient = colors.day.ambient;
        let targetSun = colors.day.sun;
        let sunIntensity = 1.5;
        let ambientIntensity = 0.6;

        if (time >= 5 && time < 7) { 
            // Dawn
            const t = (time - 5) / 2; 
            targetAmbient = colors.dawn.ambient.clone().lerp(colors.day.ambient, t);
            targetSun = colors.dawn.sun.clone().lerp(colors.day.sun, t);
            ambientIntensity = THREE.MathUtils.lerp(0.2, 0.6, t);
            sunIntensity = THREE.MathUtils.lerp(0.2, 1.5, t);
        } else if (time >= 7 && time < 17) { 
            // Day
            targetAmbient = colors.day.ambient;
            targetSun = colors.day.sun;
        } else if (time >= 17 && time < 19) { 
            // Dusk
            const t = (time - 17) / 2; 
            targetAmbient = colors.day.ambient.clone().lerp(colors.dusk.ambient, t);
            targetSun = colors.day.sun.clone().lerp(colors.dusk.sun, t);
            ambientIntensity = THREE.MathUtils.lerp(0.6, 0.3, t);
            sunIntensity = THREE.MathUtils.lerp(1.5, 0.2, t);
        } else { 
            // Night
            targetAmbient = colors.night.ambient;
            targetSun = colors.night.sun;
            ambientIntensity = 0.2;
            sunIntensity = 0.1;
        }

        // Weather Overrides
        if (weatherIntensity > 0) {
            targetAmbient.lerp(colors.storm.ambient, weatherIntensity * 0.8);
            targetSun.lerp(colors.storm.sun, weatherIntensity * 0.8);
            sunIntensity = THREE.MathUtils.lerp(sunIntensity, 0.1, weatherIntensity);
            ambientIntensity = THREE.MathUtils.lerp(ambientIntensity, 0.2, weatherIntensity);
        }

        // Apply
        if (dirLightRef.current) {
            dirLightRef.current.color.copy(targetSun);
            dirLightRef.current.intensity = THREE.MathUtils.lerp(dirLightRef.current.intensity, sunIntensity, delta * 2);
            
            // Move Sun
            const angle = (time / 24) * Math.PI * 2 - Math.PI / 2;
            const radius = 50;
            dirLightRef.current.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 20);
        }

        if (ambientRef.current) {
            ambientRef.current.color.copy(targetAmbient);
            ambientRef.current.intensity = THREE.MathUtils.lerp(ambientRef.current.intensity, ambientIntensity, delta * 2);
        }
    });

    const isDark = timeRef.current < 6 || timeRef.current > 18;
    const isNight = timeRef.current < 5 || timeRef.current > 19;
    
    // Calculate Sun Position for Sky component
    const sunPos = useMemo(() => {
        const angle = (timeRef.current / 24) * Math.PI * 2 - Math.PI / 2;
        return new THREE.Vector3(Math.cos(angle) * 100, Math.sin(angle) * 100, 20);
    }, [timeRef.current]); // This will still re-render Sky when timeRef changes if we used state, but here we use Ref.
    // Wait, Sky needs a prop. We can't update Sky without re-rendering.
    // However, Sky is cheap. But we want to avoid re-rendering the PARENT.
    // So this component handles the lights (refs) efficiently.
    // For Sky/Stars, we might just let them update every 0.5s via the parent callback or use a local state here.
    
    // Actually, let's just use a local state for the Sky/Stars updates to keep them smooth but isolated.
    const [visualTime, setVisualTime] = useState(initialTime);
    
    useFrame((state) => {
        if (state.clock.elapsedTime % 0.1 < 0.02) { // Update sky every ~0.1s
            setVisualTime(timeRef.current);
        }
    });

    const skySunPos = new THREE.Vector3();
    const angle = (visualTime / 24) * Math.PI * 2 - Math.PI / 2;
    skySunPos.set(Math.cos(angle) * 100, Math.sin(angle) * 100, 20);

    return (
        <>
            <ambientLight ref={ambientRef} />
            <directionalLight 
                ref={dirLightRef} 
                castShadow 
                shadow-mapSize={[2048, 2048]} 
                shadow-camera-left={-50} 
                shadow-camera-right={50} 
                shadow-camera-top={50} 
                shadow-camera-bottom={-50} 
            />
            
            {!isNight && <Sky sunPosition={skySunPos} turbidity={0.5} rayleigh={0.5} />}
            {isDark && <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />}
            
            <fogExp2 attach="fog" args={['#202020', 0.02 + (weatherIntensity * 0.05)]} />
        </>
    );
};
