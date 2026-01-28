import { GridNode, TileType, WorldItem, ItemType, Position, BiomeType, Enemy, EnemyType, NPC } from '../types';
import { DEFAULT_GRID_SIZE, HOUSE_COUNT, TREE_COUNT, ITEM_COUNT, ENEMY_COUNT, ENEMY_CONFIG } from '../constants';

const SAFE_ZONE_RADIUS = 35; // No enemies within this distance of origin

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// Deterministic pseudo-random based on coordinates and seed
const randomAt = (x: number, z: number, seed: number) => {
    const sin = Math.sin(x * 12.9898 + z * 78.233 + seed) * 43758.5453;
    return sin - Math.floor(sin);
};

// Smooth noise function
const noise = (x: number, z: number, seed: number) => {
  return Math.sin(x * 0.1 + seed) * Math.cos(z * 0.1 + seed) + Math.sin(x * 0.03 + z * 0.03) * 0.5;
};

// River Noise (Ridged Multifractal-ish)
const riverNoise = (x: number, z: number, seed: number) => {
    // Create 'valleys' by taking absolute value of sine waves
    const n = Math.abs(Math.sin(x * 0.04 + seed) + Math.cos(z * 0.04 + seed * 0.5));
    // Invert so 0 is the center of the river
    return n; 
};

// Road noise for infinite roads
const roadNoise = (x: number, z: number, seed: number) => {
    // Winding roads
    return Math.abs(Math.sin(x * 0.03 + seed * 0.5) + Math.sin(z * 0.04 + seed));
};

// Town density noise (Low frequency)
const townNoise = (x: number, z: number, seed: number) => {
    return Math.sin(x * 0.02 + seed) + Math.cos(z * 0.02 + seed * 1.5);
};

