import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { TileType, ItemType, Enemy, EnemyType, NPC } from '../types';
import { COLORS, ITEM_COLORS, ENEMY_CONFIG } from '../constants';

// --- Geometries (Optimized low-poly) ---
export const boxGeo = new THREE.BoxGeometry(1, 1, 1);
export const coneGeo = new THREE.ConeGeometry(0.5, 1, 4); 
export const cylinderGeo = new THREE.CylinderGeometry(0.2, 0.2, 1, 5); 
export const sphereGeo = new THREE.SphereGeometry(0.3, 6, 6); 
export const dodecaGeo = new THREE.DodecahedronGeometry(0.3, 0);
export const pyramidGeo = new THREE.ConeGeometry(0.7, 1, 4);
export const enemyGeo = new THREE.SphereGeometry(0.4, 7, 7);
export const swordGeo = new THREE.BoxGeometry(0.1, 0.8, 0.1);
export const flaskGeo = new THREE.CylinderGeometry(0.15, 0.2, 0.4, 6);
export const coinGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.05, 8);
export const rockGeo = new THREE.DodecahedronGeometry(0.25, 0); 
export const postGeo = new THREE.BoxGeometry(0.15, 0.6, 0.15);
export const railGeo = new THREE.BoxGeometry(1, 0.1, 0.05);
export const flowerGeo = new THREE.ConeGeometry(0.1, 0.2, 5, 1, true); // Open cone for flower

// --- Components ---

export const PathLine: React.FC<{ points: [number, number, number][] }> = React.memo(({ points }) => {
  if (!points || points.length < 2) return null;
  return (
    <Line
      points={points}
      color="#fbbf24"
      lineWidth={3}
      dashed
      dashScale={2}
      dashSize={1}
      gapSize={1}
      position={[0, 0.1, 0]}
    />
  );
});

export const Bridge: React.FC<{ position: [number, number, number] }> = React.memo(({ position }) => {
    return (
        <group position={position}>
            {/* Planks - Scaled Up */}
            <mesh position={[0, 0, 0]} castShadow receiveShadow geometry={boxGeo} scale={[1.2, 0.15, 1.2]}>
                <meshStandardMaterial color="#78350f" />
            </mesh>
            {/* Rails */}
            <mesh position={[0.55, 0.4, 0]} geometry={boxGeo} scale={[0.15, 0.8, 1.2]}>
                <meshStandardMaterial color="#5d4037" />
            </mesh>
            <mesh position={[-0.55, 0.4, 0]} geometry={boxGeo} scale={[0.15, 0.8, 1.2]}>
                <meshStandardMaterial color="#5d4037" />
            </mesh>
        </group>
    );
});

export const CaveEntrance: React.FC<{ position: [number, number, number]; rotation?: number }> = React.memo(({ position, rotation = 0 }) => {
    return (
        <group position={position} rotation={[0, rotation, 0]}>
            {/* Outer Rock Shape - Larger */}
            <mesh position={[0, 1.5, 0]} geometry={dodecaGeo} scale={[2.5, 2.5, 2.5]}>
                <meshStandardMaterial color={COLORS.ROCK_DARK} />
            </mesh>
            {/* Dark Entrance 'Hole' */}
            <mesh position={[0, 0.5, 0.8]} rotation={[Math.PI/4, 0, 0]}>
                 <circleGeometry args={[0.8, 6]} />
                 <meshBasicMaterial color="#000000" />
            </mesh>
        </group>
    );
});

