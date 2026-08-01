import { CONFIG } from "../../config.js";
import { SeededRandom } from "../seeded-random.js";
import { compileIslandRecipe } from "./island-recipe-compiler.js";
import { islandCatalog, listIslandTemplates } from "./island-catalog.js";

export function rollIslandEncounter({ voyageSeed, rollIndex, playerProgression = { level: 1, unlocks: [] }, debugOptions = {}, rollType = "natural" }) {
  const random = new SeededRandom(`${voyageSeed}:${rollType}:${rollIndex}:${CONFIG.GENERATION_VERSION}`);
  const sourceTemplates = debugOptions.includeExperimental
    ? islandCatalog.templates.filter((template) => template.enabled)
    : listIslandTemplates({ naturalOnly: true });
  const candidates = sourceTemplates
    .filter((template) => template.enabled)
    .filter((template) => debugOptions.ignoreLevelGate || template.level.minimumAccessLevel <= (playerProgression.level ?? 1))
    .filter((template) => hasUnlocks(playerProgression, template.access?.requiredUnlocks ?? []));
  const forced = debugOptions.forcedTemplateId
    ? candidates.find((template) => template.id === debugOptions.forcedTemplateId)
    : null;
  const template = forced ?? random.weighted(candidates.map((candidate) => ({ ...candidate, weight: candidate.encounterWeight })));
  if (!template) throw new Error("No eligible island templates for encounter roll.");
  const size = debugOptions.forcedSize ?? random.weighted(Object.entries(template.allowedSizes).map(([id, weight]) => ({ id, weight }))).id;
  const seed = `${voyageSeed}:${rollType}:${rollIndex}:${template.id}:${size}`;
  const recipe = compileIslandRecipe({ templateId: template.id, seed, size, generationVersion: CONFIG.GENERATION_VERSION });
  return {
    seed,
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
    remaining: CONFIG.ENCOUNTER_RESPONSE_SECONDS
  };
}

function hasUnlocks(playerProgression, requiredUnlocks) {
  const unlocks = new Set(playerProgression.unlocks ?? []);
  return requiredUnlocks.every((unlock) => unlocks.has(unlock));
}