export const generateTile = (x: number, z: number, seed: number, biome: BiomeType): GridNode => {
    const rawH = noise(x, z, seed);
    let type: TileType = TileType.GRASS;
    let baseTile = TileType.GRASS;
    let waterLevel = -0.3;
    let heightScale = 1.0;
    
    // Biome Settings
    if (biome === BiomeType.DESERT) {
        baseTile = TileType.SAND;
        heightScale = 0.8;
    } else if (biome === BiomeType.ALPINE) {
        heightScale = 2.5;
    } else { // Forest
        heightScale = 1.5;
    }

    // --- Heightmap & Terracing ---
    const stepSize = 0.4;
    let smoothHeight = Math.max(0, rawH * heightScale);
    let terracedHeight = Math.floor(smoothHeight / stepSize) * stepSize;
    // Blend smooth and terrace for "eroded" look
    let height = (terracedHeight * 0.7) + (smoothHeight * 0.3);

    // --- Town Clusters ---
    // Values > 0.5 are "town centers", < -0.5 are "wilderness"
    const tVal = townNoise(x, z, seed + 999);
    const isTown = tVal > 0.5;
    const isWilderness = tVal < -0.5;

    // --- Rivers ---
    const rVal = riverNoise(x, z, seed + 100);
    const riverThreshold = 0.12; // Narrower rivers
    let isRiver = false;

    if (rVal < riverThreshold && height < 1.2) {
        isRiver = true;
        height = -0.2; 
    }

    // --- Tile Type Assignment ---
    type = baseTile;

    if (isRiver) {
        type = TileType.WATER;
    } else if (height <= 0 && biome !== BiomeType.DESERT) {
        if (rawH < waterLevel) {
            type = TileType.WATER;
            height = -0.2;
        } else {
             type = TileType.SAND;
        }
    } else if (biome === BiomeType.ALPINE) {
        if (height > 1.2) type = TileType.SNOW;
        else if (height > 0.6) type = TileType.ROCK;
    } else if (biome === BiomeType.FOREST) {
        if (height > 1.0) type = TileType.ROCK;
    } else if (biome === BiomeType.DESERT) {
        if (height > 0.8) type = TileType.ROCK;
    }

    // --- Roads & Bridges ---
    const roadVal = roadNoise(x, z, seed + 50);
    let isRoad = false;
    let decoration = null;
    
    // Roads are more common in towns, less common in wilderness
    const roadThreshold = isTown ? 0.18 : (isWilderness ? 0.08 : 0.12);

    // Check road generation
    if (roadVal < roadThreshold) {
        // If it overlaps a river, it's a bridge
        if (isRiver) {
            type = TileType.ROAD;
            height = 0.2; // Bridge height
            decoration = 'bridge';
            isRoad = true;
        } 
        // Normal road (avoid mountains/water unless bridge)
        else if (type !== TileType.WATER && type !== TileType.ROCK && type !== TileType.SNOW) {
            type = TileType.ROAD;
            height = Math.max(0.1, Math.floor(height * 2)/2); // Flatten
            isRoad = true;
        }
    }

    // --- Objects & Decoration ---
    // Make mostly everything traversible except water and buildings
    let walkable = type !== TileType.WATER; 
    let decorationActive = false;
    let style = 0;
    let rotation = 0;

    const rng = randomAt(x, z, seed);
    const rng2 = randomAt(x, z, seed + 1);

    // Vegetation Clusters
    const vegNoise = noise(x * 0.5, z * 0.5, seed + 200);

    // Caves (In Rock walls)
    if (type === TileType.ROCK && !decoration) {
        // Rare chance for cave
        if (rng > 0.96) {
             decoration = 'cave';
             rotation = Math.floor(rng2 * 4) * (Math.PI / 2);
        }
    }

    if (walkable && !isRoad && !decoration) {
        // Houses (Clustered in Towns)
        const houseChance = isTown ? 0.15 : 0.005; // High chance in town, very low in wild
        
        if (type === baseTile && height < 0.8 && rng < houseChance) {
            type = TileType.HOUSE;
            walkable = false; // Houses block movement
            style = biome === BiomeType.DESERT ? 2 : (Math.floor(rng2 * 2)); // 0 or 1 for forest/alpine
            decorationActive = false;
            rotation = Math.floor(rng2 * 4) * (Math.PI / 2);
        }
        // Trees
        else if (vegNoise > 0.2 && rng > (isTown ? 0.8 : 0.4)) { // Fewer trees in town centers
            type = TileType.TREE;
            // Walkable stays true
            style = biome === BiomeType.DESERT ? 2 : (biome === BiomeType.ALPINE ? 1 : 0);
            rotation = rng * Math.PI * 2;
        }
        // Bushes
        else if (vegNoise > 0.3 && rng > 0.4) {
            type = TileType.BUSH;
            // Walkable stays true
            rotation = rng * Math.PI * 2;
        }
        // Fences (Near houses or roads ideally)
        else if (isTown && rng > 0.85) {
            decoration = 'fence';
            rotation = (rng2 > 0.5) ? 0 : Math.PI / 2;
            walkable = false; // Fences still block
        }
        // Flowers
        else if (type === TileType.GRASS && rng < 0.08) {
            decoration = 'flower';
            rotation = rng2 * Math.PI;
        }
        // Lamps (Only in towns, near roads)
        else if (isTown && rng < 0.05) {
            decoration = 'lamp';
            decorationActive = true;
            walkable = false; // Lamps block
        }
    }

    return {
        x,
        y: z,
        walkable,
        type,
        height,
        style,
        decoration,
        decorationActive,
        rotation
    };
};

const getDifficulty = (x: number, z: number) => {
    const dist = Math.sqrt(x*x + z*z);
    return Math.min(1, dist / 200); 
};

const spawnItemAt = (x: number, z: number, seed: number, biome: BiomeType): ItemType | null => {
    const rng = randomAt(x, z, seed);
    
    // Significantly reduced spawn rate (Scarce resources)
    if (rng > 0.985) { // Was 0.96
        const typeRng = randomAt(x, z, seed + 1);
        
        if (typeRng > 0.96) return ItemType.POTION;
        if (typeRng > 0.93) return ItemType.SWORD;
        if (typeRng > 0.90) return ItemType.GEM;

        if (biome === BiomeType.DESERT) {
            if (typeRng > 0.6) return ItemType.GOLD;
            if (typeRng > 0.4) return ItemType.IRON_ORE;
            return ItemType.STONE;
        } 
        else if (biome === BiomeType.ALPINE) {
            if (typeRng > 0.6) return ItemType.IRON_ORE;
            if (typeRng > 0.4) return ItemType.COAL;
            if (typeRng > 0.2) return ItemType.GEM;
            return ItemType.STONE;
        } 
        else { // FOREST
            if (typeRng > 0.8) return ItemType.COAL;
            if (typeRng > 0.6) return ItemType.BERRY;
            return ItemType.WOOD;
        }
    }
    return null;
}

