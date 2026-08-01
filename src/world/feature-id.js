export function generatedFeatureId({ kind, generationVersion, islandSeed, featureType, tileX = 0, tileY = 0, ordinal = 0 }) {
  return `${kind}:${generationVersion}:${islandSeed}:${featureType}:${tileX}:${tileY}:${ordinal}`;
}
