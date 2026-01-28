import { ItemType, Recipe } from "./types";

export const GRID_SIZE = 120; // Increased from 60 to 120 (4x area)
export const TILE_SIZE = 1;

// Scaled up counts for the larger map
export const HOUSE_COUNT = 120; 
export const TREE_COUNT = 450;
export const ITEM_COUNT = 300;
export const ENEMY_COUNT = 80;

// Combat Config
export const PLAYER_START_HP = 100;
export const ENEMY_MAX_HP = 30;
export const ENEMY_ATTACK = 5;
export const PLAYER_BASE_ATTACK = 10;
export const SWORD_BONUS_ATTACK = 15;
export const POTION_HEAL_AMOUNT = 30;
export const ENEMY_AGGRO_RANGE = 12; // Increased aggro range

export const RECIPES: Recipe[] = [
  {
    id: 'craft_sword',
    name: 'Iron Sword',
    result: ItemType.SWORD,
    resultCount: 1,
    description: 'Increases attack damage by 15.',
    ingredients: [
      { type: ItemType.WOOD, count: 3 },
      { type: ItemType.STONE, count: 2 },
    ]
  },
  {
    id: 'craft_potion',
    name: 'Health Potion',
    result: ItemType.POTION,
    resultCount: 1,
    description: 'Restores 30 Health Points.',
    ingredients: [
      { type: ItemType.BERRY, count: 2 },
    ]
  },
  {
    id: 'craft_gold_transmute',
    name: 'Transmute Gold',
    result: ItemType.GOLD,
    resultCount: 1,
    description: 'Turn valuable gems into gold.',
    ingredients: [
      { type: ItemType.GEM, count: 2 },
    ]
  }
];

export const COLORS = {
  // Terrain
  GRASS: '#4ade80',
  GRASS_DARK: '#22c55e',
  SAND: '#fcd34d',
  SAND_DARK: '#fbbf24',
  ROCK: '#78716c',
  ROCK_DARK: '#57534e',
  SNOW: '#f8fafc',
  WATER: '#60a5fa',
  WATER_DEEP: '#3b82f6',
  ROAD: '#94a3b8',
  PATH: '#fbbf24',

  // Vegetation
  TREE_TRUNK: '#78350f',
  TREE_LEAVES: '#15803d',
  PINE_LEAVES: '#064e3b',
  CACTUS: '#65a30d',
  STUMP: '#5d4037',

  // House Styles
  HOUSE_WALL_A: '#fca5a5',
  HOUSE_ROOF_A: '#b91c1c',
  HOUSE_WALL_B: '#fdba74',
  HOUSE_ROOF_B: '#9a3412',
  HOUSE_WALL_C: '#cbd5e1',
  HOUSE_ROOF_C: '#334155',

  // Entities
  ENEMY: '#db2777', // Pink Slime
  ENEMY_HIT: '#ffffff',
};

export const ITEM_COLORS: Record<ItemType, string> = {
  [ItemType.WOOD]: '#a0522d',
  [ItemType.STONE]: '#a9a9a9',
  [ItemType.GEM]: '#ec4899',
  [ItemType.GOLD]: '#fbbf24',
  [ItemType.BERRY]: '#ef4444',
  [ItemType.SWORD]: '#60a5fa',
  [ItemType.POTION]: '#84cc16',
};