export const generateWorld = (originX: number = 0, originZ: number = 0, inputSeed?: number, inputBiome?: BiomeType, gridSize: number = DEFAULT_GRID_SIZE): { grid: GridNode[][]; items: WorldItem[]; enemies: Enemy[]; npcs: NPC[]; startPos: Position; biome: BiomeType; seed: number } => {
  const seed = inputSeed || Math.random() * 100;
  
  let biome = inputBiome;
  if (!biome) {
      const biomeRoll = randomAt(0, 0, seed);
      if (biomeRoll < 0.33) biome = BiomeType.DESERT;
      else if (biomeRoll < 0.66) biome = BiomeType.ALPINE;
      else biome = BiomeType.FOREST;
  }

  const grid: GridNode[][] = [];
  const items: WorldItem[] = [];
  const enemies: Enemy[] = [];
  const npcs: NPC[] = [];

  for (let z = 0; z < gridSize; z++) {
    const row: GridNode[] = [];
    for (let x = 0; x < gridSize; x++) {
        row.push(generateTile(originX + x, originZ + z, seed, biome));
    }
    grid.push(row);
  }

  // Populate Items/Enemies/NPCs
  let itemCount = 0;
  let mcGregorSpawned = false;
  let sonsWatchSpawned = false;

  for (let z = 0; z < gridSize; z++) {
      for (let x = 0; x < gridSize; x++) {
          const tile = grid[z][x];
          const worldX = tile.x;
          const worldZ = tile.y;
          const difficulty = getDifficulty(worldX, worldZ);
          const distFromCenter = Math.sqrt(worldX*worldX + worldZ*worldZ);

          if (tile.walkable && !tile.decoration && tile.type !== TileType.ROAD) {
              // Spawn McGregor near center/spawn (low difficulty), preferably near a house
              if (!mcGregorSpawned && difficulty < 0.1 && tile.type === TileType.GRASS) {
                  // Check neighbors for house
                   const neighbors = [
                      grid[z+1]?.[x], grid[z-1]?.[x], grid[z]?.[x+1], grid[z]?.[x-1]
                   ];
                   if (neighbors.some(n => n?.type === TileType.HOUSE)) {
                       npcs.push({
                           id: 'npc_mcgregor',
                           name: 'Old Man McGregor',
                           position: { x: worldX, z: worldZ },
                           role: 'QUEST_GIVER'
                       });
                       mcGregorSpawned = true;
                   }
              }

              // Spawn Son's Watch far away (High difficulty)
              if (!sonsWatchSpawned && difficulty > 0.4 && itemCount < ITEM_COUNT) {
                   const rng = randomAt(worldX, worldZ, seed + 99);
                   if (rng > 0.98) {
                        const id = `item-watch-${worldX}-${worldZ}`;
                        items.push({ id, type: ItemType.SONS_WATCH, position: { x: worldX, z: worldZ }, collected: false });
                        tile.itemId = id;
                        sonsWatchSpawned = true;
                   }
              }

              if (itemCount < ITEM_COUNT) {
                 const itemType = spawnItemAt(worldX, worldZ, seed + 2, biome);
                 if (itemType) {
                    const id = `item-${worldX}-${worldZ}`;
                    items.push({ id, type: itemType, position: { x: worldX, z: worldZ }, collected: false });
                    tile.itemId = id;
                    itemCount++;
                 }
              }
              
              // Enemy Spawning - SAFE ZONE LOGIC
              if (distFromCenter > SAFE_ZONE_RADIUS) {
                  const rng = randomAt(worldX, worldZ, seed + 1);
                  if (rng < (0.005 + difficulty * 0.03)) {
                     let enemyType = EnemyType.SLIME;
                     const typeRoll = randomAt(worldX, worldZ, seed + 3);
                     if (difficulty > 0.6 && typeRoll > 0.7) enemyType = EnemyType.GOLEM;
                     else if (difficulty > 0.3 && typeRoll > 0.6) enemyType = EnemyType.GHOST;
                     const config = ENEMY_CONFIG[enemyType];
                     enemies.push({ id: `enemy-${worldX}-${worldZ}`, type: enemyType, position: { x: worldX, z: worldZ }, hp: config.hp, maxHp: config.hp, attack: config.attack, dead: false });
                  }
              }
          }
      }
  }

  // Fallback: If McGregor didn't spawn naturally, force spawn him near center
  if (!mcGregorSpawned) {
      npcs.push({
           id: 'npc_mcgregor',
           name: 'Old Man McGregor',
           position: { x: originX + Math.floor(gridSize/2) + 2, z: originZ + Math.floor(gridSize/2) },
           role: 'QUEST_GIVER'
      });
  }
  
  // Fallback: Force spawn watch if missed
  if (!sonsWatchSpawned) {
       const wX = originX + gridSize - 5;
       const wZ = originZ + gridSize - 5;
       const id = `item-watch-force`;
       items.push({ id, type: ItemType.SONS_WATCH, position: { x: wX, z: wZ }, collected: false });
  }

  // Find valid start position
  let startPos = { x: originX + Math.floor(gridSize/2), z: originZ + Math.floor(gridSize/2) };
  let safety = 0;
  while(safety < 100) {
      const localX = startPos.x - originX;
      const localZ = startPos.z - originZ;
      if (localX >= 0 && localX < gridSize && localZ >= 0 && localZ < gridSize) {
          if (grid[localZ][localX].walkable && grid[localZ][localX].type !== TileType.WATER) break;
      }
      startPos.x += Math.floor(Math.random()*5)-2;
      startPos.z += Math.floor(Math.random()*5)-2;
      safety++;
  }
  
  // Fallback if spawn is invalid
  const localX = startPos.x - originX;
  const localZ = startPos.z - originZ;
  if (localX >= 0 && localX < gridSize && localZ >= 0 && localZ < gridSize) {
      if (!grid[localZ][localX].walkable) {
          grid[localZ][localX].type = TileType.GRASS;
          grid[localZ][localX].height = 0.5;
          grid[localZ][localX].walkable = true;
      }
  }

  return { grid, items, enemies, npcs, startPos, biome, seed };
};

