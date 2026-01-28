import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { TileType, ItemType, Enemy } from '../types';
import { COLORS, ITEM_COLORS } from '../constants';

// --- Geometries ---
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const coneGeo = new THREE.ConeGeometry(0.5, 1, 4); 
const cylinderGeo = new THREE.CylinderGeometry(0.2, 0.2, 1, 8);
const sphereGeo = new THREE.SphereGeometry(0.3, 8, 8);
const dodecaGeo = new THREE.DodecahedronGeometry(0.3);
const pyramidGeo = new THREE.ConeGeometry(0.7, 1, 4);
const enemyGeo = new THREE.SphereGeometry(0.4, 8, 8); // Slime-like
const swordGeo = new THREE.BoxGeometry(0.1, 0.8, 0.1);
const flaskGeo = new THREE.CylinderGeometry(0.15, 0.2, 0.4, 8);

export const GroundTile: React.FC<{ type: TileType; height: number; position: [number, number, number]; onClick?: () => void }> = React.memo(({ type, height, position, onClick }) => {
  
  const color = useMemo(() => {
    switch (type) {
      case TileType.ROAD: return COLORS.ROAD;
      case TileType.WATER: return COLORS.WATER;
      case TileType.SAND: return height > 0.2 ? COLORS.SAND_DARK : COLORS.SAND;
      case TileType.ROCK: return COLORS.ROCK;
      case TileType.SNOW: return COLORS.SNOW;
      case TileType.HOUSE: return COLORS.ROAD; // Foundation
      case TileType.TREE: return COLORS.GRASS;
      case TileType.STUMP: return COLORS.GRASS;
      default: return height > 0.15 ? COLORS.GRASS_DARK : COLORS.GRASS;
    }
  }, [type, height]);

  // Adjust Y based on height for terrain look
  const meshY = -0.5 + (height * 0.5); 
  const scaleY = 1 + height;

  return (
    <mesh 
      position={[position[0], meshY, position[2]]} 
      geometry={boxGeo} 
      scale={[1, scaleY, 1]} 
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick();
      }}
      receiveShadow
    >
      <meshStandardMaterial color={color} />
    </mesh>
  );
});

export const House: React.FC<{ position: [number, number, number]; style?: number }> = React.memo(({ position, style = 0 }) => {
  return (
    <group position={position}>
      {style === 0 && (
        <>
          <mesh position={[0, 0.5, 0]} castShadow geometry={boxGeo} scale={[0.8, 1, 0.8]}>
            <meshStandardMaterial color={COLORS.HOUSE_WALL_A} />
          </mesh>
          <mesh position={[0, 1.25, 0]} castShadow geometry={coneGeo} rotation={[0, Math.PI / 4, 0]} scale={[1.2, 0.8, 1.2]}>
            <meshStandardMaterial color={COLORS.HOUSE_ROOF_A} />
          </mesh>
        </>
      )}

      {style === 1 && (
        <>
          <mesh position={[0, 0.75, 0]} castShadow geometry={boxGeo} scale={[0.6, 1.5, 0.6]}>
            <meshStandardMaterial color={COLORS.HOUSE_WALL_B} />
          </mesh>
          <mesh position={[0, 1.75, 0]} castShadow geometry={coneGeo} rotation={[0, 0, 0]} scale={[0.8, 1, 0.8]}>
            <meshStandardMaterial color={COLORS.HOUSE_ROOF_B} />
          </mesh>
        </>
      )}

      {style === 2 && (
        <>
           <mesh position={[0, 0.4, 0]} castShadow geometry={boxGeo} scale={[1, 0.8, 0.8]}>
            <meshStandardMaterial color={COLORS.HOUSE_WALL_C} />
          </mesh>
          <mesh position={[0.3, 0.6, 0]} castShadow geometry={boxGeo} scale={[0.4, 1.2, 0.4]}>
            <meshStandardMaterial color={COLORS.HOUSE_WALL_C} />
          </mesh>
          <mesh position={[0, 1, 0]} castShadow geometry={pyramidGeo} rotation={[0, Math.PI / 4, 0]} scale={[1.2, 0.6, 1.2]}>
            <meshStandardMaterial color={COLORS.HOUSE_ROOF_C} />
          </mesh>
        </>
      )}

      <mesh position={[0, 0.3, 0.41]} geometry={boxGeo} scale={[0.2, 0.6, 0.05]}>
        <meshStandardMaterial color="#333" />
      </mesh>
    </group>
  );
});

