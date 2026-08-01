import { CONFIG } from "../config.js";

export function worldToTile(x, y) {
  return {
    tileX: Math.floor(x / CONFIG.TILE_SIZE),
    tileY: Math.floor(y / CONFIG.TILE_SIZE)
  };
}

export function tileToWorld(tileX, tileY) {
  return {
    x: tileX * CONFIG.TILE_SIZE,
    y: tileY * CONFIG.TILE_SIZE
  };
}

export function worldToScreen(worldX, worldY, camera) {
  return {
    x: Math.round(worldX - camera.x),
    y: Math.round(worldY - camera.y)
  };
}

export function screenToWorld(screenX, screenY, camera, canvas) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (screenX - rect.left) * scaleX + camera.x,
    y: (screenY - rect.top) * scaleY + camera.y
  };
}

export function tileKey(tileX, tileY) {
  return `${tileX},${tileY}`;
}