export const House: React.FC<{ position: [number, number, number]; style?: number; rotation?: number }> = React.memo(({ position, style = 0, rotation = 0 }) => {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Shared Details */}
      {/* Chimney - Scaled Up */}
      <mesh position={[0.6, 3.5, 0.6]} geometry={boxGeo} scale={[0.3, 1.2, 0.3]} castShadow>
          <meshStandardMaterial color="#4b5563" />
      </mesh>

      {style === 0 && ( // Cozy Cottage - Scaled 2x
        <>
          <mesh position={[0, 1.0, 0]} castShadow geometry={boxGeo} scale={[2.0, 2.0, 2.0]}>
            <meshStandardMaterial color={COLORS.HOUSE_WALL_A} />
          </mesh>
          <mesh position={[0, 2.5, 0]} castShadow geometry={coneGeo} rotation={[0, Math.PI / 4, 0]} scale={[2.8, 1.8, 2.8]}>
            <meshStandardMaterial color={COLORS.HOUSE_ROOF_A} />
          </mesh>
          {/* Door Frame */}
          <mesh position={[0, 0.6, 1.01]} geometry={boxGeo} scale={[0.6, 1.3, 0.1]}>
             <meshStandardMaterial color="#7f1d1d" />
          </mesh>
          {/* Door */}
          <mesh position={[0, 0.6, 1.05]} geometry={boxGeo} scale={[0.5, 1.2, 0.1]}>
            <meshStandardMaterial color="#451a03" />
          </mesh>
          {/* Window */}
          <mesh position={[0.6, 1.2, 1.01]} geometry={boxGeo} scale={[0.4, 0.4, 0.1]}>
            <meshStandardMaterial color="#fef3c7" emissive="#fef3c7" emissiveIntensity={0.5} />
          </mesh>
        </>
      )}

      {style === 1 && ( // Tall Tower - Scaled
        <>
          <mesh position={[0, 1.5, 0]} castShadow geometry={boxGeo} scale={[1.6, 3.0, 1.6]}>
            <meshStandardMaterial color={COLORS.HOUSE_WALL_B} />
          </mesh>
          <mesh position={[0, 3.5, 0]} castShadow geometry={coneGeo} rotation={[0, 0, 0]} scale={[2.0, 2.0, 2.0]}>
            <meshStandardMaterial color={COLORS.HOUSE_ROOF_B} />
          </mesh>
          <mesh position={[0, 0.8, 0.81]} geometry={boxGeo} scale={[0.5, 1.2, 0.1]}>
            <meshStandardMaterial color="#451a03" />
          </mesh>
          <mesh position={[0, 2.4, 0.81]} geometry={boxGeo} scale={[0.4, 0.6, 0.1]}>
            <meshStandardMaterial color="#fef3c7" emissive="#fef3c7" emissiveIntensity={0.5} />
          </mesh>
        </>
      )}

      {style === 2 && ( // Desert Adobe - Scaled
        <>
           <mesh position={[0, 0.9, 0]} castShadow geometry={boxGeo} scale={[2.2, 1.8, 2.0]}>
            <meshStandardMaterial color={COLORS.HOUSE_WALL_C} />
          </mesh>
          <mesh position={[0.8, 1.6, 0]} castShadow geometry={boxGeo} scale={[0.8, 2.8, 0.8]}>
            <meshStandardMaterial color={COLORS.HOUSE_WALL_C} />
          </mesh>
          <mesh position={[0, 1.9, 0]} castShadow geometry={boxGeo} scale={[2.0, 0.2, 1.8]}>
            <meshStandardMaterial color={COLORS.HOUSE_ROOF_C} />
          </mesh>
          <mesh position={[0, 0.7, 1.01]} geometry={boxGeo} scale={[0.5, 1.2, 0.1]}>
            <meshStandardMaterial color="#451a03" />
          </mesh>
        </>
      )}
    </group>
  );
});

