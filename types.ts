export enum TileType {
  GRASS = 0,
  ROAD = 1,
  HOUSE = 2,
  TREE = 3,
  WATER = 4,
  SAND = 5,
  ROCK = 6,
  SNOW = 7,
  STUMP = 8,
}

export enum ItemType {
  WOOD = 'Wood',
  STONE = 'Stone',
  GEM = 'Gem',
  GOLD = 'Gold',
  BERRY = 'Berry',
  SWORD = 'Sword',
  POTION = 'Potion',
}

export enum BiomeType {
  FOREST = 'Forest',
  DESERT = 'Desert',
  ALPINE = 'Alpine',
}

export interface Position {
  x: number;
  z: number; // Using Z for 3D depth instead of Y
}

export interface GridNode {
  x: number;
  y: number; // Grid Y maps to World Z
  walkable: boolean;
  type: TileType;
  height: number;
  itemId?: string; // ID of item on this tile if any
  style?: number; // Variant for houses (0-2) or trees (0-2)
  decoration?: string | null;
}

export interface WorldItem {
  id: string;
  type: ItemType;
  position: Position;
  collected: boolean;
}

export interface InventoryItem {
  type: ItemType;
  count: number;
}

export interface Enemy {
  id: string;
  position: Position;
  hp: number;
  maxHp: number;
  attack: number;
  dead: boolean;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  type: 'COLLECT' | 'KILL';
  targetType: ItemType | 'ENEMY'; // ItemType for collect, 'ENEMY' for kill
  requiredCount: number;
  currentCount: number;
  completed: boolean;
}

export interface Ingredient {
  type: ItemType;
  count: number;
}

export interface Recipe {
  id: string;
  name: string;
  result: ItemType;
  resultCount: number;
  ingredients: Ingredient[];
  description: string;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  color: string;
  life: number; // 0.0 to 1.0
  scale: number;
}

export interface GameState {
  grid: GridNode[][];
  items: WorldItem[];
  enemies: Enemy[];
  playerPos: Position;
  playerHp: number;
  playerMaxHp: number;
  targetPos: Position | null;
  path: Position[];
  isMoving: boolean;
  inventory: InventoryItem[];
  inventoryOpen: boolean;
  craftingOpen: boolean;
  quests: Quest[];
  questLogOpen: boolean;
  interactionCount: number;
  biome: BiomeType;
  harvestTarget: Position | null;
  combatTargetId: string | null;
  particles: Particle[];
  shakeIntensity: number;
  damageFlash: number; // Opacity 0-1
}