export const Tree: React.FC<{ position: [number, number, number]; style?: number }> = React.memo(({ position, style = 0 }) => {
  const scale = useMemo(() => 0.8 + Math.random() * 0.4, []);
  
  if (style === 2) {
    // Cactus
    return (
      <group position={position} scale={[scale, scale, scale]}>
         <mesh position={[0, 0.5, 0]} castShadow geometry={cylinderGeo} scale={[0.8, 2, 0.8]}>
          <meshStandardMaterial color={COLORS.CACTUS} />
        </mesh>
        <mesh position={[0.3, 0.8, 0]} castShadow geometry={cylinderGeo} rotation={[0,0,-0.5]} scale={[0.6, 0.8, 0.6]}>
          <meshStandardMaterial color={COLORS.CACTUS} />
        </mesh>
        <mesh position={[-0.3, 0.6, 0]} castShadow geometry={cylinderGeo} rotation={[0,0,0.5]} scale={[0.6, 0.8, 0.6]}>
          <meshStandardMaterial color={COLORS.CACTUS} />
        </mesh>
      </group>
    )
  }

  if (style === 1) {
    // Pine
    return (
      <group position={position} scale={[scale * 0.8, scale * 1.5, scale * 0.8]}>
         <mesh position={[0, 0.3, 0]} castShadow geometry={cylinderGeo} scale={[0.5, 0.6, 0.5]}>
          <meshStandardMaterial color={COLORS.TREE_TRUNK} />
        </mesh>
        <mesh position={[0, 0.8, 0]} castShadow geometry={coneGeo} scale={[1.5, 1.2, 1.5]}>
          <meshStandardMaterial color={COLORS.PINE_LEAVES} />
        </mesh>
        <mesh position={[0, 1.4, 0]} castShadow geometry={coneGeo} scale={[1.2, 1.2, 1.2]}>
          <meshStandardMaterial color={COLORS.PINE_LEAVES} />
        </mesh>
      </group>
    )
  }

  // Standard Oak
  return (
    <group position={position} scale={[scale, scale, scale]}>
      <mesh position={[0, 0.5, 0]} castShadow geometry={cylinderGeo} scale={[1, 1, 1]}>
        <meshStandardMaterial color={COLORS.TREE_TRUNK} />
      </mesh>
      <mesh position={[0, 1.2, 0]} castShadow geometry={dodecaGeo} scale={[2.5, 2.5, 2.5]}>
        <meshStandardMaterial color={COLORS.TREE_LEAVES} />
      </mesh>
    </group>
  );
});

export const Stump: React.FC<{ position: [number, number, number] }> = React.memo(({ position }) => {
  return (
    <group position={position}>
      <mesh position={[0, 0.25, 0]} castShadow geometry={cylinderGeo} scale={[1.2, 0.5, 1.2]}>
        <meshStandardMaterial color={COLORS.STUMP} />
      </mesh>
    </group>
  );
});

export const StreetLamp: React.FC<{ position: [number, number, number] }> = React.memo(({ position }) => {
  return (
    <group position={position}>
      <mesh position={[0, 1, 0]} castShadow geometry={cylinderGeo} scale={[0.15, 2, 0.15]}>
        <meshStandardMaterial color="#334155" />
      </mesh>
       <mesh position={[0, 1.8, 0]} castShadow geometry={boxGeo} scale={[0.4, 0.5, 0.4]}>
        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.5} transparent opacity={0.9} />
      </mesh>
       <mesh position={[0, 2.1, 0]} castShadow geometry={coneGeo} scale={[0.6, 0.2, 0.6]}>
        <meshStandardMaterial color="#334155" />
      </mesh>
    </group>
  );
});

export const EnemyMesh: React.FC<{ enemy: Enemy; onClick: () => void }> = ({ enemy, onClick }) => {
    const meshRef = useRef<THREE.Group>(null);
    const healthPercent = Math.max(0, enemy.hp / enemy.maxHp);
    
    useFrame((state) => {
        if(meshRef.current) {
            // Bounce animation
            meshRef.current.position.y = Math.abs(Math.sin(state.clock.elapsedTime * 4)) * 0.3;
            meshRef.current.rotation.y += 0.01;
        }
    });

    return (
        <group position={[enemy.position.x, 0.4, enemy.position.z]} onClick={(e) => { e.stopPropagation(); onClick(); }}>
            <group ref={meshRef}>
                 <mesh castShadow geometry={enemyGeo} scale={[1, 0.8, 1]}>
                    <meshStandardMaterial color={COLORS.ENEMY} emissive={COLORS.ENEMY} emissiveIntensity={0.2} roughness={0.2} />
                </mesh>
                {/* Eyes */}
                <mesh position={[0.15, 0.2, 0.3]} geometry={sphereGeo} scale={0.2}>
                    <meshBasicMaterial color="white" />
                </mesh>
                 <mesh position={[-0.15, 0.2, 0.3]} geometry={sphereGeo} scale={0.2}>
                    <meshBasicMaterial color="white" />
                </mesh>
            </group>

            {/* Health Bar */}
            <group position={[0, 1, 0]}>
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
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.02;
      meshRef.current.position.y = 0.5 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });

  const geometry = useMemo(() => {
    switch(type) {
        case ItemType.GEM: return dodecaGeo;
        case ItemType.SWORD: return swordGeo;
        case ItemType.POTION: return flaskGeo;
        default: return sphereGeo;
    }
  }, [type]);

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
        </group>
     )
  }

  return (
    <group position={[position[0], 0, position[2]]}>
      <mesh ref={meshRef} castShadow geometry={geometry}>
        <meshStandardMaterial color={ITEM_COLORS[type]} emissive={ITEM_COLORS[type]} emissiveIntensity={0.5} transparent={type === ItemType.POTION} opacity={type === ItemType.POTION ? 0.8 : 1} />
      </mesh>
      {/* Sparkle effect plane */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[0.2, 0.25, 16]} />
        <meshBasicMaterial color="white" opacity={0.5} transparent />
      </mesh>
    </group>
  );
};

export const PathLine: React.FC<{ points: [number, number, number][] }> = ({ points }) => {
    if (points.length < 2) return null;
    
    // Create a CatmullRomCurve3 for smoother path visualization
    const curvePoints = useMemo(() => {
        return points.map(p => new THREE.Vector3(p[0], 0.2, p[2])); // Lift slightly
    }, [points]);

    const curve = useMemo(() => new THREE.CatmullRomCurve3(curvePoints, false, 'catmullrom', 0.2), [curvePoints]);

    return (
        <Line
            points={curve.getPoints(points.length * 4)} // Resample for smoothness
            color={COLORS.PATH}
            lineWidth={4} // Thicker line
            dashed={true}
            dashScale={1}
            dashSize={0.5}
            gapSize={0.3}
            opacity={0.8}
            transparent
        />
    );
};