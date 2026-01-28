import React, { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Position, WorldItem } from '../types';
import { soundManager } from '../utils/SoundManager';

interface PlayerProps {
  position: Position;
  path: Position[];
  onMoveComplete: () => void;
  onPositionUpdate: (pos: Position) => void;
  onItemCollect: (pos: Position) => void;
}

export const Player: React.FC<PlayerProps> = ({ position, path, onMoveComplete, onPositionUpdate, onItemCollect }) => {
  const meshRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const speed = 5; // Units per second

  // Ref to store current actual vector position to avoid jitter from state updates
  const currentPosRef = useRef(new THREE.Vector3(position.x, 0, position.z));
  
  // Track target node index in path
  const pathIndexRef = useRef(0);
  
  // Sound throttling
  const lastStepTime = useRef(0);

  useEffect(() => {
    // When path changes, reset index (path[0] is current pos usually, so start moving to path[1])
    if (path.length > 0) {
      pathIndexRef.current = 1;
    }
  }, [path]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    if (path.length > 0 && pathIndexRef.current < path.length) {
      const targetNode = path[pathIndexRef.current];
      const targetVec = new THREE.Vector3(targetNode.x, 0, targetNode.z);
      
      const dist = currentPosRef.current.distanceTo(targetVec);
      const step = speed * delta;

      // Play step sound
      if (state.clock.elapsedTime - lastStepTime.current > 0.3) {
          soundManager.play('step');
          lastStepTime.current = state.clock.elapsedTime;
      }

      if (dist <= step) {
        // Reached node
        currentPosRef.current.copy(targetVec);
        pathIndexRef.current++;
        
        // Notify logical position update (discrete grid coords)
        onPositionUpdate(targetNode);
        
        // Check for items at this discrete node
        onItemCollect(targetNode);

        if (pathIndexRef.current >= path.length) {
          onMoveComplete();
        }
      } else {
        // Move towards node
        const direction = new THREE.Vector3().subVectors(targetVec, currentPosRef.current).normalize();
        currentPosRef.current.add(direction.multiplyScalar(step));
        
        // Rotate player to face direction
        const lookAtTarget = new THREE.Vector3(targetNode.x, 0, targetNode.z);
        meshRef.current.lookAt(lookAtTarget);
      }
    }

    // Sync mesh position
    meshRef.current.position.copy(currentPosRef.current);
    // Bobbing animation
    meshRef.current.position.y = 0.5 + Math.sin(state.clock.elapsedTime * 10) * 0.1;

    // --- Third Person Camera Logic ---
    
    // Get player's forward direction
    const forward = new THREE.Vector3(0, 0, 1);
    forward.applyQuaternion(meshRef.current.quaternion);
    forward.normalize();

    // Calculate ideal camera position (behind and slightly up)
    // - forward * 3 (3 units behind)
    // + up * 2.5 (2.5 units up)
    const cameraOffset = forward.clone().multiplyScalar(-4).add(new THREE.Vector3(0, 3, 0));
    const desiredCamPos = currentPosRef.current.clone().add(cameraOffset);

    // Smoothly interpolate camera position
    // Lower alpha (0.05) creates a "heavier", smoother camera that trails slightly
    camera.position.lerp(desiredCamPos, 0.08);

    // Look slightly above the player's head
    const lookTarget = currentPosRef.current.clone().add(new THREE.Vector3(0, 1.5, 0));
    camera.lookAt(lookTarget);
  });

  return (
    <group ref={meshRef} position={[position.x, 0.5, position.z]}>
      {/* Body */}
      <mesh castShadow position={[0, 0.4, 0]}>
        <capsuleGeometry args={[0.3, 0.6, 4, 8]} />
        <meshStandardMaterial color="#3b82f6" />
      </mesh>
      {/* Head */}
      <mesh position={[0, 0.9, 0]}>
        <sphereGeometry args={[0.25]} />
        <meshStandardMaterial color="#fca5a5" />
      </mesh>
      {/* Eyes */}
      <mesh position={[0.1, 0.95, 0.2]} geometry={new THREE.SphereGeometry(0.05)}>
        <meshStandardMaterial color="black" />
      </mesh>
      <mesh position={[-0.1, 0.95, 0.2]} geometry={new THREE.SphereGeometry(0.05)}>
        <meshStandardMaterial color="black" />
      </mesh>
      {/* Backpack */}
      <mesh position={[0, 0.5, -0.25]} geometry={new THREE.BoxGeometry(0.4, 0.5, 0.2)}>
        <meshStandardMaterial color="#92400e" />
      </mesh>
    </group>
  );
};