import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Sky, Stars, ContactShadows, OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { generateWorld, generateChunkStrip, generateTile } from '../utils/generation';
import { findPath } from '../utils/pathfinding';
import { GameState, Position, TileType, ItemType, Enemy, Recipe, Particle, BiomeType, WorldItem } from '../types';
import { DEFAULT_GRID_SIZE, PLAYER_START_HP, ENEMY_AGGRO_RANGE, PLAYER_BASE_ATTACK, SWORD_BONUS_ATTACK, POTION_HEAL_AMOUNT, ENEMY_ATTACK } from '../constants';
import { House, ItemMesh, PathLine, EnemyMesh, StreetLamp, CaveEntrance, Bridge, NPCMesh } from './WorldMeshes';
import { WorldRenderer } from './WorldRenderer';
import { InstancedObjects } from './InstancedObjects';
import { Player } from './Player';
import { InventoryUI } from './InventoryUI';
import { QuestLog } from './QuestLog';
import { CraftingUI } from './CraftingUI';
import { Effects } from './Effects';
import { Minimap } from './Minimap';
import { soundManager } from '../utils/SoundManager';
import { RefreshCw, Heart, Skull, Moon, Sun, Package, Hammer, Scroll, Map, Camera, User, Axe, Pickaxe, Hand, LogOut, DoorOpen, MessageSquare } from 'lucide-react';

// --- Camera Controller Component ---
interface CameraFollowerProps {
    target: React.RefObject<THREE.Group>;
    mode: 'top-down' | 'third-person';
    facing: Position;
}

const CameraFollower: React.FC<CameraFollowerProps> = ({ target, mode, facing }) => {
  const { camera, controls } = useThree();
  const transitionRef = useRef(0); // 0 = top-down, 1 = third-person

  // Configure controls based on mode
  useEffect(() => {
    if (!controls) return;
    const ctrl = controls as any;
    ctrl.enabled = true; 
    
    if (mode === 'top-down') {
        ctrl.minDistance = 15;
        ctrl.maxDistance = 35;
        ctrl.maxPolarAngle = Math.PI / 3;
        ctrl.minPolarAngle = Math.PI / 6;
        ctrl.enableRotate = true;
    } else {
        // Third Person: Locked rotation mostly
        ctrl.minDistance = 2;
        ctrl.maxDistance = 20;
        ctrl.maxPolarAngle = Math.PI / 1.8;
        ctrl.enableRotate = true; 
    }
  }, [mode, controls]);

  useFrame((state, delta) => {
    if (!target.current || !controls) return;
    const playerPos = target.current.position;
    
    // Smooth transition value
    const targetT = mode === 'third-person' ? 1 : 0;
    transitionRef.current = THREE.MathUtils.lerp(transitionRef.current, targetT, delta * 3);

    // Calculate ideal positions
    // Top Down Ideal
    const topDownOffset = new THREE.Vector3(0, 25, 20);
    const idealTopDownPos = playerPos.clone().add(topDownOffset);

    // Third Person Ideal - Closer and tighter
    const dirX = facing.x || 0;
    const dirZ = facing.z || 1;
    const len = Math.sqrt(dirX*dirX + dirZ*dirZ);
    const ndx = len > 0 ? dirX/len : 0;
    const ndz = len > 0 ? dirZ/len : 1;
    const backDist = 4.5; // Closer
    const height = 3.5;   // Lower
    const thirdPersonOffset = new THREE.Vector3(-ndx * backDist, height, -ndz * backDist);
    const idealThirdPersonPos = playerPos.clone().add(thirdPersonOffset);

    // Interpolate ideal position
    const idealPos = new THREE.Vector3().lerpVectors(idealTopDownPos, idealThirdPersonPos, transitionRef.current);

    // @ts-ignore
    const ctrl = controls as any;

    if (mode === 'third-person') {
       camera.position.lerp(idealPos, 0.1);
       // Look slightly above player
       ctrl.target.lerp(playerPos.clone().add(new THREE.Vector3(0, 1.5, 0)), 0.2);
    } else {
       ctrl.target.lerp(playerPos, 0.1);
       if (transitionRef.current > 0.1) {
           camera.position.lerp(idealPos, 0.1);
       }
    }
    
    ctrl.update();
  });
  
  return null;
};

interface GameProps {
  initialSettings?: {
    biome: BiomeType;
    seed: number;
    worldSize: number;
  };
  onExit: () => void;
}

