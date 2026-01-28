import React, { useRef, useEffect } from 'react';
import { GameState, TileType } from '../types';
import { COLORS } from '../constants';

interface MinimapProps {
    gameState: GameState;
}

export const Minimap: React.FC<MinimapProps> = ({ gameState }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const SIZE = 140; 
    const ZOOM = 5; // px per tile

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { playerPos, worldOrigin, grid, items, enemies } = gameState;

        // Clear Background
        ctx.fillStyle = '#0f172a'; // slate-950
        ctx.fillRect(0, 0, SIZE, SIZE);

        const range = Math.ceil((SIZE / ZOOM) / 2);
        const centerX = SIZE / 2;
        const centerY = SIZE / 2;

        // Clip to rounded corners
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, SIZE, SIZE);
        ctx.clip();

        // Draw Terrain
        for (let x = -range; x <= range; x++) {
            for (let z = -range; z <= range; z++) {
                const wX = Math.floor(playerPos.x) + x;
                const wZ = Math.floor(playerPos.z) + z;
                
                const gX = wX - worldOrigin.x;
                const gZ = wZ - worldOrigin.z;

                const cX = centerX + (x * ZOOM) - (ZOOM / 2);
                const cY = centerY + (z * ZOOM) - (ZOOM / 2);
                
                // Draw tile
                if (gZ >= 0 && gZ < grid.length && gX >= 0 && gX < grid[0].length) {
                    const tile = grid[gZ][gX];
                    let color = '#1e293b'; 

                    if (tile.walkable) {
                         if (tile.type === TileType.ROAD) color = '#64748b'; // Road
                         else if (tile.type === TileType.SAND) color = '#d97706'; // Darker sand
                         else if (tile.type === TileType.SNOW) color = '#cbd5e1'; 
                         else color = '#15803d'; // Grass
                    } else {
                         if (tile.type === TileType.WATER) color = '#1d4ed8';
                         else if (tile.type === TileType.ROCK) color = '#475569';
                         else if (tile.type === TileType.TREE) color = '#064e3b';
                         else if (tile.type === TileType.HOUSE) color = '#7f1d1d'; // Roof
                         else if (tile.type === TileType.BUSH) color = '#3f6212';
                    }
                    
                    ctx.fillStyle = color;
                    ctx.fillRect(cX, cY, ZOOM, ZOOM);
                }
            }
        }

        // Draw Items
        items.forEach(item => {
             if (item.collected) return;
             const dx = item.position.x - playerPos.x;
             const dz = item.position.z - playerPos.z;
             if (Math.abs(dx) <= range && Math.abs(dz) <= range) {
                 const cX = centerX + (dx * ZOOM) - 2;
                 const cY = centerY + (dz * ZOOM) - 2;
                 ctx.fillStyle = '#fbbf24'; 
                 ctx.fillRect(cX, cY, 4, 4);
             }
        });

        // Draw Enemies
        enemies.forEach(enemy => {
             if (enemy.dead) return;
             const dx = enemy.position.x - playerPos.x;
             const dz = enemy.position.z - playerPos.z;
             if (Math.abs(dx) <= range && Math.abs(dz) <= range) {
                 const cX = centerX + (dx * ZOOM) - 3;
                 const cY = centerY + (dz * ZOOM) - 3;
                 ctx.fillStyle = '#ef4444'; 
                 ctx.fillRect(cX, cY, 6, 6);
             }
        });

        // Draw Player Arrow
        ctx.save();
        ctx.translate(centerX, centerY);
        // Calculate rotation based on facing vector
        const angle = Math.atan2(gameState.playerFacing.x, gameState.playerFacing.z);
        // Standardize: Z+ is down on canvas. Facing {x:0, z:1} means angle 0. Arrow points down.
        // If facing {x:1, z:0}, angle PI/2. Arrow points right.
        ctx.rotate(-angle); // Invert rotation for canvas coordinate system vs world
        
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(5, 6);
        ctx.lineTo(0, 4);
        ctx.lineTo(-5, 6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        ctx.restore();
        ctx.restore();

        // Border Overlay
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 4;
        ctx.strokeRect(0, 0, SIZE, SIZE);

    }, [gameState]);

    return (
        <canvas 
            ref={canvasRef} 
            width={SIZE} 
            height={SIZE} 
            className="rounded-xl shadow-2xl border border-slate-600 bg-slate-900/90 backdrop-blur"
        />
    );
};