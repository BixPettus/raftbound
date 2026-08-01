import { CONFIG } from "../config.js?v=wp4-catalog-1";
import { ItemDrop } from "../entities/item-drop.js";
import { generateIslandV4, createIslandDefinition } from "./generation/island-generator.js";
import { compileIslandRecipe } from "./catalog/island-recipe-compiler.js";
import { ISLAND_CATALOG_VERSION } from "../data/world/catalog-version.js";

export { createIslandDefinition };

export function generateIsland(options) {
  return generateIslandV4(options);
}

export function serializeIsland(island) {
  if (!island) return null;
  return {
    seed: island.seed,
    biome: island.biome,
    size: island.size,
    templateId: island.templateId,
    catalogVersion: island.catalogVersion,
    generationVersion: island.generationVersion,
    recipeHash: island.recipeHash,
    removedResourceIds: [...island.removedResourceIds],
    openedContainerIds: [...island.openedContainerIds],
    modifiedTiles: island.tileMap.serializeModifications(),
    itemDrops: (island.itemDrops ?? []).map((drop) => drop.serialize())
  };
}

export function restoreIsland(savedIsland) {
  if (!savedIsland) return null;
  const compatibility = getSavedIslandCompatibility(savedIsland);
  if (!compatibility.ok) return null;
  const island = generateIsland({ recipe: compatibility.recipe });
  island.removedResourceIds = new Set(savedIsland.removedResourceIds ?? []);
  island.openedContainerIds = new Set(savedIsland.openedContainerIds ?? []);
  island.tileMap.applyModifications(savedIsland.modifiedTiles ?? []);
  island.itemDrops = (savedIsland.itemDrops ?? []).map((drop) => new ItemDrop(drop));
  island.resources.forEach((node) => {
    if (island.removedResourceIds.has(node.id)) node.destroyed = true;
  });
  return island;
}

export function getSavedIslandCompatibility(savedIsland) {
  if (!savedIsland) return { ok: false, reason: "missing island" };
  if (savedIsland.generationVersion !== CONFIG.GENERATION_VERSION) return { ok: false, reason: "generation version mismatch" };
  if (savedIsland.catalogVersion !== ISLAND_CATALOG_VERSION) return { ok: false, reason: "catalog version mismatch" };
  try {
    const recipe = compileIslandRecipe({
      templateId: savedIsland.templateId,
      seed: savedIsland.seed,
      size: savedIsland.size,
      generationVersion: savedIsland.generationVersion
    });
    if (recipe.recipeHash !== savedIsland.recipeHash) return { ok: false, reason: "recipe hash mismatch" };
    return { ok: true, recipe };
  } catch (error) {
    return { ok: false, reason: error.message };
  }
}
