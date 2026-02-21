import React, { useEffect, useRef } from 'react';
import { GameState, TileType, BiomeType } from '../types';
import { Terminal, MapPin, Activity, Clock, Cpu, Compass, Footprints } from 'lucide-react';

interface Props {
  gameState: GameState;
}

const TILE_NAMES: Record<TileType, string> = {
    [TileType.GRASS]: 'GRASS',
    [TileType.ROAD]: 'ROAD',
    [TileType.HOUSE]: 'STRUCT_HOUSE',
    [TileType.TREE]: 'VEGETATION_TREE',
    [TileType.WATER]: 'FLUID_WATER',
    [TileType.SAND]: 'SAND',
    [TileType.ROCK]: 'ROCK_FORMATION',
    [TileType.SNOW]: 'PERMAFROST',
    [TileType.STUMP]: 'ORGANIC_REMAINS',
    [TileType.BUSH]: 'VEGETATION_LOW',
    [TileType.PATH]: 'PATH_DIRT',
};

export const DebugOverlay: React.FC<Props> = ({ gameState }) => {
    const logContainerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll logs
    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [gameState.logs]);

    if (!gameState.gameSettings.showDebugLog) return null;

    const { playerPos, worldOrigin, grid, timeOfDay, biome, isMoving, playerFacing } = gameState;
    const localX = Math.round(playerPos.x - worldOrigin.x);
    const localZ = Math.round(playerPos.z - worldOrigin.z);
    
    let currentTile = 'UNKNOWN';
    let currentHeight = 0;

    if (localZ >= 0 && localZ < grid.length && localX >= 0 && localX < grid[0].length) {
        const t = grid[localZ][localX];
        currentTile = TILE_NAMES[t.type] || 'UNKNOWN';
        currentHeight = t.height;
    }

    const timeString = `${Math.floor(timeOfDay).toString().padStart(2, '0')}:${Math.floor((timeOfDay % 1) * 60).toString().padStart(2, '0')}`;
    
    // Calculate Heading
    let heading = "N";
    if (Math.abs(playerFacing.x) > Math.abs(playerFacing.z)) {
        heading = playerFacing.x > 0 ? "E" : "W";
    } else {
        heading = playerFacing.z > 0 ? "S" : "N";
    }

    return (
        <div className="absolute bottom-20 left-4 w-64 pointer-events-none flex flex-col gap-1 font-mono text-[9px] text-green-500/60 z-30">
            {/* System Status Panel - Compact */}
            <div className="bg-black/60 border border-green-500/10 p-1.5 rounded backdrop-blur-sm">
                <div className="grid grid-cols-2 gap-y-0.5">
                    <div className="flex items-center gap-1 opacity-50"><MapPin size={8} /> POS:</div>
                    <div className="text-right opacity-80">{playerPos.x.toFixed(0)}, {playerPos.z.toFixed(0)}</div>

                    <div className="flex items-center gap-1 opacity-50"><Activity size={8} /> BIO:</div>
                    <div className="text-right opacity-80">{biome.substring(0,3).toUpperCase()}</div>

                    <div className="flex items-center gap-1 opacity-50"><Activity size={8} /> SRF:</div>
                    <div className="text-right opacity-80">{currentTile}</div>

                    <div className="flex items-center gap-1 opacity-50"><Clock size={8} /> T_CYCLE:</div>
                    <div className="text-right opacity-80">{timeString}</div>

                    <div className="flex items-center gap-1 opacity-50"><Footprints size={8} /> STATE:</div>
                    <div className="text-right opacity-80">{isMoving ? 'MOVING' : 'IDLE'}</div>

                    <div className="flex items-center gap-1 opacity-50"><Compass size={8} /> HDG:</div>
                    <div className="text-right opacity-80">{heading}</div>
                </div>
            </div>

            {/* Event Log - Discrete */}
            <div className="bg-black/60 border border-green-500/10 p-1.5 rounded backdrop-blur-sm h-32 flex flex-col">
                <div ref={logContainerRef} className="flex-1 overflow-hidden flex flex-col justify-end gap-0.5 opacity-80">
                    {gameState.logs.slice(-6).map((log) => (
                        <div key={log.id} className="flex gap-1.5 leading-tight animate-in fade-in slide-in-from-left-1 duration-300">
                            <span className="opacity-30 text-[8px] min-w-[24px]">{log.timestamp.split(':').slice(1).join(':')}</span>
                            <span className={`truncate ${log.type === 'COMBAT' ? 'text-red-400/80' : (log.type === 'LOOT' ? 'text-yellow-400/80' : 'text-green-300/80')}`}>
                                {log.message}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};