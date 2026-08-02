import { CONFIG } from "../../config.js";
import { contextIndex } from "./generation-context.js";
import { buildTraversalGrid, isReachable } from "./traversal-grid.js";
import { getResourceDefinition } from "../content/resource-registry.js";
import { getResourceTable } from "../content/resource-table-registry.js";
import { SHORE_ZONES } from "./shoreline-planner.js";

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
  validateShorelines(context, metrics, failures);
  if (hasCaveEntranceInBeach(context)) failures.push("ENTRANCE_IN_BEACH_ZONE");
  if (hasEnemyInBeach(context)) failures.push("ENEMY_IN_BEACH_ZONE");

  let reachable = null;
  if (failures.length === 0) {
    reachable = buildTraversalGrid(context, [{ tileX: context.profile.startX + 1, tileY: context.definition.seaLevelTile - 2 }]);
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
  const plan = shorelinePlan(context, side);
  if (!plan) return false;
  const sandyZones = new Set([SHORE_ZONES.SUBMERGED_SHELF, SHORE_ZONES.FORESHORE, SHORE_ZONES.DRY_BEACH]);
  for (const column of plan.columns) {
    if (!sandyZones.has(column.zone)) continue;
    if (context.tileMap.getTile(column.tileX, column.surfaceTileY) !== "sand") return false;
  }
  return true;
}

function hasCaveEntranceInBeach(context) {
  return context.caveGraph.nodes
    .filter((node) => node.type === "SURFACE_ENTRANCE")
    .some((node) => isManagedDryShore(context, Math.round(node.centerX)));
}

function hasEnemyInBeach(context) {
  return context.enemies.some((enemy) => {
    const tileX = Math.floor(enemy.x / CONFIG.TILE_SIZE);
    return isManagedDryShore(context, tileX);
  });
}

function validateShorelines(context, metrics, failures) {
  const arrival = shorelinePlan(context, "arrival");
  const far = shorelinePlan(context, "far");
  if (!arrival || !far) {
    failures.push("OFFSHORE_SAND_SHELF_MISSING");
    return;
  }
  const sea = context.definition.seaLevelTile;
  const datum = context.shorelineDatum;
  if (datum?.waterSurfaceTileY !== sea || datum?.shorelineSurfaceTileY !== sea) failures.push("SHORELINE_NOT_AT_WATERLINE");
  if (datum?.raftDeckWorldY !== sea * CONFIG.TILE_SIZE) failures.push("RAFT_DECK_NOT_AT_SHORELINE");
  for (const plan of [arrival, far]) {
    const shorelineColumn = plan.columns.find((column) => column.tileX === plan.shorelineX);
    if (!shorelineColumn || shorelineColumn.surfaceTileY !== sea) failures.push("SHORELINE_NOT_AT_WATERLINE");
    if (!plan.columns.some((column) => column.zone === SHORE_ZONES.SUBMERGED_SHELF && context.tileMap.getTile(column.tileX, column.surfaceTileY) === "sand")) failures.push("OFFSHORE_SAND_SHELF_MISSING");
    const slopeFailure = hasSteepShoreTransition(context, plan);
    if (slopeFailure) failures.push(plan.side === "arrival" ? "ARRIVAL_SHORE_VERTICAL_WALL" : "FAR_SHORE_VERTICAL_WALL");
    if (slopeFailure) failures.push("SHORE_TRANSITION_TOO_STEEP");
    validateShoreMaterials(context, plan, metrics, failures);
  }
}

function validateShoreMaterials(context, plan, metrics, failures) {
  const [minCap, maxCap] = context.recipe.edgeProfiles[plan.side].profile.materials.capDepthRange;
  const checkedZones = new Set([SHORE_ZONES.SUBMERGED_SHELF, SHORE_ZONES.FORESHORE, SHORE_ZONES.DRY_BEACH]);
  let previousCap = null;
  for (const column of plan.columns) {
    if (column.zone === SHORE_ZONES.SUBMERGED_SHELF) {
      const exposed = context.tileMap.getTile(column.tileX, column.surfaceTileY);
      if (exposed === "grass") failures.push("UNDERWATER_GRASS_IN_EDGE");
      if (exposed === "dirt") failures.push("UNDERWATER_DIRT_IN_EDGE");
      if (exposed !== "sand") failures.push("OFFSHORE_SAND_SHELF_MISSING");
    }
    if (!checkedZones.has(column.zone)) continue;
    const capDepth = contiguousTileDepth(context, column.tileX, column.surfaceTileY, "sand");
    if (capDepth < minCap) failures.push("SAND_CAP_TOO_SHALLOW");
    if (capDepth > maxCap) failures.push("SAND_CAP_TOO_DEEP");
    if (previousCap != null && Math.abs(capDepth - previousCap) > 1) failures.push("SAND_CAP_DISCONTINUITY");
    previousCap = capDepth;
  }
}

