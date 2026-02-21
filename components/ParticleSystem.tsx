
import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export interface ParticleData {
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    color: THREE.Color;
    life: number;
    scale: number;
    gravity: number;
}

export const ParticleSystem: React.FC = () => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    
    // We use a Ref for state to avoid React re-renders
    const particlesRef = useRef<ParticleData[]>([]);
    const MAX_PARTICLES = 500;

    useEffect(() => {
        const handleSpawn = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            const { x, y, z, color, count, speed = 0.1, scale = 0.3 } = detail;
            
            const newParticles: ParticleData[] = [];
            for(let i=0; i<count; i++) {
                newParticles.push({
                    x, y, z,
                    vx: (Math.random() - 0.5) * speed,
                    vy: Math.random() * speed + 0.05,
                    vz: (Math.random() - 0.5) * speed,
                    color: new THREE.Color(color),
                    life: 1.0,
                    scale: scale * (0.5 + Math.random() * 0.5),
                    gravity: 0.005
                });
            }
            
            // Add to pool, respecting limit
            particlesRef.current = [...particlesRef.current, ...newParticles].slice(-MAX_PARTICLES);
        };

        window.addEventListener('GAME_PARTICLE_SPAWN', handleSpawn);
        return () => window.removeEventListener('GAME_PARTICLE_SPAWN', handleSpawn);
    }, []);

    useFrame((state, delta) => {
        if (!meshRef.current) return;

        const particles = particlesRef.current;
        let activeCount = 0;

        // Update Physics
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.life -= delta * 1.5; // Fade out speed
            
            if (p.life <= 0) {
                particles.splice(i, 1);
                continue;
            }

            p.x += p.vx;
            p.y += p.vy;
            p.z += p.vz;
            p.vy -= p.gravity;
            
            // Ground collision
            if (p.y < 0.1) {
                p.y = 0.1;
                p.vy *= -0.5;
                p.vx *= 0.8;
                p.vz *= 0.8;
            }

            activeCount++;
        }

        // Render
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            dummy.position.set(p.x, p.y, p.z);
            dummy.scale.setScalar(p.scale * p.life);
            dummy.rotation.set(Math.random(), Math.random(), Math.random());
            dummy.updateMatrix();
            
            meshRef.current.setMatrixAt(i, dummy.matrix);
            meshRef.current.setColorAt(i, p.color);
        }

        // Hide unused instances
        for (let i = activeCount; i < MAX_PARTICLES; i++) {
            dummy.scale.setScalar(0);
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);
        }

        meshRef.current.instanceMatrix.needsUpdate = true;
        if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    });

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_PARTICLES]} frustumCulled={false}>
            <boxGeometry args={[0.2, 0.2, 0.2]} />
            <meshBasicMaterial toneMapped={false} />
        </instancedMesh>
    );
};

// Helper to spawn particles from anywhere
export const spawnParticles = (x: number, y: number, z: number, color: string, count: number, speed?: number, scale?: number) => {
    window.dispatchEvent(new CustomEvent('GAME_PARTICLE_SPAWN', { 
        detail: { x, y, z, color, count, speed, scale } 
    }));
};
