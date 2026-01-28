import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, Sky, Stars, ContactShadows } from '@react-three/drei';
import { generateWorld } from '../utils/generation';
import { findPath } from '../utils/pathfinding';
import { GameState, Position, TileType, ItemType, Enemy, Recipe, Particle } from '../types';
import { GRID_SIZE, PLAYER_START_HP, ENEMY_AGGRO_RANGE, PLAYER_BASE_ATTACK, SWORD_BONUS_ATTACK, POTION_HEAL_AMOUNT, ENEMY_ATTACK } from '../constants';
import { GroundTile, House, Tree, Stump, ItemMesh, PathLine, EnemyMesh, StreetLamp } from './WorldMeshes';
import { Player } from './Player';
import { InventoryUI } from './InventoryUI';
import { QuestLog } from './QuestLog';
import { CraftingUI } from './CraftingUI';
import { Effects } from './Effects';
import { soundManager } from '../utils/SoundManager';
import { MousePointer2, RefreshCw, Heart, Skull, Volume2 } from 'lucide-react';

export const Game: React.FC = () => {
  // --- Game State ---
  const [gameState, setGameState] = useState<GameState>(() => {
    const { grid, items, enemies, startPos, biome } = generateWorld();
    return {
      grid,
      items,
      enemies,
      playerPos: startPos,
      playerHp: PLAYER_START_HP,
      playerMaxHp: PLAYER_START_HP,
      targetPos: null,
      path: [],
      isMoving: false,
      inventory: [],
      inventoryOpen: false,
      craftingOpen: false,
      interactionCount: 0,
      biome: biome,
      harvestTarget: null,
      combatTargetId: null,
      questLogOpen: false,
      particles: [],
      shakeIntensity: 0,
      damageFlash: 0,
      quests: [
        { 
          id: 'q1', 
          title: 'Lumberjack', 
          description: 'Collect 5 pieces of Wood from trees.', 
          type: 'COLLECT', 
          targetType: ItemType.WOOD, 
          requiredCount: 5, 
          currentCount: 0, 
          completed: false 
        },
        { 
          id: 'q2', 
          title: 'Slime Hunter', 
          description: 'Defeat 3 Slimes to clear the area.', 
          type: 'KILL', 
          targetType: 'ENEMY', 
          requiredCount: 3, 
          currentCount: 0, 
          completed: false 
        },
      ]
    };
  });

  const lastFrameTime = useRef(Date.now());

  // --- Game Loop (Physics, AI, Particles) ---
  useEffect(() => {
    let animationFrameId: number;

    const loop = () => {
      const now = Date.now();
      const delta = (now - lastFrameTime.current) / 1000;
      lastFrameTime.current = now;

      setGameState(prev => {
        // 1. Particle Physics
        let newParticles = prev.particles.map(p => ({
            ...p,
            x: p.x + p.vx * delta * 5, // Speed up visual
            y: p.y + p.vy * delta * 5,
            z: p.z + p.vz * delta * 5,
            vy: p.vy - 10 * delta, // Gravity
            life: p.life - delta, // Decay
        })).filter(p => p.life > 0 && p.y > -0.5);

        // 2. Shake Decay
        const newShake = Math.max(0, prev.shakeIntensity - delta * 5);
        
        // 3. Damage Flash Decay
        const newFlash = Math.max(0, prev.damageFlash - delta * 2);

        // 4. Enemy Logic (Run less frequently ideally, but okay for now)
        // We'll move the heavy AI logic here from the interval to sync everything if we wanted smoothness,
        // but let's keep the interval for AI ticks to avoid overloading render loop state updates.
        // However, we MUST return something if we want to update particles/shake frame-by-frame.
        
        if (newParticles.length !== prev.particles.length || prev.shakeIntensity !== newShake || prev.damageFlash !== newFlash) {
             return { ...prev, particles: newParticles, shakeIntensity: newShake, damageFlash: newFlash };
        }
        return prev;
      });

      animationFrameId = requestAnimationFrame(loop);
    };

    loop();
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  // --- Enemy AI Interval ---
  useEffect(() => {
    const interval = setInterval(() => {
      setGameState(prev => {
        if (prev.playerHp <= 0) return prev; 

        let newEnemies = [...prev.enemies];
        let newPlayerHp = prev.playerHp;
        let tookDamage = false;

        newEnemies = newEnemies.map(enemy => {
          if (enemy.dead) return enemy;

          const dist = Math.abs(enemy.position.x - prev.playerPos.x) + Math.abs(enemy.position.z - prev.playerPos.z);
          
          if (dist === 1) {
            // Attack Player
            newPlayerHp = Math.max(0, newPlayerHp - enemy.attack);
            tookDamage = true;
            soundManager.play('hit');
            return enemy;
          } else if (dist <= ENEMY_AGGRO_RANGE) {
            // Move logic...
            let dx = 0;
            let dz = 0;
            if (enemy.position.x < prev.playerPos.x) dx = 1;
            else if (enemy.position.x > prev.playerPos.x) dx = -1;
            else if (enemy.position.z < prev.playerPos.z) dz = 1;
            else if (enemy.position.z > prev.playerPos.z) dz = -1;

            const nextX = enemy.position.x + dx;
            const nextZ = enemy.position.z + dz;

            if (prev.grid[nextZ]?.[nextX]?.walkable) {
              return { ...enemy, position: { x: nextX, z: nextZ } };
            }
          }
          return enemy;
        });

        // Effect Triggers for damage
        let shake = prev.shakeIntensity;
        let flash = prev.damageFlash;
        
        if (tookDamage) {
            shake = 1.0;
            flash = 0.5;
        }

        return { ...prev, enemies: newEnemies, playerHp: newPlayerHp, shakeIntensity: shake, damageFlash: flash };
      });
    }, 800); 

    return () => clearInterval(interval);
  }, []);

  // --- Helpers ---

  const spawnParticles = (x: number, z: number, color: string, count: number) => {
    const newParticles: Particle[] = [];
    for(let i=0; i<count; i++) {
        newParticles.push({
            id: Math.random().toString(),
            x: x,
            y: 0.5,
            z: z,
            vx: (Math.random() - 0.5) * 2,
            vy: Math.random() * 2 + 1,
            vz: (Math.random() - 0.5) * 2,
            color: color,
            life: 1.0,
            scale: Math.random() * 0.5 + 0.5
        });
    }
    return newParticles;
  };

  const performAction = useCallback((targetX: number, targetZ: number) => {
    setGameState(prev => {
      const newGrid = prev.grid.map(row => row.map(node => ({ ...node })));
      const targetTile = newGrid[targetZ][targetX];
      const newItems = [...prev.items];
      const newEnemies = prev.enemies.map(e => ({...e}));
      const newQuests = [...prev.quests];
      let addedParticles: Particle[] = [];
      
      let itemType: ItemType | null = null;

      // Combat Interaction
      if (prev.combatTargetId) {
        const enemyIndex = newEnemies.findIndex(e => e.id === prev.combatTargetId);
        if (enemyIndex > -1 && !newEnemies[enemyIndex].dead) {
             const dmg = PLAYER_BASE_ATTACK + (prev.inventory.some(i => i.type === ItemType.SWORD) ? SWORD_BONUS_ATTACK : 0);
             newEnemies[enemyIndex].hp -= dmg;
             soundManager.play('hit');
             
             // Hit Particles
             addedParticles = spawnParticles(newEnemies[enemyIndex].position.x, newEnemies[enemyIndex].position.z, '#ffffff', 5);

             if (newEnemies[enemyIndex].hp <= 0) {
                 newEnemies[enemyIndex].dead = true;
                 soundManager.play('collect'); 
                 
                 // Death Particles
                 addedParticles = [...addedParticles, ...spawnParticles(newEnemies[enemyIndex].position.x, newEnemies[enemyIndex].position.z, '#db2777', 15)];

                 // Drop Loot
                 const lootRoll = Math.random();
                 const lootType = lootRoll > 0.5 ? ItemType.GOLD : (lootRoll > 0.2 ? ItemType.POTION : ItemType.GEM);
                 
                 newItems.push({
                    id: `loot-${Date.now()}`,
                    type: lootType,
                    position: { x: newEnemies[enemyIndex].position.x, z: newEnemies[enemyIndex].position.z },
                    collected: false
                 });

                 newQuests.forEach(q => {
                    if (!q.completed && q.type === 'KILL' && q.targetType === 'ENEMY') {
                        q.currentCount++;
                        if (q.currentCount >= q.requiredCount) q.completed = true;
                    }
                 });
             }
        }
      } 
      else {
        if (targetTile.type === TileType.TREE) {
            targetTile.type = TileType.STUMP;
            targetTile.walkable = true;
            itemType = ItemType.WOOD;
            soundManager.play('hit');
            addedParticles = spawnParticles(targetX, targetZ, '#15803d', 5);
        } else if (targetTile.type === TileType.ROCK) {
            targetTile.type = TileType.GRASS;
            targetTile.walkable = true;
            targetTile.height = Math.max(0, targetTile.height - 0.2);
            itemType = ItemType.STONE;
            soundManager.play('hit');
            addedParticles = spawnParticles(targetX, targetZ, '#78716c', 5);
        }

        if (itemType) {
            newItems.push({
            id: `spawn-${Date.now()}`,
            type: itemType,
            position: { x: targetX, z: targetZ },
            collected: false,
            });
        }
      }

      return {
        ...prev,
        grid: newGrid,
        items: newItems,
        enemies: newEnemies,
        quests: newQuests,
        harvestTarget: null,
        combatTargetId: null,
        isMoving: false,
        path: [],
        particles: [...prev.particles, ...addedParticles]
      };
    });
  }, []);

  const findPathToAdjacent = useCallback((grid: any[][], start: Position, target: Position) => {
    const neighbors = [
      {x: target.x+1, z: target.z}, {x: target.x-1, z: target.z},
      {x: target.x, z: target.z+1}, {x: target.x, z: target.z-1}
    ];

    let bestPath: Position[] | null = null;
    const atNeighbor = neighbors.some(n => n.x === start.x && n.z === start.z);
    if (atNeighbor) {
      return [start];
    }

    for (const n of neighbors) {
      if (n.x >= 0 && n.x < GRID_SIZE && n.z >= 0 && n.z < GRID_SIZE && grid[n.z][n.x].walkable) {
        const path = findPath(grid, start, n);
        if (path.length > 0 && (!bestPath || path.length < bestPath.length)) {
          bestPath = path;
        }
      }
    }
    return bestPath;
  }, []);

  const handleRegenerate = useCallback(() => {
    const { grid, items, enemies, startPos, biome } = generateWorld();
    setGameState(prev => ({
      grid,
      items,
      enemies,
      playerPos: startPos,
      playerHp: PLAYER_START_HP,
      playerMaxHp: PLAYER_START_HP,
      targetPos: null,
      path: [],
      isMoving: false,
      inventory: [],
      inventoryOpen: false,
      craftingOpen: false,
      interactionCount: 0,
      biome,
      harvestTarget: null,
      combatTargetId: null,
      quests: prev.quests.map(q => ({...q, currentCount: 0, completed: false})),
      questLogOpen: false,
      particles: [],
      shakeIntensity: 0,
      damageFlash: 0
    }));
  }, []);

  const handleTileClick = useCallback((x: number, z: number) => {
    if (gameState.playerHp <= 0) return;
    soundManager.resume();
    if (gameState.interactionCount === 0) {
      setGameState(prev => ({ ...prev, interactionCount: 1 }));
    }

    const clickedEnemy = gameState.enemies.find(e => !e.dead && e.position.x === x && e.position.z === z);
    const clickedTile = gameState.grid[z][x];

    if (clickedEnemy) {
        const path = findPathToAdjacent(gameState.grid, gameState.playerPos, { x, z });
        if (path) {
            if (path.length === 1 && path[0].x === gameState.playerPos.x && path[0].z === gameState.playerPos.z) {
                setGameState(prev => ({ ...prev, combatTargetId: clickedEnemy.id }));
                setTimeout(() => performAction(x, z), 50);
            } else {
                setGameState(prev => ({
                    ...prev,
                    targetPos: path[path.length - 1],
                    path: path,
                    isMoving: true,
                    combatTargetId: clickedEnemy.id,
                    harvestTarget: { x, z }
                }));
            }
        }
    } else if (clickedTile.type === TileType.TREE || clickedTile.type === TileType.ROCK) {
      const path = findPathToAdjacent(gameState.grid, gameState.playerPos, { x, z });
      if (path) {
        if (path.length === 1 && path[0].x === gameState.playerPos.x && path[0].z === gameState.playerPos.z) {
          performAction(x, z);
        } else {
          setGameState(prev => ({
            ...prev,
            targetPos: path[path.length - 1],
            path: path,
            isMoving: true,
            harvestTarget: { x, z },
            combatTargetId: null
          }));
        }
      }
    } else if (clickedTile.walkable) {
      const path = findPath(gameState.grid, gameState.playerPos, { x, z });
      if (path.length > 0) {
        setGameState(prev => ({
          ...prev,
          targetPos: { x, z },
          path: path,
          isMoving: true,
          harvestTarget: null, 
          combatTargetId: null
        }));
      }
    }
  }, [gameState.grid, gameState.playerPos, gameState.enemies, gameState.playerHp, gameState.interactionCount, findPathToAdjacent, performAction]);

  const handleMoveComplete = useCallback(() => {
    setGameState(prev => {
      if (prev.harvestTarget) {
        const dist = Math.abs(prev.playerPos.x - prev.harvestTarget.x) + Math.abs(prev.playerPos.z - prev.harvestTarget.z);
        if (dist === 1) {
             setTimeout(() => performAction(prev.harvestTarget!.x, prev.harvestTarget!.z), 0);
        }
      }
      return { ...prev, isMoving: false, path: [] };
    });
  }, [performAction]);

  const handlePositionUpdate = useCallback((newPos: Position) => {
    setGameState(prev => ({ ...prev, playerPos: newPos }));
  }, []);

  const handleItemCollect = useCallback((pos: Position) => {
    setGameState(prev => {
      const itemIndex = prev.items.findIndex(
        i => !i.collected && i.position.x === pos.x && i.position.z === pos.z
      );

      if (itemIndex > -1) {
        const item = prev.items[itemIndex];
        const newItems = [...prev.items];
        newItems[itemIndex] = { ...item, collected: true };
        
        soundManager.play('collect');

        if (item.type === ItemType.POTION) {
            return {
                ...prev,
                items: newItems,
                playerHp: Math.min(prev.playerMaxHp, prev.playerHp + POTION_HEAL_AMOUNT)
            }
        }

        const invIndex = prev.inventory.findIndex(inv => inv.type === item.type);
        const newInventory = [...prev.inventory];
        if (invIndex > -1) {
          newInventory[invIndex] = { ...newInventory[invIndex], count: newInventory[invIndex].count + 1 };
        } else {
          newInventory.push({ type: item.type, count: 1 });
        }

        const newQuests = prev.quests.map(q => {
          if (!q.completed && q.type === 'COLLECT' && q.targetType === item.type) {
            const newCount = q.currentCount + 1;
            return {
              ...q,
              currentCount: newCount,
              completed: newCount >= q.requiredCount
            };
          }
          return q;
        });

        return {
          ...prev,
          items: newItems,
          inventory: newInventory,
          quests: newQuests
        };
      }
      return prev;
    });
  }, []);

  const handleCraft = useCallback((recipe: Recipe) => {
    setGameState(prev => {
        const newInventory = [...prev.inventory];
        for (const ing of recipe.ingredients) {
            const itemIndex = newInventory.findIndex(i => i.type === ing.type);
            if (itemIndex > -1) {
                newInventory[itemIndex] = { 
                    ...newInventory[itemIndex], 
                    count: newInventory[itemIndex].count - ing.count 
                };
                if (newInventory[itemIndex].count <= 0) {
                     newInventory.splice(itemIndex, 1);
                }
            }
        }
        const resultIndex = newInventory.findIndex(i => i.type === recipe.result);
        if (resultIndex > -1) {
            newInventory[resultIndex] = { 
                ...newInventory[resultIndex], 
                count: newInventory[resultIndex].count + recipe.resultCount 
            };
        } else {
            newInventory.push({ type: recipe.result, count: recipe.resultCount });
        }
        
        soundManager.play('craft');
        return { ...prev, inventory: newInventory };
    });
  }, []);

  const toggleInventory = () => setGameState(prev => ({ ...prev, inventoryOpen: !prev.inventoryOpen, craftingOpen: false }));
  const toggleCrafting = () => setGameState(prev => ({ ...prev, craftingOpen: !prev.craftingOpen, inventoryOpen: false }));
  const toggleQuestLog = () => setGameState(prev => ({ ...prev, questLogOpen: !prev.questLogOpen }));

  const tiles = useMemo(() => {
    return gameState.grid.flatMap(row => row);
  }, [gameState.grid]);

  return (
    <div 
      className="w-full h-full relative" 
      onClick={() => soundManager.resume()}
      onKeyDown={() => soundManager.resume()}
      onPointerDown={() => soundManager.resume()}
    >
      
      {/* Damage Flash Overlay */}
      <div 
        className="absolute inset-0 z-40 bg-red-600 pointer-events-none transition-opacity"
        style={{ opacity: gameState.damageFlash }}
      />

      {/* --- HUD --- */}
      <div className={`absolute top-10 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-6 py-4 rounded-xl backdrop-blur-md transition-opacity duration-500 z-10 text-center max-w-md pointer-events-none select-none ${gameState.interactionCount > 0 ? 'opacity-0' : 'opacity-100'}`}>
        <h1 className="text-2xl font-bold mb-2 text-yellow-400">Procedural Town</h1>
        <p className="text-sm text-gray-300">
          Click to Move. Click Enemies to Attack.<br/>
          Collect Sword for +Damage, Potions for HP.<br/>
          Explore the {gameState.biome} biome.
        </p>
        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-blue-300 animate-pulse">
           <Volume2 size={16} /> Audio Enabled
        </div>
      </div>

      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-slate-900/80 p-2 rounded-lg border border-slate-700">
        <Heart className="text-red-500 fill-red-500" size={20} />
        <div className="w-48 h-4 bg-slate-950 rounded-full overflow-hidden border border-slate-700">
            <div 
                className="h-full bg-red-600 transition-all duration-300" 
                style={{ width: `${(gameState.playerHp / gameState.playerMaxHp) * 100}%` }}
            />
        </div>
        <span className="text-xs font-mono text-white">{gameState.playerHp}/{gameState.playerMaxHp}</span>
      </div>

      {gameState.playerHp <= 0 && (
        <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center text-white">
            <Skull size={64} className="text-red-600 mb-4 animate-bounce" />
            <h2 className="text-4xl font-bold text-red-500 mb-4">YOU DIED</h2>
            <button 
                onClick={handleRegenerate}
                className="bg-white text-black px-6 py-3 rounded-full font-bold hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
                <RefreshCw size={20} /> Respawn
            </button>
        </div>
      )}

      <InventoryUI 
        inventory={gameState.inventory} 
        isOpen={gameState.inventoryOpen} 
        onToggle={toggleInventory} 
      />

      <CraftingUI 
        inventory={gameState.inventory}
        isOpen={gameState.craftingOpen}
        onToggle={toggleCrafting}
        onCraft={handleCraft}
      />

      <QuestLog 
        quests={gameState.quests}
        isOpen={gameState.questLogOpen}
        onToggle={toggleQuestLog}
      />

      <button
        onClick={handleRegenerate}
        className="absolute bottom-4 right-4 z-20 bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-lg border border-slate-600 shadow-md flex items-center gap-2 text-xs transition-colors"
      >
        <RefreshCw size={14} /> Regenerate World
      </button>

      <div className="absolute bottom-4 left-4 z-10 text-white/50 text-xs font-mono pointer-events-none">
        Coords: [{gameState.playerPos.x}, {gameState.playerPos.z}] | 
        Biome: {gameState.biome}
      </div>

      <Canvas shadows dpr={[1, 2]}>
        <Sky sunPosition={[100, 20, 100]} />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <ambientLight intensity={0.4} color="#b0c4de" />
        <directionalLight 
          position={[GRID_SIZE/2, 60, GRID_SIZE/2]} 
          intensity={1.5} 
          castShadow 
          shadow-mapSize={[2048, 2048]} 
          shadow-camera-left={-GRID_SIZE/2}
          shadow-camera-right={GRID_SIZE/2}
          shadow-camera-top={GRID_SIZE/2}
          shadow-camera-bottom={-GRID_SIZE/2}
        />
        
        {/* Effects (Particles & Shake) */}
        <Effects particles={gameState.particles} shakeIntensity={gameState.shakeIntensity} />

        <group>
          <PathLine points={gameState.path.map(p => [p.x, 0.1, p.z])} />

          {tiles.map((tile) => (
            <GroundTile 
              key={`${tile.x}-${tile.y}`}
              type={tile.type}
              height={tile.height}
              position={[tile.x, 0, tile.y]}
              onClick={() => handleTileClick(tile.x, tile.y)}
            />
          ))}

          {tiles.map(tile => {
            if (tile.type === TileType.HOUSE) return <House key={`h-${tile.x}-${tile.y}`} position={[tile.x, 0, tile.y]} style={tile.style} />;
            if (tile.type === TileType.TREE) return <Tree key={`t-${tile.x}-${tile.y}`} position={[tile.x, 0, tile.y]} style={tile.style} />;
            if (tile.type === TileType.STUMP) return <Stump key={`s-${tile.x}-${tile.y}`} position={[tile.x, 0, tile.y]} />;
            if (tile.decoration === 'lamp') return <StreetLamp key={`l-${tile.x}-${tile.y}`} position={[tile.x, 0, tile.y]} />;
            return null;
          })}

          {gameState.items.map(item => (
            !item.collected && (
              <ItemMesh 
                key={item.id} 
                type={item.type} 
                position={[item.position.x, 0, item.position.z]} 
              />
            )
          ))}

          {gameState.enemies.map(enemy => (
            !enemy.dead && (
                <EnemyMesh 
                    key={enemy.id} 
                    enemy={enemy} 
                    onClick={() => handleTileClick(enemy.position.x, enemy.position.z)} 
                />
            )
          ))}

          {gameState.playerHp > 0 && (
            <Player 
                position={gameState.playerPos} 
                path={gameState.path} 
                onMoveComplete={handleMoveComplete}
                onPositionUpdate={handlePositionUpdate}
                onItemCollect={handleItemCollect}
            />
          )}
        </group>

        <ContactShadows opacity={0.4} scale={100} blur={2} far={10} resolution={256} color="#000000" />
      </Canvas>
    </div>
  );
};