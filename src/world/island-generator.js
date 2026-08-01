import { CONFIG } from "../config.js?v=wp4-catalog-1";
import { ItemDrop } from "../entities/item-drop.js";
import { generateIslandV4, createIslandDefinition } from "./generation/island-generator.js";

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
  if ((savedIsland.generationVersion ?? 0) < CONFIG.GENERATION_VERSION) return null;
  const island = generateIsland(savedIsland);
  island.removedResourceIds = new Set(savedIsland.removedResourceIds ?? []);
  island.openedContainerIds = new Set(savedIsland.openedContainerIds ?? []);
  island.tileMap.applyModifications(savedIsland.modifiedTiles ?? []);
  island.itemDrops = (savedIsland.itemDrops ?? []).map((drop) => new ItemDrop(drop));
  island.resources.forEach((node) => {
    if (island.removedResourceIds.has(node.id)) node.destroyed = true;
  });
  return island;
}
