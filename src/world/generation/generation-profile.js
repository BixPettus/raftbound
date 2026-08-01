import { CONFIG } from "../../config.js";

export function createGenerationProfile(biomeId = "temperate", size = "small") {
  const dimensions = CONFIG.ISLAND_DIMENSIONS[size] ?? CONFIG.ISLAND_DIMENSIONS.small;
  return {
    biomeId,
    size,
    dimensions,
    startX: 32,
    endMargin: 18,
    arrivalFlatTiles: 16,
    caveAirRatio: {
      small: { min: 0.07, max: 0.22 },
      medium: { min: 0.09, max: 0.24 },
      large: { min: 0.1, max: 0.28 }
    }[size] ?? { min: 0.07, max: 0.22 },
    caveTargets: {
      small: { entrances: 1, upper: 1, mid: 2, deep: 1, side: 1 },
      medium: { entrances: 2, upper: 2, mid: 4, deep: 1, side: 3 },
      large: { entrances: 3, upper: 3, mid: 6, deep: 2, side: 5 }
    }[size] ?? { entrances: 1, upper: 1, mid: 2, deep: 1, side: 1 },
    oreProfiles: [
      { tileId: "copper_ore", minimumDepthRatio: 0.2, maximumDepthRatio: 0.62, clustersByIslandSize: { small: 7, medium: 11, large: 16 }, radiusRange: [2, 4], density: 0.62, caveExposureBias: 0.35 },
      { tileId: "iron_ore", minimumDepthRatio: 0.45, maximumDepthRatio: 0.9, clustersByIslandSize: { small: 4, medium: 8, large: 13 }, radiusRange: [2, 4], density: 0.55, caveExposureBias: 0.28 }
    ]
  };
}
