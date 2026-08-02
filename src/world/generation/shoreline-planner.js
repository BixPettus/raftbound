import { CONFIG } from "../../config.js";

export const SHORE_ZONES = Object.freeze({
  DEEP_OFFSHORE: "DEEP_OFFSHORE",
  SUBMERGED_SHELF: "SUBMERGED_SHELF",
  FORESHORE: "FORESHORE",
  DRY_BEACH: "DRY_BEACH",
  INLAND_TRANSITION: "INLAND_TRANSITION",
  INTERIOR: "INTERIOR"
});

const DEEP_OFFSHORE_WIDTH = 4;

export function planShorelines(context) {
  const random = context.randomStreams.get("shoreline-plan");
  const arrival = buildArrivalPlan(context, context.recipe.edgeProfiles.arrival, random);
  const far = buildFarPlan(context, context.recipe.edgeProfiles.far, random);
  const columns = new Map();
  for (const plan of [arrival, far]) {
    for (const column of plan.columns) {
      if (!context.tileMap.inBounds(column.tileX, 0)) continue;
      columns.set(column.tileX, column);
      context.surfaceHeights[column.tileX] = column.surfaceTileY;
    }
  }
  context.shorelinePlans = [arrival, far];
  context.shorelineColumns = columns;
  context.shorelineDatum = {
    waterSurfaceTileY: context.definition.seaLevelTile,
    waterSurfaceWorldY: context.definition.seaLevelTile * CONFIG.TILE_SIZE,
    shorelineSurfaceTileY: context.definition.seaLevelTile,
    shorelineSurfaceWorldY: context.definition.seaLevelTile * CONFIG.TILE_SIZE,
    raftDeckWorldY: context.definition.seaLevelTile * CONFIG.TILE_SIZE
  };
}

function buildArrivalPlan(context, edge, random) {
  const geometry = edge.profile.geometry;
  const materials = edge.profile.materials;
  const sea = context.definition.seaLevelTile;
  const shorelineX = context.profile.startX;
  const widths = allocateBeachWidths(edge.width, geometry, random);
  const offshoreWidth = random.int(...geometry.offshoreShelfWidthRange);
  const offshoreDepth = random.int(...geometry.offshoreDepthRange);
  const offshoreStartX = Math.max(0, shorelineX - offshoreWidth - DEEP_OFFSHORE_WIDTH);
  const columns = [];
  let previousCapDepth = random.int(...materials.capDepthRange);

  for (let x = offshoreStartX; x < shorelineX - offshoreWidth; x += 1) {
    previousCapDepth = nextCapDepth(context, x, previousCapDepth, materials.capDepthRange);
    columns.push(column(context, x, SHORE_ZONES.DEEP_OFFSHORE, sea + offshoreDepth + 1, materials.surfaceTile, previousCapDepth, materials));
  }
  for (let x = shorelineX - offshoreWidth; x < shorelineX; x += 1) {
    const t = (x - (shorelineX - offshoreWidth)) / Math.max(1, offshoreWidth - 1);
    const depth = Math.max(1, Math.round(lerp(offshoreDepth, 1, smoothstep(t))));
    previousCapDepth = nextCapDepth(context, x, previousCapDepth, materials.capDepthRange);
    columns.push(column(context, x, SHORE_ZONES.SUBMERGED_SHELF, sea + depth, materials.surfaceTile, previousCapDepth, materials));
  }

  const foreshoreEndX = shorelineX + widths.foreshore - 1;
  const dryBeachEndX = foreshoreEndX + widths.dryBeach;
  const inlandTransitionEndX = dryBeachEndX + widths.inlandTransition;
  for (let x = shorelineX; x <= foreshoreEndX; x += 1) {
    previousCapDepth = nextCapDepth(context, x, previousCapDepth, materials.capDepthRange);
    columns.push(column(context, x, SHORE_ZONES.FORESHORE, sea, materials.surfaceTile, previousCapDepth, materials));
  }
  for (let x = foreshoreEndX + 1; x <= dryBeachEndX; x += 1) {
    const t = (x - (foreshoreEndX + 1)) / Math.max(1, widths.dryBeach - 1);
    const rise = Math.round(smoothstep(t) * geometry.dryBeachMaximumRise);
    previousCapDepth = nextCapDepth(context, x, previousCapDepth, materials.capDepthRange);
    columns.push(column(context, x, SHORE_ZONES.DRY_BEACH, sea - rise, materials.surfaceTile, previousCapDepth, materials));
  }
  addArrivalTransition(context, columns, dryBeachEndX + 1, inlandTransitionEndX, previousCapDepth, materials);

  return {
    side: "arrival",
    offshoreStartX,
    shorelineX,
    foreshoreEndX,
    dryBeachEndX,
    inlandTransitionEndX,
    columns
  };
}

