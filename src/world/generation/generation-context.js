import { CONFIG } from "../../config.js";
import { TileMap } from "../tile-map.js";
import { getBiomeDefinition } from "../biome-registry.js";
import { biomeAt, biomeBlendAt } from "../catalog/biome-region-planner.js";
import { compileIslandRecipe } from "../catalog/island-recipe-compiler.js";
import { createGenerationProfile } from "./generation-profile.js";
import { RandomStreams } from "./random-streams.js";

export function createIslandDefinition({ seed, biome = "temperate", size = "small", generationVersion = CONFIG.GENERATION_VERSION, templateId = "temperate_haven", recipe = null }) {
  const compiledRecipe = recipe ?? compileIslandRecipe({ templateId, seed, size, generationVersion });
  const primaryBiomeId = compiledRecipe.biomeRegions[0]?.biomeId ?? biome;
  const profile = createGenerationProfile(primaryBiomeId, compiledRecipe.size);
  const biomeDef = getBiomeDefinition(primaryBiomeId);
  return {
    seed: compiledRecipe.seed,
    biome: biomeDef.id,
    size: compiledRecipe.size,
    templateId: compiledRecipe.templateId,
    templateName: compiledRecipe.templateName,
    archetypeId: compiledRecipe.archetypeId,
    catalogVersion: compiledRecipe.catalogVersion,
    recipeHash: compiledRecipe.recipeHash,
    recipe: compiledRecipe,
    generationVersion: compiledRecipe.generationVersion,
    width: profile.dimensions.width,
    height: profile.dimensions.height,
    seaLevelTile: profile.dimensions.seaLevelTile
  };
}

export function createGenerationContext(definition, attempt = 0) {
  const profile = applyRecipeModifiers(createGenerationProfile(definition.biome, definition.size), definition.recipe?.generationModifiers ?? {});
  const primaryBiome = getBiomeDefinition(definition.biome);
  const getBiomeAt = (tileX) => getBiomeDefinition(biomeAt(definition.recipe.biomeRegions, tileX)?.biomeId ?? definition.biome);
  const getBiomeBlendAt = (tileX) => biomeBlendAt(definition.recipe.biomeRegions, tileX);
  return {
    definition,
    profile,
    recipe: definition.recipe,
    biome: primaryBiome,
    getBiomeAt,
    getBiomeBlendAt,
    getEdgeAt: (tileX) => edgeAt(definition.recipe, tileX, definition.width, profile.endMargin),
    getShorelineColumn(tileX) {
      return this.shorelineColumns?.get(tileX) ?? null;
    },
    getShoreZone(tileX) {
      return this.getShorelineColumn(tileX)?.zone ?? "INTERIOR";
    },
    shorelinePlans: [],
    shorelineColumns: new Map(),
    shorelineDatum: null,
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
    playerSpawnTile: { tileX: profile.startX - 7, tileY: definition.seaLevelTile - 2 },
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

function applyRecipeModifiers(profile, modifiers) {
  const result = {
    ...profile,
    caveAirRatio: {
      min: profile.caveAirRatio.min * (modifiers.caveAirRatioMultiplier ?? 1),
      max: profile.caveAirRatio.max * Math.max(1, modifiers.caveAirRatioMultiplier ?? 1)
    },
    caveTargets: {
      ...profile.caveTargets,
      upper: Math.max(1, Math.round(profile.caveTargets.upper * (modifiers.chamberMultiplier ?? 1))),
      mid: Math.max(1, Math.round(profile.caveTargets.mid * (modifiers.chamberMultiplier ?? 1))),
      deep: Math.max(1, Math.round(profile.caveTargets.deep * (modifiers.deepCavernMultiplier ?? 1)))
    }
  };
  return result;
}

function edgeAt(recipe, tileX, width, endMargin) {
  const startX = 32;
  if (tileX >= startX && tileX < startX + recipe.edgeProfiles.arrival.width) return recipe.edgeProfiles.arrival;
  const farStart = width - endMargin - recipe.edgeProfiles.far.width;
  if (tileX >= farStart && tileX < width - endMargin) return recipe.edgeProfiles.far;
  return null;
}
