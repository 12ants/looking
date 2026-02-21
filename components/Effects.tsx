
import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { WeatherType, Position } from '../types';

interface EffectsProps {
  shakeIntensity: number;
  quality?: 'LOW' | 'HIGH';
  weather?: WeatherType;
  weatherIntensity?: number;
  playerPos?: Position;
}

export const Effects: React.FC<EffectsProps> = ({ shakeIntensity, quality = 'HIGH', weather, weatherIntensity = 0, playerPos }) => {
  const { camera } = useThree();
  const rainRef = useRef<THREE.InstancedMesh>(null);
  const lightningRef = useRef<THREE.PointLight>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const MAX_RAIN_DROPS = quality === 'HIGH' ? 800 : 200;

  // Rain particle logic
  const rainDrops = useMemo(() => {
    return Array.from({ length: MAX_RAIN_DROPS }).map(() => ({
        pos: new THREE.Vector3((Math.random() - 0.5) * 40, Math.random() * 20, (Math.random() - 0.5) * 40),
        speed: 15 + Math.random() * 10
    }));
  }, [MAX_RAIN_DROPS]);

  // Handle Camera Shake
  useFrame(() => {
    if (shakeIntensity > 0) {
      const shake = shakeIntensity * 0.1;
      camera.position.x += (Math.random() - 0.5) * shake;
      camera.position.y += (Math.random() - 0.5) * shake;
      camera.position.z += (Math.random() - 0.5) * shake;
    }
  });

  useFrame((state, delta) => {
    // Weather Particles (Rain)
    if (rainRef.current && playerPos && weatherIntensity > 0.05) {
        const rainActiveCount = Math.floor(MAX_RAIN_DROPS * weatherIntensity);
        
        for (let r = 0; r < rainDrops.length; r++) {
            const drop = rainDrops[r];
            drop.pos.y -= drop.speed * delta;
            
            if (drop.pos.y < -2) {
                drop.pos.y = 20 + Math.random() * 5;
                drop.pos.x = (Math.random() - 0.5) * 40;
                drop.pos.z = (Math.random() - 0.5) * 40;
            }

            dummy.position.set(playerPos.x + drop.pos.x, drop.pos.y, playerPos.z + drop.pos.z);
            dummy.scale.set(0.05, 0.4, 0.05);
            dummy.updateMatrix();
            
            if (r < rainActiveCount) {
                rainRef.current.setMatrixAt(r, dummy.matrix);
            } else {
                dummy.scale.set(0,0,0);
                dummy.updateMatrix();
                rainRef.current.setMatrixAt(r, dummy.matrix);
            }
        }
        rainRef.current.instanceMatrix.needsUpdate = true;
    }

    // Lightning Flash
    if (lightningRef.current && weather === WeatherType.STORM) {
        const flashChance = 0.005;
        if (Math.random() < flashChance && lightningRef.current.intensity === 0) {
            lightningRef.current.intensity = 5;
            lightningRef.current.position.set(playerPos?.x || 0, 15, playerPos?.z || 0);
        }
        lightningRef.current.intensity = THREE.MathUtils.lerp(lightningRef.current.intensity, 0, delta * 10);
    }
  });

  return (
    <>
        {(weather === WeatherType.RAIN || weather === WeatherType.STORM) && (
            <instancedMesh ref={rainRef} args={[undefined, undefined, MAX_RAIN_DROPS]} frustumCulled={false}>
                <boxGeometry args={[1, 1, 1]} />
                <meshBasicMaterial color="#60a5fa" transparent opacity={0.4} toneMapped={false} />
            </instancedMesh>
        )}

        {weather === WeatherType.STORM && (
            <pointLight ref={lightningRef} intensity={0} distance={100} color="#ffffff" />
        )}
    </>
  );
};