function buildFarPlan(context, edge, random) {
  const geometry = edge.profile.geometry;
  const materials = edge.profile.materials;
  const sea = context.definition.seaLevelTile;
  const landStartX = context.definition.width - context.profile.endMargin - edge.width;
  const landEndX = context.definition.width - context.profile.endMargin - 1;
  const widths = allocateBeachWidths(edge.width, geometry, random);
  const offshoreWidth = Math.min(random.int(...geometry.offshoreShelfWidthRange), context.definition.width - landEndX - DEEP_OFFSHORE_WIDTH - 1);
  const offshoreDepth = random.int(...geometry.offshoreDepthRange);
  const shorelineX = landEndX - widths.foreshore + 1;
  const columns = [];
  let previousCapDepth = random.int(...materials.capDepthRange);

  addFarTransition(context, columns, landStartX, landStartX + widths.inlandTransition - 1, previousCapDepth, materials);
  previousCapDepth = columns[columns.length - 1]?.capDepth ?? previousCapDepth;

  const dryBeachStartX = landStartX + widths.inlandTransition;
  const dryBeachEndX = dryBeachStartX + widths.dryBeach - 1;
  for (let x = dryBeachStartX; x <= dryBeachEndX; x += 1) {
    const t = 1 - (x - dryBeachStartX) / Math.max(1, widths.dryBeach - 1);
    const rise = Math.round(smoothstep(t) * geometry.dryBeachMaximumRise);
    previousCapDepth = nextCapDepth(context, x, previousCapDepth, materials.capDepthRange);
    columns.push(column(context, x, SHORE_ZONES.DRY_BEACH, sea - rise, materials.surfaceTile, previousCapDepth, materials));
  }
  for (let x = dryBeachEndX + 1; x <= landEndX; x += 1) {
    previousCapDepth = nextCapDepth(context, x, previousCapDepth, materials.capDepthRange);
    columns.push(column(context, x, SHORE_ZONES.FORESHORE, sea, materials.surfaceTile, previousCapDepth, materials));
  }

  const shelfStartX = landEndX + 1;
  const shelfEndX = Math.min(context.definition.width - 1, shelfStartX + Math.max(0, offshoreWidth) - 1);
  for (let x = shelfStartX; x <= shelfEndX; x += 1) {
    const t = (x - shelfStartX) / Math.max(1, shelfEndX - shelfStartX);
    const depth = Math.max(1, Math.round(lerp(1, offshoreDepth, smoothstep(t))));
    previousCapDepth = nextCapDepth(context, x, previousCapDepth, materials.capDepthRange);
    columns.push(column(context, x, SHORE_ZONES.SUBMERGED_SHELF, sea + depth, materials.surfaceTile, previousCapDepth, materials));
  }
  for (let x = shelfEndX + 1; x <= Math.min(context.definition.width - 1, shelfEndX + DEEP_OFFSHORE_WIDTH); x += 1) {
    previousCapDepth = nextCapDepth(context, x, previousCapDepth, materials.capDepthRange);
    columns.push(column(context, x, SHORE_ZONES.DEEP_OFFSHORE, sea + offshoreDepth + 1, materials.surfaceTile, previousCapDepth, materials));
  }

  return {
    side: "far",
    offshoreStartX: shelfStartX,
    shorelineX,
    foreshoreEndX: landEndX,
    dryBeachEndX,
    inlandTransitionEndX: landStartX + widths.inlandTransition - 1,
    columns
  };
}

