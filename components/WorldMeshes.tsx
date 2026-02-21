
import React, { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import { TileType, ItemType, Enemy, EnemyType, NPC, Position } from '../types';
import { COLORS, ITEM_COLORS, ENEMY_CONFIG } from '../constants';

// --- Geometries ---
export const boxGeo = new THREE.BoxGeometry(1, 1, 1);
export const coneGeo = new THREE.ConeGeometry(0.5, 1, 8); 
export const cylinderGeo = new THREE.CylinderGeometry(0.2, 0.2, 1, 12); 
export const sphereGeo = new THREE.SphereGeometry(0.3, 16, 16); 
export const dodecaGeo = new THREE.DodecahedronGeometry(0.3, 0);
export const icosaGeo = new THREE.IcosahedronGeometry(0.3, 0); 
export const pyramidGeo = new THREE.ConeGeometry(0.7, 1, 4);
export const enemyGeo = new THREE.SphereGeometry(0.4, 16, 16);
export const swordGeo = new THREE.BoxGeometry(0.1, 0.8, 0.1);
export const flaskGeo = new THREE.CylinderGeometry(0.15, 0.2, 0.4, 12);
export const coinGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.05, 16);
export const rockGeo = new THREE.DodecahedronGeometry(0.25, 1); 
export const postGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.6, 8); 
export const railGeo = new THREE.BoxGeometry(1, 0.1, 0.05);
export const flowerGeo = new THREE.ConeGeometry(0.1, 0.2, 7, 1, true); 
export const barrelGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.7, 12);
export const crateGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
export const mushroomCapGeo = new THREE.ConeGeometry(0.2, 0.2, 8);
export const mushroomStemGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.2, 6);
export const pebbleGeo = new THREE.IcosahedronGeometry(0.1, 0);

// --- Components ---

const FocusRing: React.FC<{ active: boolean; color?: string; size?: number }> = ({ active, color = '#fbbf24', size = 0.5 }) => {
    const ref = useRef<THREE.Mesh>(null);
    useFrame((state) => {
        if (ref.current && active) {
            ref.current.rotation.z += 0.02;
            const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.1;
            ref.current.scale.set(scale, scale, 1);
        }
    });
    if (!active) return null;
    return (
        <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
            <ringGeometry args={[size * 0.8, size, 32]} />
            <meshBasicMaterial color={color} opacity={0.6} transparent side={THREE.DoubleSide} />
        </mesh>
    );
};

export const DestinationMarker: React.FC<{ position: Position }> = ({ position }) => {
    const ref = useRef<THREE.Group>(null);
    useFrame((state) => {
        if (ref.current) {
            const t = state.clock.elapsedTime;
            ref.current.position.y = 0.5 + Math.sin(t * 5) * 0.1;
            ref.current.rotation.y = t * 2;
        }
    });

    return (
        <group ref={ref} position={[position.x, 0.5, position.z]}>
            {/* Pulsing Target Arrow */}
            <mesh rotation={[Math.PI, 0, 0]} position={[0, 0, 0]}>
                <coneGeometry args={[0.2, 0.4, 4]} />
                <meshStandardMaterial color="#3b82f6" emissive="#60a5fa" emissiveIntensity={2} toneMapped={false} />
            </mesh>
            {/* Ground Ring */}
            <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -0.45, 0]}>
                <ringGeometry args={[0.3, 0.35, 16]} />
                <meshBasicMaterial color="#3b82f6" transparent opacity={0.5} side={THREE.DoubleSide} />
            </mesh>
        </group>
    );
};

interface InteractionCueProps {
    position: [number, number, number];
    playerPos?: Position;
    range?: number;
    text?: string;
    color?: string;
    icon?: 'arrow' | 'exclamation';
}

