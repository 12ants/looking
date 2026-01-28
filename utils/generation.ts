import { GridNode, TileType, WorldItem, ItemType, Position, BiomeType, Enemy } from '../types';
import { GRID_SIZE, HOUSE_COUNT, TREE_COUNT, ITEM_COUNT, ENEMY_COUNT, ENEMY_MAX_HP, ENEMY_ATTACK } from '../constants';

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// Simple pseudo-random noise
const noise = (x: number, z: number, seed: number) => {
  return Math.sin(x * 0.15 + seed) * Math.cos(z * 0.15 + seed) + Math.sin(x * 0.05 + z * 0.05) * 0.5;
};

export const generateWorld = (): { grid: GridNode[][]; items: WorldItem[]; enemies: Enemy[]; startPos: Position; biome: BiomeType } => {
  const grid: GridNode[][] = [];
  const items: WorldItem[] = [];
  const enemies: Enemy[] = [];
  const seed = Math.random() * 100;
  
  // Select Biome
  const biomeRoll = Math.random();
  let biome = BiomeType.FOREST;
  let baseTile: TileType = TileType.GRASS;
  let treeStyle = 0; // 0: Oak, 1: Pine, 2: Cactus
  let waterLevel = -0.3; // Threshold for water generation
  
  if (biomeRoll < 0.33) {
    biome = BiomeType.DESERT;
    baseTile = TileType.SAND;
    treeStyle = 2; // Cactus
    waterLevel = -0.6; // Less water
  } else if (biomeRoll < 0.66) {
    biome = BiomeType.ALPINE;
    baseTile = TileType.GRASS; // Mix of grass/snow
    treeStyle = 1; // Pine
    waterLevel = -0.2;
  }

  // 1. Initialize Grid with Height Map & Terrain
  for (let z = 0; z < GRID_SIZE; z++) {
    const row: GridNode[] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      const h = noise(x, z, seed);
      let type: TileType = baseTile;
      let height = Math.max(0, h * 0.5); // Visual height

      // Biome specific logic
      if (h < waterLevel) {
        type = TileType.WATER;
        height = -0.2;
      } else if (biome === BiomeType.ALPINE && h > 0.4) {
        type = TileType.SNOW;
        height = h * 0.8; // Higher peaks
      } else if (biome === BiomeType.ALPINE && h > 0.1) {
        type = TileType.ROCK;
        height = h * 0.6;
      } else if (biome === BiomeType.FOREST && h > 0.6) {
        type = TileType.ROCK;
      }

      row.push({
        x,
        y: z,
        walkable: type !== TileType.WATER && type !== TileType.ROCK, // Rock/Water unwalkable
        type,
        height,
        decoration: null,
      });
    }
    grid.push(row);
  }

  // 2. Generate Organic Lakes (Cellular growth)
  const numLakes = biome === BiomeType.DESERT ? 2 : 8; // Increased lake count
  for (let i = 0; i < numLakes; i++) {
    let lx = randomInt(5, GRID_SIZE - 5);
    let lz = randomInt(5, GRID_SIZE - 5);
    if (grid[lz][lx].type === TileType.WATER) continue; // Already water

    // Grow lake
    const lakeSize = randomInt(15, 50); // Larger lakes
    const queue = [{x: lx, z: lz}];
    let currentSize = 0;
    
    while(queue.length > 0 && currentSize < lakeSize) {
      const cur = queue.shift()!;
      if (cur.x < 0 || cur.x >= GRID_SIZE || cur.z < 0 || cur.z >= GRID_SIZE) continue;
      
      if (grid[cur.z][cur.x].type !== TileType.WATER) {
        grid[cur.z][cur.x].type = TileType.WATER;
        grid[cur.z][cur.x].walkable = false;
        grid[cur.z][cur.x].height = -0.2;
        currentSize++;

        if (Math.random() > 0.3) queue.push({x: cur.x + 1, z: cur.z});
        if (Math.random() > 0.3) queue.push({x: cur.x - 1, z: cur.z});
        if (Math.random() > 0.3) queue.push({x: cur.x, z: cur.z + 1});
        if (Math.random() > 0.3) queue.push({x: cur.x, z: cur.z - 1});
      }
    }
  }

  // 3. Generate Roads (Connect random points)
  // Find valid land spots for start/end
  const getLandPoint = () => {
    let p = { x: randomInt(2, GRID_SIZE-3), z: randomInt(2, GRID_SIZE-3) };
    let safety = 0;
    while (!grid[p.z][p.x].walkable && safety < 500) {
      p = { x: randomInt(2, GRID_SIZE-3), z: randomInt(2, GRID_SIZE-3) };
      safety++;
    }
    return p;
  };

  const drawRoad = (p1: Position, p2: Position) => {
    let currX = p1.x;
    let currZ = p1.z;
    
    // Simple pathing for roads
    let failsafe = 0;
    while ((currX !== p2.x || currZ !== p2.z) && failsafe < 1000) {
      failsafe++;
      if (grid[currZ][currX].type !== TileType.WATER) {
        grid[currZ][currX].type = TileType.ROAD;
        grid[currZ][currX].walkable = true;
        grid[currZ][currX].height = 0.05;
      } else {
        // Bridge over water
        grid[currZ][currX].type = TileType.ROAD; 
        grid[currZ][currX].walkable = true;
        grid[currZ][currX].height = 0.1;
      }

      // Random-ish movement towards target to make roads less straight
      if (Math.random() > 0.5) {
        if (currX !== p2.x) currX += currX < p2.x ? 1 : -1;
        else if (currZ !== p2.z) currZ += currZ < p2.z ? 1 : -1;
      } else {
        if (currZ !== p2.z) currZ += currZ < p2.z ? 1 : -1;
        else if (currX !== p2.x) currX += currX < p2.x ? 1 : -1;
      }
    }
  };

  // Generate a network of roads
  const roadNodesCount = 10;
  const roadNodes: Position[] = [];
  for(let i=0; i<roadNodesCount; i++) {
      roadNodes.push(getLandPoint());
  }
  
  // Connect in a loop and some cross-connections
  for(let i=0; i<roadNodesCount; i++) {
      drawRoad(roadNodes[i], roadNodes[(i+1) % roadNodesCount]);
      // Connect to opposite sometimes for cross-roads
      if (i % 3 === 0) {
          drawRoad(roadNodes[i], roadNodes[(i + 4) % roadNodesCount]);
      }
  }

  // 4. Place Houses (Near roads)
  let housesPlaced = 0;
  let attempts = 0;
  // Increased attempts allowed for dense placement
  while (housesPlaced < HOUSE_COUNT && attempts < 10000) {
    attempts++;
    const x = randomInt(1, GRID_SIZE - 2);
    const z = randomInt(1, GRID_SIZE - 2);

    const tile = grid[z][x];
    if (tile.type !== baseTile && tile.type !== TileType.SNOW) continue; // Build on land
    
    // Check neighbors for road
    const neighbors = [
      grid[z + 1]?.[x], grid[z - 1]?.[x], grid[z]?.[x + 1], grid[z]?.[x - 1]
    ];
    const nearRoad = neighbors.some(n => n && n.type === TileType.ROAD);

    if (nearRoad) {
      tile.type = TileType.HOUSE;
      tile.walkable = false;
      tile.height = 0;
      // Random house style: 0 (Cottage), 1 (Tower), 2 (Manor)
      tile.style = randomInt(0, 2); 
      housesPlaced++;
    }
  }

  // 5. Place Decorations (Street Lamps)
  // We do this after houses and roads are set
  for (let z = 1; z < GRID_SIZE - 1; z++) {
    for (let x = 1; x < GRID_SIZE - 1; x++) {
      const tile = grid[z][x];
      // Place lamps on empty walkable tiles next to roads
      if (tile.type === baseTile && tile.walkable && !tile.itemId) {
         const neighbors = [
             grid[z+1]?.[x], grid[z-1]?.[x], grid[z]?.[x+1], grid[z]?.[x-1],
             grid[z+1]?.[x+1], grid[z-1]?.[x-1], grid[z+1]?.[x-1], grid[z-1]?.[x+1]
         ];
         
         const nextToRoad = neighbors.some(n => n?.type === TileType.ROAD);
         
         // 4% chance per valid tile to spawn a lamp
         if (nextToRoad && Math.random() < 0.04) {
             tile.decoration = 'lamp';
             tile.walkable = false; // Lamp posts block movement
         }
      }
    }
  }

  // 6. Place Vegetation (Trees/Cacti/Rocks)
  let treesPlaced = 0;
  attempts = 0;
  const targetTrees = biome === BiomeType.DESERT ? TREE_COUNT / 2 : TREE_COUNT; // Less trees in desert

  while (treesPlaced < targetTrees && attempts < 10000) {
    attempts++;
    const x = randomInt(0, GRID_SIZE - 1);
    const z = randomInt(0, GRID_SIZE - 1);
    const tile = grid[z][x];

    if (tile.walkable && tile.type !== TileType.ROAD && tile.type !== TileType.HOUSE && !tile.decoration) {
      // Clustering logic: higher chance if near another tree
      tile.type = TileType.TREE;
      tile.walkable = false;
      tile.style = treeStyle; 
      treesPlaced++;
    }
  }

  // 7. Place Items (Context Aware)
  let itemsPlaced = 0;
  attempts = 0;
  
  while (itemsPlaced < ITEM_COUNT && attempts < 10000) {
    attempts++;
    const x = randomInt(0, GRID_SIZE - 1);
    const z = randomInt(0, GRID_SIZE - 1);
    const tile = grid[z][x];

    if (tile.walkable && !tile.itemId && !tile.decoration) {
      let itemType: ItemType;
      
      // Biome/Terrain specific loot table
      if (tile.type === TileType.SNOW || tile.type === TileType.ROCK) {
        itemType = Math.random() > 0.5 ? ItemType.STONE : ItemType.GEM;
      } else if (biome === BiomeType.DESERT) {
        itemType = Math.random() > 0.7 ? ItemType.GOLD : ItemType.STONE;
      } else if (biome === BiomeType.FOREST) {
        const nearTree = [grid[z+1]?.[x], grid[z-1]?.[x], grid[z]?.[x+1], grid[z]?.[x-1]].some(n => n?.type === TileType.TREE);
        itemType = nearTree ? ItemType.BERRY : ItemType.WOOD;
      } else {
         // Default random
         const all = Object.values(ItemType);
         const roll = Math.random();
         if (roll > 0.9) itemType = ItemType.SWORD;
         else if (roll > 0.8) itemType = ItemType.POTION;
         else itemType = all[randomInt(0, all.length - 3)] as ItemType; // Exclude sword/potion from generic roll usually
      }

      const id = `item-${itemsPlaced}`;
      items.push({
        id,
        type: itemType,
        position: { x, z },
        collected: false,
      });
      tile.itemId = id;
      itemsPlaced++;
    }
  }

  // 8. Spawn Enemies
  let enemiesPlaced = 0;
  attempts = 0;
  while (enemiesPlaced < ENEMY_COUNT && attempts < 10000) {
    attempts++;
    const x = randomInt(0, GRID_SIZE - 1);
    const z = randomInt(0, GRID_SIZE - 1);
    const tile = grid[z][x];

    // Ensure walkable and no item/house/decoration
    if (tile.walkable && tile.type !== TileType.ROAD && !tile.itemId && !tile.decoration) {
       enemies.push({
         id: `enemy-${enemiesPlaced}`,
         position: { x, z },
         hp: ENEMY_MAX_HP,
         maxHp: ENEMY_MAX_HP,
         attack: ENEMY_ATTACK,
         dead: false
       });
       enemiesPlaced++;
    }
  }

  // 9. Start Pos
  let startPos = { x: 0, z: 0 };
  for(let z=0; z<GRID_SIZE; z++) {
    for(let x=0; x<GRID_SIZE; x++) {
      if(grid[z][x].type === TileType.ROAD) {
        startPos = { x, z };
        break;
      }
    }
  }

  return { grid, items, enemies, startPos, biome };
};