
import { ItemType, Recipe, EnemyType } from "./types";

export const DEFAULT_GRID_SIZE = 80; 
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
    id: 'craft_fishing_rod',
    name: 'Fishing Rod',
    result: ItemType.FISHING_ROD,
    resultCount: 1,
    description: 'A simple rod for catching fish in water.',
    ingredients: [
        { type: ItemType.WOOD, count: 3 },
        { type: ItemType.STONE, count: 1 },
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
  },
  {
    id: 'cook_fish',
    name: 'Cooked Fish',
    result: ItemType.POTION, // Placeholder: Cooking fish makes potion for now
    resultCount: 1,
    description: 'Cook raw fish into a healing meal.',
    ingredients: [
        { type: ItemType.RAW_FISH, count: 1 },
        { type: ItemType.COAL, count: 1 }
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
  ROAD: '#94a3b8', // Cobblestone
  PATH: '#d97706', // Dirt/Worn path

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

  // Props
  BARREL: '#78350f',
  CRATE: '#92400e',

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
  [ItemType.POWER_CORE]: '#06b6d4', // Cyan/Electric Blue
  [ItemType.ENGINE_PART]: '#475569', // Slate
  [ItemType.FISHING_ROD]: '#f59e0b', // Amber/Orange
  [ItemType.RAW_FISH]: '#38bdf8', // Light Blue
  [ItemType.OLD_BOOT]: '#4b5563', // Grey
  [ItemType.ANCIENT_COIN]: '#fcd34d', // Gold
};

export const ITEM_DETAILS: Record<ItemType, { name: string; description: string; lore: string; usage?: string; type: string }> = {
  [ItemType.WOOD]: {
    name: "Ancient Log",
    description: "A rough, weathered block of timber. Essential for construction and basic crafting.",
    lore: "Timber from the Whispering Pines. Locals say the sap bleeds red if you cut it during a full moon. It's sturdy, but always feels slightly damp to the touch.",
    type: "Material"
  },
  [ItemType.STONE]: {
    name: "Granite Chunk",
    description: "A heavy, solid rock. Used for durable tools and foundations.",
    lore: "Quarried from the Deep Ridge. It's surprisingly heavy and bears faint, natural markings that look unsettlingly like runic script. It smells of dust and deep earth.",
    type: "Material"
  },
  [ItemType.GEM]: {
    name: "Astral Geode",
    description: "A sparkling gemstone that hums with faint magical energy.",
    lore: "A shard of Astralite. It refracts light into colors that don't quite exist in the natural spectrum. Mages once used these to power their floating towers before the Fall.",
    type: "Treasure"
  },
  [ItemType.GOLD]: {
    name: "Imperial Coin",
    description: "Standard currency of the fallen realm.",
    lore: "An Imperial Dinar. The face on the coin has been scratched out, likely by a revolutionary long ago. Gold is the only thing that hasn't rusted in this valley.",
    type: "Currency"
  },
  [ItemType.BERRY]: {
    name: "Sunberry",
    description: "A small, glowing fruit found in wild bushes.",
    lore: "Wild Lumina Berries. They provide a burst of energy, but eating too many causes one to hear voices in the wind. A favorite snack of the strange local fauna.",
    type: "Consumable"
  },
  [ItemType.SWORD]: {
    name: "Iron Broadsword",
    description: "A sharp, reliable blade for combat.",
    lore: "A heavy iron blade with a leather-wrapped grip. There are notches along the edge, tally marks of battles fought in the mud and rain against things better left unnamed.",
    usage: "+15 Attack Damage",
    type: "Weapon"
  },
  [ItemType.POTION]: {
    name: "Vitality Draught",
    description: "A swirling red liquid that knits wounds instantly.",
    lore: "Alchemist's Red. A volatile mixture that accelerates cell regeneration. The taste is vile—like copper and burnt sugar—but it beats bleeding out in the dirt.",
    usage: "Restores 30 HP",
    type: "Consumable"
  },
  [ItemType.IRON_ORE]: {
    name: "Raw Iron",
    description: "Unrefined iron ore with heavy rock impurities.",
    lore: "Bog Iron from the marshes. Dreadfully impure and smelling of sulfur. It takes a hot fire to smelt, but the resulting metal is harder than anything imported from the capital.",
    type: "Material"
  },
  [ItemType.COAL]: {
    name: "Ember Coal",
    description: "Combustible black rock that burns hot.",
    lore: "Dark-Earth. Digging this up usually disturbs the slumbering things beneath. It burns with a smokeless blue flame and is essential for smelting the strange metals found here.",
    type: "Fuel"
  },
  [ItemType.SONS_WATCH]: {
    name: "Silver Pocket Watch",
    description: "A tarnished silver watch. It's stopped forever at 4:20.",
    lore: "The silver casing is dented, shielding a cracked face. The ticking is uneven, like a faltering heartbeat. It belonged to someone who walked into the woods and never walked out.",
    type: "Quest Item"
  },
  [ItemType.POWER_CORE]: {
    name: "Golem Core",
    description: "A pulsating, unstable crystal extracted from a Golem.",
    lore: "The beating heart of a Golem. It pulses with a rhythmic, magnetic thrum that makes your teeth ache. It feels uncomfortably hot and is prone to violent electrical arcing.",
    type: "Quest Item"
  },
  [ItemType.ENGINE_PART]: {
    name: "Spark Assembly",
    description: "A makeshift engine component crafted by McGregor.",
    lore: "A Spark-Ignition Manifold. It's a relic of high-tech engineering, salvaged from the wreckage of the old world and patched with brass fittings. It smells of ozone and grease.",
    usage: "Fixes the Car",
    type: "Quest Item"
  },
  [ItemType.FISHING_ROD]: {
    name: "Wooden Rod",
    description: "A simple flexible stick with a string and hook.",
    lore: "It won't catch a leviathan, but it's good enough for river trout. Fishing is a good way to pass the time while the world ends.",
    usage: "Equip to fish in water",
    type: "Tool"
  },
  [ItemType.RAW_FISH]: {
    name: "River Trout",
    description: "A slippery, fresh fish.",
    lore: "Its scales shimmer in the light. It's good eating if you can get a fire going.",
    type: "Material"
  },
  [ItemType.OLD_BOOT]: {
    name: "Soggy Boot",
    description: "Gross. Someone walked home barefoot.",
    lore: "The leather is rotten and it smells of pond scum. Maybe there's a coin stuck in the heel? No, just mud.",
    type: "Junk"
  },
  [ItemType.ANCIENT_COIN]: {
    name: "Pre-War Coin",
    description: "A heavy gold coin from a lost era.",
    lore: "Minted before the Collapse. Collectors pay a handsome price for these.",
    type: "Treasure"
  }
};