export const InteractionCue: React.FC<InteractionCueProps> = ({ position, playerPos, range = 3.5, text, color = '#fbbf24', icon = 'arrow' }) => {
    const meshRef = useRef<THREE.Group>(null);
    const isVisible = useMemo(() => {
        if (!playerPos) return false;
        const dist = Math.sqrt(Math.pow(position[0] - playerPos.x, 2) + Math.pow(position[2] - playerPos.z, 2));
        return dist < range;
    }, [playerPos, position, range]);

    useFrame((state) => {
        if (!meshRef.current) return;
        if (isVisible) {
            const t = state.clock.elapsedTime;
            meshRef.current.position.y = position[1] + Math.sin(t * 2) * 0.05;
            meshRef.current.rotation.y = t * 1.0;
        }
    });

    if (!isVisible) return null;

    return (
        <group ref={meshRef} position={position}>
            {icon === 'exclamation' ? (
                <group scale={0.8}>
                    <mesh position={[0, 0.35, 0]}>
                        <capsuleGeometry args={[0.08, 0.4, 4, 8]} />
                        <meshBasicMaterial color={color} toneMapped={false} />
                    </mesh>
                    <mesh position={[0, -0.1, 0]}>
                        <sphereGeometry args={[0.08, 8, 8]} />
                        <meshBasicMaterial color={color} toneMapped={false} />
                    </mesh>
                </group>
            ) : (
                <mesh position={[0, 0, 0]} rotation={[Math.PI, 0, 0]} scale={0.8}>
                    <coneGeometry args={[0.15, 0.3, 4]} />
                    <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.9} />
                </mesh>
            )}
            {text && (
                <Html position={[0, 0.6, 0]} center distanceFactor={10} zIndexRange={[100, 0]}>
                    <div className="pointer-events-none flex items-center gap-1.5 whitespace-nowrap bg-black/80 backdrop-blur-md text-white px-3 py-1.5 rounded-lg text-[11px] font-bold border border-white/20 shadow-2xl tracking-wide opacity-95 animate-in fade-in zoom-in duration-200">
                        <span className="flex items-center justify-center w-5 h-5 bg-yellow-500 text-black rounded text-[10px] font-black shadow-inner">E</span>
                        <span className="uppercase text-slate-100">{text}</span>
                    </div>
                </Html>
            )}
        </group>
    );
};

export const Bobber: React.FC<{ position: Position; alert: boolean }> = ({ position, alert }) => {
    const ref = useRef<THREE.Group>(null);
    useFrame((state) => {
        if (ref.current) {
            let y = -0.4 + Math.sin(state.clock.elapsedTime * 3) * 0.05;
            if (alert) {
                y -= 0.1;
                ref.current.position.x = position.x + (Math.random() - 0.5) * 0.05;
                ref.current.position.z = position.z + (Math.random() - 0.5) * 0.05;
            } else { ref.current.position.x = position.x; ref.current.position.z = position.z; }
            ref.current.position.y = y;
        }
    });
    return (
        <group ref={ref} position={[position.x, 0, position.z]}>
             <mesh position={[0, 0.1, 0]}><sphereGeometry args={[0.1, 8, 8]} /><meshStandardMaterial color="#ef4444" /></mesh>
             <mesh position={[0, 0, 0]}><sphereGeometry args={[0.1, 8, 8]} /><meshStandardMaterial color="#f8fafc" /></mesh>
             {alert && (
                 <group position={[0, 0.5, 0]}>
                     <mesh position={[0, 0.25, 0]}><boxGeometry args={[0.05, 0.3, 0.05]} /><meshBasicMaterial color="#facc15" toneMapped={false} /></mesh>
                     <mesh position={[0, 0, 0]}><boxGeometry args={[0.05, 0.05, 0.05]} /><meshBasicMaterial color="#facc15" toneMapped={false} /></mesh>
                 </group>
             )}
        </group>
    );
}

