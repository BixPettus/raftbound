import { DANGER_TIERS } from "../../data/world/danger-tiers.js";
import { getIslandArchetype, getSpecialAttribute, getWorldBiome } from "./island-catalog.js";

const WEIGHTS = Object.freeze({ environment: 0.3, hostility: 0.35, navigation: 0.2, scarcity: 0.15 });

export function calculateBiomeDanger(biome) {
  const source = typeof biome === "string" ? getWorldBiome(biome) : biome;
  return round(
    source.danger.environment * WEIGHTS.environment
    + source.danger.hostility * WEIGHTS.hostility
    + source.danger.navigation * WEIGHTS.navigation
    + source.danger.scarcity * WEIGHTS.scarcity
  );
}

export function calculateTemplateDanger(template) {
  const distinctBiomeIds = [...new Set(template.biomeSlots.map((slot) => slot.biomeId))];
  const biomeScores = distinctBiomeIds
    .sort()
    .map((biomeId) => ({ biomeId, score: calculateBiomeDanger(biomeId) }));
  const biomeAverage = round(biomeScores.reduce((sum, item) => sum + item.score, 0) / Math.max(1, biomeScores.length));
  const archetypeModifier = getIslandArchetype(template.archetypeId).dangerModifier ?? 0;
  const specialAttributeModifier = template.specialAttributes
    .map((id) => getSpecialAttribute(id).dangerModifier ?? 0)
    .reduce((sum, modifier) => sum + modifier, 0);
  const templateModifier = template.dangerModifier ?? 0;
  const finalScore = clamp(round(biomeAverage + archetypeModifier + specialAttributeModifier + templateModifier), 0, 100);
  return {
    biomeScores,
    biomeAverage,
    archetypeModifier,
    specialAttributeModifier,
    templateModifier,
    finalScore,
    tier: dangerTierForScore(finalScore)
  };
}

export function dangerTierForScore(score) {
  return DANGER_TIERS.find((tier) => score >= tier.min && score <= tier.max)?.label ?? "Extreme";
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function round(value) {
  return Number(value.toFixed(2));
}

