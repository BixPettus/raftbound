export const ORE_PROFILES = [
  {
    id: "temperate_ores",
    entries: [
      { tileId: "copper_ore", minimumDepthRatio: 0.18, maximumDepthRatio: 0.72, clustersByIslandSize: { small: 5, medium: 8, large: 11 }, radiusRange: [2, 4], density: 0.66 },
      { tileId: "iron_ore", minimumDepthRatio: 0.46, maximumDepthRatio: 0.92, clustersByIslandSize: { small: 3, medium: 5, large: 8 }, radiusRange: [2, 4], density: 0.56 }
    ]
  },
  {
    id: "desert_ores",
    entries: [
      { tileId: "copper_ore", minimumDepthRatio: 0.18, maximumDepthRatio: 0.65, clusterMultiplier: 1.2, exposureBias: 0.4, clustersByIslandSize: { small: 6, medium: 10, large: 14 }, radiusRange: [2, 4], density: 0.68 },
      { tileId: "iron_ore", minimumDepthRatio: 0.48, maximumDepthRatio: 0.9, clusterMultiplier: 0.9, exposureBias: 0.25, clustersByIslandSize: { small: 3, medium: 5, large: 7 }, radiusRange: [2, 4], density: 0.54 },
      { tileId: "salt_rock", minimumDepthRatio: 0.12, maximumDepthRatio: 0.5, clusterMultiplier: 1, exposureBias: 0.55, clustersByIslandSize: { small: 4, medium: 7, large: 10 }, radiusRange: [2, 3], density: 0.64 }
    ]
  },
  {
    id: "jungle_ores",
    entries: [
      { tileId: "copper_ore", minimumDepthRatio: 0.2, maximumDepthRatio: 0.7, clustersByIslandSize: { small: 5, medium: 8, large: 11 }, radiusRange: [2, 4], density: 0.6 },
      { tileId: "iron_ore", minimumDepthRatio: 0.48, maximumDepthRatio: 0.92, clustersByIslandSize: { small: 3, medium: 5, large: 8 }, radiusRange: [2, 4], density: 0.54 }
    ]
  },
  {
    id: "volcanic_ores",
    entries: [
      { tileId: "copper_ore", minimumDepthRatio: 0.25, maximumDepthRatio: 0.7, clustersByIslandSize: { small: 4, medium: 7, large: 10 }, radiusRange: [2, 4], density: 0.56 },
      { tileId: "iron_ore", minimumDepthRatio: 0.42, maximumDepthRatio: 0.95, clustersByIslandSize: { small: 5, medium: 9, large: 13 }, radiusRange: [2, 4], density: 0.6 }
    ]
  }
];