export const Car: React.FC<{ position: [number, number, number]; rotation?: number; playerPos?: Position }> = React.memo(({ position, rotation = 0, playerPos }) => {
    return (
        <group position={position} rotation={[0, rotation, 0]}>
            <InteractionCue position={[0, 2.2, 0]} playerPos={playerPos} text="Inspect Engine" color="#ef4444" icon="exclamation" />
            <mesh position={[0, 0.4, 0]} castShadow receiveShadow geometry={boxGeo} scale={[1.2, 0.5, 2.2]}><meshStandardMaterial color="#ef4444" /></mesh>
            <mesh position={[0, 0.9, -0.2]} castShadow receiveShadow geometry={boxGeo} scale={[1.0, 0.5, 1.2]}><meshStandardMaterial color="#ef4444" /></mesh>
            <mesh position={[0, 0.9, -0.2]} geometry={boxGeo} scale={[1.02, 0.45, 0.8]}><meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.1} /></mesh>
            <mesh position={[0.4, 0.4, 1.05]} geometry={sphereGeo} scale={0.15}><meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={2} /></mesh>
            <mesh position={[-0.4, 0.4, 1.05]} geometry={sphereGeo} scale={0.15}><meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={2} /></mesh>
            <mesh position={[0.55, 0.3, 0.6]} rotation={[0, 0, Math.PI/2]} geometry={cylinderGeo} scale={[0.4, 0.2, 0.4]}><meshStandardMaterial color="#1e293b" /></mesh>
            <mesh position={[-0.55, 0.3, 0.6]} rotation={[0, 0, Math.PI/2]} geometry={cylinderGeo} scale={[0.4, 0.2, 0.4]}><meshStandardMaterial color="#1e293b" /></mesh>
            <mesh position={[0.55, 0.3, -0.8]} rotation={[0, 0, Math.PI/2]} geometry={cylinderGeo} scale={[0.4, 0.2, 0.4]}><meshStandardMaterial color="#1e293b" /></mesh>
            <mesh position={[-0.55, 0.3, -0.8]} rotation={[0, 0, Math.PI/2]} geometry={cylinderGeo} scale={[0.4, 0.2, 0.4]}><meshStandardMaterial color="#1e293b" /></mesh>
        </group>
    )
});

export const PathLine: React.FC<{ points: [number, number, number][] }> = React.memo(({ points }) => {
  const lineRef = useRef<any>(null);
  useFrame((state) => { if (lineRef.current) { lineRef.current.material.opacity = 0.4 + Math.sin(state.clock.elapsedTime * 4) * 0.2; lineRef.current.material.dashOffset -= 0.05; } });
  if (!points || points.length < 2) return null;
  return (
    <group position={[0, 0.05, 0]}>
         <mesh position={points[points.length - 1]}><ringGeometry args={[0.3, 0.35, 16]} /><meshBasicMaterial color="#fbbf24" opacity={0.6} transparent side={THREE.DoubleSide} /></mesh>
         <Line ref={lineRef} points={points} color="#fbbf24" lineWidth={3} dashed dashScale={1} dashSize={0.5} gapSize={0.5} transparent opacity={0.6} position={[0, 0.1, 0]} />
    </group>
  );
});

export const Bridge: React.FC<{ position: [number, number, number] }> = React.memo(({ position }) => {
    return (
        <group position={position}>
            <mesh position={[0, 0, 0]} castShadow receiveShadow geometry={boxGeo} scale={[1.4, 0.15, 1.4]}><meshStandardMaterial color="#78350f" /></mesh>
            <mesh position={[0.65, 0.4, 0]} geometry={boxGeo} scale={[0.15, 0.8, 1.4]}><meshStandardMaterial color="#5d4037" /></mesh>
            <mesh position={[-0.65, 0.4, 0]} geometry={boxGeo} scale={[0.15, 0.8, 1.4]}><meshStandardMaterial color="#5d4037" /></mesh>
            <mesh position={[0.6, -1.0, 0]} geometry={cylinderGeo} scale={[0.5, 2.0, 0.5]}><meshStandardMaterial color="#5d4037" /></mesh>
            <mesh position={[-0.6, -1.0, 0]} geometry={cylinderGeo} scale={[0.5, 2.0, 0.5]}><meshStandardMaterial color="#5d4037" /></mesh>
        </group>
    );
});

