import { CONFIG } from "../../config.js";
import { SeededRandom } from "../seeded-random.js";
import { compileIslandRecipe } from "./island-recipe-compiler.js";
import { islandCatalog, listIslandTemplates } from "./island-catalog.js";
import { ISLAND_CATALOG_VERSION } from "../../data/world/catalog-version.js";

export function rollIslandEncounter({ voyageSeed, rollIndex, playerProgression = { level: 1, unlocks: [] }, debugOptions = {}, rollType = "natural" }) {
  const random = new SeededRandom(`${voyageSeed}:${rollType}:${rollIndex}:${CONFIG.GENERATION_VERSION}`);
  const candidates = listEncounterCandidates({ debugOptions })
    .filter((template) => template.enabled)
    .filter((template) => debugOptions.ignoreLevelGate || template.level.minimumAccessLevel <= (playerProgression.level ?? 1))
    .filter((template) => hasUnlocks(playerProgression, template.access?.requiredUnlocks ?? []));
  const forced = debugOptions.forcedTemplateId
    ? candidates.find((template) => template.id === debugOptions.forcedTemplateId)
    : null;
  const template = forced ?? random.weighted(candidates.map((candidate) => ({ ...candidate, weight: candidate.encounterWeight })));
  if (!template) throw new Error("No eligible island templates for encounter roll.");
  if (debugOptions.forcedTemplateId && !forced) throw new Error(`Forced island template is not eligible: ${debugOptions.forcedTemplateId}`);
  if (debugOptions.forcedSize && !Object.hasOwn(template.allowedSizes, debugOptions.forcedSize)) {
    throw new Error(`Forced island size ${debugOptions.forcedSize} is not allowed by template ${template.id}.`);
  }
  const size = debugOptions.forcedSize ?? random.weighted(Object.entries(template.allowedSizes).map(([id, weight]) => ({ id, weight }))).id;
  const seed = `${voyageSeed}:${rollType}:${rollIndex}:${template.id}:${size}`;
  const recipe = compileIslandRecipe({ templateId: template.id, seed, size, generationVersion: CONFIG.GENERATION_VERSION });
  return encounterFromRecipe(recipe, { rollType, rollIndex, remaining: CONFIG.ENCOUNTER_RESPONSE_SECONDS });
}

export function restorePendingEncounter(savedEncounter) {
  if (!savedEncounter) return null;
  if (savedEncounter.generationVersion !== CONFIG.GENERATION_VERSION) return null;
  if (savedEncounter.catalogVersion !== ISLAND_CATALOG_VERSION) return null;
  try {
    const recipe = compileIslandRecipe({
      templateId: savedEncounter.templateId,
      seed: savedEncounter.seed,
      size: savedEncounter.size,
      generationVersion: savedEncounter.generationVersion
    });
    if (recipe.recipeHash !== savedEncounter.recipeHash) return null;
    return encounterFromRecipe(recipe, {
      rollType: savedEncounter.rollType,
      rollIndex: savedEncounter.rollIndex,
      remaining: Math.max(0, savedEncounter.remaining ?? CONFIG.ENCOUNTER_RESPONSE_SECONDS)
    });
  } catch {
    return null;
  }
}

export function encounterFromRecipe(recipe, { rollType = "natural", rollIndex = 0, remaining = CONFIG.ENCOUNTER_RESPONSE_SECONDS } = {}) {
  return {
    rollType,
    rollIndex,
    seed: recipe.seed,
    templateId: recipe.templateId,
    templateName: recipe.templateName,
    archetypeId: recipe.archetypeId,
    size: recipe.size,
    generationRating: recipe.generationRating,
    level: recipe.level,
    danger: recipe.danger,
    biomeSummary: recipe.biomeSummary,
    edgeSummary: recipe.edges,
    specialAttributes: recipe.specialAttributes,
    recipeHash: recipe.recipeHash,
    catalogVersion: recipe.catalogVersion,
    generationVersion: recipe.generationVersion,
    recipe,
    remaining
  };
}

function listEncounterCandidates({ debugOptions = {} }) {
  if (!debugOptions.includeExperimental) return listIslandTemplates({ naturalOnly: true });
  return islandCatalog.templates.filter((template) => {
    if (!template.enabled) return false;
    if (template.implementationStatus === "placeholder") return debugOptions.includePlaceholders === true;
    return true;
  });
}

function hasUnlocks(playerProgression, requiredUnlocks) {
  const unlocks = new Set(playerProgression.unlocks ?? []);
  return requiredUnlocks.every((unlock) => unlocks.has(unlock));
}
