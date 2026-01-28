import React, { useLayoutEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { GridNode, TileType } from '../types';
import { COLORS } from '../constants';

interface WorldRendererProps {
  grid: GridNode[][];
  onTileClick: (x: number, z: number) => void;
}

const tempObject = new THREE.Object3D();
const tempColor = new THREE.Color();

export const WorldRenderer: React.FC<WorldRendererProps> = ({ grid, onTileClick }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  // Flatten grid for indexing
  const flatGrid = useMemo(() => grid.flatMap(row => row), [grid]);
  const count = flatGrid.length;

  useLayoutEffect(() => {
    if (!meshRef.current) return;

    let i = 0;
    for (const tile of flatGrid) {
      // Position and Scale
      const scaleY = 1 + tile.height;
      const y = -0.5 + (tile.height * 0.5);
      
      tempObject.position.set(tile.x, y, tile.y);
      tempObject.scale.set(1, scaleY, 1);
      tempObject.updateMatrix();
      meshRef.current.setMatrixAt(i, tempObject.matrix);

      // Color Logic
      let colorHex = COLORS.GRASS;
      switch (tile.type) {
        case TileType.ROAD: colorHex = COLORS.ROAD; break;
        case TileType.WATER: colorHex = COLORS.WATER; break;
        case TileType.SAND: colorHex = tile.height > 0.2 ? COLORS.SAND_DARK : COLORS.SAND; break;
        case TileType.ROCK: colorHex = COLORS.ROCK; break;
        case TileType.SNOW: colorHex = COLORS.SNOW; break;
        case TileType.HOUSE: colorHex = COLORS.ROAD; break; // Foundation
        case TileType.TREE: colorHex = COLORS.GRASS; break;
        case TileType.STUMP: colorHex = COLORS.GRASS; break;
        case TileType.BUSH: colorHex = COLORS.GRASS; break; // Bush sits on grass
        default: colorHex = tile.height > 0.15 ? COLORS.GRASS_DARK : COLORS.GRASS;
      }
      
      tempColor.set(colorHex);
      meshRef.current.setColorAt(i, tempColor);
      
      i++;
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;

  }, [flatGrid]);

  const handleClick = (e: any) => {
    e.stopPropagation();
    const instanceId = e.instanceId;
    if (instanceId !== undefined) {
      const tile = flatGrid[instanceId];
      if (tile) {
        onTileClick(tile.x, tile.y);
      }
    }
  };

  return (
    <instancedMesh 
      ref={meshRef} 
      args={[undefined, undefined, count]} 
      onClick={handleClick}
      receiveShadow
      castShadow
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="white" /> {/* Color is set via instanceColor */}
    </instancedMesh>
  );
};