export const Game: React.FC<GameProps> = ({ initialSettings, onExit }) => {
  // --- Game State ---
  const [cameraMode, setCameraMode] = useState<'top-down' | 'third-person'>('third-person');
  const gridSize = initialSettings?.worldSize || DEFAULT_GRID_SIZE;
  
  const [gameState, setGameState] = useState<GameState>(() => {
    const { grid, items, enemies, npcs, startPos, biome, seed } = generateWorld(0, 0, initialSettings?.seed, initialSettings?.biome, gridSize);
    return {
      grid,
      worldOrigin: { x: 0, z: 0 },
      items,
      enemies,
      npcs,
      playerPos: startPos,
      playerFacing: { x: 0, z: 1 },
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
      activeDialogue: null,
      particles: [],
      shakeIntensity: 0,
      damageFlash: 0,
      timeOfDay: 12,
      quests: [
          { 
            id: 'q_explore', 
            title: 'Explore', 
            description: 'Look around the town and find resources.', 
            type: 'COLLECT', 
            targetType: ItemType.WOOD, 
            requiredCount: 1, 
            currentCount: 0, 
            completed: false 
          }
      ],
      storyStage: 0,
      seed
    };
  });

  const lastFrameTime = useRef(Date.now());
  const playerRef = useRef<THREE.Group>(null);

  // --- Audio Ambience ---
  useEffect(() => {
    soundManager.playAmbience(gameState.biome);
    return () => {
      soundManager.stopAmbience();
    };
  }, [gameState.biome]);

  // --- Terrain Generation Loop ---
  useEffect(() => {
      const checkTerrain = () => {
          setGameState(prev => {
              const { playerPos, worldOrigin, grid, seed, biome } = prev;
              const localX = playerPos.x - worldOrigin.x;
              const localZ = playerPos.z - worldOrigin.z;
              const BUFFER = 15; 
              
              let newGrid = [...grid];
              let newOrigin = { ...worldOrigin };
              let newItems = [...prev.items];
              let newEnemies = [...prev.enemies];
              let changed = false;

              // Use dynamic gridSize
              if (localX > gridSize - BUFFER) {
                  const shiftAmount = 10;
                  newOrigin.x += shiftAmount;
                  newGrid = newGrid.map((row, zIndex) => {
                      const newRow = row.slice(shiftAmount);
                      for(let i=0; i<shiftAmount; i++) {
                          newRow.push(generateTile(newOrigin.x + gridSize - shiftAmount + i, newOrigin.z + zIndex, seed, biome));
                      }
                      return newRow;
                  });
                  const strip = generateChunkStrip(newOrigin.x + gridSize - shiftAmount, newOrigin.z, shiftAmount, gridSize, seed, biome);
                  newItems = [...newItems, ...strip.newItems];
                  newEnemies = [...newEnemies, ...strip.newEnemies];
                  changed = true;
              }
              else if (localX < BUFFER) {
                  const shiftAmount = 10;
                  newOrigin.x -= shiftAmount;
                   newGrid = newGrid.map((row, zIndex) => {
                      const newRow = [...row];
                      newRow.splice(gridSize - shiftAmount, shiftAmount);
                      const prefix: any[] = [];
                      for(let i=0; i<shiftAmount; i++) {
                          prefix.push(generateTile(newOrigin.x + i, newOrigin.z + zIndex, seed, biome));
                      }
                      return [...prefix, ...newRow];
                  });
                  const strip = generateChunkStrip(newOrigin.x, newOrigin.z, shiftAmount, gridSize, seed, biome);
                  newItems = [...newItems, ...strip.newItems];
                  newEnemies = [...newEnemies, ...strip.newEnemies];
                  changed = true;
              }

              if (localZ > gridSize - BUFFER) {
                  const shiftAmount = 10;
                  newOrigin.z += shiftAmount;
                  newGrid.splice(0, shiftAmount);
                  for(let i=0; i<shiftAmount; i++) {
                      const row: any[] = [];
                      for(let x=0; x<gridSize; x++) {
                          row.push(generateTile(newOrigin.x + x, newOrigin.z + gridSize - shiftAmount + i, seed, biome));
                      }
                      newGrid.push(row);
                  }
                  const strip = generateChunkStrip(newOrigin.x, newOrigin.z + gridSize - shiftAmount, gridSize, shiftAmount, seed, biome);
                  newItems = [...newItems, ...strip.newItems];
                  newEnemies = [...newEnemies, ...strip.newEnemies];
                  changed = true;
              }
              else if (localZ < BUFFER) {
                  const shiftAmount = 10;
                  newOrigin.z -= shiftAmount;
                  newGrid.splice(gridSize - shiftAmount, shiftAmount);
                  const newRows: any[] = [];
                   for(let i=0; i<shiftAmount; i++) {
                      const row: any[] = [];
                      for(let x=0; x<gridSize; x++) {
                          row.push(generateTile(newOrigin.x + x, newOrigin.z + i, seed, biome));
                      }
                      newRows.push(row);
                  }
                  newGrid = [...newRows, ...newGrid];
                  const strip = generateChunkStrip(newOrigin.x, newOrigin.z, gridSize, shiftAmount, seed, biome);
                  newItems = [...newItems, ...strip.newItems];
                  newEnemies = [...newEnemies, ...strip.newEnemies];
                  changed = true;
              }

              if (changed) {
                  const minX = newOrigin.x;
                  const maxX = newOrigin.x + gridSize;
                  const minZ = newOrigin.z;
                  const maxZ = newOrigin.z + gridSize;
                  
                  newItems = newItems.filter(i => i.position.x >= minX && i.position.x < maxX && i.position.z >= minZ && i.position.z < maxZ);
                  newEnemies = newEnemies.filter(e => e.position.x >= minX && e.position.x < maxX && e.position.z >= minZ && e.position.z < maxZ);
                  
                  return { ...prev, grid: newGrid, worldOrigin: newOrigin, items: newItems, enemies: newEnemies };
              }
              return prev;
          });
      };

      const interval = setInterval(checkTerrain, 500);
      return () => clearInterval(interval);
  }, [gridSize]);

  // --- Actions ---
  const spawnParticles = useCallback((x: number, z: number, color: string, count: number) => {
    return Array.from({ length: count }).map(() => ({
        id: Math.random().toString(),
        x: x, y: 0.5, z: z,
        vx: (Math.random() - 0.5) * 2, vy: Math.random() * 2 + 1, vz: (Math.random() - 0.5) * 2,
        color: color, life: 1.0, scale: Math.random() * 0.5 + 0.5
    }));
  }, []);

  const performAction = useCallback((targetX: number, targetZ: number) => {
    setGameState(prev => {
      const localX = targetX - prev.worldOrigin.x;
      const localZ = targetZ - prev.worldOrigin.z;
      
      if (localX < 0 || localX >= gridSize || localZ < 0 || localZ >= gridSize) return prev;

      const newEnemies = prev.enemies.map(e => ({...e}));
      const newItems = [...prev.items];
      const newQuests = [...prev.quests];
      let addedParticles: Particle[] = [];
      let soundToPlay = '';

      if (prev.combatTargetId) {
        const enemyIndex = newEnemies.findIndex(e => e.id === prev.combatTargetId);
        if (enemyIndex > -1 && !newEnemies[enemyIndex].dead) {
             const dmg = PLAYER_BASE_ATTACK + (prev.inventory.some(i => i.type === ItemType.SWORD) ? SWORD_BONUS_ATTACK : 0);
             newEnemies[enemyIndex].hp -= dmg;
             soundToPlay = 'hit';
             addedParticles = spawnParticles(newEnemies[enemyIndex].position.x, newEnemies[enemyIndex].position.z, '#ffffff', 5);

             if (newEnemies[enemyIndex].hp <= 0) {
                 newEnemies[enemyIndex].dead = true;
                 soundToPlay = 'collect'; 
                 addedParticles = [...addedParticles, ...spawnParticles(newEnemies[enemyIndex].position.x, newEnemies[enemyIndex].position.z, '#db2777', 15)];
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
        // Simple Interaction logic for things that aren't gathering (like houses)
        const targetTile = prev.grid[localZ][localX];
         if (targetTile.type === TileType.HOUSE) {
             // Loot house logic (Houses still lootable?)
            if (!targetTile.decorationActive) {
                targetTile.decorationActive = true; 
                soundToPlay = 'collect';
                addedParticles = spawnParticles(targetX, targetZ, '#fbbf24', 15);
                const lootRoll = Math.random();
                const lootType = lootRoll > 0.7 ? ItemType.POTION : (lootRoll > 0.4 ? ItemType.GOLD : ItemType.GEM);
                newItems.push({
                    id: `house-loot-${Date.now()}`,
                    type: lootType,
                    position: { x: targetX, z: targetZ },
                    collected: false
                });
            }
        }
      }

      if (soundToPlay) soundManager.play(soundToPlay);

      return { ...prev, items: newItems, enemies: newEnemies, quests: newQuests, harvestTarget: null, combatTargetId: null, isMoving: false, path: [], particles: [...prev.particles, ...addedParticles] };
    });
  }, [gridSize, spawnParticles]);

  // --- Dialogue Logic ---
  const handleDialogueOption = useCallback((action: () => void) => {
      action();
      setGameState(prev => ({ ...prev, activeDialogue: null }));
  }, []);

  const openDialogue = useCallback((npcId: string) => {
    setGameState(prev => {
        if (npcId === 'npc_mcgregor') {
            const hasWatch = prev.inventory.some(i => i.type === ItemType.SONS_WATCH);
            const stage = prev.storyStage;

            if (stage === 0) {
                // Initial Quest
                return {
                    ...prev,
                    activeDialogue: {
                        npcName: "Old Man McGregor",
                        text: "Excuse me traveler... have you seen my son? He went looking for treasure near the caves to the far east, but he hasn't returned in days. Please, if you find him... or anything of his...",
                        options: [
                            { 
                                label: "I'll look for him.", 
                                action: () => setGameState(s => ({ 
                                    ...s, 
                                    storyStage: 1, 
                                    quests: [...s.quests, {
                                        id: 'q_find_son',
                                        title: 'The Lost Son',
                                        description: 'Find a trace of McGregor\'s son in the wilderness (High Danger Area).',
                                        type: 'COLLECT',
                                        targetType: ItemType.SONS_WATCH,
                                        requiredCount: 1,
                                        currentCount: 0,
                                        completed: false
                                    }]
                                })) 
                            },
                            { label: "Sorry, I'm busy.", action: () => {} }
                        ]
                    }
                }
            } else if (stage === 1) {
                if (hasWatch) {
                    return {
                        ...prev,
                         activeDialogue: {
                            npcName: "Old Man McGregor",
                            text: "Is that... his pocket watch? Oh, heavens. My poor boy... at least I know the truth now. Thank you for bringing this to me. Please, take this for your trouble.",
                            options: [
                                { 
                                    label: "I'm sorry for your loss.", 
                                    action: () => setGameState(s => {
                                        // Remove watch, add reward
                                        const newInv = s.inventory.filter(i => i.type !== ItemType.SONS_WATCH);
                                        // Add reward
                                        const goldIdx = newInv.findIndex(i => i.type === ItemType.GOLD);
                                        if (goldIdx > -1) newInv[goldIdx].count += 50;
                                        else newInv.push({ type: ItemType.GOLD, count: 50 });
                                        
                                        // Complete quest
                                        const newQuests = s.quests.map(q => q.id === 'q_find_son' ? { ...q, completed: true, currentCount: 1 } : q);

                                        return { ...s, inventory: newInv, quests: newQuests, storyStage: 2, particles: [...s.particles, ...spawnParticles(s.playerPos.x, s.playerPos.z, '#fbbf24', 20)] };
                                    }) 
                                }
                            ]
                        }
                    }
                } else {
                     return {
                        ...prev,
                        activeDialogue: {
                            npcName: "Old Man McGregor",
                            text: "Please hurry... I fear the worst. Check the dangerous lands far from town.",
                            options: [
                                { label: "I'm on my way.", action: () => {} }
                            ]
                        }
                    }
                }
            } else if (stage === 2) {
                 return {
                    ...prev,
                    activeDialogue: {
                        npcName: "Old Man McGregor",
                        text: "Thank you again. I will give him a proper burial.",
                        options: [
                            { label: "Take care.", action: () => {} }
                        ]
                    }
                }
            }
        }
        return prev;
    });
  }, [spawnParticles]);

  // --- Game Loop (Particles & Time) ---
  useEffect(() => {
    let animationFrameId: number;
    const loop = () => {
      const now = Date.now();
      const delta = (now - lastFrameTime.current) / 1000;
      lastFrameTime.current = now;

      setGameState(prev => {
        let newParticles = prev.particles.map(p => ({
            ...p,
            x: p.x + p.vx * delta * 5, 
            y: p.y + p.vy * delta * 5,
            z: p.z + p.vz * delta * 5,
            vy: p.vy - 10 * delta,
            life: p.life - delta,
        })).filter(p => p.life > 0 && p.y > -0.5);

        const newShake = Math.max(0, prev.shakeIntensity - delta * 5);
        const newFlash = Math.max(0, prev.damageFlash - delta * 2);

        let newTime = prev.timeOfDay + (delta * 0.2);
        if (newTime >= 24) newTime = 0;

        if (newParticles.length !== prev.particles.length || prev.shakeIntensity !== newShake || prev.damageFlash !== newFlash || Math.floor(prev.timeOfDay) !== Math.floor(newTime)) {
             return { ...prev, particles: newParticles, shakeIntensity: newShake, damageFlash: newFlash, timeOfDay: newTime };
        }
        return prev;
      });

      animationFrameId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  // --- Enemy AI ---
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
            newPlayerHp = Math.max(0, newPlayerHp - enemy.attack);
            tookDamage = true;
            soundManager.play('hit');
            return enemy;
          } else if (dist <= ENEMY_AGGRO_RANGE) {
            let dx = 0, dz = 0;
            if (enemy.position.x < prev.playerPos.x) dx = 1;
            else if (enemy.position.x > prev.playerPos.x) dx = -1;
            else if (enemy.position.z < prev.playerPos.z) dz = 1;
            else if (enemy.position.z > prev.playerPos.z) dz = -1;

            const nextX = enemy.position.x + dx;
            const nextZ = enemy.position.z + dz;
            const localX = nextX - prev.worldOrigin.x;
            const localZ = nextZ - prev.worldOrigin.z;
            
            if (localX >= 0 && localX < gridSize && localZ >= 0 && localZ < gridSize && prev.grid[localZ]?.[localX]?.walkable) {
              return { ...enemy, position: { x: nextX, z: nextZ } };
            }
          }
          return enemy;
        });

        if (tookDamage) {
            return { ...prev, enemies: newEnemies, playerHp: newPlayerHp, shakeIntensity: 1.0, damageFlash: 0.5 };
        }
        return { ...prev, enemies: newEnemies, playerHp: newPlayerHp };
      });
    }, 800); 
    return () => clearInterval(interval);
  }, [gridSize]);

  // --- Input Handlers ---
  const toggleLamp = useCallback((x: number, z: number) => {
    soundManager.play('step');
    setGameState(prev => {
        const localX = x - prev.worldOrigin.x;
        const localZ = z - prev.worldOrigin.z;
        if (localX < 0 || localX >= gridSize || localZ < 0 || localZ >= gridSize) return prev;

        const newGrid = prev.grid.map(row => row.map(node => ({ ...node })));
        if (newGrid[localZ][localX].decoration === 'lamp') {
            newGrid[localZ][localX].decorationActive = !newGrid[localZ][localX].decorationActive;
        }
        return { ...prev, grid: newGrid };
    });
  }, [gridSize]);

  const findPathToAdjacent = useCallback((grid: any[][], start: Position, target: Position, origin: Position) => {
    const localTarget = { x: target.x - origin.x, z: target.z - origin.z };
    const localStart = { x: start.x - origin.x, z: start.z - origin.z };

    const neighbors = [
      {x: localTarget.x+1, z: localTarget.z}, {x: localTarget.x-1, z: localTarget.z},
      {x: localTarget.x, z: localTarget.z+1}, {x: localTarget.x, z: localTarget.z-1},
      {x: localTarget.x+1, z: localTarget.z+1}, {x: localTarget.x-1, z: localTarget.z-1},
      {x: localTarget.x-1, z: localTarget.z+1}, {x: localTarget.x+1, z: localTarget.z-1}
    ];
    let bestPath: Position[] | null = null;
    
    if (neighbors.some(n => n.x === localStart.x && n.z === localStart.z)) return [start];

    for (const n of neighbors) {
      if (n.x >= 0 && n.x < gridSize && n.z >= 0 && n.z < gridSize && grid[n.z][n.x].walkable) {
        const localPath = findPath(grid, localStart, n);
        if (localPath.length > 0 && (!bestPath || localPath.length < bestPath.length)) {
             bestPath = localPath.map(p => ({ x: p.x + origin.x, z: p.z + origin.z }));
        }
      }
    }
    return bestPath;
  }, [gridSize]);

  const handleTileClick = useCallback((x: number, z: number) => {
    if (gameState.playerHp <= 0) return;
    soundManager.resume();
    if (gameState.interactionCount === 0) setGameState(prev => ({ ...prev, interactionCount: 1 }));

    // Check for NPC
    const clickedNPC = gameState.npcs.find(n => n.position.x === x && n.position.z === z);
    if (clickedNPC) {
         const path = findPathToAdjacent(gameState.grid, gameState.playerPos, { x, z }, gameState.worldOrigin);
         if (path) {
             const facing = path.length > 0 ? { x: path[0].x - gameState.playerPos.x, z: path[0].z - gameState.playerPos.z } : gameState.playerFacing;
             if (path.length === 1 && path[0].x === gameState.playerPos.x && path[0].z === gameState.playerPos.z) {
                 // Already adjacent, talk
                 openDialogue(clickedNPC.id);
                 setGameState(prev => ({ ...prev, playerFacing: {x: x - prev.playerPos.x, z: z - prev.playerPos.z} }));
             } else {
                 setGameState(prev => ({ ...prev, targetPos: path[path.length - 1], path: path, isMoving: true, combatTargetId: null, harvestTarget: null, playerFacing: facing }));
             }
         }
         return;
    }

    const clickedEnemy = gameState.enemies.find(e => !e.dead && e.position.x === x && e.position.z === z);
    const localX = x - gameState.worldOrigin.x;
    const localZ = z - gameState.worldOrigin.z;
    if (localX < 0 || localX >= gridSize || localZ < 0 || localZ >= gridSize) return;

    const clickedTile = gameState.grid[localZ][localX];

    // Interaction Priority: Enemy > House Loot > Walk (Move to terrain)
    if (clickedEnemy) {
        const path = findPathToAdjacent(gameState.grid, gameState.playerPos, { x, z }, gameState.worldOrigin);
        if (path) {
            const facing = path.length > 0 ? { x: path[0].x - gameState.playerPos.x, z: path[0].z - gameState.playerPos.z } : gameState.playerFacing;
            if (path.length === 1 && path[0].x === gameState.playerPos.x && path[0].z === gameState.playerPos.z) {
                setGameState(prev => ({ ...prev, combatTargetId: clickedEnemy.id }));
                setTimeout(() => performAction(x, z), 50);
            } else {
                setGameState(prev => ({ ...prev, targetPos: path[path.length - 1], path: path, isMoving: true, combatTargetId: clickedEnemy.id, harvestTarget: { x, z }, playerFacing: facing }));
            }
        }
    } else if (clickedTile.type === TileType.HOUSE && !clickedTile.decorationActive) {
      // House is not walkable, must walk adjacent to loot
      const path = findPathToAdjacent(gameState.grid, gameState.playerPos, { x, z }, gameState.worldOrigin);
      if (path) {
        const facing = path.length > 0 ? { x: path[0].x - gameState.playerPos.x, z: path[0].z - gameState.playerPos.z } : gameState.playerFacing;
        if (path.length === 1 && path[0].x === gameState.playerPos.x && path[0].z === gameState.playerPos.z) {
             // Already adjacent
             performAction(x, z); // Loot
             setGameState(prev => ({ ...prev, playerFacing: {x: x - prev.playerPos.x, z: z - prev.playerPos.z} }));
        } else {
          // Go to house
          setGameState(prev => ({ ...prev, targetPos: path[path.length - 1], path: path, isMoving: true, harvestTarget: { x, z }, combatTargetId: null, playerFacing: facing }));
        }
      }
    } else if (clickedTile.walkable) {
      // Standard Movement (Includes Trees, Rocks, etc. since they are now walkable)
      const localStart = { x: gameState.playerPos.x - gameState.worldOrigin.x, z: gameState.playerPos.z - gameState.worldOrigin.z };
      const localEnd = { x: localX, z: localZ };
      const localPath = findPath(gameState.grid, localStart, localEnd);
      
      if (localPath.length > 0) {
        const worldPath = localPath.map(p => ({ x: p.x + gameState.worldOrigin.x, z: p.z + gameState.worldOrigin.z }));
        const nextPos = worldPath[0];
        const facing = { x: nextPos.x - gameState.playerPos.x, z: nextPos.z - gameState.playerPos.z };
        setGameState(prev => ({ ...prev, targetPos: { x, z }, path: worldPath, isMoving: true, harvestTarget: null, combatTargetId: null, playerFacing: facing }));
      }
    }
  }, [gameState.grid, gameState.playerPos, gameState.enemies, gameState.playerHp, gameState.npcs, gameState.interactionCount, gameState.worldOrigin, findPathToAdjacent, performAction, gridSize, openDialogue]);

  const handleMoveComplete = useCallback(() => {
    setGameState(prev => {
      // If we had a harvest target (house), try to interact when adjacent
      if (prev.harvestTarget) {
        const dist = Math.max(Math.abs(prev.playerPos.x - prev.harvestTarget.x), Math.abs(prev.playerPos.z - prev.harvestTarget.z));
        if (dist <= 1.5) {
             const localX = prev.harvestTarget.x - prev.worldOrigin.x;
             const localZ = prev.harvestTarget.z - prev.worldOrigin.z;
             if (localX >= 0 && localZ >= 0) {
                 const tile = prev.grid[localZ][localX];
                 if (tile.type === TileType.HOUSE) {
                    // Trigger Loot logic immediately
                    setTimeout(() => performAction(prev.harvestTarget!.x, prev.harvestTarget!.z), 50);
                    return {
                        ...prev,
                        isMoving: false,
                        path: [],
                        harvestTarget: null, // Done
                        playerFacing: { x: prev.harvestTarget.x - prev.playerPos.x, z: prev.harvestTarget.z - prev.playerPos.z }
                    }
                 }
             }
        }
      }
      return { ...prev, isMoving: false, path: [] };
    });
  }, [performAction]);

  const handlePositionUpdate = useCallback((newPos: Position) => {
      setGameState(prev => {
          const dx = newPos.x - prev.playerPos.x;
          const dz = newPos.z - prev.playerPos.z;
          const facing = (dx !== 0 || dz !== 0) ? { x: dx, z: dz } : prev.playerFacing;
          return { ...prev, playerPos: newPos, playerFacing: facing };
      });
  }, []);

  const handleItemCollect = useCallback((pos: Position) => {
    setGameState(prev => {
      const itemIndex = prev.items.findIndex(i => !i.collected && i.position.x === pos.x && i.position.z === pos.z);
      if (itemIndex > -1) {
        const item = prev.items[itemIndex];
        const newItems = [...prev.items];
        newItems[itemIndex] = { ...item, collected: true };
        soundManager.play('collect');

        const invIndex = prev.inventory.findIndex(inv => inv.type === item.type);
        const newInventory = [...prev.inventory];
        if (invIndex > -1) newInventory[invIndex] = { ...newInventory[invIndex], count: newInventory[invIndex].count + 1 };
        else newInventory.push({ type: item.type, count: 1 });

        const newQuests = prev.quests.map(q => {
          if (!q.completed && q.type === 'COLLECT' && q.targetType === item.type) {
            const newCount = q.currentCount + 1;
            return { ...q, currentCount: newCount, completed: newCount >= q.requiredCount };
          }
          return q;
        });
        return { ...prev, items: newItems, inventory: newInventory, quests: newQuests };
      }
      return prev;
    });
  }, []);

  const handleUseItem = useCallback((itemType: ItemType) => {
      setGameState(prev => {
          if (itemType === ItemType.POTION) {
              if (prev.playerHp >= prev.playerMaxHp) return prev; // Don't waste
              
              const newHp = Math.min(prev.playerMaxHp, prev.playerHp + POTION_HEAL_AMOUNT);
              soundManager.play('collect'); 
              
              // Remove 1
              const newInventory = [...prev.inventory];
              const idx = newInventory.findIndex(i => i.type === itemType);
              if (idx > -1) {
                  newInventory[idx] = { ...newInventory[idx], count: newInventory[idx].count - 1 };
                  if (newInventory[idx].count <= 0) newInventory.splice(idx, 1);
              }
              
              return { 
                  ...prev, 
                  playerHp: newHp, 
                  inventory: newInventory, 
                  particles: [...prev.particles, ...spawnParticles(prev.playerPos.x, prev.playerPos.z, '#22c55e', 10)] 
              };
          }
          return prev;
      });
  }, [spawnParticles]);

  const handleDropItem = useCallback((itemType: ItemType) => {
       setGameState(prev => {
            const newInventory = [...prev.inventory];
            const idx = newInventory.findIndex(i => i.type === itemType);
            if (idx > -1) {
                newInventory[idx] = { ...newInventory[idx], count: newInventory[idx].count - 1 };
                if (newInventory[idx].count <= 0) newInventory.splice(idx, 1);
                
                // Spawn item
                const newItem: WorldItem = {
                    id: `drop-${Date.now()}`,
                    type: itemType,
                    position: { ...prev.playerPos }, // Drop at feet
                    collected: false
                };
                
                return { ...prev, inventory: newInventory, items: [...prev.items, newItem] };
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
                newInventory[itemIndex] = { ...newInventory[itemIndex], count: newInventory[itemIndex].count - ing.count };
                if (newInventory[itemIndex].count <= 0) newInventory.splice(itemIndex, 1);
            }
        }
        const resultIndex = newInventory.findIndex(i => i.type === recipe.result);
        if (resultIndex > -1) newInventory[resultIndex] = { ...newInventory[resultIndex], count: newInventory[resultIndex].count + recipe.resultCount };
        else newInventory.push({ type: recipe.result, count: recipe.resultCount });
        soundManager.play('craft');
        return { ...prev, inventory: newInventory };
    });
  }, []);

  const handleRegenerate = useCallback(() => {
    const { grid, items, enemies, npcs, startPos, biome, seed } = generateWorld(0, 0, initialSettings?.seed || Math.random() * 100, initialSettings?.biome, gridSize);
    setGameState(prev => ({
      grid, items, enemies, npcs, playerPos: startPos, playerFacing: {x:0, z:1}, worldOrigin: {x:0, z:0}, playerHp: PLAYER_START_HP, playerMaxHp: PLAYER_START_HP,
      targetPos: null, path: [], isMoving: false, inventory: [], inventoryOpen: false, craftingOpen: false, activeDialogue: null,
      interactionCount: 0, biome, harvestTarget: null, combatTargetId: null,
      quests: [
          { 
            id: 'q_explore', 
            title: 'Explore', 
            description: 'Look around the town and find resources.', 
            type: 'COLLECT', 
            targetType: ItemType.WOOD, 
            requiredCount: 1, 
            currentCount: 0, 
            completed: false 
          }
      ],
      storyStage: 0,
      questLogOpen: false, particles: [], shakeIntensity: 0, damageFlash: 0, timeOfDay: 12, seed
    }));
  }, [initialSettings, gridSize]);

  // Prepare path points with correct Y height for rendering
  const pathPoints = useMemo(() => {
      return gameState.path.map(p => {
          const localX = p.x - gameState.worldOrigin.x;
          const localZ = p.z - gameState.worldOrigin.z;
          let y = 0.1;
          if (localX >= 0 && localX < gridSize && localZ >= 0 && localZ < gridSize) {
             y = gameState.grid[localZ][localX].height + 0.15; // slightly above terrain
          }
          return [p.x, y, p.z] as [number, number, number];
      });
  }, [gameState.path, gameState.grid, gameState.worldOrigin, gridSize]);

  // UI Toggles
  const toggleInventory = () => setGameState(prev => ({ ...prev, inventoryOpen: !prev.inventoryOpen, craftingOpen: false, questLogOpen: false }));
  const toggleCrafting = () => setGameState(prev => ({ ...prev, craftingOpen: !prev.craftingOpen, inventoryOpen: false, questLogOpen: false }));
  const toggleQuestLog = () => setGameState(prev => ({ ...prev, questLogOpen: !prev.questLogOpen, inventoryOpen: false, craftingOpen: false }));
  const toggleCamera = () => setCameraMode(prev => prev === 'top-down' ? 'third-person' : 'top-down');

  // Environment
  const sunPosition = useMemo(() => {
    const angle = (gameState.timeOfDay / 24) * Math.PI * 2 - Math.PI / 2;
    return [Math.cos(angle) * 100, Math.sin(angle) * 100, 0] as [number, number, number];
  }, [gameState.timeOfDay]);

  const isNight = gameState.timeOfDay < 6 || gameState.timeOfDay > 18;
  const tiles = useMemo(() => gameState.grid.flatMap(row => row), [gameState.grid]);

  return (
    <div className="w-full h-full relative" onClick={() => soundManager.resume()}>
      
      {/* Damage Flash */}
      <div className="absolute inset-0 z-40 bg-red-600 pointer-events-none transition-opacity" style={{ opacity: gameState.damageFlash }} />

      {/* Dialogue UI */}
      {gameState.activeDialogue && (
          <div className="absolute inset-0 z-50 flex items-end justify-center pb-24 pointer-events-auto bg-black/40">
              <div className="max-w-xl w-full mx-4 bg-slate-900/95 border-2 border-slate-600 p-6 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-10 fade-in zoom-in-95">
                  <div className="flex items-start gap-4 mb-4">
                      <div className="w-16 h-16 bg-slate-800 rounded-full border border-slate-600 flex items-center justify-center shrink-0">
                          <User size={32} className="text-slate-400" />
                      </div>
                      <div>
                          <h3 className="font-bold text-yellow-400 text-lg">{gameState.activeDialogue.npcName}</h3>
                          <p className="text-slate-200 text-sm leading-relaxed mt-1">
                              "{gameState.activeDialogue.text}"
                          </p>
                      </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 mt-4">
                      {gameState.activeDialogue.options.map((opt, i) => (
                          <button 
                            key={i}
                            onClick={() => handleDialogueOption(opt.action)}
                            className="w-full text-left px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-slate-700 transition-colors flex items-center gap-2 group"
                          >
                              <MessageSquare size={16} className="text-slate-400 group-hover:text-blue-400" />
                              <span className="text-sm font-medium">{opt.label}</span>
                          </button>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* Top Bar HUD */}
      <div className="absolute top-4 left-4 right-4 z-30 flex justify-between items-start pointer-events-none">
          <div className="flex gap-4 items-center">
             <div className="bg-slate-900/80 backdrop-blur border border-slate-700 p-2 rounded-lg text-white flex items-center gap-2 shadow-lg">
                {isNight ? <Moon size={16} className="text-blue-300" /> : <Sun size={16} className="text-yellow-400" />}
                <span className="text-xs font-mono font-bold">{Math.floor(gameState.timeOfDay).toString().padStart(2, '0')}:00</span>
             </div>
             <div className="bg-slate-900/80 backdrop-blur border border-slate-700 p-2 rounded-lg flex items-center gap-2 shadow-lg">
                <Heart className="text-red-500 fill-red-500" size={18} />
                <div className="w-32 h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-700/50">
                    <div className="h-full bg-red-600 transition-all duration-300" style={{ width: `${(gameState.playerHp / gameState.playerMaxHp) * 100}%` }} />
                </div>
                <span className="text-xs font-mono text-white ml-1">{gameState.playerHp}</span>
             </div>
          </div>
          
          <div className="flex flex-col items-end gap-2 pointer-events-auto">
             <div className="flex gap-2">
                 <button onClick={onExit} className="bg-red-900/80 hover:bg-red-800 backdrop-blur border border-red-700 p-2 rounded-lg text-white shadow-lg transition-colors flex items-center gap-2">
                    <LogOut size={16} />
                    <span className="text-xs font-bold hidden sm:inline">Exit</span>
                 </button>
             </div>
             <Minimap gameState={gameState} />
             <div className="bg-slate-900/80 backdrop-blur border border-slate-700 px-3 py-1 rounded-lg text-white text-[10px] font-mono shadow-lg opacity-80 flex items-center">
                 {gameState.biome} [{Math.floor(gameState.playerPos.x)}, {Math.floor(gameState.playerPos.z)}]
             </div>
          </div>
      </div>

      <div className={`absolute top-20 left-1/2 transform -translate-x-1/2 bg-black/60 text-white px-6 py-3 rounded-full backdrop-blur-md transition-all duration-500 z-20 text-center pointer-events-none select-none ${gameState.interactionCount > 0 ? 'opacity-0 translate-y-[-20px]' : 'opacity-100'}`}>
        <p className="text-xs font-medium tracking-wide">TAP TO MOVE • SWIPE TO ROTATE</p>
      </div>

      {gameState.playerHp <= 0 && (
        <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center text-white animate-in fade-in duration-1000">
            <Skull size={64} className="text-red-600 mb-6 animate-bounce" />
            <h2 className="text-4xl font-bold text-red-500 mb-2">YOU DIED</h2>
            <p className="text-slate-500 mb-8">Your journey ends here.</p>
            <button onClick={handleRegenerate} className="bg-white text-black px-8 py-3 rounded-full font-bold hover:bg-gray-200 transition-colors flex items-center gap-2">
                <RefreshCw size={20} /> Respawn
            </button>
        </div>
      )}

      <InventoryUI 
        inventory={gameState.inventory} 
        isOpen={gameState.inventoryOpen} 
        onToggle={toggleInventory} 
        onUseItem={handleUseItem}
        onDropItem={handleDropItem}
      />
      <CraftingUI inventory={gameState.inventory} isOpen={gameState.craftingOpen} onToggle={toggleCrafting} onCraft={handleCraft} />
      <QuestLog quests={gameState.quests} isOpen={gameState.questLogOpen} onToggle={toggleQuestLog} />

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-end gap-4 pointer-events-auto">
         <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 p-2 rounded-2xl flex gap-2 shadow-2xl">
            <button onClick={toggleInventory} className={`p-3 rounded-xl transition-all ${gameState.inventoryOpen ? 'bg-blue-600 text-white shadow-lg scale-105' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}>
                <Package size={24} strokeWidth={1.5} />
            </button>
            <button onClick={toggleCrafting} className={`p-3 rounded-xl transition-all ${gameState.craftingOpen ? 'bg-orange-600 text-white shadow-lg scale-105' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}>
                <Hammer size={24} strokeWidth={1.5} />
            </button>
            <button onClick={toggleQuestLog} className={`p-3 rounded-xl transition-all relative ${gameState.questLogOpen ? 'bg-yellow-600 text-white shadow-lg scale-105' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}>
                <Scroll size={24} strokeWidth={1.5} />
                {gameState.quests.some(q => q.completed) && <span className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full animate-pulse" />}
            </button>
            <div className="w-px bg-slate-700/50 mx-1"></div>
            <button onClick={toggleCamera} className={`p-3 rounded-xl transition-all ${cameraMode === 'third-person' ? 'text-purple-400 hover:text-purple-300' : 'text-slate-400 hover:text-white'}`} title="Toggle Camera">
                {cameraMode === 'top-down' ? <Camera size={24} strokeWidth={1.5} /> : <User size={24} strokeWidth={1.5} />}
            </button>
            <button onClick={handleRegenerate} className="p-3 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-all" title="Regenerate">
                <Map size={24} strokeWidth={1.5} />
            </button>
         </div>
      </div>

      <Canvas shadows dpr={[1, 1.5]}>
        <Sky sunPosition={sunPosition} />
        <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
        <ambientLight intensity={isNight ? 0.1 : 0.5} color="#b0c4de" />
        <directionalLight 
          position={[sunPosition[0], sunPosition[1], 20]} 
          intensity={isNight ? 0.2 : 1.5} 
          castShadow 
          shadow-mapSize={[1024, 1024]} 
          shadow-camera-left={-gridSize/2} shadow-camera-right={gridSize/2}
          shadow-camera-top={gridSize/2} shadow-camera-bottom={-gridSize/2}
        />
        
        <OrbitControls makeDefault enablePan={true} />
        <CameraFollower target={playerRef} mode={cameraMode} facing={gameState.playerFacing} />
        <Effects particles={gameState.particles} shakeIntensity={gameState.shakeIntensity} />

        <group>
          <PathLine points={pathPoints} />

          <WorldRenderer grid={gameState.grid} onTileClick={handleTileClick} />
          
          <InstancedObjects grid={gameState.grid} />

          {tiles.map(tile => {
            if (tile.type === TileType.HOUSE) return <House key={`h-${tile.x}-${tile.y}`} position={[tile.x, tile.height, tile.y]} style={tile.style} rotation={tile.rotation} />;
            if (tile.decoration === 'lamp') return <StreetLamp key={`l-${tile.x}-${tile.y}`} position={[tile.x, tile.height, tile.y]} active={tile.decorationActive} onClick={() => toggleLamp(tile.x, tile.y)} />;
            if (tile.decoration === 'cave') return <CaveEntrance key={`c-${tile.x}-${tile.y}`} position={[tile.x, tile.height, tile.y]} rotation={tile.rotation} />;
            if (tile.decoration === 'bridge') return <Bridge key={`b-${tile.x}-${tile.y}`} position={[tile.x, tile.height, tile.y]} />;
            return null;
          })}

          {gameState.items.map(item => !item.collected && <ItemMesh key={item.id} type={item.type} position={[item.position.x, 0, item.position.z]} />)}
          
          {gameState.enemies.map(enemy => {
              if (enemy.dead) return null;
              // Determine terrain height for grounding
              const localX = enemy.position.x - gameState.worldOrigin.x;
              const localZ = enemy.position.z - gameState.worldOrigin.z;
              let terrainHeight = 0;
              if (localZ >= 0 && localZ < gameState.grid.length && localX >= 0 && localX < gameState.grid[0].length) {
                  terrainHeight = gameState.grid[localZ][localX].height;
              }
              
              return (
                <EnemyMesh 
                    key={enemy.id} 
                    enemy={enemy} 
                    terrainHeight={terrainHeight}
                    onClick={() => handleTileClick(enemy.position.x, enemy.position.z)} 
                />
              );
          })}

          {gameState.npcs.map(npc => <NPCMesh key={npc.id} npc={npc} onClick={() => handleTileClick(npc.position.x, npc.position.z)} />)}
          
          {gameState.playerHp > 0 && <Player 
              innerRef={playerRef} 
              position={gameState.playerPos} 
              path={gameState.path} 
              onMoveComplete={handleMoveComplete} 
              onPositionUpdate={handlePositionUpdate} 
              onItemCollect={handleItemCollect}
              grid={gameState.grid}
              worldOrigin={gameState.worldOrigin}
          />}
        </group>
        <ContactShadows opacity={0.4} scale={100} blur={2} far={10} resolution={256} color="#000000" />
      </Canvas>
    </div>
  );
};