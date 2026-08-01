import assert from "node:assert/strict";
import { CONFIG } from "../src/config.js";
import { validateIslandCatalog } from "../src/world/catalog/catalog-validator.js";
import { calculateBiomeDanger, calculateTemplateDanger, dangerTierForScore } from "../src/world/catalog/danger-calculator.js";
import { compileIslandRecipe } from "../src/world/catalog/island-recipe-compiler.js";
import { rollIslandEncounter } from "../src/world/catalog/encounter-roller.js";
import { getEnemyDefinition, getIslandTemplate, getWorldBiome, listIslandTemplates } from "../src/world/catalog/island-catalog.js";

const validation = validateIslandCatalog();
assert.equal(validation.ok, true, validation.errors.join("\n"));

testDanger();
testLevelGates();
testRecipes();
testEnemies();
testEdges();

console.log("catalog validation passed");

function testDanger() {
  const temperate = getWorldBiome("temperate");
  assert.equal(calculateBiomeDanger(temperate), 14.6);
  const haven = getIslandTemplate("temperate_haven");
  const havenDanger = calculateTemplateDanger(haven);
  assert.equal(havenDanger.biomeAverage, 14.6);
  assert.equal(havenDanger.finalScore, 1.6);
  assert.equal(havenDanger.tier, "Safe");
  assert.equal(dangerTierForScore(20), "Low");

  const mixedA = { ...getIslandTemplate("desert_jungle_frontier") };
  const mixedB = { ...mixedA, biomeSlots: [...mixedA.biomeSlots].reverse() };
  assert.equal(calculateTemplateDanger(mixedA).biomeAverage, calculateTemplateDanger(mixedB).biomeAverage);
  assert.equal(calculateTemplateDanger({ ...mixedA, level: { ...mixedA.level, rating: 9 } }).finalScore, calculateTemplateDanger(mixedA).finalScore);
  assert.equal(calculateTemplateDanger({ ...mixedA, dangerModifier: 7 }).finalScore !== calculateTemplateDanger(mixedA).finalScore, true);
}

function testLevelGates() {
  const levelOne = rollIslandEncounter({ voyageSeed: "catalog-gate", rollIndex: 0, playerProgression: { level: 1, unlocks: [] } });
  assert.equal(["temperate_haven", "temperate_caverns"].includes(levelOne.templateId), true);
  const normalCandidates = listIslandTemplates({ naturalOnly: true }).map((template) => template.id);
  assert.equal(normalCandidates.includes("volcanic_rift"), false);
  const forced = rollIslandEncounter({
    voyageSeed: "catalog-gate",
    rollIndex: 0,
    playerProgression: { level: 1, unlocks: [] },
    rollType: "debug",
    debugOptions: { ignoreLevelGate: true, includeExperimental: true, forcedTemplateId: "volcanic_rift", forcedSize: "medium" }
  });
  assert.equal(forced.templateId, "volcanic_rift");
}

function testRecipes() {
  const a = compileIslandRecipe({ templateId: "temperate_haven", seed: "recipe-same", size: "small", generationVersion: CONFIG.GENERATION_VERSION });
  const b = compileIslandRecipe({ templateId: "temperate_haven", seed: "recipe-same", size: "small", generationVersion: CONFIG.GENERATION_VERSION });
  assert.deepEqual(a, b);
  assert.equal(a.catalogVersion, 1);
  assert.equal(a.generationVersion, 4);
  assert.equal(a.biomeRegions.length, 1);
  assert.equal(a.edges.arrival.id, "sandy_beach");
  assert.equal(a.edges.far.id, "sandy_beach");
}

function testEnemies() {
  const crawler = getEnemyDefinition("shore_crawler");
  assert.equal(crawler.level, 1);
  assert.equal(crawler.threatCost, 2);
  assert.equal(crawler.combat.health, 60);
  const recipe = compileIslandRecipe({ templateId: "temperate_haven", seed: "enemy-plan", size: "medium" });
  assert.equal(recipe.enemySpawnPlan.tableIds.includes("temperate_enemies"), true);
  assert.equal(recipe.enemySpawnPlan.entries.every((entry) => getEnemyDefinition(entry.enemyId).implemented), true);
}

function testEdges() {
  for (const template of listIslandTemplates({ naturalOnly: true })) {
    assert.equal(template.edges.arrival, "sandy_beach");
    assert.equal(template.edges.far, "sandy_beach");
  }
}
