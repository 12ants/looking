
import { GridNode, TileType, WorldItem, ItemType, Position, BiomeType, Enemy, EnemyType, NPC } from '../types';
import { DEFAULT_GRID_SIZE, ITEM_COUNT, ENEMY_CONFIG } from '../constants';

const SAFE_ZONE_RADIUS = 35; 

// --- Improved Noise Functions (Value Noise) ---

const fract = (x: number) => x - Math.floor(x);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);

const hash = (x: number, z: number, seed: number) => {
    const n = Math.sin(x * 127.1 + z * 311.7 + seed) * 43758.5453123;
    return n - Math.floor(n);
};

const noise2D = (x: number, z: number, seed: number) => {
    const i_x = Math.floor(x);
    const i_z = Math.floor(z);
    const f_x = fract(x);
    const f_z = fract(z);
    const u = smooth(f_x);
    const v = smooth(f_z);
    const n00 = hash(i_x, i_z, seed);
    const n10 = hash(i_x + 1, i_z, seed);
    const n01 = hash(i_x, i_z + 1, seed);
    const n11 = hash(i_x + 1, i_z + 1, seed);
    return lerp(lerp(n00, n10, u), lerp(n01, n11, u), v) * 2.0 - 1.0;
};

const fbm = (x: number, z: number, seed: number, octaves: number, persistence: number = 0.5, lacunarity: number = 2.0) => {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;  
    for(let i=0; i < octaves; i++) {
        total += noise2D(x * frequency, z * frequency, seed) * amplitude;
        maxValue += amplitude;
        amplitude *= persistence;
        frequency *= lacunarity;
    }
    return total / maxValue;
};

const randomAt = (x: number, z: number, seed: number) => {
    return hash(x, z, seed);
};

export const generateTile = (x: number, z: number, seed: number, biome: BiomeType): GridNode => {
    let h = fbm(x * 0.02, z * 0.02, seed, 4); 
    const mountainNoise = fbm(x * 0.05, z * 0.05, seed + 100, 3);
    if (mountainNoise > 0.4) h += (mountainNoise - 0.4) * 3.0;

    const riverBase = fbm(x * 0.015, z * 0.015, seed + 200, 2);
    const riverLine = Math.abs(riverBase);
    const riverWidth = 0.08;
    let isRiver = false;
    if (riverLine < riverWidth) {
        const depth = (riverWidth - riverLine) / riverWidth;
        h -= depth * 2.5;
        if (h < -0.8) isRiver = true;
    }

    const stepSize = 0.6;
    let finalHeight = Math.floor(h / stepSize) * stepSize;
    
    let type = TileType.GRASS;
    let decoration = null;
    let decorationActive = false;
    let walkable = true;
    let style = 0;
    let rotation = 0;
    
    if (isRiver) {
        type = TileType.WATER;
        walkable = false;
        finalHeight = -1.0;
    } else if (finalHeight < -0.5) {
        type = TileType.SAND;
    } else if (finalHeight > 1.8) {
        type = TileType.ROCK;
        if (finalHeight > 2.8) type = TileType.SNOW;
    }

    const townVal = noise2D(x * 0.02, z * 0.02, seed + 500);
    const isTown = townVal > 0.35 && type !== TileType.WATER && type !== TileType.ROCK && type !== TileType.SNOW;
    const isTownEdge = townVal > 0.25 && townVal <= 0.35;

    if (isTown || isTownEdge) {
        if (type !== TileType.WATER) {
            finalHeight = Math.max(0, Math.floor(finalHeight));
            if (type === TileType.ROCK) type = TileType.GRASS;
        }
    }

    const roadNoise = Math.abs(noise2D(x * 0.03, z * 0.03, seed + 600));
    let isRoad = false;
    if (isTown) {
        const gridX = Math.abs(Math.round(x)) % 6 === 0;
        const gridZ = Math.abs(Math.round(z)) % 6 === 0;
        if (gridX || gridZ) isRoad = true;
    } else {
        if (roadNoise < 0.06 && type !== TileType.WATER && type !== TileType.ROCK) isRoad = true;
    }

    if (type === TileType.WATER && roadNoise < 0.06) {
        type = TileType.ROAD;
        decoration = 'bridge';
        finalHeight = -0.4;
        walkable = true;
        isRoad = true;
    } else if (isRoad) {
        type = isTown ? TileType.ROAD : TileType.PATH;
        walkable = true;
    }

    const rng = randomAt(x, z, seed);
    const rng2 = randomAt(x, z, seed + 1);
    const hasSpace = (x % 2 !== 0 || z % 2 !== 0); 

    if (walkable && !isRoad && !decoration) {
        if (isTown && hasSpace) {
            const houseDensity = hash(Math.floor(x/2), Math.floor(z/2), seed + 700);
            if (houseDensity > 0.4) {
                type = TileType.HOUSE;
                walkable = false;
                style = Math.floor(rng * 3);
                rotation = Math.floor(rng2 * 4) * (Math.PI / 2);
            } else if (houseDensity > 0.2) {
                if (rng > 0.8) { decoration = 'fence'; walkable = false; rotation = (rng2 > 0.5) ? 0 : Math.PI/2; }
                else if (rng > 0.7) { decoration = 'barrel'; walkable = false; }
                else if (rng > 0.65) { decoration = 'crate'; walkable = false; }
                else if (rng < 0.05) { decoration = 'lamp'; decorationActive = true; walkable = false; }
            }
        } else if (!isTown) {
            const forestNoise = fbm(x * 0.08, z * 0.08, seed + 800, 2);
            if (forestNoise > 0.2 && rng > 0.9 && type === TileType.GRASS) {
                const spacing = (x % 3 === 0 || z % 3 === 0);
                if (spacing) {
                    type = TileType.TREE;
                    style = forestNoise > 0.5 ? 1 : 0;
                    rotation = rng * Math.PI * 2;
                }
            } else if (type === TileType.SAND && rng > 0.9) decoration = 'pebble';
            else if (type === TileType.GRASS && rng < 0.02) decoration = 'flower';
            else if (type === TileType.GRASS && rng > 0.98) type = TileType.BUSH;
        }
    }

    if (type === TileType.ROCK && !decoration) {
        const caveN = noise2D(x * 0.1, z * 0.1, seed + 900);
        if (finalHeight > 1.2 && caveN > 0.6 && rng > 0.92) {
            decoration = 'cave';
            rotation = Math.floor(rng2 * 4) * (Math.PI/2);
        }
    }

    return { x, y: z, walkable, type, height: finalHeight, style, decoration, decorationActive, rotation };
};