export const CaveEntrance: React.FC<{ position: [number, number, number]; rotation?: number; playerPos?: Position }> = React.memo(({ position, rotation = 0, playerPos }) => {
    return (
        <group position={position} rotation={[0, rotation, 0]}>
            <InteractionCue position={[0, 3.5, 0]} playerPos={playerPos} text="Explore Cave" color="#a855f7" icon="arrow" />
            <mesh position={[0, 1.8, 0]} geometry={dodecaGeo} scale={[3.0, 3.5, 3.0]}><meshStandardMaterial color={COLORS.ROCK_DARK} /></mesh>
            <mesh position={[1.5, 0.5, 0.5]} geometry={dodecaGeo} scale={[1.5, 1.5, 1.5]}><meshStandardMaterial color={COLORS.ROCK} /></mesh>
             <mesh position={[-1.5, 0.5, 0.5]} geometry={dodecaGeo} scale={[1.2, 1.2, 1.2]}><meshStandardMaterial color={COLORS.ROCK} /></mesh>
            <mesh position={[0, 0.5, 0.8]} rotation={[Math.PI/4, 0, 0]}><circleGeometry args={[1.0, 8]} /><meshBasicMaterial color="#000000" /></mesh>
             <mesh position={[0, 0.5, 0.5]} rotation={[0, 0, 0]}><sphereGeometry args={[0.9, 8, 8]} /><meshBasicMaterial color="#000000" side={THREE.BackSide} /></mesh>
        </group>
    );
});

interface HouseProps { position: [number, number, number]; style?: number; rotation?: number; playerPos?: Position; looted?: boolean; onClick?: () => void; }

export const House: React.FC<HouseProps> = React.memo(({ position, style = 0, rotation = 0, playerPos, looted = false, onClick }) => {
  const [hovered, setHovered] = useState(false);
  const doorRef = useRef<THREE.Group>(null);
  const isNear = useMemo(() => { if (!playerPos) return false; const d = Math.sqrt(Math.pow(position[0] - playerPos.x, 2) + Math.pow(position[2] - playerPos.z, 2)); return d < 3.5; }, [playerPos, position]);
  useFrame((state, delta) => { if (doorRef.current) { const target = looted ? Math.PI / 2.5 : 0; doorRef.current.rotation.y = THREE.MathUtils.lerp(doorRef.current.rotation.y, target, delta * 2); } });
  const windowMat = useMemo(() => <meshStandardMaterial color={looted ? "#1e293b" : "#fef3c7"} emissive={looted ? "#000000" : "#fef3c7"} emissiveIntensity={looted ? 0 : 0.8} roughness={0.2} />, [looted]);

  return (
    <group position={position} rotation={[0, rotation, 0]} onClick={(e) => { e.stopPropagation(); onClick?.(); }} onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }} onPointerOut={(e) => { setHovered(false); document.body.style.cursor = 'auto'; }}>
      {!looted && <InteractionCue position={[0, style === 1 ? 5.5 : 4.5, 0]} playerPos={playerPos} text="Search House" range={4.5} />}
      <FocusRing active={hovered || (isNear && !looted)} size={2.5} />
      <mesh position={[0, 0.05, 0]} receiveShadow rotation={[-Math.PI/2, 0, 0]}><planeGeometry args={[3.8, 3.8]} /><meshStandardMaterial color="#57534e" /> </mesh>
      <mesh position={[0, 1.5, 0]} castShadow geometry={boxGeo} scale={[3.0, 3.0, 3.0]}><meshStandardMaterial color={style === 1 ? COLORS.HOUSE_WALL_B : (style === 2 ? COLORS.HOUSE_WALL_C : COLORS.HOUSE_WALL_A)} /></mesh>
      <group ref={doorRef} position={[-0.35, 1.0, 1.55]}> <mesh position={[0.35, 0, 0]} geometry={boxGeo} scale={[0.7, 1.7, 0.1]}><meshStandardMaterial color="#451a03" /></mesh> </group>
    </group>
  );
});

