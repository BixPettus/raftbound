import { CONFIG } from "../../config.js";
import { contextIndex } from "./generation-context.js";

const WALK_STEP_DOWN = 3;
const FALL_SCAN = 18;
const JUMP_ARCS = [
  { dx: -5, peak: -4 },
  { dx: -4, peak: -4 },
  { dx: -3, peak: -4 },
  { dx: -2, peak: -3 },
  { dx: -1, peak: -3 },
  { dx: 1, peak: -3 },
  { dx: 2, peak: -3 },
  { dx: 3, peak: -4 },
  { dx: 4, peak: -4 },
  { dx: 5, peak: -4 }
];

const fitCaches = new WeakMap();

export function buildTraversalGrid(context, starts) {
  const reachable = new Uint8Array(context.definition.width * context.definition.height);
  const queue = [];
  const enqueue = (x, y) => {
    if (!canOccupyTraversalState(context, x, y)) return false;
    const index = contextIndex(context, x, y);
    if (reachable[index]) return false;
    reachable[index] = 1;
    queue.push([x, y]);
    return true;
  };

  fitCaches.set(context, new Int8Array(context.definition.width * context.definition.height).fill(-1));
  try {
    starts.forEach(({ tileX, tileY }) => enqueue(tileX, tileY));
    for (let i = 0; i < queue.length; i += 1) {
      const [x, y] = queue[i];
      for (const next of getTransitions(context, x, y)) enqueue(next.x, next.y);
    }
  } finally {
    fitCaches.delete(context);
  }
  return reachable;
}

export function canStand(context, tileX, tileY) {
  return canFit(context, tileX, tileY) && hasFloor(context, tileX, tileY);
}

export function canFit(context, tileX, tileY) {
  const widthTiles = colliderWidthTiles();
  const heightTiles = colliderHeightTiles();
  if (tileX < 0 || tileY < 0 || tileX + widthTiles > context.definition.width || tileY + heightTiles > context.definition.height) return false;
  const cache = fitCaches.get(context);
  const index = cache ? contextIndex(context, tileX, tileY) : -1;
  if (cache && cache[index] !== -1) return cache[index] === 1;
  for (let y = tileY; y < tileY + heightTiles; y += 1) {
    for (let x = tileX; x < tileX + widthTiles; x += 1) {
      if (context.tileMap.isSolidTile(x, y)) {
        if (cache) cache[index] = 0;
        return false;
      }
    }
  }
  if (cache) cache[index] = 1;
  return true;
}

export function sweptColliderClear(context, fromX, fromY, toX, toY) {
  const steps = Math.max(1, Math.ceil(Math.hypot(toX - fromX, toY - fromY) * 2));
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const x = Math.round(fromX + (toX - fromX) * t);
    const y = Math.round(fromY + (toY - fromY) * t);
    if (!canFit(context, x, y)) return false;
  }
  return true;
}

export function isReachable(reachable, context, tileX, tileY) {
  return context.tileMap.inBounds(tileX, tileY) && reachable[contextIndex(context, tileX, tileY)] === 1;
}

function getTransitions(context, x, y) {
  const transitions = [];
  const inWater = isInWater(context, x, y);

  for (const dx of [-1, 1]) {
    const walked = resolveWalkOrFall(context, x, y, x + dx, y);
    if (walked && sweptColliderClear(context, x, y, walked.x, walked.y)) transitions.push(walked);
  }

  const fallen = resolveFall(context, x, y + 1, FALL_SCAN);
  if (fallen && sweptColliderClear(context, x, y, fallen.x, fallen.y)) transitions.push(fallen);

  for (const arc of JUMP_ARCS) {
    const jumped = resolveJumpArc(context, x, y, arc.dx, arc.peak);
    if (jumped) transitions.push(jumped);
  }

  if (inWater) {
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (isInWater(context, nx, ny) && sweptColliderClear(context, x, y, nx, ny)) transitions.push({ x: nx, y: ny });
      }
    }
  }

  return transitions;
}

function resolveWalkOrFall(context, fromX, fromY, targetX, targetY) {
  for (let stepUp = 0; stepUp <= 1; stepUp += 1) {
    const y = targetY - stepUp;
    if (!canFit(context, targetX, y)) continue;
    const fallen = resolveFall(context, targetX, y, WALK_STEP_DOWN);
    if (fallen && sweptColliderClear(context, fromX, fromY, targetX, y)) return fallen;
  }
  return null;
}

function resolveFall(context, x, startY, maxFall) {
  for (let y = startY; y <= startY + maxFall; y += 1) {
    if (!canFit(context, x, y)) return null;
    if (canStand(context, x, y) || isInWater(context, x, y)) return { x, y };
  }
  return null;
}

function resolveJumpArc(context, x, y, dx, peak) {
  const endX = x + dx;
  for (let landingY = y - 5; landingY <= y + 5; landingY += 1) {
    if (!jumpPathClear(context, x, y, endX, landingY, peak)) continue;
    if (canStand(context, endX, landingY) || isInWater(context, endX, landingY)) return { x: endX, y: landingY };
    const fallen = resolveFall(context, endX, landingY + 1, 8);
    if (fallen && sweptColliderClear(context, endX, landingY, fallen.x, fallen.y)) return fallen;
  }
  return null;
}

function jumpPathClear(context, fromX, fromY, toX, toY, peak) {
  const steps = Math.max(8, Math.ceil(Math.hypot(toX - fromX, toY - fromY) * 3));
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const x = Math.round(fromX + (toX - fromX) * t);
    const baselineY = fromY + (toY - fromY) * t;
    const y = Math.round(baselineY + Math.sin(t * Math.PI) * peak);
    if (!canFit(context, x, y)) return false;
  }
  return true;
}

function hasFloor(context, tileX, tileY) {
  const floorY = tileY + colliderHeightTiles();
  for (let x = tileX; x < tileX + colliderWidthTiles(); x += 1) {
    if (context.tileMap.inBounds(x, floorY) && context.tileMap.isSolidTile(x, floorY)) return true;
  }
  return false;
}

function isInWater(context, tileX, tileY) {
  if (!canFit(context, tileX, tileY)) return false;
  const bodyY = tileY + colliderHeightTiles() - 1;
  for (let x = tileX; x < tileX + colliderWidthTiles(); x += 1) {
    if (context.tileMap.isWaterTile(x, bodyY)) return true;
  }
  return false;
}

function canOccupyTraversalState(context, tileX, tileY) {
  return canStand(context, tileX, tileY) || isInWater(context, tileX, tileY);
}

function colliderWidthTiles() {
  return Math.ceil(CONFIG.PLAYER_WIDTH / CONFIG.TILE_SIZE);
}

function colliderHeightTiles() {
  return Math.ceil(CONFIG.PLAYER_HEIGHT / CONFIG.TILE_SIZE);
}
