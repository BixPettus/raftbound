import { CONFIG } from "../../config.js";
import { getOreProfile } from "../content/biome-profile-registry.js";
import { getBiomeDefinition } from "../biome-registry.js";

export function createGenerationProfile(biomeId = "temperate", size = "small") {
  const dimensions = CONFIG.ISLAND_DIMENSIONS[size] ?? CONFIG.ISLAND_DIMENSIONS.small;
  const biome = getBiomeDefinition(biomeId);
  const caveAirRatio = {
    small: { min: 0.07, max: 0.22 },
    medium: { min: 0.09, max: 0.24 },
    large: { min: 0.1, max: 0.28 }
  }[size] ?? { min: 0.07, max: 0.22 };
  if (biomeId === "desert") caveAirRatio.max += 0.08;
  return {
    biomeId,
    size,
    dimensions,
    startX: 32,
    endMargin: 18,
    arrivalFlatTiles: 16,
    caveAirRatio,
    caveTargets: {
      small: { entrances: 1, upper: 1, mid: 2, deep: 1, side: 1 },
      medium: { entrances: 2, upper: 2, mid: 4, deep: 1, side: 3 },
      large: { entrances: 3, upper: 3, mid: 6, deep: 2, side: 5 }
    }[size] ?? { entrances: 1, upper: 1, mid: 2, deep: 1, side: 1 },
    oreProfiles: getOreProfile(biome.ores.profileId).entries
  };
}