export const StreetLamp: React.FC<{ position: [number, number, number]; active?: boolean; onClick?: () => void; playerPos?: Position }> = React.memo(({ position, active = true, onClick, playerPos }) => {
  const [hovered, setHovered] = useState(false);
  const isNear = useMemo(() => { if (!playerPos) return false; const d = Math.sqrt(Math.pow(position[0] - playerPos.x, 2) + Math.pow(position[2] - playerPos.z, 2)); return d < 3.0; }, [playerPos, position]);
  return (
    <group position={position} onClick={(e) => { if (onClick) { e.stopPropagation(); onClick(); } }} onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }} onPointerOut={(e) => { setHovered(false); document.body.style.cursor = 'auto'; }}>
      <InteractionCue position={[0, 5.5, 0]} playerPos={playerPos} text="Toggle Light" color={active ? '#60a5fa' : '#fbbf24'} range={3.0} />
      <FocusRing active={hovered || isNear} size={0.5} color={active ? '#60a5fa' : '#fbbf24'} />
      <mesh position={[0, 2.0, 0]} castShadow geometry={cylinderGeo} scale={[0.3, 4.0, 0.3]}><meshStandardMaterial color="#334155" /></mesh>
       <mesh position={[0, 3.8, 0]} castShadow geometry={boxGeo} scale={[0.8, 1.0, 0.8]}><meshStandardMaterial color={active ? "#fbbf24" : "#64748b"} emissive={active ? "#fbbf24" : "#000000"} emissiveIntensity={active ? 2 : 0} transparent opacity={0.9} /></mesh>
      {active && <pointLight position={[0, 3.8, 0]} intensity={1.5} distance={15} color="#fbbf24" decay={2} castShadow={false} />}
    </group>
  );
});

