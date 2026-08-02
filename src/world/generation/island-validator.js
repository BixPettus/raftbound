import { CONFIG } from "../../config.js";
import { contextIndex } from "./generation-context.js";
import { buildTraversalGrid, isReachable } from "./traversal-grid.js";
import { getResourceDefinition } from "../content/resource-registry.js";
import { getResourceTable } from "../content/resource-table-registry.js";

export function validateGeneratedIsland(context) {
  const failures = [];
  const metrics = calculateMetrics(context);
  for (const missingTag of missingRequiredResourceTags(context)) failures.push(`MISSING_${missingTag.toUpperCase()}`);
  if (entranceNodes(context).length < 1) failures.push("NO_ENTRANCE");
  if (!context.caveGraph.nodes.some((node) => node.type === "UPPER_CHAMBER")) failures.push("NO_UPPER_CHAMBER");
  if (context.definition.size !== "small" && !context.caveGraph.nodes.some((node) => node.type === "DEEP_CAVERN")) failures.push("NO_DEEP_CAVERN");
  if (metrics.caveAirRatio < context.profile.caveAirRatio.min || metrics.caveAirRatio > context.profile.caveAirRatio.max) failures.push("CAVE_AIR_RATIO");
  if (metrics.waterOnSolid > 0) failures.push("WATER_IN_SOLID");
  if (metrics.maximumSurfaceSlope > 2) failures.push("SURFACE_SLOPE");
  if (!hasSandyEdge(context, "arrival")) failures.push("ARRIVAL_EDGE_NOT_SANDY");
  if (!hasSandyEdge(context, "far")) failures.push("FAR_EDGE_NOT_SANDY");
  if (hasCaveEntranceInBeach(context)) failures.push("ENTRANCE_IN_BEACH_ZONE");
  if (hasEnemyInBeach(context)) failures.push("ENEMY_IN_BEACH_ZONE");

  let reachable = null;
  if (failures.length === 0) {
    reachable = buildTraversalGrid(context, [{ tileX: context.profile.startX + 1, tileY: context.definition.seaLevelTile - 3 }]);
    for (const tag of requiredResourceTags(context)) {
      if (!context.resources.some((node) => resourceHasTag(node.type, tag) && isReachableNear(context, reachable, node.tileX, node.tileY - 1, 5))) {
        failures.push(`${tag.toUpperCase()}_UNREACHABLE`);
      }
    }
    if (!entranceNodes(context).some((node) => isReachableNear(context, reachable, Math.round(node.centerX), Math.round(node.centerY), Math.ceil(Math.max(node.radiusX, node.radiusY)) + 3))) failures.push("ENTRANCE_UNREACHABLE");
    if (!isNodeTypeReachable(context, reachable, "UPPER_CHAMBER")) failures.push("UPPER_CHAMBER_UNREACHABLE");
    if (!isNodeTypeReachable(context, reachable, "MID_CHAMBER")) failures.push("MID_CHAMBER_UNREACHABLE");
    if (context.definition.size !== "small" && !isNodeTypeReachable(context, reachable, "DEEP_CAVERN")) failures.push("DEEP_CAVERN_UNREACHABLE");
  }

  context.diagnostics.validationFailures = failures;
  context.diagnostics.metrics = metrics;
  context.diagnostics.reachable = reachable;
  return { ok: failures.length === 0, failures, metrics };
}

function hasSandyEdge(context, side) {
  const edge = context.recipe.edgeProfiles[side];
  const startX = side === "arrival"
    ? context.profile.startX
    : context.definition.width - context.profile.endMargin - edge.width;
  for (let x = startX; x < startX + edge.width; x += 1) {
    if (context.tileMap.getTile(x, context.surfaceHeights[x]) !== "sand") return false;
  }
  return true;
}

function hasCaveEntranceInBeach(context) {
  const arrivalEnd = context.profile.startX + context.recipe.edgeProfiles.arrival.width;
  const farStart = context.definition.width - context.profile.endMargin - context.recipe.edgeProfiles.far.width;
  return context.caveGraph.nodes
    .filter((node) => node.type === "SURFACE_ENTRANCE")
    .some((node) => node.centerX < arrivalEnd || node.centerX >= farStart);
}

function hasEnemyInBeach(context) {
  const arrivalEnd = context.profile.startX + context.recipe.edgeProfiles.arrival.width;
  const farStart = context.definition.width - context.profile.endMargin - context.recipe.edgeProfiles.far.width;
  return context.enemies.some((enemy) => {
    const tileX = Math.floor(enemy.x / CONFIG.TILE_SIZE);
    return tileX < arrivalEnd || tileX >= farStart;
  });
}

