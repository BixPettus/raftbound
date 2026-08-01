import { BIOME_DEFINITIONS } from "../data/biomes.js";

const biomeMap = new Map(BIOME_DEFINITIONS.map((biome) => [biome.id, Object.freeze({ ...biome })]));

export function getBiomeDefinition(biomeId) {
  const biome = biomeMap.get(biomeId);
  if (!biome) throw new Error(`Unknown biome id: ${biomeId}`);
  return biome;
}

export function listBiomes() {
  return [...biomeMap.values()];
}

export function chooseBiome(random) {
  const selected = random.weighted(listBiomes());
  return selected.implemented ? selected : getBiomeDefinition("temperate");
}
