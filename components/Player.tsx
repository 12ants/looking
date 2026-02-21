
import React, { useRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Position, GridNode, PlayerConfig, WeatherType } from '../types';
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
  visible?: boolean;
  config: PlayerConfig;
  onClick: () => void;
  timeOfDay: number;
  weather?: WeatherType;
}

const Lantern: React.FC<{ active: boolean }> = ({ active }) => {
    return (
        <group position={[0, -0.4, 0.1]} scale={0.8}>
            {/* Handle */}
            <mesh position={[0, 0.35, 0]}>
                <torusGeometry args={[0.08, 0.015, 8, 16]} />
                <meshStandardMaterial color="#2d2d2d" metalness={0.8} />
            </mesh>
            {/* Top Cap */}
            <mesh position={[0, 0.25, 0]}>
                <cylinderGeometry args={[0.1, 0.12, 0.05, 8]} />
                <meshStandardMaterial color="#2d2d2d" metalness={0.8} />
            </mesh>
            {/* Glass/Light Body */}
            <mesh position={[0, 0.1, 0]}>
                <cylinderGeometry args={[0.08, 0.08, 0.25, 8]} />
                <meshStandardMaterial 
                    color={active ? "#fbbf24" : "#444444"} 
                    emissive={active ? "#fbbf24" : "#000000"} 
                    emissiveIntensity={active ? 2 : 0}
                    transparent
                    opacity={0.8}
                />
            </mesh>
            {/* Base */}
            <mesh position={[0, -0.05, 0]}>
                <cylinderGeometry args={[0.12, 0.12, 0.05, 8]} />
                <meshStandardMaterial color="#2d2d2d" metalness={0.8} />
            </mesh>
            
            {/* Point Light */}
            {active && (
                <pointLight 
                    intensity={1.2} 
                    distance={12} 
                    color="#fbbf24" 
                    decay={2} 
                    castShadow={true}
                    shadow-mapSize={[512, 512]}
                />
            )}
        </group>
    );
};

