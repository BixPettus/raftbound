import { CONFIG } from "../config.js?v=terrain-inventory-4";
import { getTileDefinition } from "../world/tile-registry.js";
import { getStructureDefinition } from "../raft/structure-registry.js";
import { worldToScreen, worldToTile } from "../world/coordinates.js";
import { GAME_STATES } from "./game-state.js";
import { getItemDefinition } from "../items/item-registry.js";

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.ctx.imageSmoothingEnabled = false;
  }

  render(game, alpha = 1) {
    const ctx = this.ctx;
    const ratio = game.camera.devicePixelRatio || 1;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.imageSmoothingEnabled = false;
    const renderGame = {
      ...game,
      camera: game.camera.getPresentationState(alpha),
      canvas: {
        ...game.canvas,
        width: game.camera.logicalWidth,
        height: game.camera.logicalHeight
      }
    };
    const biome = game.currentBiome;
    ctx.clearRect(0, 0, renderGame.canvas.width, renderGame.canvas.height);
    drawSky(ctx, renderGame.canvas, biome?.palette?.sky ?? "#84d2ef");
    drawOcean(ctx, renderGame);
    drawTiles(ctx, renderGame);
    drawRaft(ctx, renderGame);
    drawRaftBlocks(ctx, renderGame);
    drawWaterOverlay(ctx, renderGame);
    drawItemDrops(ctx, renderGame);
    drawResources(ctx, renderGame);
    drawEnemies(ctx, renderGame);
    drawInteractionHighlights(ctx, renderGame);
    drawPlayer(ctx, renderGame, alpha);
    drawBuildPreview(ctx, renderGame);
    drawPrompts(ctx, renderGame);
  }
}

function drawSky(ctx, canvas, color) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(255,255,255,0.42)";
  ctx.fillRect(80, 70, 92, 12);
  ctx.fillRect(210, 42, 130, 10);
}