function addArrivalTransition(context, columns, startX, endX, previousCapDepth, materials) {
  const sea = context.definition.seaLevelTile;
  const targetX = Math.min(context.definition.width - context.profile.endMargin - 1, endX + 1);
  const targetY = context.surfaceHeights[targetX] ?? sea - 2;
  let currentY = columns[columns.length - 1]?.surfaceTileY ?? sea;
  for (let x = startX; x <= endX; x += 1) {
    const remaining = Math.max(1, endX - x + 1);
    const desired = Math.round(lerp(currentY, targetY, 1 / remaining));
    currentY = clamp(desired, currentY - 1, currentY + 1);
    const t = (x - startX) / Math.max(1, endX - startX);
    previousCapDepth = nextCapDepth(context, x, previousCapDepth, materials.capDepthRange);
    columns.push(column(context, x, SHORE_ZONES.INLAND_TRANSITION, currentY, transitionSurfaceTile(context, x, t), previousCapDepth, materials));
  }
}

function addFarTransition(context, columns, startX, endX, previousCapDepth, materials) {
  const sea = context.definition.seaLevelTile;
  const interiorX = Math.max(context.profile.startX, startX - 1);
  const interiorY = context.surfaceHeights[interiorX] ?? sea - 2;
  let currentY = interiorY;
  for (let x = startX; x <= endX; x += 1) {
    const t = (x - startX) / Math.max(1, endX - startX);
    const targetY = sea - Math.round((1 - t) * 2);
    currentY = clamp(Math.round(lerp(currentY, targetY, 0.45)), currentY - 1, currentY + 1);
    previousCapDepth = nextCapDepth(context, x, previousCapDepth, materials.capDepthRange);
    columns.push(column(context, x, SHORE_ZONES.INLAND_TRANSITION, currentY, transitionSurfaceTile(context, x, 1 - t), previousCapDepth, materials));
  }
}

function allocateBeachWidths(total, geometry, random) {
  const [foreshoreMin, foreshoreMax] = geometry.foreshoreWidthRange;
  const [dryMin, dryMax] = geometry.dryBeachWidthRange;
  const [transitionMin, transitionMax] = geometry.inlandTransitionWidthRange;
  let foreshore = random.int(foreshoreMin, foreshoreMax);
  let dryBeach = random.int(dryMin, dryMax);
  let inlandTransition = total - foreshore - dryBeach;
  if (inlandTransition < transitionMin) {
    let needed = transitionMin - inlandTransition;
    const dryReduction = Math.min(needed, dryBeach - dryMin);
    dryBeach -= dryReduction;
    needed -= dryReduction;
    const foreshoreReduction = Math.min(needed, foreshore - foreshoreMin);
    foreshore -= foreshoreReduction;
    inlandTransition = total - foreshore - dryBeach;
  }
  if (inlandTransition > transitionMax) {
    let extra = inlandTransition - transitionMax;
    const dryGrowth = Math.min(extra, dryMax - dryBeach);
    dryBeach += dryGrowth;
    extra -= dryGrowth;
    const foreshoreGrowth = Math.min(extra, foreshoreMax - foreshore);
    foreshore += foreshoreGrowth;
    inlandTransition = total - foreshore - dryBeach;
  }
  return { foreshore, dryBeach, inlandTransition };
}

function column(context, tileX, zone, surfaceTileY, surfaceTile, capDepth, materials) {
  return {
    tileX,
    zone,
    surfaceTileY: clamp(surfaceTileY, 0, context.definition.height - 4),
    surfaceTile,
    capTile: materials.capTile,
    capDepth,
    substrateTile: materials.substrateTile,
    deepSubstrateTile: materials.deepSubstrateTile,
    substrateDepth: 7
  };
}

function nextCapDepth(context, x, previous, range) {
  const [min, max] = range;
  const drift = hashUnit(`${context.definition.seed}:sand-cap:${x}`) > 0.58 ? 1 : hashUnit(`${context.definition.seed}:sand-cap-b:${x}`) < 0.42 ? -1 : 0;
  return clamp(previous + drift, min, max);
}

function transitionSurfaceTile(context, x, t) {
  const biomeSurface = context.getBiomeAt(x).tiles.surface;
  if (biomeSurface === "sand") return "sand";
  if (t < 0.42) return "sand";
  if (t < 0.78) return "dirt";
  return biomeSurface;
}

function smoothstep(t) {
  const clamped = clamp(t, 0, 1);
  return clamped * clamped * (3 - 2 * clamped);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function hashUnit(input) {
  let hash = 2166136261;
  const text = String(input);
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
