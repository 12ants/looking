import React from 'react';

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
  BUSH = 9,
}

export enum ItemType {
  WOOD = 'Wood',
  STONE = 'Stone',
  GEM = 'Gem',
  GOLD = 'Gold',
  BERRY = 'Berry',
  SWORD = 'Sword',
  POTION = 'Potion',
  IRON_ORE = 'Iron Ore',
  COAL = 'Coal',
  SONS_WATCH = 'Sons Watch', // Quest Item
}

export enum BiomeType {
  FOREST = 'Forest',
  DESERT = 'Desert',
  ALPINE = 'Alpine',
}

export enum EnemyType {
  SLIME = 'Slime',
  GHOST = 'Ghost',
  GOLEM = 'Golem',
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
  decoration?: string | null; // 'lamp', 'fence', 'flower'
  decorationActive?: boolean; // State for decorations like lamps (on/off), Houses (looted)
  rotation?: number; // Y-axis rotation in radians
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
  type: EnemyType;
  position: Position;
  hp: number;
  maxHp: number;
  attack: number;
  dead: boolean;
}

export interface NPC {
  id: string;
  name: string;
  position: Position;
  role: 'QUEST_GIVER' | 'MERCHANT' | 'VILLAGER';
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  type: 'COLLECT' | 'KILL' | 'TALK';
  targetType: ItemType | 'ENEMY' | 'NPC'; // ItemType for collect, 'ENEMY' for kill
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

export interface DialogueOption {
  label: string;
  action: () => void;
}

export interface DialogueState {
  npcName: string;
  text: string;
  options: DialogueOption[];
}

export interface GameState {
  grid: GridNode[][];
  worldOrigin: Position; // The world coordinate of grid[0][0]
  items: WorldItem[];
  enemies: Enemy[];
  npcs: NPC[]; // New NPC array
  playerPos: Position;
  playerFacing: Position; // Normalized direction vector
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
  activeDialogue: DialogueState | null; // New Dialogue State
  interactionCount: number;
  biome: BiomeType;
  harvestTarget: Position | null;
  combatTargetId: string | null;
  particles: Particle[];
  shakeIntensity: number;
  damageFlash: number; // Opacity 0-1
  timeOfDay: number; // 0 to 24
  seed: number;
  storyStage: number; // 0: Start, 1: Quest Given, 2: Item Found, 3: Completed
}

// Global declaration to extend JSX Intrinsic Elements with React Three Fiber types
declare global {
  namespace JSX {
    interface IntrinsicElements {
      // Catch-all for React Three Fiber elements to prevent type errors
      [elemName: string]: any;
    }
  }
}
