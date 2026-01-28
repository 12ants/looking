import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Particle } from '../types';

interface EffectsProps {
  particles: Particle[];
  shakeIntensity: number;
}

export const Effects: React.FC<EffectsProps> = ({ particles, shakeIntensity }) => {
  const { camera } = useThree();
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Handle Camera Shake
  useFrame(() => {
    if (shakeIntensity > 0) {
      const shake = shakeIntensity * 0.1;
      camera.position.x += (Math.random() - 0.5) * shake;
      camera.position.y += (Math.random() - 0.5) * shake;
      camera.position.z += (Math.random() - 0.5) * shake;
    }
  });

  // Update Particles Visuals
  useEffect(() => {
    if (!meshRef.current) return;
    
    // Resize instance mesh count if needed? 
    // Recreating instanced mesh is expensive. We assume a max buffer or just map active particles.
    // Three.js InstancedMesh count is fixed. We should set it to a max reasonable number.
  }, [particles.length]);

  useFrame(() => {
    if (!meshRef.current) return;
    
    // Reset all to scale 0 first (hide unused)
    // Optimization: Only update active ones
    let i = 0;
    for (const p of particles) {
        dummy.position.set(p.x, p.y, p.z);
        dummy.scale.set(p.scale * p.life, p.scale * p.life, p.scale * p.life); // Shrink as they die
        dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
        meshRef.current.setColorAt(i, new THREE.Color(p.color));
        i++;
    }
    
    // Hide remaining instances
    // Getting count from args is hard here, assume max 200
    for (; i < 200; i++) {
        dummy.scale.set(0,0,0);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, 200]} frustumCulled={false}>
      <boxGeometry args={[0.15, 0.15, 0.15]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
};