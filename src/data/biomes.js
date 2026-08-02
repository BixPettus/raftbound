import { WORLD_BIOMES } from "./world/biomes.js";
import { calculateBiomeDanger, dangerTierForScore } from "../world/catalog/danger-calculator.js";

const weights = { temperate: 0.5, desert: 0.25, jungle: 0.2, volcanic: 0.05 };

export const BIOME_DEFINITIONS = WORLD_BIOMES.map((biome) => {
  const score = calculateBiomeDanger(biome);
  return {
    ...biome,
    weight: weights[biome.id] ?? 0,
    risk: dangerTierForScore(score),
    tiles: {
      surface: biome.terrain.surfaceTile,
      subsurface: biome.terrain.subsurfaceTile,
      deep: biome.terrain.deepTile,
      water: "water"
    },
    resources: biome.resources,
    resourceTableIds: [biome.resources.surfaceTableId, biome.resources.undergroundTableId]
  };
});
