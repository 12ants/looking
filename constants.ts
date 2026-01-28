import { ItemType, Recipe, EnemyType } from "./types";

export const DEFAULT_GRID_SIZE = 50; 
export const TILE_SIZE = 1;

// Scaled down counts for smaller map
export const HOUSE_COUNT = 30; 
export const TREE_COUNT = 120;
export const ITEM_COUNT = 50;
export const ENEMY_COUNT = 20;

// Combat Config
export const PLAYER_START_HP = 100;

export const ENEMY_CONFIG: Record<EnemyType, { hp: number, attack: number, color: string }> = {
  [EnemyType.SLIME]: { hp: 30, attack: 5, color: '#db2777' }, // Pink
  [EnemyType.GHOST]: { hp: 20, attack: 8, color: '#a855f7' }, // Purple
  [EnemyType.GOLEM]: { hp: 80, attack: 15, color: '#94a3b8' }, // Grey
};

export const ENEMY_MAX_HP = 30; // Deprecated fallback
export const ENEMY_ATTACK = 5; // Deprecated fallback

export const PLAYER_BASE_ATTACK = 10;
export const SWORD_BONUS_ATTACK = 15;
export const POTION_HEAL_AMOUNT = 30;
export const ENEMY_AGGRO_RANGE = 12;

export const RECIPES: Recipe[] = [
  {
    id: 'craft_sword',
    name: 'Iron Sword',
    result: ItemType.SWORD,
    resultCount: 1,
    description: 'Forged from Iron and Coal.',
    ingredients: [
      { type: ItemType.WOOD, count: 2 },
      { type: ItemType.IRON_ORE, count: 3 },
      { type: ItemType.COAL, count: 2 },
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
  BUSH: '#16a34a',

  // House Styles
  HOUSE_WALL_A: '#fca5a5',
  HOUSE_ROOF_A: '#b91c1c',
  HOUSE_WALL_B: '#fdba74',
  HOUSE_ROOF_B: '#9a3412',
  HOUSE_WALL_C: '#cbd5e1',
  HOUSE_ROOF_C: '#334155',

  // Entities (Fallbacks)
  ENEMY: '#db2777', 
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
  [ItemType.IRON_ORE]: '#b45309', // Rusty orange
  [ItemType.COAL]: '#1e293b', // Dark slate/black
  [ItemType.SONS_WATCH]: '#cbd5e1', // Silver/White
};

export const ITEM_DETAILS: Record<ItemType, { name: string; description: string; lore: string; usage?: string; type: string }> = {
  [ItemType.WOOD]: {
    name: "Wood Log",
    description: "A rough block of wood. Essential for construction and crafting.",
    lore: "Harvested from the ancient forests.",
    type: "Material"
  },
  [ItemType.STONE]: {
    name: "Stone Chunk",
    description: "A heavy, solid rock. Used for durable tools.",
    lore: "Cold to the touch, reliable in a fight.",
    type: "Material"
  },
  [ItemType.GEM]: {
    name: "Mystic Gem",
    description: "A sparkling gemstone with magical properties.",
    lore: "It seems to glow with an inner light.",
    type: "Treasure"
  },
  [ItemType.GOLD]: {
    name: "Gold Coin",
    description: "Standard currency of the realm.",
    lore: "Minted in the capital long ago.",
    type: "Currency"
  },
  [ItemType.BERRY]: {
    name: "Wild Berry",
    description: "A small, sweet fruit found in bushes.",
    lore: "Nature's candy. Beware of thorns.",
    usage: "Restores Energy (Planned)",
    type: "Consumable"
  },
  [ItemType.SWORD]: {
    name: "Iron Sword",
    description: "A sharp blade for combat.",
    lore: "Trusty steel. Pointy end goes into the enemy.",
    usage: "+15 Attack Damage",
    type: "Weapon"
  },
  [ItemType.POTION]: {
    name: "Health Potion",
    description: "A red liquid that knits wounds instantly.",
    lore: "Tastes like strawberries and chalk.",
    usage: "Restores 30 HP",
    type: "Consumable"
  },
  [ItemType.IRON_ORE]: {
    name: "Iron Ore",
    description: "Unrefined iron with rock impurities.",
    lore: "Requires smelting to be useful.",
    type: "Material"
  },
  [ItemType.COAL]: {
    name: "Lump of Coal",
    description: "Combustible black rock.",
    lore: "Keeps the forge fires burning.",
    type: "Fuel"
  },
  [ItemType.SONS_WATCH]: {
    name: "Old Pocket Watch",
    description: "A tarnished silver watch. It's stopped at 4:20.",
    lore: "Engraved on the back: 'For my son, always.'",
    type: "Quest Item"
  }
};