export const generateChunkStrip = (originX: number, originZ: number, width: number, height: number, seed: number, biome: BiomeType) => {
    const nodes: GridNode[] = [];
    const newItems: WorldItem[] = [];
    const newEnemies: Enemy[] = [];

    for (let z = 0; z < height; z++) {
        for (let x = 0; x < width; x++) {
            const worldX = originX + x;
            const worldZ = originZ + z;
            const tile = generateTile(worldX, worldZ, seed, biome);
            nodes.push(tile);
            
            const difficulty = getDifficulty(worldX, worldZ);
            const distFromCenter = Math.sqrt(worldX*worldX + worldZ*worldZ);

            if (tile.walkable && !tile.decoration && tile.type !== TileType.ROAD) {
                 const itemType = spawnItemAt(worldX, worldZ, seed + 2, biome);
                 if (itemType) {
                    const id = `item-${worldX}-${worldZ}`;
                    newItems.push({ id, type: itemType, position: { x: worldX, z: worldZ }, collected: false });
                    tile.itemId = id;
                 }
                 
                 // Chunk Enemy Generation - SAFE ZONE LOGIC
                 if (distFromCenter > SAFE_ZONE_RADIUS) {
                     const rng = randomAt(worldX, worldZ, seed + 1);
                     if (rng < (0.005 + difficulty * 0.03)) {
                        let enemyType = EnemyType.SLIME;
                        const typeRoll = randomAt(worldX, worldZ, seed + 3);
                        if (difficulty > 0.6 && typeRoll > 0.7) enemyType = EnemyType.GOLEM;
                        else if (difficulty > 0.3 && typeRoll > 0.6) enemyType = EnemyType.GHOST;
                        const config = ENEMY_CONFIG[enemyType];
                        newEnemies.push({ id: `enemy-${worldX}-${worldZ}`, type: enemyType, position: { x: worldX, z: worldZ }, hp: config.hp, maxHp: config.hp, attack: config.attack, dead: false });
                     }
                 }
            }
        }
    }
    return { nodes, newItems, newEnemies };
};