import { CONFIG } from "../config.js?v=terrain-inventory-4";

const STEP_HEIGHT = CONFIG.TILE_SIZE * 0.6;

export function moveWithCollision(entity, collisionWorld, dt) {
  let onGround = false;
  let landed = false;
  const previousVy = entity.vy;
  const previousX = entity.x;
  const previousY = entity.y;

  entity.x += entity.vx * dt;
  for (const rect of queryOverlappingSolidRects(entity, collisionWorld)) {
    if (!intersects(entity.bounds, rect)) continue;
    if (entity.onGround && canStepOnto(entity, rect, collisionWorld)) {
      entity.y = rect.y - entity.height;
      onGround = true;
      continue;
    }
    if (entity.vx > 0 && previousX + entity.width <= rect.x + 0.001) entity.x = rect.x - entity.width;
    else if (entity.vx < 0 && previousX >= rect.x + rect.width - 0.001) entity.x = rect.x + rect.width;
    else continue;
    entity.vx = 0;
  }

  entity.y += entity.vy * dt;
  for (const rect of queryOverlappingSolidRects(entity, collisionWorld)) {
    if (!intersects(entity.bounds, rect)) continue;
    const topPenetration = entity.y + entity.height - rect.y;
    if (entity.vy > 0 && (previousY + entity.height <= rect.y + 0.001 || topPenetration <= STEP_HEIGHT)) {
      entity.y = rect.y - entity.height;
      onGround = true;
      landed = previousVy > 0;
    } else if (entity.vy < 0 && previousY >= rect.y + rect.height - 0.001) {
      entity.y = rect.y + rect.height;
    } else continue;
    entity.vy = 0;
  }

  return { onGround, landed };
}

function canStepOnto(entity, rect, collisionWorld) {
  const footY = entity.y + entity.height;
  const stepHeight = footY - rect.y;
  if (stepHeight <= 0 || stepHeight > STEP_HEIGHT) return false;
  const steppedBounds = {
    x: entity.x,
    y: rect.y - entity.height,
    width: entity.width,
    height: entity.height
  };
  return querySolidRectsForBounds(steppedBounds, collisionWorld).every((solid) => !intersects(steppedBounds, solid));
}

function queryOverlappingSolidRects(entity, collisionWorld) {
  return querySolidRectsForBounds(entity.bounds, collisionWorld);
}

function querySolidRectsForBounds(bounds, collisionWorld) {
  if (typeof collisionWorld.querySolidRects === "function") {
    return collisionWorld.querySolidRects(bounds);
  }
  return queryOverlappingSolidTiles(bounds, collisionWorld).map((tile) => tileRect(tile.tileX, tile.tileY));
}

function queryOverlappingSolidTiles(bounds, collisionWorld) {
  const minX = Math.floor(bounds.x / CONFIG.TILE_SIZE) - 1;
  const maxX = Math.floor((bounds.x + bounds.width) / CONFIG.TILE_SIZE) + 1;
  const minY = Math.floor(bounds.y / CONFIG.TILE_SIZE) - 1;
  const maxY = Math.floor((bounds.y + bounds.height) / CONFIG.TILE_SIZE) + 1;
  const tiles = [];
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (collisionWorld.isSolidTile?.(x, y)) tiles.push({ tileX: x, tileY: y });
    }
  }
  return tiles;
}

function tileRect(tileX, tileY) {
  return {
    x: tileX * CONFIG.TILE_SIZE,
    y: tileY * CONFIG.TILE_SIZE,
    width: CONFIG.TILE_SIZE,
    height: CONFIG.TILE_SIZE
  };
}

function intersects(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