export const NPCMesh: React.FC<{ npc: NPC; onClick: () => void; playerPos?: Position }> = ({ npc, onClick, playerPos }) => {
    const ref = useRef<THREE.Group>(null);
    const [hovered, setHovered] = useState(false);
    useFrame((state) => { if(ref.current) ref.current.position.y = 0.5 + Math.sin(state.clock.elapsedTime * 1.5) * 0.03; });
    const isNear = useMemo(() => { if (!playerPos) return false; const d = Math.sqrt(Math.pow(npc.position.x - playerPos.x, 2) + Math.pow(npc.position.z - playerPos.z, 2)); return d < 3.5; }, [playerPos, npc.position]);

    const colors = useMemo(() => {
        if (npc.role === 'QUEST_GIVER') return { body: '#475569', head: '#e2e8f0', hat: '#334155', accent: '#3b82f6', skin: '#d6d3d1' };
        if (npc.role === 'MERCHANT') return { body: '#713f12', head: '#fdba74', hat: '#78350f', accent: '#f59e0b', skin: '#fdba74' };
        return { body: '#3f6212', head: '#fca5a5', hat: '#14532d', accent: '#84cc16', skin: '#fca5a5' };
    }, [npc.role]);

    return (
        <group ref={ref} position={[npc.position.x, 0.5, npc.position.z]} onClick={(e) => { e.stopPropagation(); onClick(); }} onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }} onPointerOut={(e) => { setHovered(false); document.body.style.cursor = 'auto'; }}>
            <InteractionCue position={[0, 2.5, 0]} playerPos={playerPos} text={npc.role === 'QUEST_GIVER' ? "Quest" : (npc.role === 'MERCHANT' ? "Trade" : "Talk")} color={colors.accent} icon="exclamation" />
            <FocusRing active={hovered || isNear} size={0.6} color={colors.accent} />
            
            {/* Body */}
            <mesh castShadow position={[0, 0.4, 0]}>
                <cylinderGeometry args={[0.22, 0.25, 0.8, 8]} />
                <meshStandardMaterial color={colors.body} />
            </mesh>
            
            {/* Head */}
            <mesh castShadow position={[0, 0.95, 0]}>
                <boxGeometry args={[0.3, 0.35, 0.3]} />
                <meshStandardMaterial color={colors.skin} />
            </mesh>

            {/* Hat */}
            {npc.role === 'MERCHANT' ? (
                <group position={[0, 1.15, 0]}>
                    <mesh position={[0, 0, 0]}>
                        <cylinderGeometry args={[0.4, 0.4, 0.05, 8]} />
                        <meshStandardMaterial color={colors.hat} />
                    </mesh>
                    <mesh position={[0, 0.15, 0]}>
                        <cylinderGeometry args={[0.2, 0.2, 0.3, 8]} />
                        <meshStandardMaterial color={colors.hat} />
                    </mesh>
                </group>
            ) : npc.role === 'QUEST_GIVER' ? (
                // Old Man Hat + Beard
                <group>
                    <mesh position={[0, 1.15, 0]}>
                        <coneGeometry args={[0.35, 0.4, 8]} />
                        <meshStandardMaterial color={colors.hat} />
                    </mesh>
                    {/* Beard */}
                    <mesh position={[0, 0.85, 0.15]}>
                        <boxGeometry args={[0.2, 0.25, 0.1]} />
                        <meshStandardMaterial color="#e5e5e5" />
                    </mesh>
                </group>
            ) : (
                // Villager Hair
                <mesh position={[0, 1.15, 0]}>
                    <boxGeometry args={[0.32, 0.1, 0.32]} />
                    <meshStandardMaterial color={colors.hat} />
                </mesh>
            )}

            {/* Merchant Backpack */}
            {npc.role === 'MERCHANT' && (
                <group position={[0, 0.6, -0.25]}>
                    <mesh castShadow>
                        <boxGeometry args={[0.4, 0.6, 0.3]} />
                        <meshStandardMaterial color="#854d0e" />
                    </mesh>
                    <mesh position={[0, 0.3, 0]} rotation={[0, 0, Math.PI/2]}>
                        <cylinderGeometry args={[0.1, 0.1, 0.42, 8]} />
                        <meshStandardMaterial color="#a16207" />
                    </mesh>
                </group>
            )}

            {/* Face details */}
            <mesh position={[0.08, 0.98, 0.16]}>
                <planeGeometry args={[0.05, 0.05]} />
                <meshBasicMaterial color="black" />
            </mesh>
            <mesh position={[-0.08, 0.98, 0.16]}>
                <planeGeometry args={[0.05, 0.05]} />
                <meshBasicMaterial color="black" />
            </mesh>
        </group>
    );
};

export const Barrel: React.FC<{ position: [number, number, number]; playerPos?: Position; looted: boolean; onClick: () => void }> = React.memo(({ position, playerPos, looted, onClick }) => {
    const [hovered, setHovered] = useState(false);
    const isNear = useMemo(() => { if (!playerPos) return false; const d = Math.sqrt(Math.pow(position[0] - playerPos.x, 2) + Math.pow(position[2] - playerPos.z, 2)); return d < 2.5; }, [playerPos, position]);
    return (
        <group position={position} onClick={(e) => { e.stopPropagation(); onClick(); }} onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }} onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}>
            {!looted && <InteractionCue position={[0, 1.2, 0]} playerPos={playerPos} text="Open Barrel" range={2.5} />}
            <FocusRing active={hovered || (isNear && !looted)} size={0.4} />
            <mesh position={[0, 0.35, 0]} castShadow receiveShadow geometry={barrelGeo}><meshStandardMaterial color={looted ? "#5d4037" : COLORS.BARREL} /></mesh>
        </group>
    );
});