const getDifficulty = (x: number, z: number) => {
    const dist = Math.sqrt(x*x + z*z);
    return Math.min(1, dist / 200); 
};

const spawnItemAt = (x: number, z: number, seed: number, biome: BiomeType): ItemType | null => {
    const rng = randomAt(x, z, seed);
    if (rng > 0.985) { 
        const typeRng = randomAt(x, z, seed + 1);
        if (typeRng > 0.97) return ItemType.POTION;
        if (typeRng > 0.95) return ItemType.SWORD;
        if (typeRng > 0.93) return ItemType.GEM;
        if (typeRng > 0.88) return ItemType.GOLD;
        if (typeRng > 0.80) return ItemType.IRON_ORE;
        if (typeRng > 0.72) return ItemType.COAL;
        if (typeRng > 0.64) return ItemType.STONE;
        if (typeRng > 0.55) return ItemType.BERRY;
        return ItemType.WOOD;
    }
    return null;
}

export const trySpawnEnemy = (worldX: number, worldZ: number, seed: number): Enemy | null => {
    const difficulty = getDifficulty(worldX, worldZ);
    const distFromCenter = Math.sqrt(worldX*worldX + worldZ*worldZ);
    if (distFromCenter > SAFE_ZONE_RADIUS) {
        const rng = randomAt(worldX, worldZ, seed + 1);
        if (rng < (0.005 + difficulty * 0.03)) {
           let enemyType = EnemyType.SLIME;
           const typeRoll = randomAt(worldX, worldZ, seed + 3);
           if (difficulty > 0.6 && typeRoll > 0.7) enemyType = EnemyType.GOLEM;
           else if (difficulty > 0.3 && typeRoll > 0.6) enemyType = EnemyType.GHOST;
           const config = ENEMY_CONFIG[enemyType];
           return { id: `enemy-${worldX}-${worldZ}`, type: enemyType, position: { x: worldX, z: worldZ }, hp: config.hp, maxHp: config.hp, attack: config.attack, dead: false };
        }
    }
    return null;
};

