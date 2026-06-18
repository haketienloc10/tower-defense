import { isInsideGrid, type GridCoord } from "./iso";

export interface FlowFieldInput {
  width: number;
  height: number;
  home: GridCoord;
  blockers: readonly GridCoord[];
}

export interface FlowField {
  width: number;
  height: number;
  home: GridCoord;
  distanceAt(coord: GridCoord): number | null;
}

const DIRECTIONS: readonly GridCoord[] = [
  { gx: 1, gy: 0 },
  { gx: 0, gy: -1 },
  { gx: 0, gy: 1 },
  { gx: -1, gy: 0 },
];

export function createFlowField(input: FlowFieldInput): FlowField {
  const distances = Array.from({ length: input.height }, () =>
    Array<number | null>(input.width).fill(null),
  );
  const blocked = new Set(input.blockers.map(coordKey));
  const queue: GridCoord[] = [];

  if (!blocked.has(coordKey(input.home))) {
    distances[input.home.gy][input.home.gx] = 0;
    queue.push(input.home);
  }

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    const currentDistance = distances[current.gy][current.gx];
    if (currentDistance === null) continue;

    for (const direction of DIRECTIONS) {
      const next = {
        gx: current.gx + direction.gx,
        gy: current.gy + direction.gy,
      };
      if (!isInsideGrid(next, input.width, input.height)) continue;
      if (blocked.has(coordKey(next))) continue;
      if (distances[next.gy][next.gx] !== null) continue;
      distances[next.gy][next.gx] = currentDistance + 1;
      queue.push(next);
    }
  }

  return {
    width: input.width,
    height: input.height,
    home: input.home,
    distanceAt(coord) {
      if (!isInsideGrid(coord, input.width, input.height)) return null;
      return distances[coord.gy][coord.gx];
    },
  };
}

export function nextFlowStep(
  field: FlowField,
  from: GridCoord,
): GridCoord | null {
  const currentDistance = field.distanceAt(from);
  if (currentDistance === null || currentDistance === 0) return null;

  let best: GridCoord | null = null;
  let bestDistance = currentDistance;
  for (const direction of DIRECTIONS) {
    const candidate = {
      gx: from.gx + direction.gx,
      gy: from.gy + direction.gy,
    };
    const distance = field.distanceAt(candidate);
    if (distance === null || distance >= bestDistance) continue;
    best = candidate;
    bestDistance = distance;
  }

  return best;
}

function coordKey(coord: GridCoord): string {
  return `${coord.gx},${coord.gy}`;
}