export const Crate: React.FC<{ position: [number, number, number]; playerPos?: Position; looted: boolean; onClick: () => void }> = React.memo(({ position, playerPos, looted, onClick }) => {
    const [hovered, setHovered] = useState(false);
    const isNear = useMemo(() => { if (!playerPos) return false; const d = Math.sqrt(Math.pow(position[0] - playerPos.x, 2) + Math.pow(position[2] - playerPos.z, 2)); return d < 2.5; }, [playerPos, position]);
    return (
        <group position={position} onClick={(e) => { e.stopPropagation(); onClick(); }} onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }} onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}>
            {!looted && <InteractionCue position={[0, 1.0, 0]} playerPos={playerPos} text="Search Crate" range={2.5} />}
            <FocusRing active={hovered || (isNear && !looted)} size={0.5} />
            <mesh position={[0, 0.3, 0]} castShadow receiveShadow geometry={crateGeo}><meshStandardMaterial color={looted ? "#78350f" : COLORS.CRATE} /></mesh>
        </group>
    );
});

export const ItemMesh: React.FC<{ type: ItemType; position: [number, number, number] }> = React.memo(({ type, position }) => {
    const ref = useRef<THREE.Group>(null);
    useFrame((state) => { if (ref.current) { ref.current.rotation.y += 0.02; ref.current.position.y = 0.5 + Math.sin(state.clock.elapsedTime * 2) * 0.1; } });
    const color = ITEM_COLORS[type] || '#ffffff';
    return (
        <group ref={ref} position={position}>
            <mesh scale={[0.4, 0.4, 0.4]}><boxGeometry /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} /></mesh>
            <mesh position={[0, -0.4, 0]} rotation={[-Math.PI/2, 0, 0]}><ringGeometry args={[0.2, 0.25, 16]} /><meshBasicMaterial color={color} opacity={0.5} transparent side={THREE.DoubleSide} /></mesh>
        </group>
    );
});

export const EnemyMesh: React.FC<{ enemy: Enemy; terrainHeight: number; onClick: () => void }> = React.memo(({ enemy, terrainHeight, onClick }) => {
    const ref = useRef<THREE.Group>(null);
    const [hovered, setHovered] = useState(false);
    useFrame((state) => { if (ref.current) { const s = enemy.type === EnemyType.GHOST ? 2 : 5; const h = enemy.type === EnemyType.GHOST ? 1.5 : 0.5; ref.current.position.y = terrainHeight + h + Math.sin(state.clock.elapsedTime * s) * 0.1; } });
    const config = ENEMY_CONFIG[enemy.type];
    return (
        <group ref={ref} position={[enemy.position.x, 0, enemy.position.z]} onClick={(e) => { e.stopPropagation(); onClick(); }} onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }} onPointerOut={(e) => { setHovered(false); document.body.style.cursor = 'auto'; }}>
            <FocusRing active={hovered} color="#ef4444" size={0.8} />
            <group position={[0, 1.2, 0]}> <mesh position={[-0.4, 0, 0]}><planeGeometry args={[0.8, 0.1]} /><meshBasicMaterial color="black" /></mesh> <mesh position={[-0.4 + (0.4 * (enemy.hp / enemy.maxHp)), 0, 0.01]}><planeGeometry args={[0.8 * (enemy.hp / enemy.maxHp), 0.08]} /><meshBasicMaterial color="#ef4444" /></mesh> </group>
            <mesh castShadow scale={[0.6, 0.4, 0.6]}><sphereGeometry args={[1, 16, 16]} /><meshStandardMaterial color={config.color} transparent opacity={0.8} /></mesh>
        </group>
    );
});