function hasSteepShoreTransition(context, plan) {
  const columns = plan.columns
    .filter((column) => column.zone !== SHORE_ZONES.DEEP_OFFSHORE)
    .sort((a, b) => a.tileX - b.tileX);
  for (let i = 1; i < columns.length; i += 1) {
    if (Math.abs(columns[i].surfaceTileY - columns[i - 1].surfaceTileY) > 1) return true;
  }
  const inland = plan.side === "arrival" ? columns[columns.length - 1] : columns[0];
  const adjacentX = plan.side === "arrival" ? inland.tileX + 1 : inland.tileX - 1;
  if (context.tileMap.inBounds(adjacentX, 0) && Math.abs(context.surfaceHeights[adjacentX] - inland.surfaceTileY) > 1) return true;
  return false;
}

function contiguousTileDepth(context, x, startY, tileId) {
  let count = 0;
  for (let y = startY; y < context.definition.height; y += 1) {
    if (context.tileMap.getTile(x, y) !== tileId) break;
    count += 1;
  }
  return count;
}

function shorelinePlan(context, side) {
  return context.shorelinePlans?.find((plan) => plan.side === side) ?? null;
}

function isManagedDryShore(context, tileX) {
  const zone = context.getShoreZone(tileX);
  return zone === SHORE_ZONES.FORESHORE || zone === SHORE_ZONES.DRY_BEACH || zone === SHORE_ZONES.INLAND_TRANSITION;
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
  const geology = calculateGeologyDiagnostics(context, tileCounts);
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
    geology,
    resourceCounts: context.resources.reduce((counts, node) => ({ ...counts, [node.type]: (counts[node.type] ?? 0) + 1 }), {}),
    enemyCount: context.enemies.length
  };
}

function calculateGeologyDiagnostics(context, materialCounts) {
  const tracked = new Set(["dirt", "stone", "sand", "sandstone", "compacted_sandstone"]);
  const counts = Object.fromEntries([...tracked].map((tile) => [tile, materialCounts[tile] ?? 0]));
  const boundaryDepths = [];
  let repeatedPairs = 0;
  let checkedPairs = 0;
  let isolatedSecondary = 0;
  let secondaryTotal = 0;
  for (let x = context.profile.startX; x < context.definition.width - context.profile.endMargin; x += 1) {
    for (let y = context.surfaceHeights[x]; y < context.definition.height - 3; y += 1) {
      const tile = context.tileMap.getTile(x, y);
      if (tile === "stone" || tile === "compacted_sandstone") {
        boundaryDepths.push(y - context.surfaceHeights[x]);
        break;
      }
    }
    for (let y = context.surfaceHeights[x] + 1; y < Math.min(context.definition.height - 3, context.surfaceHeights[x] + 24); y += 1) {
      const tile = context.tileMap.getTile(x, y);
      if (tile !== "dirt" && tile !== "stone") continue;
      const diagonal = context.tileMap.getTile(x + 1, y + 1);
      if (diagonal === tile) repeatedPairs += 1;
      checkedPairs += 1;
      if (tile === "stone") {
        secondaryTotal += 1;
        if (!hasNeighborTile(context, x, y, "stone")) isolatedSecondary += 1;
      }
    }
  }
  return {
    isolatedSecondaryTileRatio: secondaryTotal > 0 ? isolatedSecondary / secondaryTotal : 0,
    boundaryDepthVariance: variance(boundaryDepths),
    repeatedPatternScore: checkedPairs > 0 ? repeatedPairs / checkedPairs : 0,
    materialCounts: counts
  };
}

function hasNeighborTile(context, x, y, tileId) {
  return context.tileMap.getTile(x - 1, y) === tileId
    || context.tileMap.getTile(x + 1, y) === tileId
    || context.tileMap.getTile(x, y - 1) === tileId
    || context.tileMap.getTile(x, y + 1) === tileId;
}

function variance(values) {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
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
