import { CONFIG } from "../../config.js";
import { TileMap } from "../tile-map.js";
import { getBiomeDefinition } from "../biome-registry.js";
import { createGenerationProfile } from "./generation-profile.js";
import { RandomStreams } from "./random-streams.js";

export function createIslandDefinition({ seed, biome = "temperate", size = "small", generationVersion = CONFIG.GENERATION_VERSION }) {
  const profile = createGenerationProfile(biome, size);
  const biomeDef = getBiomeDefinition(biome);
  return {
    seed,
    biome: biomeDef.id,
    size,
    generationVersion,
    width: profile.dimensions.width,
    height: profile.dimensions.height,
    seaLevelTile: profile.dimensions.seaLevelTile
  };
}

export function createGenerationContext(definition, attempt = 0) {
  const profile = createGenerationProfile(definition.biome, definition.size);
  return {
    definition,
    profile,
    biome: getBiomeDefinition(definition.biome),
    tileMap: new TileMap(definition.width, definition.height, "air", definition.seaLevelTile),
    surfaceHeights: new Array(definition.width).fill(definition.seaLevelTile),
    depthBands: new Array(definition.width * definition.height).fill(0),
    caveGraph: { nodes: [], edges: [] },
    caveMask: new Uint8Array(definition.width * definition.height),
    waterMask: new Uint8Array(definition.width * definition.height),
    resources: [],
    enemies: [],
    pointsOfInterest: [],
    raftDockTile: { tileX: profile.startX - 6, tileY: definition.seaLevelTile + CONFIG.RAFT_WATERLINE_TILE_OFFSET },
    playerSpawnTile: { tileX: profile.startX - 7, tileY: definition.seaLevelTile - 3 },
    randomStreams: new RandomStreams(definition, attempt),
    diagnostics: { attempt, stageTimingsMs: {}, validationFailures: [] },
    startedAt: performanceNow()
  };
}

export function stageTiming(context, name, run) {
  const start = performanceNow();
  const result = run();
  context.diagnostics.stageTimingsMs[name] = performanceNow() - start;
  return result;
}

export function contextIndex(context, tileX, tileY) {
  return tileY * context.definition.width + tileX;
}

function performanceNow() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}
