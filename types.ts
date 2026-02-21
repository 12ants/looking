
import React from 'react';
import { ThreeElements } from '@react-three/fiber';

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
  PATH = 10, // Dirt path
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
  SONS_WATCH = 'Sons Watch', // Side Quest Item
  POWER_CORE = 'Power Core', // Main Quest Item
  ENGINE_PART = 'Engine Part', // Main Quest Item
  FISHING_ROD = 'Fishing Rod',
  RAW_FISH = 'Raw Fish',
  OLD_BOOT = 'Old Boot',
  ANCIENT_COIN = 'Ancient Coin',
}

export enum BiomeType {
  FOREST = 'Forest',
}

export enum EnemyType {
  SLIME = 'Slime',
  GHOST = 'Ghost',
  GOLEM = 'Golem',
}

export enum WeatherType {
  CLEAR = 'Clear',
  RAIN = 'Rain',
  STORM = 'Storm',
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
  decoration?: string | null; // 'lamp', 'fence', 'flower', 'barrel', 'crate', 'cave', 'bridge', 'mushroom', 'pebble'
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

export interface PlayerConfig {
  skinColor: string;
  shirtColor: string;
  pantsColor: string;
}

export interface GameSettings {
  audioVolume: number;
  shadowsEnabled: boolean;
  particleQuality: 'LOW' | 'HIGH';
  daySpeed: number; // New: 0.1 to 2.0
  enemyDensity: 'LOW' | 'MEDIUM' | 'HIGH'; // New
  showDebugLog: boolean; // New: Toggle for HUD
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
  type: 'COLLECT' | 'KILL' | 'TALK' | 'INTERACT';
  targetType: string; // Flexible target type (ItemType, 'ENEMY', 'NPC', 'LAMP', 'CAVE', etc.)
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

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'INFO' | 'COMBAT' | 'LOOT' | 'SYSTEM';
}

export interface Notification {
  id: string;
  message: string;
  subtext?: string;
  type: 'QUEST' | 'ITEM' | 'INFO' | 'DANGER';
}

export interface FishingState {
    status: 'IDLE' | 'CASTING' | 'WAITING' | 'BITE' | 'REELING' | 'CAUGHT' | 'LOST';
    bobberPos: Position | null;
    startTime: number;
    targetZone: number; // 0-100 position of the green bar
    cursorPos: number; // 0-100 position of the player cursor
}

export interface GameState {
  grid: GridNode[][];
  worldOrigin: Position; // The world coordinate of grid[0][0]
  items: WorldItem[];
  enemies: Enemy[];
  npcs: NPC[]; 
  playerPos: Position;
  playerFacing: Position; // Normalized direction vector
  playerHp: number;
  playerMaxHp: number;
  targetPos: Position | null;
  pendingTarget: Position | null; // New: For double-click movement verification
  path: Position[];
  isMoving: boolean;
  inventory: InventoryItem[];
  inventoryOpen: boolean;
  craftingOpen: boolean;
  settingsOpen: boolean; 
  gameSettings: GameSettings; 
  quests: Quest[];
  questLogOpen: boolean;
  activeDialogue: DialogueState | null; 
  activeThought: string | null; // New: Player internal monologue
  interactionCount: number;
  biome: BiomeType;
  harvestTarget: Position | null;
  combatTargetId: string | null;
  particles: Particle[];
  shakeIntensity: number;
  damageFlash: number; 
  timeOfDay: number; // 0 to 24
  seed: number;
  storyStage: number; 
  logs: LogEntry[]; 
  notification: Notification | null; // New: Visual Toast Indicator
  gameWon: boolean; // New: Win state
  fishing: FishingState; // New: Fishing mechanics
  weather: WeatherType; // New: Dynamic weather
  weatherIntensity: number; // 0 to 1 for lerping effects
}

// Global declaration to extend JSX Intrinsic Elements with React Three Fiber types.
// Merging into both global JSX and React.JSX to cover standard and react-jsx transform environments.
declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {
      [elemName: string]: any;
    }
  }
  namespace React {
    namespace JSX {
      interface IntrinsicElements extends ThreeElements {
        [elemName: string]: any;
      }
    }
  }
}