export const spawnEnemiesForGrid = (grid: GridNode[][], seed: number): Enemy[] => {
    const newEnemies: Enemy[] = [];
    grid.forEach(row => {
        row.forEach(tile => {
            if (tile.walkable && !tile.decoration && tile.type !== TileType.ROAD && tile.type !== TileType.PATH) {
                const enemy = trySpawnEnemy(tile.x, tile.y, seed);
                if (enemy) newEnemies.push(enemy);
            }
        });
    });
    return newEnemies;
};

export const generateWorld = (originX: number = 0, originZ: number = 0, inputSeed?: number, inputBiome?: BiomeType, gridSize: number = DEFAULT_GRID_SIZE, spawnEnemies: boolean = false): { grid: GridNode[][]; items: WorldItem[]; enemies: Enemy[]; npcs: NPC[]; startPos: Position; biome: BiomeType; seed: number } => {
  const seed = inputSeed || Math.random() * 100;
  const biome = BiomeType.FOREST;
  const grid: GridNode[][] = [];
  const items: WorldItem[] = [];
  const enemies: Enemy[] = [];
  const npcs: NPC[] = [];

  for (let z = 0; z < gridSize; z++) {
    const row: GridNode[] = [];
    for (let x = 0; x < gridSize; x++) row.push(generateTile(originX + x, originZ + z, seed, biome));
    grid.push(row);
  }

  let itemCount = 0;
  let mcGregorSpawned = false;

  for (let z = 0; z < gridSize; z++) {
      for (let x = 0; x < gridSize; x++) {
          const tile = grid[z][x];
          const worldX = tile.x;
          const worldZ = tile.y;
          const difficulty = getDifficulty(worldX, worldZ);
          
          if (tile.walkable && !tile.decoration && tile.type !== TileType.ROAD && tile.type !== TileType.PATH) {
              // Quest Giver (McGregor) - Essential, spawns near start
              if (!mcGregorSpawned && difficulty < 0.1 && tile.type === TileType.GRASS) {
                   const neighbors = [grid[z+1]?.[x], grid[z-1]?.[x], grid[z]?.[x+1], grid[z]?.[x-1]];
                   // Must be near a house
                   if (neighbors.some(n => n?.type === TileType.HOUSE)) {
                       npcs.push({ id: 'npc_mcgregor', name: 'Old Man McGregor', position: { x: worldX, z: worldZ }, role: 'QUEST_GIVER' });
                       mcGregorSpawned = true;
                   }
              }
              // Generic Villagers - ONLY spawn much further out (Late Game)
              // difficulty > 0.3 ensures they are far from start
              else if (tile.type === TileType.GRASS && difficulty > 0.3 && noise2D(worldX, worldZ, seed + 1000) > 0.96) {
                   npcs.push({ id: `npc_villager_${worldX}_${worldZ}`, name: 'Lost Villager', position: { x: worldX, z: worldZ }, role: 'VILLAGER' });
              }
              // Wandering Merchant - VERY RARE and FAR
              // difficulty > 0.5 ensures deep exploration
              else if (difficulty > 0.5 && noise2D(worldX, worldZ, seed + 2000) > 0.98) {
                   npcs.push({ id: `npc_merchant_${worldX}_${worldZ}`, name: 'Wandering Trader', position: { x: worldX, z: worldZ }, role: 'MERCHANT' });
              }

              if (itemCount < ITEM_COUNT) {
                 const itemType = spawnItemAt(worldX, worldZ, seed + 2, biome);
                 if (itemType) {
                    items.push({ id: `item-${worldX}-${worldZ}`, type: itemType, position: { x: worldX, z: worldZ }, collected: false });
                    tile.itemId = `item-${worldX}-${worldZ}`;
                    itemCount++;
                 }
              }
              if (spawnEnemies) {
                  const enemy = trySpawnEnemy(worldX, worldZ, seed);
                  if (enemy) enemies.push(enemy);
              }
          }
      }
  }

  if (!mcGregorSpawned) npcs.push({ id: 'npc_mcgregor', name: 'Old Man McGregor', position: { x: originX + Math.floor(gridSize/2) + 2, z: originZ + Math.floor(gridSize/2) }, role: 'QUEST_GIVER' });
  
  let startPos = { x: originX + Math.floor(gridSize/2), z: originZ + Math.floor(gridSize/2) };
  let carPlaced = false;
  const roadTiles = grid.flat().filter(t => t.type === TileType.ROAD || t.type === TileType.PATH);
  const centerX = originX + gridSize / 2;
  const centerZ = originZ + gridSize / 2;
  roadTiles.sort((a, b) => {
      const distA = Math.sqrt(Math.pow(a.x - centerX, 2) + Math.pow(a.y - centerZ, 2));
      const distB = Math.sqrt(Math.pow(b.x - centerX, 2) + Math.pow(b.y - centerZ, 2));
      return distA - distB;
  });

  const SAFE_RADIUS = 4;
  for (const road of roadTiles) {
      const neighbors = [{dx: 1, dy: 0}, {dx: -1, dy: 0}, {dx: 0, dy: 1}, {dx: 0, dy: -1}];
      for (const n of neighbors) {
          const cx = (road.x - originX) + n.dx; 
          const cz = (road.y - originZ) + n.dy; 
          if (cx >= 0 && cx < gridSize && cz >= 0 && cz < gridSize) {
              const tile = grid[cz][cx];
              if (tile.type !== TileType.WATER && tile.type !== TileType.ROAD && tile.type !== TileType.PATH && tile.decoration !== 'bridge' && Math.abs(tile.height - road.height) < 0.8) {
                  tile.decoration = 'car';
                  tile.type = TileType.GRASS;
                  tile.height = road.height; 
                  tile.walkable = false;
                  tile.rotation = Math.atan2(-n.dx, -n.dy); 
                  startPos = { x: road.x, z: road.y };
                  carPlaced = true;
                  const clearTargets = [{x: road.x - originX, z: road.y - originZ}, {x: cx, z: cz}];
                  for (const target of clearTargets) {
                      for (let dz = -SAFE_RADIUS; dz <= SAFE_RADIUS; dz++) {
                          for (let dx = -SAFE_RADIUS; dx <= SAFE_RADIUS; dx++) {
                              const tx = target.x + dx;
                              const tz = target.z + dz;
                              if (tx >= 0 && tx < gridSize && tz >= 0 && tz < gridSize) {
                                  const t = grid[tz][tx];
                                  if (t.x === tile.x && t.y === tile.y) continue;
                                  if (t.type === TileType.TREE || t.type === TileType.HOUSE || t.type === TileType.ROCK || t.type === TileType.STUMP || t.type === TileType.BUSH) {
                                      t.type = TileType.GRASS;
                                      t.decoration = null;
                                      t.walkable = true;
                                      if (Math.abs(t.height - road.height) < 1.0) t.height = road.height; 
                                  }
                                  if (t.decoration && t.decoration !== 'bridge') t.decoration = null;
                              }
                          }
                      }
                  }
                  break;
              }
          }
          if (carPlaced) break;
      }
      if (carPlaced) break;
  }
  
  if (carPlaced) {
      const minX = startPos.x - SAFE_RADIUS;
      const maxX = startPos.x + SAFE_RADIUS;
      const minZ = startPos.z - SAFE_RADIUS;
      const maxZ = startPos.z + SAFE_RADIUS;
      const removeInZone = (arr: any[]) => {
          for (let i = arr.length - 1; i >= 0; i--) {
              const p = (arr[i].position || arr[i].position);
              if (p.x >= minX && p.x <= maxX && p.z >= minZ && p.z <= maxZ) arr.splice(i, 1);
          }
      };
      removeInZone(items);
      removeInZone(enemies);
  }
  
  return { grid, items, enemies, npcs, startPos, biome, seed };
};

export const generateChunkStrip = (originX: number, originZ: number, width: number, height: number, seed: number, biome: BiomeType, spawnEnemies: boolean = false) => {
    const nodes: GridNode[] = [];
    const newItems: WorldItem[] = [];
    const newEnemies: Enemy[] = [];
    for (let z = 0; z < height; z++) {
        for (let x = 0; x < width; x++) {
            const worldX = originX + x;
            const worldZ = originZ + z;
            const tile = generateTile(worldX, worldZ, seed, biome);
            nodes.push(tile);
            if (tile.walkable && !tile.decoration && tile.type !== TileType.ROAD && tile.type !== TileType.PATH) {
                 const itemType = spawnItemAt(worldX, worldZ, seed + 2, biome);
                 if (itemType) {
                    newItems.push({ id: `item-${worldX}-${worldZ}`, type: itemType, position: { x: worldX, z: worldZ }, collected: false });
                    tile.itemId = `item-${worldX}-${worldZ}`;
                 }
                 if (spawnEnemies) {
                    const enemy = trySpawnEnemy(worldX, worldZ, seed);
                    if (enemy) newEnemies.push(enemy);
                 }
            }
        }
    }
    return { nodes, newItems, newEnemies };
};