function drawOcean(ctx, game) {
  const y = Math.round(game.world.waterSystem.seaLevelY - game.camera.y);
  ctx.fillStyle = "#247baa";
  ctx.fillRect(0, y, game.canvas.width, game.canvas.height - y);
  ctx.globalAlpha = 0.38;
  ctx.strokeStyle = "#9bd7ea";
  ctx.lineWidth = 2;
  for (let x = -64; x < game.canvas.width + 64; x += 64) {
    const waveY = y + 10 + Math.sin(game.world.waterSystem.animationTime * 2 + x * 0.04) * 4;
    ctx.beginPath();
    ctx.moveTo(x, waveY);
    ctx.lineTo(x + 28, waveY - 4);
    ctx.lineTo(x + 56, waveY);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawWaterOverlay(ctx, game) {
  const y = Math.round(game.world.waterSystem.seaLevelY - game.camera.y);
  ctx.save();
  ctx.globalAlpha = 0.24;
  ctx.fillStyle = "#247baa";
  ctx.fillRect(0, y, game.canvas.width, game.canvas.height - y);
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = "#9bd7ea";
  ctx.lineWidth = 2;
  for (let x = -64; x < game.canvas.width + 64; x += 64) {
    const waveY = y + 4 + Math.sin(game.world.waterSystem.animationTime * 2 + x * 0.04) * 3;
    ctx.beginPath();
    ctx.moveTo(x, waveY);
    ctx.lineTo(x + 28, waveY - 3);
    ctx.lineTo(x + 56, waveY);
    ctx.stroke();
  }
  ctx.restore();
}

function drawTiles(ctx, game) {
  const map = game.world.tileMap;
  const minX = Math.max(0, Math.floor(game.camera.x / CONFIG.TILE_SIZE) - 1);
  const maxX = Math.min(map.width - 1, Math.ceil((game.camera.x + game.canvas.width) / CONFIG.TILE_SIZE) + 1);
  const minY = Math.max(0, Math.floor(game.camera.y / CONFIG.TILE_SIZE) - 1);
  const maxY = Math.min(map.height - 1, Math.ceil((game.camera.y + game.canvas.height) / CONFIG.TILE_SIZE) + 1);

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const tileId = map.getTile(x, y);
      if (tileId === "air") continue;
      const tile = getTileDefinition(tileId);
      const screen = worldToScreen(x * CONFIG.TILE_SIZE, y * CONFIG.TILE_SIZE, game.camera);
      ctx.fillStyle = tile.renderStyle.color;
      ctx.fillRect(screen.x, screen.y, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
      ctx.fillStyle = tile.renderStyle.edge ?? "rgba(0,0,0,0.2)";
      ctx.fillRect(screen.x, screen.y, CONFIG.TILE_SIZE, 3);
      if ((x + y) % 3 === 0) ctx.fillRect(screen.x + 9, screen.y + 17, 5, 3);
    }
  }
}

function drawRaft(ctx, game) {
  for (const structure of game.raft.structures) {
    const def = getStructureDefinition(structure.structureType);
    const pos = game.raft.gridToWorld(structure.gridX, structure.gridY);
    const screen = worldToScreen(pos.x, pos.y, game.camera);
    if (structure.structureType === "sail") {
      ctx.fillStyle = "#5a3920";
      ctx.fillRect(screen.x + 13, screen.y, 6, CONFIG.TILE_SIZE * 2);
      ctx.fillStyle = "#efe5c6";
      ctx.beginPath();
      ctx.moveTo(screen.x + 18, screen.y + 4);
      ctx.lineTo(screen.x + 56, screen.y + 34);
      ctx.lineTo(screen.x + 18, screen.y + 62);
      ctx.closePath();
      ctx.fill();
      continue;
    }
    if (structure.structureType === "storage_crate") {
      ctx.fillStyle = "#7b4b25";
      ctx.fillRect(screen.x + 3, screen.y + 8, 26, 22);
      ctx.strokeStyle = "#d09b5e";
      ctx.strokeRect(screen.x + 3, screen.y + 8, 26, 22);
      continue;
    }
    if (structure.structureType === "workbench") {
      ctx.fillStyle = "#6b4424";
      ctx.fillRect(screen.x + 2, screen.y + 13, 28, 12);
      ctx.fillRect(screen.x + 6, screen.y + 24, 5, 12);
      ctx.fillRect(screen.x + 22, screen.y + 24, 5, 12);
      continue;
    }
    ctx.fillStyle = structure.structureType === "wood_wall" ? "#8b582d" : "#9b6b38";
    ctx.fillRect(screen.x, screen.y, def.width * CONFIG.TILE_SIZE, def.height * CONFIG.TILE_SIZE);
    ctx.strokeStyle = "#59361b";
    ctx.strokeRect(screen.x + 0.5, screen.y + 0.5, def.width * CONFIG.TILE_SIZE - 1, def.height * CONFIG.TILE_SIZE - 1);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(screen.x + 4, screen.y + 10, CONFIG.TILE_SIZE - 8, 3);
  }
}

function drawRaftBlocks(ctx, game) {
  for (const block of game.raft.serializeBlocks?.() ?? []) {
    const tile = getTileDefinition(block.tileId);
    const pos = game.raft.gridToWorld(block.gridX, block.gridY);
    const screen = worldToScreen(pos.x, pos.y, game.camera);
    ctx.fillStyle = tile.renderStyle.color;
    ctx.fillRect(screen.x, screen.y, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
    ctx.fillStyle = tile.renderStyle.edge ?? "rgba(0,0,0,0.2)";
    ctx.fillRect(screen.x, screen.y, CONFIG.TILE_SIZE, 3);
  }
}

function drawItemDrops(ctx, game) {
  for (const drop of game.world.island?.itemDrops ?? []) {
    if (drop.destroyed) continue;
    const screen = worldToScreen(drop.x, drop.y, game.camera);
    ctx.fillStyle = "#f3dc79";
    ctx.fillRect(Math.round(screen.x), Math.round(screen.y), drop.width, drop.height);
    ctx.strokeStyle = "#6b4c1c";
    ctx.strokeRect(Math.round(screen.x) + 0.5, Math.round(screen.y) + 0.5, drop.width - 1, drop.height - 1);
  }
}

function drawResources(ctx, game) {
  for (const node of game.world.island?.resources ?? []) {
    if (node.destroyed) continue;
    const screen = worldToScreen(node.x, node.y, game.camera);
    if (node.type === "tree") {
      ctx.fillStyle = "#6e4628";
      ctx.fillRect(screen.x + node.width * 0.43, screen.y + node.height * 0.38, node.width * 0.18, node.height * 0.62);
      ctx.fillStyle = "#2f7a3f";
      ctx.fillRect(screen.x, screen.y + node.height * 0.13, node.width, node.height * 0.28);
      ctx.fillStyle = "#3f9650";
      ctx.fillRect(screen.x + node.width * 0.18, screen.y, node.width * 0.64, node.height * 0.22);
      ctx.fillStyle = "#276b36";
      ctx.fillRect(screen.x + node.width * 0.08, screen.y + node.height * 0.28, node.width * 0.32, node.height * 0.16);
      ctx.fillRect(screen.x + node.width * 0.58, screen.y + node.height * 0.24, node.width * 0.34, node.height * 0.18);
    } else if (node.type === "surface_stone") {
      ctx.fillStyle = "#8b9297";
      ctx.fillRect(screen.x + 3, screen.y + 7, node.width - 6, node.height - 7);
      ctx.fillStyle = "#62686e";
      ctx.fillRect(screen.x + node.width * 0.44, screen.y + 2, node.width * 0.36, 9);
    } else {
      ctx.fillStyle = "#5fc779";
      ctx.fillRect(screen.x + node.width * 0.25, screen.y + 10, 6, node.height - 10);
      ctx.fillRect(screen.x + node.width * 0.62, screen.y, 6, node.height);
      ctx.fillRect(screen.x + node.width * 0.42, screen.y + node.height * 0.48, 14, 6);
    }
  }
}

function drawEnemies(ctx, game) {
  for (const enemy of game.world.island?.enemies ?? []) {
    if (enemy.destroyed) continue;
    const screen = worldToScreen(enemy.x, enemy.y, game.camera);
    ctx.fillStyle = enemy.state === "HURT" ? "#f1c15d" : "#933f39";
    ctx.fillRect(screen.x, screen.y + 4, enemy.width, enemy.height - 4);
    ctx.fillStyle = "#f2e5b8";
    ctx.fillRect(screen.x + (enemy.direction > 0 ? 21 : 5), screen.y + 8, 4, 4);
  }
}

function drawPlayer(ctx, game, alpha = 1) {
  const player = game.player;
  const renderPosition = player.getRenderPosition?.(alpha) ?? { x: player.x, y: player.y };
  const screen = worldToScreen(renderPosition.x, renderPosition.y, game.camera);
  const state = player.getAnimationState();
  const selected = player.hotbar.getSelectedHotbarItem();
  const selectedItem = selected ? getItemDefinition(selected.itemId) : null;
  const baseX = Math.round(screen.x + player.width / 2);
  const baseY = Math.round(screen.y + player.height);
  const runCycle = Math.sin(player.animationTime * 13);
  const swimCycle = Math.sin(player.animationTime * 9);
  const bob = state === "run" ? Math.round(Math.abs(runCycle) * -2) : state === "swim" ? Math.round(swimCycle * 2) : 0;
  const playerActionProgress = player.actionController?.animationProgress() ?? (player.actionTimer > 0 ? 1 - player.actionTimer / CONFIG.PLAYER_ACTION_SECONDS : 0);
  const actionProgress = playerActionProgress;
  const visualScale = CONFIG.PLAYER_SPRITE_HEIGHT / 56;

  ctx.save();
  if (player.invulnerability > 0 && Math.floor(player.animationTime * 18) % 2 === 0) ctx.globalAlpha = 0.64;
  ctx.translate(baseX, baseY + Math.round(bob * visualScale));
  ctx.scale(player.facing * visualScale, visualScale);

  drawLegs(ctx, state, runCycle, swimCycle);
  drawBody(ctx, state);
  drawArms(ctx, state, runCycle, selectedItem, actionProgress);
  drawHead(ctx, state, player.hurtTimer > 0);
  drawHeldTool(ctx, selectedItem, state, actionProgress);
  drawActionStreak(ctx, selectedItem, actionProgress);

  ctx.restore();
}

function drawLegs(ctx, state, runCycle, swimCycle) {
  const stride = state === "run" ? Math.round(runCycle * 4) : 0;
  const swim = state === "swim" ? Math.round(swimCycle * 4) : 0;
  const trouser = "#263a56";
  const boot = "#171d22";
  if (state === "swim") {
    ctx.fillStyle = trouser;
    ctx.fillRect(-8, -15 + swim, 7, 15);
    ctx.fillRect(2, -15 - swim, 7, 15);
    ctx.fillStyle = "#d2b45d";
    ctx.fillRect(-11, -2 + swim, 10, 4);
    ctx.fillRect(2, -2 - swim, 10, 4);
    return;
  }
  ctx.fillStyle = trouser;
  ctx.fillRect(-8 + stride, -21, 7, 18);
  ctx.fillRect(2 - stride, -21, 7, 18);
  ctx.fillStyle = boot;
  ctx.fillRect(-10 + stride, -5, 10, 5);
  ctx.fillRect(2 - stride, -5, 10, 5);
}

function drawBody(ctx, state) {
  const crouch = state === "hurt" ? 2 : 0;
  ctx.fillStyle = "#102128";
  ctx.fillRect(-10, -38 + crouch, 20, 20);
  ctx.fillStyle = "#2d8092";
  ctx.fillRect(-8, -38 + crouch, 16, 18);
  ctx.fillStyle = "#f0c36a";
  ctx.fillRect(-8, -30 + crouch, 16, 3);
  ctx.fillStyle = "#1b5263";
  ctx.fillRect(4, -37 + crouch, 4, 17);
}

function drawArms(ctx, state, runCycle, selectedItem, actionProgress) {
  const arm = "#c98b61";
  const sleeve = "#245f70";
  const acting = selectedItem && actionProgress > 0;
  const swing = state === "run" && !acting ? Math.round(runCycle * 3) : 0;
  const actionLift = selectedItem && actionProgress > 0 ? Math.round(Math.sin(actionProgress * Math.PI) * -17) : 0;
  const actionReach = selectedItem && actionProgress > 0 ? Math.round(Math.sin(actionProgress * Math.PI) * 8) : 0;
  ctx.fillStyle = sleeve;
  ctx.fillRect(-13, -35 - swing, 5, 13);
  ctx.fillRect(8 + actionReach, -34 + swing + actionLift, 5, 13);
  ctx.fillStyle = arm;
  ctx.fillRect(-14, -24 - swing, 5, 7);
  ctx.fillRect(9 + actionReach, -23 + swing + actionLift, 5, 7);
}

function drawHead(ctx, state, hurt) {
  const skin = hurt ? "#e9b06e" : "#c98b61";
  ctx.fillStyle = "#1a2024";
  ctx.fillRect(-7, -53, 14, 3);
  ctx.fillStyle = skin;
  ctx.fillRect(-7, -51, 14, 13);
  ctx.fillStyle = "#5f3826";
  ctx.fillRect(-8, -51, 4, 8);
  ctx.fillRect(-5, -54, 10, 4);
  ctx.fillStyle = "#d94f3d";
  ctx.fillRect(-9, -56, 18, 4);
  ctx.fillStyle = "#f3dc79";
  ctx.fillRect(3, -48, 3, 3);
  if (state === "swim") {
    ctx.fillStyle = "#83d7ef";
    ctx.fillRect(-8, -49, 16, 3);
  }
}

function drawHeldTool(ctx, selectedItem, state, actionProgress) {
  if (!selectedItem) return;
  const toolType = selectedItem.toolType;
  if (!toolType) return;
  const hasAction = actionProgress > 0;
  const swing = hasAction ? easeOut(actionProgress) : 0;
  const recoil = hasAction ? Math.sin(actionProgress * Math.PI) : 0;
  ctx.save();
  ctx.translate(13 + Math.round(recoil * 3), -25 + Math.round(recoil * -7));
  if (toolType === "spear") {
    ctx.rotate(hasAction ? -0.55 + swing * 1.05 : -0.3);
    ctx.fillStyle = "#7b4b25";
    ctx.fillRect(0, -2, 40, 4);
    ctx.fillStyle = "#d9dee0";
    ctx.fillRect(38, -4, 9, 8);
  } else if (toolType === "axe") {
    ctx.rotate(hasAction ? -1.8 + swing * 2.8 : -0.85);
    ctx.fillStyle = "#7b4b25";
    ctx.fillRect(0, -2, 24, 4);
    ctx.fillStyle = "#b9c1c4";
    ctx.fillRect(18, -9, 9, 12);
    ctx.fillStyle = "#737b80";
    ctx.fillRect(18, -5, 12, 4);
  } else if (toolType === "pickaxe") {
    ctx.rotate(hasAction ? -1.75 + swing * 2.55 : -0.9);
    ctx.fillStyle = "#7b4b25";
    ctx.fillRect(0, -2, 25, 4);
    ctx.fillStyle = "#aeb7bb";
    ctx.fillRect(18, -9, 17, 4);
    ctx.fillRect(27, -5, 4, 8);
  } else if (toolType === "hammer") {
    ctx.rotate(hasAction ? -1.35 + swing * 2.05 : -0.65);
    ctx.fillStyle = "#7b4b25";
    ctx.fillRect(0, -2, 22, 4);
    ctx.fillStyle = "#aeb7bb";
    ctx.fillRect(18, -8, 12, 9);
  }
  ctx.restore();
}

function easeOut(t) {
  return 1 - Math.pow(1 - t, 2);
}

function drawActionStreak(ctx, selectedItem, actionProgress) {
  if (!selectedItem?.toolType || actionProgress <= 0 || actionProgress >= 0.9) return;
  const alpha = Math.sin(actionProgress * Math.PI);
  ctx.save();
  ctx.globalAlpha = Math.max(0, alpha * 0.75);
  ctx.strokeStyle = selectedItem.toolType === "spear" ? "#f7e0a3" : "#d7eef0";
  ctx.lineWidth = 3;
  ctx.beginPath();
  if (selectedItem.toolType === "spear") {
    ctx.moveTo(19, -31);
    ctx.lineTo(56, -26);
  } else {
    ctx.moveTo(7, -48);
    ctx.lineTo(38, -34);
    ctx.lineTo(31, -8);
  }
  ctx.stroke();
  ctx.restore();
}

function drawInteractionHighlights(ctx, game) {
  if (game.state.current !== GAME_STATES.ISLAND_ANCHORED || !game.world.island) return;
  const selected = game.player.hotbar.getSelectedHotbarItem();
  const item = selected ? getItemDefinition(selected.itemId) : null;
  const mouse = { x: game.input.mouse.worldX, y: game.input.mouse.worldY };
  drawTerrainDigHighlight(ctx, game, item, mouse);
  for (const node of game.world.island.resources) {
    if (node.destroyed) continue;
    const nearMouse = pointDistance(mouse, node.center()) < 72;
    const nearPlayer = entityDistance(game.player, node) < CONFIG.PLAYER_INTERACTION_RANGE_TILES * CONFIG.TILE_SIZE;
    if (!nearMouse && !nearPlayer) continue;
    const validTool = item?.toolType === node.requiredTool && item.toolPower >= node.minimumToolPower;
    drawBracket(ctx, node, game.camera, validTool ? "#82e79a" : "#f3dc79");
  }
  if (item?.toolType !== "spear") return;
  for (const enemy of game.world.island.enemies) {
    if (enemy.destroyed || entityDistance(game.player, enemy) > 86) continue;
    drawBracket(ctx, enemy, game.camera, "#ef7467");
  }
}

function drawTerrainDigHighlight(ctx, game, item, mouse) {
  if (item?.toolType !== "pickaxe") return;
  const mouseTile = worldToTile(mouse.x, mouse.y);
  const target = [
    mouseTile,
    { tileX: mouseTile.tileX, tileY: mouseTile.tileY + 1 }
  ].find(({ tileX, tileY }) => game.world.tileMap.getTile(tileX, tileY) !== "air");
  if (!target) return;
  const tileId = game.world.tileMap.getTile(target.tileX, target.tileY);
  const tile = getTileDefinition(tileId);
  if (!tile.breakable) return;
  const center = {
    x: (target.tileX + 0.5) * CONFIG.TILE_SIZE,
    y: (target.tileY + 0.5) * CONFIG.TILE_SIZE
  };
  const nearPlayer = pointDistance(center, game.player.center()) <= CONFIG.TERRAIN_DIG_RANGE_TILES * CONFIG.TILE_SIZE;
  const validTool = nearPlayer && (!tile.requiredTool || item.toolType === tile.requiredTool) && (item.toolPower ?? 0) >= (tile.minimumToolPower ?? 0);
  drawTileBracket(ctx, target.tileX, target.tileY, game.camera, validTool ? "#82e79a" : "#f3dc79");
  const damage = game.worldEditSystem?.tileDamageSystem?.damageByTile?.get(`${target.tileX},${target.tileY}`);
  if (damage) drawCrackOverlay(ctx, target.tileX, target.tileY, game.camera, damage.accumulatedDamage / (tile.hardness ?? 1));
}

function drawBracket(ctx, entity, camera, color) {
  const screen = worldToScreen(entity.x, entity.y, camera);
  const x = Math.round(screen.x - 3);
  const y = Math.round(screen.y - 3);
  const w = Math.round(entity.width + 6);
  const h = Math.round(entity.height + 6);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y + 9);
  ctx.lineTo(x, y);
  ctx.lineTo(x + 9, y);
  ctx.moveTo(x + w - 9, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + 9);
  ctx.moveTo(x, y + h - 9);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x + 9, y + h);
  ctx.moveTo(x + w - 9, y + h);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + w, y + h - 9);
  ctx.stroke();
}