export const StreetLamp: React.FC<{ position: [number, number, number]; active?: boolean; onClick?: () => void }> = React.memo(({ position, active = true, onClick }) => {
  return (
    <group 
      position={position}
      onClick={(e) => {
        if (onClick) {
          e.stopPropagation();
          onClick();
        }
      }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
      onPointerOut={(e) => { document.body.style.cursor = 'auto'; }}
    >
      <mesh position={[0, 1.5, 0]} castShadow geometry={cylinderGeo} scale={[0.2, 3.0, 0.2]}>
        <meshStandardMaterial color="#334155" />
      </mesh>
       <mesh position={[0, 2.8, 0]} castShadow geometry={boxGeo} scale={[0.6, 0.8, 0.6]}>
        <meshStandardMaterial 
            color={active ? "#fbbf24" : "#64748b"} 
            emissive={active ? "#fbbf24" : "#000000"} 
            emissiveIntensity={active ? 2 : 0} 
            transparent 
            opacity={0.9} 
        />
      </mesh>
       <mesh position={[0, 3.3, 0]} castShadow geometry={coneGeo} scale={[0.8, 0.3, 0.8]}>
        <meshStandardMaterial color="#334155" />
      </mesh>
      {active && (
        <pointLight position={[0, 2.8, 0]} intensity={1} distance={10} color="#fbbf24" decay={2} castShadow={false} />
      )}
    </group>
  );
});

export const NPCMesh: React.FC<{ npc: NPC; onClick: () => void }> = ({ npc, onClick }) => {
    const ref = useRef<THREE.Group>(null);
    useFrame((state) => {
        if(ref.current) {
            // Idle bobbing
            ref.current.position.y = 0.5 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
        }
    });

    return (
        <group ref={ref} position={[npc.position.x, 0.5, npc.position.z]} onClick={(e) => { e.stopPropagation(); onClick(); }}>
            {/* Body */}
            <mesh castShadow position={[0, 0.4, 0]}>
                <capsuleGeometry args={[0.3, 0.8, 4, 8]} />
                <meshStandardMaterial color="#1e293b" /> {/* Dark suit/robes */}
            </mesh>
            {/* Head */}
            <mesh position={[0, 0.95, 0]}>
                <sphereGeometry args={[0.25]} />
                <meshStandardMaterial color="#fca5a5" />
            </mesh>
            {/* Beard */}
            <mesh position={[0, 0.85, 0.15]} rotation={[0.2,0,0]}>
                <coneGeometry args={[0.25, 0.4, 8]} />
                <meshStandardMaterial color="#94a3b8" /> {/* Grey beard */}
            </mesh>
            {/* Hat */}
            <mesh position={[0, 1.15, 0]}>
                <coneGeometry args={[0.4, 0.4, 8]} />
                <meshStandardMaterial color="#0f172a" />
            </mesh>
             {/* Exclamation Mark (Quest Giver) */}
             <group position={[0, 1.8, 0]}>
                <mesh position={[0, 0.3, 0]}>
                    <sphereGeometry args={[0.1]} />
                    <meshBasicMaterial color="#fbbf24" />
                </mesh>
                 <mesh position={[0, 0, 0]} rotation={[Math.PI, 0, 0]}>
                    <coneGeometry args={[0.08, 0.4, 4]} />
                    <meshBasicMaterial color="#fbbf24" />
                </mesh>
             </group>
        </group>
    );
};

export const EnemyMesh: React.FC<{ enemy: Enemy; onClick: () => void; terrainHeight?: number }> = ({ enemy, onClick, terrainHeight = 0 }) => {
    const meshRef = useRef<THREE.Group>(null);
    const healthPercent = Math.max(0, enemy.hp / enemy.maxHp);
    const config = ENEMY_CONFIG[enemy.type] || ENEMY_CONFIG[EnemyType.SLIME];
    
    useFrame((state) => {
        if(meshRef.current) {
            // Animation varies by type, but relative to terrainHeight
            // Base height shift to put bottom on ground
            let yOffset = 0.4; 
            let bounce = 0;

            if (enemy.type === EnemyType.GHOST) {
               yOffset = 0.8; 
               bounce = Math.sin(state.clock.elapsedTime * 2) * 0.2;
            } else if (enemy.type === EnemyType.GOLEM) {
               yOffset = 0.75;
               bounce = Math.abs(Math.sin(state.clock.elapsedTime * 2)) * 0.1;
            } else {
               // Slime Bounce
               yOffset = 0.4;
               bounce = Math.abs(Math.sin(state.clock.elapsedTime * 4)) * 0.3;
            }
            
            // Set Y to terrain height + model offset + animation
            meshRef.current.position.y = terrainHeight + yOffset + bounce;
            meshRef.current.rotation.y += 0.01;
        }
    });

    // Initial position set by parent, but Y is controlled by useFrame
    return (
        <group ref={meshRef} position={[enemy.position.x, 0, enemy.position.z]} onClick={(e) => { e.stopPropagation(); onClick(); }}>
             {/* Visual Body */}
             {enemy.type === EnemyType.GHOST && (
                 <>
                    <mesh castShadow geometry={coneGeo} scale={[0.8, 0.8, 0.8]} position={[0, 0.2, 0]}>
                        <meshStandardMaterial color={config.color} transparent opacity={0.8} />
                    </mesh>
                     <mesh castShadow geometry={sphereGeo} scale={0.5} position={[0, 0.6, 0]}>
                        <meshStandardMaterial color={config.color} transparent opacity={0.8} />
                    </mesh>
                 </>
             )}
             {enemy.type === EnemyType.GOLEM && (
                 <>
                    <mesh castShadow geometry={boxGeo} scale={[1.2, 1.5, 1.2]} position={[0, 0.5, 0]}>
                        <meshStandardMaterial color={config.color} roughness={0.9} />
                    </mesh>
                    <mesh position={[0, 1.3, 0]} geometry={boxGeo} scale={[0.6, 0.6, 0.6]}>
                         <meshStandardMaterial color={config.color} />
                    </mesh>
                 </>
             )}
             {enemy.type === EnemyType.SLIME && (
                <mesh castShadow geometry={enemyGeo} scale={[1, 0.8, 1]}>
                    <meshStandardMaterial color={config.color} emissive={config.color} emissiveIntensity={0.2} roughness={0.2} />
                </mesh>
             )}

            {/* Eyes */}
            <mesh position={[0.2, enemy.type === EnemyType.GOLEM ? 1.3 : (enemy.type === EnemyType.GHOST ? 0.6 : 0.2), 0.3]} geometry={sphereGeo} scale={0.15}>
                <meshBasicMaterial color={enemy.type === EnemyType.GOLEM ? "red" : "white"} />
            </mesh>
             <mesh position={[-0.2, enemy.type === EnemyType.GOLEM ? 1.3 : (enemy.type === EnemyType.GHOST ? 0.6 : 0.2), 0.3]} geometry={sphereGeo} scale={0.15}>
                <meshBasicMaterial color={enemy.type === EnemyType.GOLEM ? "red" : "white"} />
            </mesh>

            {/* Health Bar */}
            <group position={[0, enemy.type === EnemyType.GOLEM ? 2.2 : 1.2, 0]}>
                <mesh position={[0, 0, 0]}>
                    <planeGeometry args={[1, 0.15]} />
                    <meshBasicMaterial color="#333" />
                </mesh>
                <mesh position={[(-0.5 + (healthPercent * 0.5)), 0, 0.01]}>
                    <planeGeometry args={[healthPercent, 0.1]} />
                    <meshBasicMaterial color={healthPercent > 0.5 ? "#22c55e" : "#ef4444"} />
                </mesh>
            </group>
        </group>
    )
}

export const ItemMesh: React.FC<{ type: ItemType; position: [number, number, number] }> = ({ type, position }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.02;
    }
    if (groupRef.current) {
        groupRef.current.position.y = 0.5 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });

  if (type === ItemType.GOLD) {
      return (
        <group ref={groupRef} position={[position[0], 0, position[2]]}>
            <group rotation={[0, 0, 0]}>
                <mesh geometry={coinGeo} position={[0, 0, 0]}>
                    <meshStandardMaterial color={ITEM_COLORS[type]} metalness={0.9} roughness={0.2} />
                </mesh>
                 <mesh geometry={coinGeo} position={[0.1, 0.05, 0.1]} rotation={[0,0.5,0]}>
                    <meshStandardMaterial color={ITEM_COLORS[type]} metalness={0.9} roughness={0.2} />
                </mesh>
                 <mesh geometry={coinGeo} position={[-0.05, 0.05, -0.05]} rotation={[0,0.2,0]}>
                    <meshStandardMaterial color={ITEM_COLORS[type]} metalness={0.9} roughness={0.2} />
                </mesh>
            </group>
             <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.05, 0]}>
                <ringGeometry args={[0.2, 0.25, 6]} />
                <meshBasicMaterial color="yellow" opacity={0.6} transparent />
            </mesh>
        </group>
      )
  }

  // Sword needs visual adjustment
  if (type === ItemType.SWORD) {
     return (
        <group position={[position[0], 0.5, position[2]]}>
            <group rotation={[0,0, Math.PI / 4]}>
                <mesh geometry={swordGeo}>
                     <meshStandardMaterial color={ITEM_COLORS[type]} metalness={0.8} roughness={0.2} />
                </mesh>
                {/* Handle */}
                <mesh position={[0, -0.3, 0]} geometry={boxGeo} scale={[0.3, 0.05, 0.1]}>
                    <meshStandardMaterial color="#333" />
                </mesh>
            </group>
             <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -0.4, 0]}>
                <ringGeometry args={[0.2, 0.25, 6]} />
                <meshBasicMaterial color="cyan" opacity={0.4} transparent />
            </mesh>
        </group>
     )
  }

   if (type === ItemType.SONS_WATCH) {
     return (
        <group ref={groupRef} position={[position[0], 0, position[2]]}>
            <mesh rotation={[Math.PI/2, 0, 0]} castShadow>
                <cylinderGeometry args={[0.2, 0.2, 0.05, 16]} />
                <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.1} />
            </mesh>
             <mesh rotation={[Math.PI/2, 0, 0]} position={[0, 0.03, 0]}>
                <ringGeometry args={[0.15, 0.18, 16]} />
                <meshBasicMaterial color="#fbbf24" />
            </mesh>
             {/* Sparkle */}
             <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.05, 0]}>
                <ringGeometry args={[0.3, 0.35, 6]} />
                <meshBasicMaterial color="white" opacity={0.8} transparent />
            </mesh>
        </group>
     )
  }

  const geometry = useMemo(() => {
    switch(type) {
        case ItemType.GEM: return dodecaGeo;
        case ItemType.IRON_ORE: return rockGeo;
        case ItemType.COAL: return rockGeo;
        case ItemType.POTION: return flaskGeo;
        default: return sphereGeo;
    }
  }, [type]);

  const materialProps = useMemo(() => {
      switch(type) {
          case ItemType.GEM: 
            return { metalness: 0.9, roughness: 0.1, opacity: 0.9, transparent: true };
          case ItemType.IRON_ORE: 
            return { metalness: 0.6, roughness: 0.7 };
          case ItemType.COAL: 
            return { metalness: 0.2, roughness: 1.0 };
          case ItemType.POTION: 
            return { opacity: 0.8, transparent: true, emissiveIntensity: 0.6 };
          default: 
            return { metalness: 0.2, roughness: 0.5 };
      }
  }, [type]);

  return (
    <group ref={groupRef} position={[position[0], 0, position[2]]}>
      <mesh ref={meshRef} castShadow geometry={geometry}>
        <meshStandardMaterial 
            color={ITEM_COLORS[type]} 
            emissive={ITEM_COLORS[type]} 
            emissiveIntensity={materialProps.emissiveIntensity || 0.1}
            {...materialProps}
        />
      </mesh>
      {/* Sparkle effect plane */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[0.2, 0.25, 6]} />
        <meshBasicMaterial color="white" opacity={0.5} transparent />
      </mesh>
    </group>
  );
};