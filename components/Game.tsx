
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Sky, Stars, ContactShadows, OrbitControls, Html } from '@react-three/drei';
import { EffectComposer, N8AO, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { generateWorld, generateChunkStrip, generateTile, spawnEnemiesForGrid } from '../utils/generation';
import { findPath } from '../utils/pathfinding';
import { GameState, Position, TileType, ItemType, Enemy, Recipe, Particle, BiomeType, WorldItem, GameSettings, PlayerConfig, LogEntry, EnemyType, WeatherType } from '../types';
import { DEFAULT_GRID_SIZE, PLAYER_START_HP, ENEMY_AGGRO_RANGE, PLAYER_BASE_ATTACK, SWORD_BONUS_ATTACK, POTION_HEAL_AMOUNT, ENEMY_ATTACK } from '../constants';
import { House, ItemMesh, PathLine, EnemyMesh, StreetLamp, CaveEntrance, Bridge, NPCMesh, Car, Bobber, Barrel, Crate, DestinationMarker } from './WorldMeshes';
import { WorldRenderer } from './WorldRenderer';
import { InstancedObjects } from './InstancedObjects';
import { Player } from './Player';
import { InventoryUI } from './InventoryUI';
import { QuestLog } from './QuestLog';
import { CraftingUI } from './CraftingUI';
import { SettingsUI } from './SettingsUI';
import { DebugOverlay } from './DebugOverlay';
import { ThoughtBubble } from './ThoughtBubble';
import { FishingUI } from './FishingUI';
import { Effects } from './Effects';
import { soundManager } from '../utils/SoundManager';
import { RefreshCw, Heart, Skull, Moon, Sun, Package, Hammer, Scroll, Map, Camera, User, Axe, Pickaxe, Hand, LogOut, DoorOpen, MessageSquare, Crosshair, Settings, Trophy, CloudRain, CloudLightning } from 'lucide-react';
import { ParticleSystem, spawnParticles } from './ParticleSystem';
import { TimeController } from './TimeController';

import { DamageOverlay, triggerDamageFlash } from './DamageOverlay';

// --- Camera Controller Component ---
interface CameraFollowerProps {
    target: React.RefObject<THREE.Group>;
    mode: 'top-down' | 'third-person';
    facing: Position;
    isIntro: boolean;
    gameStarted: boolean;
}

const CameraFollower: React.FC<CameraFollowerProps> = ({ target, mode, facing, isIntro, gameStarted }) => {
  const { camera, controls } = useThree();
  const transitionRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!controls) return;
    const ctrl = controls as any;
    if (isIntro) {
        ctrl.enabled = false;
        return;
    }
    if (mode === 'top-down') {
        ctrl.enabled = true;
        ctrl.minDistance = 15;
        ctrl.maxDistance = 50; 
        ctrl.maxPolarAngle = Math.PI / 3;
        ctrl.minPolarAngle = Math.PI / 6;
        ctrl.enableRotate = true;
    } else if (mode === 'third-person') {
        ctrl.enabled = true;
        ctrl.minDistance = 2;
        ctrl.maxDistance = 25;
        ctrl.maxPolarAngle = Math.PI / 1.8;
        ctrl.enableRotate = true; 
    }
  }, [mode, controls, isIntro]);

  useFrame((state, delta) => {
    if (!target.current) return;
    const playerPos = target.current.position;
    if (!gameStarted) {
        if (isIntro) {
            camera.position.set(playerPos.x + 10, 1.5, playerPos.z + 15);
            camera.lookAt(playerPos);
        }
        return;
    }
    if (startTimeRef.current === null) {
        startTimeRef.current = state.clock.elapsedTime;
    }
    if (isIntro) {
        const t = state.clock.elapsedTime - (startTimeRef.current || 0);
        const duration = 10.0; 
        const progress = Math.min(1, t / duration);
        const ease = 1 - Math.pow(1 - progress, 2); 
        const startOffset = new THREE.Vector3(8, 0.8, 8);
        const dirX = facing.x || 0;
        const dirZ = facing.z || 1;
        const len = Math.sqrt(dirX*dirX + dirZ*dirZ);
        const ndx = len > 0 ? dirX/len : 0;
        const ndz = len > 0 ? dirZ/len : 1;
        const backDist = 8.0;
        const height = 5.5;
        const endOffset = new THREE.Vector3(-ndx * backDist, height, -ndz * backDist);
        const currentOffset = new THREE.Vector3().lerpVectors(startOffset, endOffset, ease);
        const introCamPos = playerPos.clone().add(currentOffset);
        camera.position.copy(introCamPos);
        camera.lookAt(playerPos.x, playerPos.y + 1.2, playerPos.z);
        // @ts-ignore
        if (controls) controls.target.copy(playerPos);
        return;
    }
    const targetT = mode === 'third-person' ? 1 : 0;
    transitionRef.current = THREE.MathUtils.lerp(transitionRef.current, targetT, delta * 2);
    const topDownOffset = new THREE.Vector3(0, 30, 25);
    const idealTopDownPos = playerPos.clone().add(topDownOffset);
    const dirX = facing.x || 0;
    const dirZ = facing.z || 1;
    const len = Math.sqrt(dirX*dirX + dirZ*dirZ);
    const ndx = len > 0 ? dirX/len : 0;
    const ndz = len > 0 ? dirZ/len : 1;
    const backDist = 8.0;
    const height = 5.5;
    const thirdPersonOffset = new THREE.Vector3(-ndx * backDist, height, -ndz * backDist);
    const idealThirdPersonPos = playerPos.clone().add(thirdPersonOffset);
    const idealPos = new THREE.Vector3().lerpVectors(idealTopDownPos, idealThirdPersonPos, transitionRef.current);
    // @ts-ignore
    const ctrl = controls as any;
    if (ctrl && ctrl.enabled) {
        if (mode === 'third-person') {
            camera.position.lerp(idealPos, 0.025);
            ctrl.target.lerp(playerPos.clone().add(new THREE.Vector3(0, 1.5, 0)), 0.04);
        } else {
            ctrl.target.lerp(playerPos, 0.04);
            if (transitionRef.current > 0.01) {
                camera.position.lerp(idealPos, 0.025);
            }
        }
        ctrl.update();
    }
  });
  return null;
};

interface GameProps {
  initialSettings?: { biome: BiomeType; seed: number; worldSize: number; playerConfig: PlayerConfig; gameSettings: Partial<GameSettings>; };
  onExit: () => void;
  gameStarted: boolean;
}