function isNodeTypeReachable(context, reachable, type) {
  return context.caveGraph.nodes
    .filter((node) => node.type === type)
    .some((node) => isReachableNear(context, reachable, Math.round(node.centerX), Math.round(node.centerY), Math.ceil(Math.max(node.radiusX, node.radiusY)) + 3));
}

function isReachableNear(context, reachable, centerX, centerY, radius) {
  const minY = Math.max(0, centerY - radius);
  const maxY = Math.min(context.definition.height - 1, centerY + radius);
  const minX = Math.max(0, centerX - radius);
  const maxX = Math.min(context.definition.width - 1, centerX + radius);
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (isReachable(reachable, context, x, y)) return true;
    }
  }
  return false;
}

export function calculateMetrics(context) {
  let caveAir = 0;
  let solidLand = 0;
  let waterTileCount = 0;
  let waterOnSolid = 0;
  const tileCounts = {};
  const oreCounts = {};
  const oreTileIds = new Set(context.profile.oreProfiles.map((profile) => profile.tileId));
  for (let y = 0; y < context.definition.height; y += 1) {
    for (let x = 0; x < context.definition.width; x += 1) {
      const tile = context.tileMap.getTile(x, y);
      tileCounts[tile] = (tileCounts[tile] ?? 0) + 1;
      if (tile.includes("ore") || oreTileIds.has(tile)) oreCounts[tile] = (oreCounts[tile] ?? 0) + 1;
      if (context.caveMask[contextIndex(context, x, y)] && tile === "air") caveAir += 1;
      if (x >= context.profile.startX && x < context.definition.width - context.profile.endMargin && y >= context.surfaceHeights[x]) solidLand += 1;
      if (context.waterMask[contextIndex(context, x, y)]) {
        waterTileCount += 1;
        if (context.tileMap.isSolidTile(x, y)) waterOnSolid += 1;
      }
    }
  }
  let maximumSurfaceSlope = 0;
  for (let x = context.profile.startX + 1; x < context.definition.width - context.profile.endMargin; x += 1) {
    maximumSurfaceSlope = Math.max(maximumSurfaceSlope, Math.abs(context.surfaceHeights[x] - context.surfaceHeights[x - 1]));
  }
  const caveNodes = context.caveGraph.nodes;
  return {
    tileCounts,
    oreCounts,
    surfaceMinimum: Math.min(...context.surfaceHeights.slice(context.profile.startX, context.definition.width - context.profile.endMargin)),
    surfaceMaximum: Math.max(...context.surfaceHeights.slice(context.profile.startX, context.definition.width - context.profile.endMargin)),
    maximumSurfaceSlope,
    caveAirRatio: solidLand > 0 ? caveAir / solidLand : 0,
    entranceCount: entranceNodes(context).length,
    upperChamberCount: caveNodes.filter((node) => node.type === "UPPER_CHAMBER").length,
    midChamberCount: caveNodes.filter((node) => node.type === "MID_CHAMBER").length,
    deepCavernCount: caveNodes.filter((node) => node.type === "DEEP_CAVERN").length,
    graphEdgeCount: context.caveGraph.edges.length,
    loopCount: context.caveGraph.edges.filter((edge) => edge.type === "LOOP").length,
    waterTileCount,
    waterOnSolid,
    resourceCounts: context.resources.reduce((counts, node) => ({ ...counts, [node.type]: (counts[node.type] ?? 0) + 1 }), {}),
    enemyCount: context.enemies.length
  };
}

function requiredResourceTags(context) {
  const tags = new Set();
  for (const region of context.recipe.biomeRegions) {
    const biome = context.getBiomeAt(region.startX);
    const table = getResourceTable(biome.resources.surfaceTableId);
    for (const tag of table.requiredTags ?? []) tags.add(tag);
  }
  return [...tags];
}

function missingRequiredResourceTags(context) {
  const available = new Set();
  for (const node of context.resources) {
    for (const tag of getResourceDefinition(node.type).resourceTags ?? []) available.add(tag);
  }
  return requiredResourceTags(context).filter((tag) => !available.has(tag));
}

function resourceHasTag(type, tag) {
  return (getResourceDefinition(type).resourceTags ?? []).includes(tag);
}

function entranceNodes(context) {
  return context.caveGraph.nodes.filter((node) => node.type === "SURFACE_ENTRANCE" || node.type === "SINKHOLE_ENTRANCE");
}