export const Player: React.FC<PlayerProps> = ({ position, path, onMoveComplete, onPositionUpdate, onItemCollect, innerRef, grid, worldOrigin, visible = true, config, onClick, timeOfDay, weather }) => {
  const meshRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  
  // Limbs
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);

  // Helper object for rotation calculations
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const [hovered, setHovered] = useState(false);

  // Base speed impacted by weather
  const baseSpeed = 3.5;
  const weatherMultiplier = (weather === WeatherType.RAIN) ? 0.75 : (weather === WeatherType.STORM ? 0.6 : 1.0);
  const speed = baseSpeed * weatherMultiplier;
  
  const rotationSpeed = 3.0; // Slower rotation for smoother turns (was 6.0)

  const isDark = timeOfDay < 6 || timeOfDay > 18;

  // Ref to store current actual vector position to avoid jitter from state updates
  const initialLocalX = position.x - worldOrigin.x;
  const initialLocalZ = position.z - worldOrigin.z;
  const initialHeight = (grid[initialLocalZ]?.[initialLocalX]?.height || 0);

  const currentPosRef = useRef(new THREE.Vector3(position.x, initialHeight, position.z));
  
  // Track target node index in path
  const pathIndexRef = useRef(0);
  
  // Sound throttling
  const lastStepTime = useRef(0);

  // Animation State
  const animIntensity = useRef(0); // 0 = Idle, 1 = Walking

  // Expose the mesh ref to parent
  useImperativeHandle(innerRef, () => meshRef.current as THREE.Group);

  useEffect(() => {
    // When path changes, reset index (path[0] is current pos usually, so start moving to path[1])
    if (path.length > 0) {
      pathIndexRef.current = 1;
    }
  }, [path]);

  // Sync ref with props if changed externally
  useEffect(() => {
      if (Math.abs(position.x - currentPosRef.current.x) > 0.5 || Math.abs(position.z - currentPosRef.current.z) > 0.5) {
          const h = getTerrainHeight(position.x, position.z);
          currentPosRef.current.set(position.x, h, position.z);
      }
  }, [position]);

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

    let isMoving = false;

    if (path.length > 0 && pathIndexRef.current < path.length) {
      isMoving = true;
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
      if (state.clock.elapsedTime - lastStepTime.current > (0.35 / weatherMultiplier)) { 
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
          isMoving = false;
        }
      } else {
        // Smoothly rotate towards target
        // We look at the target but KEEP THE Y same as current position to ensure no tilting
        dummy.position.copy(currentPosRef.current);
        dummy.lookAt(targetNode.x, currentPosRef.current.y, targetNode.z);
        meshRef.current.quaternion.slerp(dummy.quaternion, delta * rotationSpeed);

        // Move towards node
        const direction = new THREE.Vector3().subVectors(targetVec, currentPosRef.current).normalize();
        
        // Move logic: interpolate
        currentPosRef.current.add(direction.multiplyScalar(step));
      }
    } else {
        // Idle: Snap Y to terrain smoothly
        const h = getTerrainHeight(currentPosRef.current.x, currentPosRef.current.z);
        // Slower terrain snap for weight (was 5)
        currentPosRef.current.y = THREE.MathUtils.lerp(currentPosRef.current.y, h, delta * 3);
    }

    // --- Advanced Animation Logic ---
    const targetIntensity = isMoving ? 1 : 0;
    // Slower blend for animation (was 8)
    animIntensity.current = THREE.MathUtils.lerp(animIntensity.current, targetIntensity, delta * 4);

    const time = state.clock.elapsedTime;
    const t = time * (10 * weatherMultiplier); // Walking Animation Speed scaled by move speed
    const intensity = animIntensity.current;

    // Legs: Standard sine wave walk cycle
    if(leftLegRef.current) {
        leftLegRef.current.rotation.x = Math.sin(t) * 0.6 * intensity;
        // Slight knee bend effect (visual only via slight scaling or z-rot)
        leftLegRef.current.position.y = 0.475 + (Math.sin(t) > 0 ? 0.05 * Math.sin(t) * intensity : 0);
    }
    if(rightLegRef.current) {
        rightLegRef.current.rotation.x = Math.sin(t + Math.PI) * 0.6 * intensity;
        rightLegRef.current.position.y = 0.475 + (Math.sin(t + Math.PI) > 0 ? 0.05 * Math.sin(t + Math.PI) * intensity : 0);
    }

    // Arms: Opposite to legs
    if(leftArmRef.current) {
        // Walking swing
        const walkArmX = Math.sin(t + Math.PI) * 0.5;
        const walkArmZ = 0.1;

        // Idle Sway (Breathing)
        const idleArmX = Math.sin(time * 1.5) * 0.05;
        const idleArmZ = 0.1 + Math.sin(time * 2) * 0.02; // Breathing out/in

        leftArmRef.current.rotation.x = THREE.MathUtils.lerp(idleArmX, walkArmX, intensity);
        leftArmRef.current.rotation.z = THREE.MathUtils.lerp(idleArmZ, walkArmZ, intensity);
    }
    if(rightArmRef.current) {
        // Walking swing
        const walkArmX = Math.sin(t) * 0.5;
        const walkArmZ = -0.1;

        // Idle Sway
        const idleArmX = Math.sin(time * 1.5 + 1) * 0.05;
        const idleArmZ = -0.1 - Math.sin(time * 2) * 0.02;

        rightArmRef.current.rotation.x = THREE.MathUtils.lerp(idleArmX, walkArmX, intensity);
        rightArmRef.current.rotation.z = THREE.MathUtils.lerp(idleArmZ, walkArmZ, intensity);
    }

    // Body: Bobbing and Swaying
    if(bodyRef.current) {
        // Walking Bob
        const walkBob = Math.abs(Math.sin(t)) * 0.05;
        const walkSwayZ = Math.cos(t) * 0.05;
        const walkSwayY = Math.sin(t) * 0.02;

        // Idle Bob (Breathing)
        const idleBob = Math.sin(time * 2) * 0.015;
        const idleSwayZ = Math.sin(time * 1) * 0.01;

        bodyRef.current.position.y = THREE.MathUtils.lerp(idleBob, walkBob, intensity);
        bodyRef.current.rotation.z = THREE.MathUtils.lerp(idleSwayZ, walkSwayZ, intensity);
        bodyRef.current.rotation.y = THREE.MathUtils.lerp(0, walkSwayY, intensity);
    }

    // Head: Look around slightly when idle
    if (headRef.current) {
        // Idle Look: Combine sine waves for natural random-ish movement
        const idleLookY = (Math.sin(time * 0.5) + Math.cos(time * 0.35)) * 0.15;
        const idleLookX = Math.sin(time * 0.2) * 0.05;
        
        // Stabilize head when walking
        headRef.current.rotation.y = THREE.MathUtils.lerp(idleLookY, 0, intensity);
        headRef.current.rotation.x = THREE.MathUtils.lerp(idleLookX, 0, intensity);
    }

    // Sync mesh position X/Z
    meshRef.current.position.x = currentPosRef.current.x;
    meshRef.current.position.z = currentPosRef.current.z;
    meshRef.current.position.y = currentPosRef.current.y;
  });

  return (
    <group 
        ref={meshRef} 
        position={[position.x, 0.5, position.z]} 
        visible={visible} 
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={() => { setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
    >
      {/* Occlusion Silhouette */}
      <mesh position={[0, 0.75, 0]}>
         <capsuleGeometry args={[0.25, 1.5, 4, 8]} />
         <meshBasicMaterial 
            color="#60a5fa" 
            transparent 
            opacity={0.2} 
            depthFunc={THREE.GreaterDepth} 
            depthWrite={false} 
         />
      </mesh>

      {hovered && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
              <ringGeometry args={[0.4, 0.45, 32]} />
              <meshBasicMaterial color="#fbbf24" opacity={0.5} transparent side={THREE.DoubleSide} />
          </mesh>
      )}

      {/* Container for bouncing */}
      <group ref={bodyRef}>
        
        {/* Torso */}
        <mesh castShadow position={[0, 0.7, 0]}>
            <boxGeometry args={[0.35, 0.45, 0.2]} />
            <meshStandardMaterial color={config.shirtColor} />
        </mesh>

        {/* Head */}
        <group position={[0, 1.05, 0]} ref={headRef}>
            <mesh castShadow>
                <boxGeometry args={[0.25, 0.25, 0.25]} />
                <meshStandardMaterial color={config.skinColor} />
            </mesh>
            {/* Eyes */}
            <mesh position={[0.08, 0.02, 0.13]}>
                <planeGeometry args={[0.04, 0.04]} />
                <meshBasicMaterial color="black" />
            </mesh>
            <mesh position={[-0.08, 0.02, 0.13]}>
                <planeGeometry args={[0.04, 0.04]} />
                <meshBasicMaterial color="black" />
            </mesh>
        </group>

        {/* Arms */}
        <group position={[0.22, 0.85, 0]} ref={leftArmRef}>
             <mesh position={[0, -0.15, 0]} castShadow>
                <boxGeometry args={[0.1, 0.35, 0.1]} />
                <meshStandardMaterial color={config.shirtColor} />
             </mesh>
             <mesh position={[0, -0.35, 0]}>
                <boxGeometry args={[0.1, 0.1, 0.1]} />
                <meshStandardMaterial color={config.skinColor} />
             </mesh>
        </group>

        <group position={[-0.22, 0.85, 0]} ref={rightArmRef}>
             <mesh position={[0, -0.15, 0]} castShadow>
                <boxGeometry args={[0.1, 0.35, 0.1]} />
                <meshStandardMaterial color={config.shirtColor} />
             </mesh>
             <mesh position={[0, -0.35, 0]}>
                <boxGeometry args={[0.1, 0.1, 0.1]} />
                <meshStandardMaterial color={config.skinColor} />
             </mesh>
             {/* LANTERN: Attached to right hand */}
             {isDark && <Lantern active={isDark} />}
        </group>

        {/* Backpack */}
        <mesh position={[0, 0.7, -0.15]} castShadow>
            <boxGeometry args={[0.25, 0.35, 0.15]} />
            <meshStandardMaterial color="#92400e" />
        </mesh>

      </group>

      {/* Legs (Detached from body ref so they don't sway with torso, moved by logic instead) */}
      <group position={[0.1, 0.475, 0]} ref={leftLegRef}>
          <mesh position={[0, -0.25, 0]} castShadow>
              <boxGeometry args={[0.12, 0.5, 0.12]} />
              <meshStandardMaterial color={config.pantsColor} />
          </mesh>
      </group>

      <group position={[-0.1, 0.475, 0]} ref={rightLegRef}>
          <mesh position={[0, -0.25, 0]} castShadow>
              <boxGeometry args={[0.12, 0.5, 0.12]} />
              <meshStandardMaterial color={config.pantsColor} />
          </mesh>
      </group>

    </group>
  );
};