export const Game: React.FC<GameProps> = ({ initialSettings, onExit, gameStarted }) => {
  const [cameraMode, setCameraMode] = useState<'top-down' | 'third-person'>('third-person');
  const [isIntro, setIsIntro] = useState(true);
  const gridSize = initialSettings?.worldSize || DEFAULT_GRID_SIZE;
  const [enemiesActive, setEnemiesActive] = useState(false);
  const playerConfig = initialSettings?.playerConfig || { skinColor: '#e2e8f0', shirtColor: '#3b82f6', pantsColor: '#1e293b' };
  
  const addLog = useCallback((prevLogs: LogEntry[], msg: string, type: LogEntry['type'] = 'INFO'): LogEntry[] => {
      const now = new Date();
      const timeString = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;
      return [...prevLogs, { id: Math.random().toString(), timestamp: timeString, message: msg, type }];
  }, []);

  const [gameState, setGameState] = useState<GameState>(() => {
    const { grid, items, enemies, npcs, startPos, biome, seed } = generateWorld(0, 0, initialSettings?.seed, initialSettings?.biome, gridSize, false);
    return {
      grid, worldOrigin: { x: 0, z: 0 }, items, enemies, npcs, playerPos: startPos, playerFacing: { x: 0, z: 1 }, playerHp: PLAYER_START_HP, playerMaxHp: PLAYER_START_HP,
      targetPos: null, pendingTarget: null, path: [], isMoving: false, inventory: [], inventoryOpen: false, craftingOpen: false, settingsOpen: false,
      gameSettings: { audioVolume: 0.5, shadowsEnabled: true, particleQuality: 'HIGH', daySpeed: 0.2, enemyDensity: 'MEDIUM', showDebugLog: true, ...initialSettings?.gameSettings },
      interactionCount: 0, biome: biome, harvestTarget: null, combatTargetId: null, questLogOpen: false, activeDialogue: null, activeThought: "Where am I... my head hurts.",
      particles: [], shakeIntensity: 0, damageFlash: 0, timeOfDay: 12, seed, storyStage: 0,
      quests: [
          { id: 'q_survival', title: 'Survival Basics', description: 'Gather wood to prove you can survive the night.', type: 'COLLECT', targetType: ItemType.WOOD, requiredCount: 3, currentCount: 0, completed: false },
          { id: 'q_explore', title: 'Cave Explorer', description: 'Find and explore a dark cave.', type: 'INTERACT', targetType: 'CAVE', requiredCount: 1, currentCount: 0, completed: false },
      ],
      logs: [{ id: 'init', timestamp: '00:00:00', message: 'SYSTEM INITIALIZED', type: 'SYSTEM' }, { id: 'init2', timestamp: '00:00:01', message: `BIOME: ${biome}`, type: 'INFO' }],
      gameWon: false, notification: null, fishing: { status: 'IDLE', bobberPos: null, startTime: 0, targetZone: 50, cursorPos: 50 }, weather: WeatherType.CLEAR, weatherIntensity: 0,
    };
  });

  const playerRef = useRef<THREE.Group>(null);
  const thoughtTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Time Sync Handler
  const handleTimeUpdate = useCallback((time: number) => {
      setGameState(prev => ({ ...prev, timeOfDay: time }));
  }, []);

  const triggerThought = useCallback((text: string, duration: number = 4000) => {
      setGameState(prev => {
          if (prev.activeThought === text) return prev;
          return { ...prev, activeThought: text };
      });
      if (thoughtTimeoutRef.current) clearTimeout(thoughtTimeoutRef.current);
      thoughtTimeoutRef.current = setTimeout(() => setGameState(prev => ({ ...prev, activeThought: null })), duration);
  }, []);

  // Intro Sequence Effect
  useEffect(() => {
      if (!gameStarted) return; 
      soundManager.play('breakdown');
      const timer = setTimeout(() => {
          setIsIntro(false);
          setTimeout(() => triggerThought("I need to find a way to fix the car.", 5000), 1000);
      }, 10000); // 10s intro
      return () => clearTimeout(timer);
  }, [gameStarted, triggerThought]);

  const closeDialogue = useCallback(() => {
    setGameState(prev => ({ ...prev, activeDialogue: null }));
  }, []);

  const openDialogue = useCallback((npcId: string) => {
    setGameState(prev => {
        const npc = prev.npcs.find(n => n.id === npcId);
        if (!npc) return prev;

        // Update TALK quests
        let newQuests = prev.quests.map(q => {
            if (!q.completed && q.type === 'TALK') {
                if (q.targetType === 'NPC' || q.targetType === npc.role || (q.targetType === 'VILLAGER' && npc.role === 'VILLAGER')) {
                    const c = q.currentCount + 1;
                    return { ...q, currentCount: c, completed: c >= q.requiredCount };
                }
            }
            return q;
        });

        let dialogueText = "";
        let options: any[] = [{ label: "Goodbye", action: () => closeDialogue() }];

        if (npc.id === 'npc_mcgregor') {
            if (prev.storyStage === 0) {
                dialogueText = "My car is broken... can't leave this place. I'm too old to gather materials. You look strong, help an old man out?";
                options = [
                    { label: "I'll help you.", action: () => {
                        setGameState(s => ({
                            ...s,
                            quests: [...s.quests, { id: 'q_core', title: 'Power Source', description: 'Defeat a Golem to retrieve a Power Core.', type: 'KILL', targetType: 'ENEMY', requiredCount: 1, currentCount: 0, completed: false }],
                            storyStage: 1,
                            notification: { id: 'q1', message: 'New Quest: Power Source', type: 'QUEST' }
                        }));
                        closeDialogue();
                    }},
                    { label: "Not right now.", action: () => closeDialogue() }
                ];
            } else if (prev.storyStage === 1) {
                const hasCore = prev.inventory.some(i => i.type === ItemType.POWER_CORE);
                if (hasCore) {
                    dialogueText = "You found the core! Now I can build the ignition manifold. Take this engine part to the car.";
                    options = [{ label: "Thank you.", action: () => {
                        setGameState(s => {
                            const newInv = [...s.inventory];
                            const coreIdx = newInv.findIndex(i => i.type === ItemType.POWER_CORE);
                            if (coreIdx > -1) { newInv[coreIdx].count--; if (newInv[coreIdx].count <= 0) newInv.splice(coreIdx, 1); }
                            newInv.push({ type: ItemType.ENGINE_PART, count: 1 });
                            return { ...s, inventory: newInv, storyStage: 2, notification: { id: 'q2', message: 'Acquired: Engine Part', type: 'ITEM' } };
                        });
                        closeDialogue();
                    }}];
                } else {
                    dialogueText = "I need that Golem Core to fix the car. Be careful, they are made of stone and rage.";
                }
            } else {
                dialogueText = "Take that part to the car! It's our only way out of these woods.";
            }
        } else if (npc.role === 'VILLAGER') {
            const lines = [
                "The shadows are longer than they used to be...",
                "Stay on the roads, traveler. The woods have eyes.",
                "Have you spoken to McGregor? He's been here since before the collapse.",
                "I miss the city lights. Here, we only have the stars and the lamps.",
                "Don't go too far south. The Golems don't like visitors."
            ];
            dialogueText = lines[Math.abs(npc.id.split('').reduce((a,b)=>a+b.charCodeAt(0),0)) % lines.length];
        } else if (npc.role === 'MERCHANT') {
            dialogueText = "Greetings! I'm just passing through. This valley is rich in Iron and Coal if you know where to dig.";
            options = [
                { label: "Where can I find Iron?", action: () => { triggerThought("I should look for caves in the high rocks."); closeDialogue(); }},
                { label: "Seen anything dangerous?", action: () => { triggerThought("He said ghosts haunt the ruins at night."); closeDialogue(); }},
                { label: "Goodbye", action: () => closeDialogue() }
            ];
        }

        return { ...prev, activeDialogue: { npcName: npc.name, text: dialogueText, options }, quests: newQuests };
    });
  }, [closeDialogue, triggerThought]);

  const toggleLamp = useCallback((x: number, z: number) => {
      setGameState(prev => {
          const localX = x - prev.worldOrigin.x;
          const localZ = z - prev.worldOrigin.z;
          if (localX >= 0 && localZ >= 0 && localZ < prev.grid.length && localX < prev.grid[0].length) {
              const newGrid = [...prev.grid];
              newGrid[localZ] = [...newGrid[localZ]];
              newGrid[localZ][localX] = { ...newGrid[localZ][localX], decorationActive: !newGrid[localZ][localX].decorationActive };
              
              // Quest update for LAMP interaction
              const newQuests = prev.quests.map(q => {
                  if (!q.completed && q.type === 'INTERACT' && q.targetType === 'LAMP') {
                      const c = q.currentCount + 1;
                      return { ...q, currentCount: c, completed: c >= q.requiredCount };
                  }
                  return q;
              });

              return { ...prev, grid: newGrid, quests: newQuests };
          }
          return prev;
      });
  }, []);

  const handleFishingResult = useCallback((success: boolean) => {
      setGameState(prev => {
          if (!success) { triggerThought("It got away..."); return { ...prev, fishing: { ...prev.fishing, status: 'IDLE', bobberPos: null } }; }
          const lootRoll = Math.random();
          let item = ItemType.RAW_FISH;
          if (lootRoll > 0.9) item = ItemType.ANCIENT_COIN; else if (lootRoll > 0.7) item = ItemType.OLD_BOOT;
          const newInventory = [...prev.inventory];
          const idx = newInventory.findIndex(i => i.type === item);
          if (idx > -1) newInventory[idx].count++; else newInventory.push({ type: item, count: 1 });
          soundManager.play('collect');
          triggerThought(`I caught a ${item}!`);
          
          // Quest update for fishing
          const newQuests = prev.quests.map(q => {
              if (!q.completed && q.type === 'COLLECT' && q.targetType === item) {
                  const c = q.currentCount + 1;
                  return { ...q, currentCount: c, completed: c >= q.requiredCount };
              }
              return q;
          });

          return { ...prev, inventory: newInventory, fishing: { ...prev.fishing, status: 'IDLE', bobberPos: null }, logs: addLog(prev.logs, `Fishing: Caught ${item}`, 'LOOT'), quests: newQuests };
      });
  }, [addLog, triggerThought]);

  const findPathToAdjacent = useCallback((grid: any[][], start: Position, target: Position, origin: Position) => {
    const localTarget = { x: target.x - origin.x, z: target.z - origin.z };
    const localStart = { x: Math.round(start.x - origin.x), z: Math.round(start.z - origin.z) };
    const neighbors = [{x: localTarget.x+1, z: localTarget.z}, {x: localTarget.x-1, z: localTarget.z}, {x: localTarget.x, z: localTarget.z+1}, {x: localTarget.x, z: localTarget.z-1}];
    let bestPath: Position[] | null = null;
    if (neighbors.some(n => n.x === localStart.x && n.z === localStart.z)) return [start];
    for (const n of neighbors) {
      if (n.x >= 0 && n.x < gridSize && n.z >= 0 && n.z < gridSize && grid[n.z][n.x].walkable) {
        const localPath = findPath(grid, localStart, n);
        if (localPath.length > 0 && (!bestPath || localPath.length < bestPath.length)) bestPath = localPath.map(p => ({ x: p.x + origin.x, z: p.z + origin.z }));
      }
    }
    return bestPath;
  }, [gridSize]);

  const performAction = useCallback((targetX: number, targetZ: number) => {
    setGameState(prev => {
      const localX = targetX - prev.worldOrigin.x;
      const localZ = targetZ - prev.worldOrigin.z;
      if (localX < 0 || localX >= gridSize || localZ < 0 || localZ >= gridSize) return prev;
      const newEnemies = prev.enemies.map(e => ({...e}));
      const newItems = [...prev.items];
      let newInventory = [...prev.inventory];
      let newQuests = [...prev.quests];
      let newLogs = [...prev.logs];
      let addedParticles: Particle[] = [];
      let soundToPlay = '';
      let winTriggered = false;
      const tile = prev.grid[localZ][localX];
      if (tile.decoration === 'car') {
          const hasEnginePart = prev.inventory.some(i => i.type === ItemType.ENGINE_PART);
          if (hasEnginePart) { winTriggered = true; soundToPlay = 'craft'; newLogs = addLog(newLogs, "ENGINE REPAIRED. IGNITION STARTED.", 'SYSTEM'); }
          else { newLogs = addLog(newLogs, "Engine is dead. Need parts.", 'INFO'); triggerThought("It won't start. Maybe that old man nearby knows something."); }
      }
      if (prev.combatTargetId) {
        const enemyIndex = newEnemies.findIndex(e => e.id === prev.combatTargetId);
        if (enemyIndex > -1 && !newEnemies[enemyIndex].dead) {
             const dmg = PLAYER_BASE_ATTACK + (prev.inventory.some(i => i.type === ItemType.SWORD) ? SWORD_BONUS_ATTACK : 0);
             newEnemies[enemyIndex].hp -= dmg;
             soundToPlay = 'hit';
             spawnParticles(newEnemies[enemyIndex].position.x, 1.0, newEnemies[enemyIndex].position.z, '#ffffff', 5);
             newLogs = addLog(newLogs, `Hit ${newEnemies[enemyIndex].type} for ${dmg} DMG`, 'COMBAT');
             if (newEnemies[enemyIndex].hp <= 0) {
                 newEnemies[enemyIndex].dead = true; soundToPlay = 'collect'; 
                 spawnParticles(newEnemies[enemyIndex].position.x, 1.0, newEnemies[enemyIndex].position.z, '#db2777', 15);
                 newLogs = addLog(newLogs, `Defeated ${newEnemies[enemyIndex].type}`, 'COMBAT');
                 let lootType = ItemType.GOLD;
                 const coreQuest = prev.quests.find(q => q.id === 'q_core' && !q.completed);
                 if (coreQuest && newEnemies[enemyIndex].type === EnemyType.GOLEM) { lootType = ItemType.POWER_CORE; newLogs = addLog(newLogs, "Found Power Core!", 'LOOT'); }
                 else { const roll = Math.random(); if (roll > 0.6) lootType = ItemType.GOLD; else if (roll > 0.4) lootType = ItemType.POTION; else lootType = ItemType.GEM; }
                 newItems.push({ id: `loot-${Date.now()}`, type: lootType, position: { x: newEnemies[enemyIndex].position.x, z: newEnemies[enemyIndex].position.z }, collected: false });
                 newQuests = newQuests.map(q => { if (!q.completed && q.type === 'KILL' && q.targetType === 'ENEMY') { const c = q.currentCount + 1; return { ...q, currentCount: c, completed: c >= q.requiredCount }; } return q; });
             }
        }
      } else {
        if ((tile.decoration === 'cave' || tile.decoration === 'barrel' || tile.decoration === 'crate') && !tile.decorationActive) {
            tile.decorationActive = true; soundToPlay = tile.decoration === 'cave' ? 'step' : 'collect'; 
            spawnParticles(targetX, 1.0, targetZ, '#525252', 12);
            const roll = Math.random(); let lootType = ItemType.WOOD; let count = 2;
            if (tile.decoration === 'cave') { 
                if (roll > 0.8) { lootType = ItemType.GEM; count = 1; } else if (roll > 0.6) { lootType = ItemType.IRON_ORE; count = 3; } else { lootType = ItemType.STONE; count = 4; } 
                // Quest update for CAVE interaction
                newQuests = newQuests.map(q => {
                    if (!q.completed && q.type === 'INTERACT' && q.targetType === 'CAVE') {
                        const c = q.currentCount + 1;
                        return { ...q, currentCount: c, completed: c >= q.requiredCount };
                    }
                    return q;
                });
            }
            else { if (roll > 0.9) { lootType = ItemType.POTION; count = 1; } else if (roll > 0.7) { lootType = ItemType.GOLD; count = 10; } else { lootType = ItemType.WOOD; count = 2; } }
            const idx = newInventory.findIndex(inv => inv.type === lootType); if (idx > -1) newInventory[idx].count += count; else newInventory.push({ type: lootType, count: count });
            newLogs = addLog(newLogs, `Searched ${tile.decoration}: +${count} ${lootType}`, 'LOOT');
            newQuests = newQuests.map(q => { if (!q.completed && q.type === 'COLLECT' && q.targetType === lootType) { const c = q.currentCount + count; return { ...q, currentCount: c, completed: c >= q.requiredCount }; } return q; });
        } else if (tile.type === TileType.HOUSE && !tile.decorationActive) {
                tile.decorationActive = true; soundToPlay = 'collect'; 
                spawnParticles(targetX, 1.0, targetZ, '#fbbf24', 15);
                const roll = Math.random(); let lootType = ItemType.GOLD; let count = 1;
                if (roll > 0.9) { lootType = ItemType.GEM; count = 1; } else if (roll > 0.7) { lootType = ItemType.POTION; count = 1; } else if (roll > 0.5) { lootType = ItemType.WOOD; count = 3; } else { lootType = ItemType.GOLD; count = 15; }
                const idx = newInventory.findIndex(inv => inv.type === lootType); if (idx > -1) newInventory[idx].count += count; else newInventory.push({ type: lootType, count: count });
                newLogs = addLog(newLogs, `Scavenged House: +${count} ${lootType}`, 'LOOT');
                newQuests = newQuests.map(q => { if (!q.completed && q.type === 'COLLECT' && q.targetType === lootType) { const c = q.currentCount + count; return { ...q, currentCount: c, completed: c >= q.requiredCount }; } return q; });
        }
      }
      if (soundToPlay) soundManager.play(soundToPlay);
      return { ...prev, items: newItems, inventory: newInventory, enemies: newEnemies, quests: newQuests, logs: newLogs, harvestTarget: null, combatTargetId: null, isMoving: false, path: [], gameWon: winTriggered || prev.gameWon };
    });
  }, [gridSize, addLog, triggerThought]);

  // Handle Keydown mainly for movement or hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key.toLowerCase() === 'l') { setGameState(prev => ({ ...prev, gameSettings: { ...prev.gameSettings, showDebugLog: !prev.gameSettings.showDebugLog } })); return; }
        if (!gameStarted || isIntro || gameState.playerHp <= 0 || gameState.gameWon) return;
        if (e.key.toLowerCase() === 'e') {
            const range = 3.0; let nearest: { x: number, z: number, dist: number } | null = null;
            gameState.npcs.forEach(npc => { const d = Math.sqrt(Math.pow(npc.position.x - gameState.playerPos.x, 2) + Math.pow(npc.position.z - gameState.playerPos.z, 2)); if (d <= range && (!nearest || d < nearest.dist)) nearest = { x: npc.position.x, z: npc.position.z, dist: d }; });
            for(let dz = -3; dz <= 3; dz++) { for(let dx = -3; dx <= 3; dx++) {
                const wx = Math.round(gameState.playerPos.x + dx); const wz = Math.round(gameState.playerPos.z + dz);
                const lx = wx - gameState.worldOrigin.x; const lz = wz - gameState.worldOrigin.z;
                if (lx >= 0 && lx < gridSize && lz >= 0 && lz < gridSize) {
                    const tile = gameState.grid[lz][lx]; const dist = Math.sqrt(dx*dx + dz*dz);
                    const isInteractable = tile.type === TileType.HOUSE || tile.decoration === 'cave' || tile.decoration === 'car' || tile.decoration === 'lamp' || tile.decoration === 'barrel' || tile.decoration === 'crate';
                    if (isInteractable && dist <= range && (!nearest || dist < nearest.dist)) nearest = { x: wx, z: wz, dist };
                }
            }}
            gameState.enemies.forEach(enemy => { if (!enemy.dead) { const d = Math.sqrt(Math.pow(enemy.position.x - gameState.playerPos.x, 2) + Math.pow(enemy.position.z - gameState.playerPos.z, 2)); if (d <= 1.5 && (!nearest || d < nearest.dist)) nearest = { x: enemy.position.x, z: enemy.position.z, dist: d }; } });
            if (nearest) handleTileClick(nearest.x, nearest.z); return;
        }
        
        // Keyboard movement shouldn't trigger double-click logic for now, just direct move
        // But for consistency let's leave it as is or map it to the same verification logic if desired. 
        // For this task, we focus on Click controls.
        let dx = 0, dz = 0;
        switch(e.key) { case 'ArrowUp': case 'w': case 'W': dz = -1; break; case 'ArrowDown': case 's': case 'S': dz = 1; break; case 'ArrowLeft': case 'a': case 'A': dx = -1; break; case 'ArrowRight': case 'd': case 'D': dx = 1; break; default: return; }
        setGameState(prev => {
            const nextX = Math.round(prev.playerPos.x + dx); const nextZ = Math.round(prev.playerPos.z + dz);
            const lx = nextX - prev.worldOrigin.x; const lz = nextZ - prev.worldOrigin.z;
            if (lx >= 0 && lx < gridSize && lz >= 0 && lz < gridSize && prev.grid[lz][lx].walkable) return { ...prev, playerPos: { x: nextX, z: nextZ }, playerFacing: { x: dx, z: dz }, path: [], isMoving: false, interactionCount: prev.interactionCount === 0 ? 1 : prev.interactionCount, pendingTarget: null }; // Clear pending on manual move
            return prev;
        });
    };
    window.addEventListener('keydown', handleKeyDown); return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameStarted, isIntro, gameState.playerHp, gameState.gameWon, gridSize, gameState.playerPos, gameState.npcs, gameState.grid, gameState.worldOrigin, gameState.enemies]);

  const handleTileClick = useCallback((x: number, z: number) => {
    if (gameState.playerHp <= 0 || isIntro || gameState.gameWon) return;
    if (gameState.fishing.status !== 'IDLE') {
        if (gameState.fishing.status === 'BITE') { setGameState(prev => ({ ...prev, fishing: { ...prev.fishing, status: 'REELING' } })); return; }
        else if (gameState.fishing.status === 'REELING') return;
        else { setGameState(prev => ({ ...prev, fishing: { ...prev.fishing, status: 'IDLE', bobberPos: null } })); return; }
    }
    
    // --- DOUBLE CLICK VERIFICATION LOGIC ---
    if (!gameState.pendingTarget || gameState.pendingTarget.x !== x || gameState.pendingTarget.z !== z) {
        setGameState(prev => ({ ...prev, pendingTarget: { x, z } }));
        soundManager.play('step'); // Minimal feedback
        return; 
    }
    
    // If we are here, we clicked the pending target again. Confirmed!
    setGameState(prev => ({ ...prev, pendingTarget: null }));
    
    soundManager.resume();
    if (gameState.interactionCount === 0) setGameState(prev => ({ ...prev, interactionCount: 1 }));
    const clickedNPC = gameState.npcs.find(n => n.position.x === x && n.position.z === z);
    if (clickedNPC) {
         const path = findPathToAdjacent(gameState.grid, gameState.playerPos, { x, z }, gameState.worldOrigin);
         if (path) {
             const facing = path.length > 0 ? { x: path[0].x - gameState.playerPos.x, z: path[0].z - gameState.playerPos.z } : gameState.playerFacing;
             if (path.length === 1 && path[0].x === gameState.playerPos.x && path[0].z === gameState.playerPos.z) { openDialogue(clickedNPC.id); setGameState(prev => ({ ...prev, playerFacing: {x: x - prev.playerPos.x, z: z - prev.playerPos.z} })); }
             else setGameState(prev => ({ ...prev, targetPos: path[path.length - 1], path, isMoving: true, combatTargetId: null, harvestTarget: null, playerFacing: facing }));
         }
         return;
    }
    const clickedEnemy = gameState.enemies.find(e => !e.dead && e.position.x === x && e.position.z === z);
    const lx = x - gameState.worldOrigin.x; const lz = z - gameState.worldOrigin.z;
    if (lx < 0 || lx >= gridSize || lz < 0 || lz >= gridSize) return;
    const tile = gameState.grid[lz][lx];
    if (clickedEnemy) {
        const path = findPathToAdjacent(gameState.grid, gameState.playerPos, { x, z }, gameState.worldOrigin);
        if (path) {
            const facing = path.length > 0 ? { x: path[0].x - gameState.playerPos.x, z: path[0].z - gameState.playerPos.z } : gameState.playerFacing;
            if (path.length === 1 && path[0].x === gameState.playerPos.x && path[0].z === gameState.playerPos.z) { setGameState(prev => ({ ...prev, combatTargetId: clickedEnemy.id })); setTimeout(() => performAction(x, z), 50); }
            else setGameState(prev => ({ ...prev, targetPos: path[path.length - 1], path, isMoving: true, combatTargetId: clickedEnemy.id, harvestTarget: { x, z }, playerFacing: facing }));
        }
    } else if ((tile.type === TileType.HOUSE && !tile.decorationActive) || ((tile.decoration === 'cave' || tile.decoration === 'barrel' || tile.decoration === 'crate') && !tile.decorationActive) || tile.decoration === 'car') {
      const path = findPathToAdjacent(gameState.grid, gameState.playerPos, { x, z }, gameState.worldOrigin);
      if (path) {
        const facing = path.length > 0 ? { x: path[0].x - gameState.playerPos.x, z: path[0].z - gameState.playerPos.z } : gameState.playerFacing;
        if (path.length === 1 && path[0].x === gameState.playerPos.x && path[0].z === gameState.playerPos.z) { performAction(x, z); setGameState(prev => ({ ...prev, playerFacing: {x: x - prev.playerPos.x, z: z - prev.playerPos.z} })); }
        else setGameState(prev => ({ ...prev, targetPos: path[path.length - 1], path, isMoving: true, harvestTarget: { x, z }, combatTargetId: null, playerFacing: facing }));
      }
    } else if (tile.type === TileType.WATER) {
        const d = Math.sqrt(Math.pow(x - gameState.playerPos.x, 2) + Math.pow(z - gameState.playerPos.z, 2));
        if (d <= 2.0) {
            const hasRod = gameState.inventory.some(i => i.type === ItemType.FISHING_ROD);
            if (hasRod) { setGameState(prev => ({ ...prev, fishing: { status: 'WAITING', bobberPos: { x, z }, startTime: Date.now(), targetZone: 50, cursorPos: 50 }, playerFacing: { x: x - prev.playerPos.x, z: z - prev.playerPos.z } })); triggerThought("Patience..."); }
            else triggerThought("I need a Fishing Rod to fish here.");
        } else {
             const path = findPathToAdjacent(gameState.grid, gameState.playerPos, { x, z }, gameState.worldOrigin);
             if (path) { const f = path.length > 0 ? { x: path[0].x - gameState.playerPos.x, z: path[0].z - gameState.playerPos.z } : gameState.playerFacing; setGameState(prev => ({ ...prev, targetPos: path[path.length - 1], path, isMoving: true, harvestTarget: null, combatTargetId: null, playerFacing: f })); }
        }
    } else if (tile.walkable) {
      const start = { x: Math.round(gameState.playerPos.x - gameState.worldOrigin.x), z: Math.round(gameState.playerPos.z - gameState.worldOrigin.z) };
      const path = findPath(gameState.grid, start, { x: lx, z: lz });
      if (path.length > 0) {
        const worldPath = path.map(p => ({ x: p.x + gameState.worldOrigin.x, z: p.z + gameState.worldOrigin.z }));
        const f = { x: worldPath[0].x - gameState.playerPos.x, z: worldPath[0].z - gameState.playerPos.z };
        setGameState(prev => ({ ...prev, targetPos: { x, z }, path: worldPath, isMoving: true, harvestTarget: null, combatTargetId: null, playerFacing: f }));
      }
    }
  }, [gameState.grid, gameState.playerPos, gameState.enemies, gameState.playerHp, gameState.npcs, gameState.interactionCount, gameState.worldOrigin, findPathToAdjacent, performAction, gridSize, openDialogue, isIntro, gameState.gameWon, triggerThought, gameState.fishing.status, gameState.inventory, gameState.playerFacing, gameState.pendingTarget]);

  const handleMoveComplete = useCallback(() => {
    setGameState(prev => {
      if (prev.harvestTarget) {
        const d = Math.max(Math.abs(prev.playerPos.x - prev.harvestTarget.x), Math.abs(prev.playerPos.z - prev.harvestTarget.z));
        if (d <= 1.5) {
             const lx = prev.harvestTarget.x - prev.worldOrigin.x; const lz = prev.harvestTarget.z - prev.worldOrigin.z;
             if (lx >= 0 && lz >= 0) {
                 const tile = prev.grid[lz][lx]; const ok = tile.type === TileType.HOUSE || tile.decoration === 'car' || tile.decoration === 'cave' || tile.decoration === 'barrel' || tile.decoration === 'crate';
                 if (ok) { setTimeout(() => performAction(prev.harvestTarget!.x, prev.harvestTarget!.z), 50); return { ...prev, isMoving: false, path: [], harvestTarget: null, playerFacing: { x: prev.harvestTarget.x - prev.playerPos.x, z: prev.harvestTarget.z - prev.playerPos.z } } }
             }
        }
      }
      return { ...prev, isMoving: false, path: [] };
    });
  }, [performAction]);

  const handlePositionUpdate = useCallback((newPos: Position) => {
      setGameState(prev => {
          const dx = newPos.x - prev.playerPos.x; const dz = newPos.z - prev.playerPos.z;
          const f = (dx !== 0 || dz !== 0) ? { x: dx, z: dz } : prev.playerFacing;
          return { ...prev, playerPos: newPos, playerFacing: f };
      });
  }, []);

  const handleItemCollect = useCallback((pos: Position) => {
    setGameState(prev => {
      const idx = prev.items.findIndex(i => !i.collected && Math.round(i.position.x) === Math.round(pos.x) && Math.round(i.position.z) === Math.round(pos.z));
      if (idx > -1) {
        const item = prev.items[idx]; const newItems = [...prev.items]; newItems[idx] = { ...item, collected: true };
        soundManager.play('collect'); const invIdx = prev.inventory.findIndex(inv => inv.type === item.type); const newInv = [...prev.inventory];
        if (invIdx > -1) newInv[invIdx].count++; else newInv.push({ type: item.type, count: 1 });
        const newQuests = prev.quests.map(q => { if (!q.completed && q.type === 'COLLECT' && q.targetType === item.type) { const c = q.currentCount + 1; return { ...q, currentCount: c, completed: c >= q.requiredCount }; } return q; });
        return { ...prev, items: newItems, inventory: newInv, quests: newQuests, logs: addLog(prev.logs, `Acquired: ${item.type}`, 'LOOT') };
      }
      return prev;
    });
  }, [addLog]);

  const handleUseItem = useCallback((itemType: ItemType) => {
      setGameState(prev => {
          if (itemType === ItemType.POTION) {
              if (prev.playerHp >= prev.playerMaxHp) { triggerThought("I'm already healthy."); return prev; } 
              const newHp = Math.min(prev.playerMaxHp, prev.playerHp + POTION_HEAL_AMOUNT); soundManager.play('collect'); 
              const newInv = [...prev.inventory]; const idx = newInv.findIndex(i => i.type === itemType);
              if (idx > -1) { newInv[idx].count--; if (newInv[idx].count <= 0) newInv.splice(idx, 1); }
              triggerThought("That tastes terrible, but I feel better.");
              spawnParticles(prev.playerPos.x, 1.0, prev.playerPos.z, '#22c55e', 10);
              return { ...prev, playerHp: newHp, inventory: newInv, logs: addLog(prev.logs, "Used Potion. Health restored.", 'INFO') };
          }
          return prev;
      });
  }, [triggerThought, addLog]);

  const handleDropItem = useCallback((itemType: ItemType) => {
       setGameState(prev => {
            const newInv = [...prev.inventory]; const idx = newInv.findIndex(i => i.type === itemType);
            if (idx > -1) {
                newInv[idx].count--; if (newInv[idx].count <= 0) newInv.splice(idx, 1);
                return { ...prev, inventory: newInv, items: [...prev.items, { id: `drop-${Date.now()}`, type: itemType, position: { ...prev.playerPos }, collected: false }], logs: addLog(prev.logs, `Dropped: ${itemType}`, 'INFO') };
            }
            return prev;
       });
  }, [addLog]);

  const handleCraft = useCallback((recipe: Recipe) => {
    setGameState(prev => {
        const newInv = [...prev.inventory];
        for (const ing of recipe.ingredients) {
            const idx = newInv.findIndex(i => i.type === ing.type);
            if (idx > -1) { newInv[idx].count -= ing.count; if (newInv[idx].count <= 0) newInv.splice(idx, 1); }
        }
        const resIdx = newInv.findIndex(i => i.type === recipe.result);
        if (resIdx > -1) newInv[resIdx].count += recipe.resultCount; else newInv.push({ type: recipe.result, count: recipe.resultCount });
        soundManager.play('craft'); triggerThought("Made something useful.");
        return { ...prev, inventory: newInv, logs: addLog(prev.logs, `Crafted: ${recipe.name}`, 'INFO') };
    });
  }, [triggerThought, addLog]);

  const handleRegenerate = useCallback(() => {
    setEnemiesActive(false);
    const { grid, items, enemies, npcs, startPos, biome, seed } = generateWorld(0, 0, initialSettings?.seed || Math.random() * 100, initialSettings?.biome, gridSize, false);
    setGameState(prev => ({
      grid, items, enemies, npcs, playerPos: startPos, playerFacing: {x:0, z:1}, worldOrigin: {x:0, z:0}, playerHp: PLAYER_START_HP, playerMaxHp: PLAYER_START_HP,
      targetPos: null, pendingTarget: null, path: [], isMoving: false, inventory: [], inventoryOpen: false, craftingOpen: false, activeDialogue: null, activeThought: "Everything looks... different.",
      interactionCount: 0, biome, harvestTarget: null, combatTargetId: null,
      quests: [{ id: 'q_survival', title: 'Survival Basics', description: 'Gather wood to prove you can survive the night.', type: 'COLLECT', targetType: ItemType.WOOD, requiredCount: 3, currentCount: 0, completed: false }],
      storyStage: 0, questLogOpen: false, particles: [], shakeIntensity: 0, damageFlash: 0, timeOfDay: 12, seed, settingsOpen: false,
      gameSettings: prev.gameSettings, logs: [{ id: 'respawn', timestamp: '00:00:00', message: 'SYSTEM REBOOT... RESPAWN INITIATED', type: 'SYSTEM' }],
      gameWon: false, notification: null, fishing: { status: 'IDLE', bobberPos: null, startTime: 0, targetZone: 50, cursorPos: 50 }, weather: WeatherType.CLEAR, weatherIntensity: 0
    }));
  }, [initialSettings, gridSize]);

  const toggleSettings = () => setGameState(prev => ({ ...prev, settingsOpen: !prev.settingsOpen, inventoryOpen: false, craftingOpen: false, questLogOpen: false }));
  const handleSettingsUpdate = (newSettings: GameSettings) => setGameState(prev => ({ ...prev, gameSettings: newSettings }));
  const pathPoints = useMemo(() => {
      return gameState.path.map(p => {
          const lx = p.x - gameState.worldOrigin.x; const lz = p.z - gameState.worldOrigin.z;
          let y = 0.1; if (lx >= 0 && lx < gridSize && lz >= 0 && lz < gridSize) y = gameState.grid[lz][lx].height + 0.15; 
          return [p.x, y, p.z] as [number, number, number];
      });
  }, [gameState.path, gameState.grid, gameState.worldOrigin, gridSize]);

  const toggleInventory = () => setGameState(prev => ({ ...prev, inventoryOpen: !prev.inventoryOpen, craftingOpen: false, questLogOpen: false, settingsOpen: false }));
  const toggleCrafting = () => setGameState(prev => ({ ...prev, craftingOpen: !prev.craftingOpen, inventoryOpen: false, questLogOpen: false, settingsOpen: false }));
  const toggleQuestLog = () => setGameState(prev => ({ ...prev, questLogOpen: !prev.questLogOpen, inventoryOpen: false, craftingOpen: false, settingsOpen: false }));
  const toggleCamera = () => setCameraMode(prev => prev === 'top-down' ? 'third-person' : 'top-down');

  const isDark = gameState.timeOfDay < 6 || gameState.timeOfDay > 18;
  const tiles = useMemo(() => gameState.grid.flatMap(row => row), [gameState.grid]);

  return (
    <div className="w-full h-full relative" onClick={() => soundManager.resume()}>
      <DamageOverlay />
      <DebugOverlay gameState={gameState} />
      <ThoughtBubble thought={gameState.activeThought} />
      {gameState.fishing.status === 'REELING' && <FishingUI onSuccess={() => handleFishingResult(true)} onFail={() => handleFishingResult(false)} />}
      {gameState.activeDialogue && (
          <div className="absolute inset-0 z-50 flex items-end justify-center pb-24 pointer-events-auto bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
              <div className="max-w-xl w-full mx-4 bg-slate-900/95 border-2 border-slate-600 p-6 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-10 fade-in zoom-in-95">
                  <div className="flex items-start gap-5 mb-5">
                      <div className="w-20 h-20 bg-slate-800 rounded-2xl border-2 border-slate-600 flex items-center justify-center shrink-0 shadow-inner">
                          <User size={40} className="text-blue-400 opacity-80" />
                      </div>
                      <div className="flex-1">
                          <h3 className="font-black text-yellow-500 text-xl tracking-tight mb-1 uppercase">{gameState.activeDialogue.npcName}</h3>
                          <div className="h-px w-16 bg-yellow-500/30 mb-3" />
                          <p className="text-slate-100 text-base leading-relaxed font-medium italic">
                              "{gameState.activeDialogue.text}"
                          </p>
                      </div>
                  </div>
                  <div className="flex flex-col gap-3 mt-6">
                      {gameState.activeDialogue.options.map((opt, i) => (
                          <button key={i} onClick={() => opt.action()} className="w-full text-left px-5 py-4 bg-slate-800/80 hover:bg-blue-600 text-white rounded-2xl border border-white/10 transition-all flex items-center gap-3 group hover:scale-[1.01] hover:shadow-lg active:scale-95">
                              <div className="w-8 h-8 rounded-lg bg-slate-700 group-hover:bg-blue-500 flex items-center justify-center transition-colors">
                                  <MessageSquare size={16} className="text-slate-400 group-hover:text-white" />
                              </div>
                              <span className="text-sm font-bold tracking-wide">{opt.label}</span>
                          </button>
                      ))}
                  </div>
              </div>
          </div>
      )}
      <div className={`absolute top-4 left-4 right-4 z-30 flex justify-between items-start pointer-events-none transition-opacity duration-500 ${isIntro && !gameStarted ? 'opacity-0' : 'opacity-100'}`}>
          {gameState.gameSettings.showDebugLog ? <div className="w-72 hidden md:block" /> : <div />}
          <div className="flex gap-4 items-center">
             <div className="bg-slate-900/80 backdrop-blur border border-slate-700 p-2 rounded-lg text-white flex items-center gap-2 shadow-lg">
                {isDark ? <Moon size={16} className="text-blue-300" /> : <Sun size={16} className="text-yellow-400" />}
                <span className="text-xs font-mono font-bold">{Math.floor(gameState.timeOfDay).toString().padStart(2, '0')}:00</span>
             </div>
             {gameState.weather !== WeatherType.CLEAR && (
                 <div className="bg-slate-900/80 backdrop-blur border border-slate-700 p-2 rounded-lg text-white flex items-center gap-2 shadow-lg animate-pulse">
                    {gameState.weather === WeatherType.STORM ? <CloudLightning size={16} className="text-yellow-400" /> : <CloudRain size={16} className="text-blue-400" />}
                    <span className="text-[10px] font-bold uppercase tracking-tight">{gameState.weather}</span>
                 </div>
             )}
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
                 <button onClick={toggleSettings} className="bg-slate-900/80 hover:bg-slate-800 backdrop-blur border border-slate-700 p-2 rounded-lg text-white shadow-lg transition-colors flex items-center gap-2"><Settings size={16} /></button>
                 <button onClick={onExit} className="bg-red-900/80 hover:bg-red-800 backdrop-blur border border-red-700 p-2 rounded-lg text-white shadow-lg transition-colors flex items-center gap-2"><LogOut size={16} /><span className="text-xs font-bold hidden sm:inline">Exit</span></button>
             </div>
          </div>
      </div>
      <div className={`absolute top-20 left-1/2 transform -translate-x-1/2 bg-black/60 text-white px-6 py-3 rounded-full backdrop-blur-md transition-all duration-500 z-20 text-center pointer-events-none select-none ${gameState.interactionCount > 0 || isIntro ? 'opacity-0 translate-y-[-20px]' : 'opacity-100'}`}>
        <p className="text-xs font-medium tracking-wide">CLICK TO SELECT • CLICK AGAIN TO MOVE</p>
      </div>
      {gameState.playerHp <= 0 && (
        <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center text-white animate-in fade-in duration-1000">
            <Skull size={64} className="text-red-600 mb-6 animate-bounce" />
            <h2 className="text-4xl font-bold text-red-500 mb-2">YOU DIED</h2>
            <p className="text-slate-500 mb-8">Your journey ends here.</p>
            <button onClick={handleRegenerate} className="bg-white text-black px-8 py-3 rounded-full font-bold hover:bg-gray-200 transition-colors flex items-center gap-2"><RefreshCw size={20} /> Respawn</button>
        </div>
      )}
      {gameState.gameWon && (
        <div className="absolute inset-0 z-50 bg-blue-950/90 flex flex-col items-center justify-center text-white animate-in fade-in duration-1000">
            <Trophy size={64} className="text-yellow-400 mb-6 animate-bounce" />
            <h2 className="text-4xl font-bold text-yellow-400 mb-2">ESCAPED!</h2>
            <p className="text-blue-200 mb-8 text-center max-w-md leading-relaxed">The engine roars to life. You leave the strange forest behind, but the mystery of the Golems remains.</p>
            <button onClick={onExit} className="bg-white text-black px-8 py-3 rounded-full font-bold hover:bg-gray-200 transition-colors flex items-center gap-2"><LogOut size={20} /> Return to Menu</button>
        </div>
      )}
      <InventoryUI inventory={gameState.inventory} isOpen={gameState.inventoryOpen} onToggle={toggleInventory} onUseItem={handleUseItem} onDropItem={handleDropItem} />
      <CraftingUI inventory={gameState.inventory} isOpen={gameState.craftingOpen} onToggle={toggleCrafting} onCraft={handleCraft} />
      <QuestLog quests={gameState.quests} isOpen={gameState.questLogOpen} onToggle={toggleQuestLog} />
      <SettingsUI settings={gameState.gameSettings} isOpen={gameState.settingsOpen} onClose={toggleSettings} onUpdate={handleSettingsUpdate} />
      <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-end gap-4 pointer-events-auto transition-opacity duration-500 ${isIntro && !gameStarted ? 'opacity-0 translate-y-10' : 'opacity-100 translate-y-0'}`}>
         <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 p-2 rounded-2xl flex gap-2 shadow-2xl">
            <button onClick={toggleInventory} className={`p-3 rounded-xl transition-all ${gameState.inventoryOpen ? 'bg-blue-600 text-white shadow-lg scale-105' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}><Package size={24} strokeWidth={1.5} /></button>
            <button onClick={toggleCrafting} className={`p-3 rounded-xl transition-all ${gameState.craftingOpen ? 'bg-orange-600 text-white shadow-lg scale-105' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}><Hammer size={24} strokeWidth={1.5} /></button>
            <button onClick={toggleQuestLog} className={`p-3 rounded-xl transition-all relative ${gameState.questLogOpen ? 'bg-yellow-600 text-white shadow-lg scale-105' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}><Scroll size={24} strokeWidth={1.5} />{gameState.quests.some(q => q.completed) && <span className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full animate-pulse" />}</button>
            <div className="w-px bg-slate-700/50 mx-1"></div>
            <button onClick={toggleCamera} className={`p-3 rounded-xl transition-all ${cameraMode !== 'top-down' ? 'text-purple-400 hover:text-purple-300' : 'text-slate-400 hover:text-white'}`} title="Change Camera">{cameraMode === 'top-down' ? <Camera size={24} strokeWidth={1.5} /> : <User size={24} strokeWidth={1.5} />}</button>
            <button onClick={handleRegenerate} className="p-3 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-all" title="Regenerate"><Map size={24} strokeWidth={1.5} /></button>
         </div>
      </div>
      <Canvas shadows={gameState.gameSettings.shadowsEnabled} dpr={[1, 1.5]}>
        <TimeController 
            initialTime={gameState.timeOfDay} 
            daySpeed={gameState.gameSettings.daySpeed} 
            weather={gameState.weather}
            weatherIntensity={gameState.weatherIntensity}
            onTimeUpdate={handleTimeUpdate}
        />
        <ParticleSystem />
        <OrbitControls makeDefault enablePan={true} enabled={true} />
        <CameraFollower target={playerRef} mode={cameraMode} facing={gameState.playerFacing} isIntro={isIntro} gameStarted={gameStarted} />
        <Effects shakeIntensity={gameState.shakeIntensity} quality={gameState.gameSettings.particleQuality} weather={gameState.weather} weatherIntensity={gameState.weatherIntensity} playerPos={gameState.playerPos} />
        <group>
          <PathLine points={pathPoints} />
          {gameState.pendingTarget && <DestinationMarker position={gameState.pendingTarget} />}
          <WorldRenderer grid={gameState.grid} onTileClick={handleTileClick} />
          <InstancedObjects grid={gameState.grid} playerPos={gameState.playerPos} handleTileClick={handleTileClick} />
          {tiles.map(tile => {
            if (tile.decoration === 'car') return <Car key={`car-${tile.x}-${tile.y}`} position={[tile.x, tile.height, tile.y]} rotation={tile.rotation} playerPos={gameState.playerPos} />;
            if (tile.type === TileType.HOUSE) return <House key={`h-${tile.x}-${tile.y}`} position={[tile.x, tile.height, tile.y]} style={tile.style} rotation={tile.rotation} looted={tile.decorationActive} playerPos={gameState.playerPos} onClick={() => handleTileClick(tile.x, tile.y)} />;
            if (tile.decoration === 'lamp') return <StreetLamp key={`l-${tile.x}-${tile.y}`} position={[tile.x, tile.height, tile.y]} active={tile.decorationActive && isDark} onClick={() => toggleLamp(tile.x, tile.y)} playerPos={gameState.playerPos} />;
            if (tile.decoration === 'cave') return <CaveEntrance key={`c-${tile.x}-${tile.y}`} position={[tile.x, tile.height, tile.y]} rotation={tile.rotation} playerPos={gameState.playerPos} />;
            if (tile.decoration === 'bridge') return <Bridge key={`b-${tile.x}-${tile.y}`} position={[tile.x, tile.height, tile.y]} />;
            return null;
          })}
          {gameState.fishing.bobberPos && <Bobber position={gameState.fishing.bobberPos} alert={gameState.fishing.status === 'BITE'} />}
          {gameState.items.map(item => !item.collected && <ItemMesh key={item.id} type={item.type} position={[item.position.x, 0, item.position.z]} />)}
          {gameState.enemies.map(enemy => {
              if (enemy.dead) return null;
              const lx = enemy.position.x - gameState.worldOrigin.x; const lz = enemy.position.z - gameState.worldOrigin.z;
              let th = 0; if (lz >= 0 && lz < gameState.grid.length && lx >= 0 && lx < gameState.grid[0].length) th = gameState.grid[lz][lx].height;
              return <EnemyMesh key={enemy.id} enemy={enemy} terrainHeight={th} onClick={() => handleTileClick(enemy.position.x, enemy.position.z)} />;
          })}
          {gameState.npcs.map(npc => <NPCMesh key={npc.id} npc={npc} onClick={() => handleTileClick(npc.position.x, npc.position.z)} playerPos={gameState.playerPos} />)}
          {gameState.playerHp > 0 && <Player innerRef={playerRef} position={gameState.playerPos} path={gameState.path} onMoveComplete={handleMoveComplete} onPositionUpdate={handlePositionUpdate} onItemCollect={handleItemCollect} grid={gameState.grid} worldOrigin={gameState.worldOrigin} visible={true} config={playerConfig} onClick={toggleInventory} timeOfDay={gameState.timeOfDay} weather={gameState.weather} />}
        </group>
        <ContactShadows opacity={0.4} scale={100} blur={2} far={10} resolution={256} color="#000000" />
        <EffectComposer enableNormalPass>
            <N8AO halfRes color="black" aoRadius={2} intensity={0.6} distanceFalloff={2} screenSpaceRadius={false} />
            <Bloom luminanceThreshold={1} mipmapBlur intensity={0.6} radius={0.4} />
            <Vignette eskil={false} offset={0.1} darkness={0.9} />
        </EffectComposer>
      </Canvas>
    </div>
  );
};
