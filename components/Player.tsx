import React, { useRef, useEffect, useImperativeHandle } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Position, GridNode } from '../types';
import { soundManager } from '../utils/SoundManager';

interface PlayerProps {
  position: Position;
  path: Position[];
  onMoveComplete: () => void;
  onPositionUpdate: (pos: Position) => void;
  onItemCollect: (pos: Position) => void;
  innerRef?: React.Ref<THREE.Group>;
  grid: GridNode[][];
  worldOrigin: Position;
}

export const Player: React.FC<PlayerProps> = ({ position, path, onMoveComplete, onPositionUpdate, onItemCollect, innerRef, grid, worldOrigin }) => {
  const meshRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const speed = 5; // Units per second

  // Ref to store current actual vector position to avoid jitter from state updates
  // Initialize Y based on grid at start
  const initialLocalX = position.x - worldOrigin.x;
  const initialLocalZ = position.z - worldOrigin.z;
  const initialHeight = (grid[initialLocalZ]?.[initialLocalX]?.height || 0);

  const currentPosRef = useRef(new THREE.Vector3(position.x, initialHeight, position.z));
  
  // Track target node index in path
  const pathIndexRef = useRef(0);
  
  // Sound throttling
  const lastStepTime = useRef(0);

  // Expose the mesh ref to parent
  useImperativeHandle(innerRef, () => meshRef.current as THREE.Group);

  useEffect(() => {
    // When path changes, reset index (path[0] is current pos usually, so start moving to path[1])
    if (path.length > 0) {
      pathIndexRef.current = 1;
    }
  }, [path]);

  // Helper to get terrain height at any world coordinate
  const getTerrainHeight = (x: number, z: number) => {
      const lx = Math.round(x - worldOrigin.x);
      const lz = Math.round(z - worldOrigin.z);
      if (lx >= 0 && lz >= 0 && lz < grid.length && lx < grid[0].length) {
          return grid[lz][lx].height;
      }
      return 0;
  };

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    if (path.length > 0 && pathIndexRef.current < path.length) {
      const targetNode = path[pathIndexRef.current];
      // Lookup target height
      const targetH = getTerrainHeight(targetNode.x, targetNode.z);
      const targetVec = new THREE.Vector3(targetNode.x, targetH, targetNode.z);
      
      // Calculate flat distance for speed consistency, but move in 3D
      const flatCurrent = new THREE.Vector3(currentPosRef.current.x, 0, currentPosRef.current.z);
      const flatTarget = new THREE.Vector3(targetNode.x, 0, targetNode.z);
      const dist = flatCurrent.distanceTo(flatTarget);
      
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
        
        // Move logic: interpolate
        currentPosRef.current.add(direction.multiplyScalar(step));
        
        // Rotate player to face direction
        // Look at target but keep head level for rotation calculation (avoid tilting mesh up/down)
        const lookAtTarget = new THREE.Vector3(targetNode.x, currentPosRef.current.y, targetNode.z);
        meshRef.current.lookAt(lookAtTarget);
      }
      // Bobbing while walking
      meshRef.current.position.y = currentPosRef.current.y + 0.5 + Math.sin(state.clock.elapsedTime * 10) * 0.1;

    } else {
        // Idle
        const h = getTerrainHeight(currentPosRef.current.x, currentPosRef.current.z);
        currentPosRef.current.y = THREE.MathUtils.lerp(currentPosRef.current.y, h, delta * 5);
        meshRef.current.position.y = currentPosRef.current.y + 0.5; // Base height

        // Idle breathing
        if (bodyRef.current) bodyRef.current.rotation.x = 0;
        meshRef.current.position.y += Math.sin(state.clock.elapsedTime * 2) * 0.05;
    }

    // Sync mesh position X/Z
    meshRef.current.position.x = currentPosRef.current.x;
    meshRef.current.position.z = currentPosRef.current.z;
  });

  return (
    <group ref={meshRef} position={[position.x, 0.5, position.z]}>
      {/* Body Group for animation */}
      <group ref={bodyRef}>
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
    </group>
  );
};