function drawTileBracket(ctx, tileX, tileY, camera, color) {
  const screen = worldToScreen(tileX * CONFIG.TILE_SIZE, tileY * CONFIG.TILE_SIZE, camera);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(Math.round(screen.x) + 2, Math.round(screen.y) + 2, CONFIG.TILE_SIZE - 4, CONFIG.TILE_SIZE - 4);
}

function pointDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function entityDistance(a, b) {
  return pointDistance(a.center(), b.center());
}

function drawBuildPreview(ctx, game) {
  const preview = game.worldEditSystem?.previewState ?? game.buildingSystem.preview;
  if (!preview) return;
  const isRaft = preview.domain === "raft_block" || preview.domain === "raft_structure" || preview.gridX != null;
  const pos = isRaft ? game.raft.gridToWorld(preview.gridX, preview.gridY) : { x: preview.tileX * CONFIG.TILE_SIZE, y: preview.tileY * CONFIG.TILE_SIZE };
  const screen = worldToScreen(pos.x, pos.y, game.camera);
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = preview.ok || preview.validation?.ok ? "#72df8f" : "#ed695c";
  ctx.fillRect(screen.x, screen.y, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
  ctx.globalAlpha = 1;
}

function drawCrackOverlay(ctx, tileX, tileY, camera, progress) {
  const screen = worldToScreen(tileX * CONFIG.TILE_SIZE, tileY * CONFIG.TILE_SIZE, camera);
  ctx.save();
  ctx.globalAlpha = Math.max(0.25, Math.min(0.85, progress));
  ctx.strokeStyle = "#1f1712";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(screen.x + 8, screen.y + 8);
  ctx.lineTo(screen.x + 15, screen.y + 17);
  ctx.lineTo(screen.x + 11, screen.y + 26);
  if (progress > 0.55) {
    ctx.moveTo(screen.x + 15, screen.y + 17);
    ctx.lineTo(screen.x + 25, screen.y + 10);
  }
  ctx.stroke();
  ctx.restore();
}

function drawPrompts(ctx, game) {
  if (game.state.current !== GAME_STATES.ISLAND_TRANSITION) return;
  ctx.fillStyle = "rgba(7,17,20,0.65)";
  ctx.fillRect(0, 0, game.canvas.width, game.canvas.height);
  ctx.fillStyle = "#f8fff9";
  ctx.font = "22px Segoe UI, sans-serif";
  ctx.fillText("Anchoring at the shoreline...", 40, 80);
}
