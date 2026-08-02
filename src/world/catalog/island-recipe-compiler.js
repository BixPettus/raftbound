import { CONFIG } from "../../config.js";
import { ISLAND_CATALOG_VERSION } from "../../data/world/catalog-version.js";
import { SeededRandom } from "../seeded-random.js";
import { createGenerationProfile } from "../generation/generation-profile.js";
import { calculateTemplateDanger } from "./danger-calculator.js";
import { planBiomeRegions } from "./biome-region-planner.js";
import { getEnemyDefinition, getEnemySpawnTable, getIslandArchetype, getIslandTemplate, getSpecialAttribute, getWorldBiome } from "./island-catalog.js";
import { resolveRecipeEdges } from "./edge-profile-registry.js";

export function compileIslandRecipe({ templateId = "temperate_haven", seed, size = "small", generationVersion = CONFIG.GENERATION_VERSION }) {
  const template = getIslandTemplate(templateId);
  const archetype = getIslandArchetype(template.archetypeId);
  const profile = createGenerationProfile(template.biomeSlots[0]?.biomeId ?? "temperate", size);
  const random = new SeededRandom(`${seed}:recipe:${templateId}:${size}:${ISLAND_CATALOG_VERSION}:${generationVersion}`);
  const edgeProfiles = resolveRecipeEdges(template, random);
  const biomeRegions = planBiomeRegions({ template, profile, edgeProfiles });
  const generationModifiers = mergeGenerationModifiers(template, archetype);
  const enemySpawnPlan = compileEnemySpawnPlan(template, size, generationModifiers, biomeRegions);
  const recipeCore = {
    catalogVersion: ISLAND_CATALOG_VERSION,
    generationVersion,
    templateId: template.id,
    templateName: template.name,
    archetypeId: archetype.id,
    seed,
    size,
    generationRating: template.generationRating,
    level: { ...template.level },
    danger: calculateTemplateDanger(template),
    biomeRegions,
    biomeSummary: template.biomeSlots.map((slot) => ({ biomeId: slot.biomeId, name: getWorldBiome(slot.biomeId).name, coverage: slot.coverage, role: slot.role })),
    edges: {
      arrival: summarizeEdge(edgeProfiles.arrival),
      far: summarizeEdge(edgeProfiles.far)
    },
    edgeProfiles,
    specialAttributes: template.specialAttributes.map((id) => ({ id, name: getSpecialAttribute(id).name })),
    generationModifiers,
    enemySpawnPlan
  };
  const recipe = {
    ...recipeCore,
    recipeHash: stableHash(recipeCore)
  };
  return CONFIG.DEVELOPMENT_MODE ? deepFreeze(recipe) : recipe;
}

export function stableHash(value) {
  const text = canonicalJson(value);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function compileEnemySpawnPlan(template, size, generationModifiers, biomeRegions) {
  const tableIds = [];
  const entries = [];
  let enemySpawnBudget = 0;
  for (let regionIndex = 0; regionIndex < template.biomeSlots.length; regionIndex += 1) {
    const slot = template.biomeSlots[regionIndex];
    const region = biomeRegions[regionIndex];
    const tableId = getWorldBiome(slot.biomeId).enemies.spawnTableId;
    if (!tableIds.includes(tableId)) tableIds.push(tableId);
    const table = getEnemySpawnTable(tableId);
    const baseBudget = (table.budgetBySize[size] ?? 0) * slot.coverage * (generationModifiers.enemyBudgetMultiplier ?? 1);
    const minThreatCost = table.entries.reduce((min, entry) => Math.min(min, getEnemyDefinition(entry.enemyId).threatCost), Infinity);
    const requiredThreatBudget = table.entries.reduce((sum, entry) => {
      const minCount = entry.minCount ?? 0;
      return sum + minCount * getEnemyDefinition(entry.enemyId).threatCost;
    }, 0);
    const regionalBudget = baseBudget > 0 ? Math.max(minThreatCost, requiredThreatBudget, Math.round(baseBudget)) : 0;
    enemySpawnBudget += regionalBudget;
    entries.push(...table.entries.map((entry) => ({
      biomeId: slot.biomeId,
      regionIndex,
      startX: region.startX,
      endX: region.endX,
      coverage: slot.coverage,
      tableId,
      enemyId: entry.enemyId,
      weight: entry.weight,
      density: entry.density,
      allowedRegion: entry.allowedRegion ?? slot.biomeId,
      minimumPlayerLevel: entry.minimumPlayerLevel ?? 1,
      minimumSpacingTiles: entry.minimumSpacingTiles,
      safeZoneExclusionTiles: entry.safeZoneExclusionTiles,
      requiresDryGround: entry.requiresDryGround === true,
      regionalBudget,
      countLimits: {
        minCount: entry.minCount,
        maxCount: entry.maxCountBySize[size] ?? 0
      }
    })));
  }
  return { tableIds, enemySpawnBudget, entries };
}

function mergeGenerationModifiers(template, archetype) {
  const result = {
    surfaceComplexityMultiplier: archetype.generation.surfaceComplexityMultiplier,
    caveComplexityMultiplier: archetype.generation.caveComplexityMultiplier,
    chamberMultiplier: archetype.generation.chamberMultiplier,
    pointOfInterestBudgetMultiplier: archetype.generation.pointOfInterestBudgetMultiplier,
    enemyBudgetMultiplier: archetype.generation.enemyBudgetMultiplier * (template.generation.enemyBudgetMultiplier ?? 1),
    resourceMultiplier: template.generation.resourceMultiplier ?? 1,
    pointOfInterestBudget: template.generation.pointOfInterestBudget ?? 0,
    caveAirRatioMultiplier: 1,
    deepCavernMultiplier: 1
  };
  for (const attributeId of template.specialAttributes) {
    Object.assign(result, multiplyModifiers(result, getSpecialAttribute(attributeId).generationModifiers ?? {}));
  }
  return result;
}

function multiplyModifiers(base, modifiers) {
  const result = {};
  for (const [key, value] of Object.entries(modifiers)) {
    result[key] = key.endsWith("Multiplier") ? (base[key] ?? 1) * value : value;
  }
  return result;
}

function summarizeEdge(edge) {
  return { id: edge.id, name: edge.name, width: edge.width };
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function deepFreeze(value) {
  if (!value || typeof value !== "object") return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}
