import { GridNode, Position } from '../types';

interface Node {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: Node | null;
}

// Heuristic: Manhattan distance
const heuristic = (a: Position, b: Position) => {
  return Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
};

export const findPath = (
  grid: GridNode[][],
  start: Position,
  end: Position
): Position[] => {
  const rows = grid.length;
  const cols = grid[0].length;

  // Validate bounds
  if (
    start.x < 0 || start.x >= cols || start.z < 0 || start.z >= rows ||
    end.x < 0 || end.x >= cols || end.z < 0 || end.z >= rows
  ) {
    return [];
  }

  // Ensure target is walkable
  if (!grid[end.z][end.x].walkable) {
    return []; 
  }

  const openList: Node[] = [];
  const closedList: boolean[][] = Array(rows).fill(false).map(() => Array(cols).fill(false));

  const startNode: Node = {
    x: start.x,
    y: start.z,
    g: 0,
    h: 0,
    f: 0,
    parent: null,
  };

  openList.push(startNode);

  while (openList.length > 0) {
    // Sort by F cost (lowest first)
    openList.sort((a, b) => a.f - b.f);
    const currentNode = openList.shift()!;

    // Found destination
    if (currentNode.x === end.x && currentNode.y === end.z) {
      const path: Position[] = [];
      let curr: Node | null = currentNode;
      while (curr) {
        path.push({ x: curr.x, z: curr.y });
        curr = curr.parent;
      }
      return path.reverse();
    }

    closedList[currentNode.y][currentNode.x] = true;

    const neighbors = [
      { x: 0, y: -1 }, // Up
      { x: 0, y: 1 },  // Down
      { x: -1, y: 0 }, // Left
      { x: 1, y: 0 },  // Right
    ];

    for (const offset of neighbors) {
      const neighborX = currentNode.x + offset.x;
      const neighborY = currentNode.y + offset.y;

      // Check bounds
      if (neighborX < 0 || neighborX >= cols || neighborY < 0 || neighborY >= rows) continue;

      // Check walkability
      if (!grid[neighborY][neighborX].walkable || closedList[neighborY][neighborX]) continue;

      const gScore = currentNode.g + 1;
      let neighborNode = openList.find(n => n.x === neighborX && n.y === neighborY);

      if (!neighborNode) {
        neighborNode = {
          x: neighborX,
          y: neighborY,
          g: gScore,
          h: heuristic({ x: neighborX, z: neighborY }, end),
          f: 0,
          parent: currentNode,
        };
        neighborNode.f = neighborNode.g + neighborNode.h;
        openList.push(neighborNode);
      } else if (gScore < neighborNode.g) {
        neighborNode.g = gScore;
        neighborNode.parent = currentNode;
        neighborNode.f = neighborNode.g + neighborNode.h;
      }
    }
  }

  return []; // No path found
};