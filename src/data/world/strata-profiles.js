export const STRATA_PROFILES = [
  {
    id: "temperate_standard",
    layers: [
      { maximumDepthRatio: 0.11, primaryTile: "dirt" },
      { maximumDepthRatio: 0.26, primaryTile: "dirt", alternateTile: "stone", alternateChance: 0.28 },
      { maximumDepthRatio: 0.94, primaryTile: "stone", alternateTile: "dirt", alternateChance: 0.08, alternateMaximumDepthRatio: 0.44 },
      { maximumDepthRatio: 1, primaryTile: "bedrock" }
    ]
  },
  {
    id: "desert_standard",
    layers: [
      { maximumDepthRatio: 0.10, primaryTile: "sand" },
      { maximumDepthRatio: 0.32, primaryTile: "sandstone" },
      { maximumDepthRatio: 0.72, primaryTile: "compacted_sandstone" },
      { maximumDepthRatio: 0.94, primaryTile: "stone" },
      { maximumDepthRatio: 1, primaryTile: "bedrock" }
    ]
  },
  {
    id: "jungle_standard",
    layers: [
      { maximumDepthRatio: 0.10, primaryTile: "rich_soil" },
      { maximumDepthRatio: 0.24, primaryTile: "rooted_soil", alternateTile: "rich_soil", alternateChance: 0.18, alternateMaximumDepthRatio: 0.24 },
      { maximumDepthRatio: 0.62, primaryTile: "wet_stone", alternateTile: "rooted_soil", alternateChance: 0.12, alternateMaximumDepthRatio: 0.45 },
      { maximumDepthRatio: 0.94, primaryTile: "stone", alternateTile: "wet_stone", alternateChance: 0.1, alternateMaximumDepthRatio: 0.72 },
      { maximumDepthRatio: 1, primaryTile: "bedrock" }
    ]
  },
  {
    id: "volcanic_standard",
    layers: [
      { maximumDepthRatio: 0.94, primaryTile: "stone" },
      { maximumDepthRatio: 1, primaryTile: "bedrock" }
    ]
  }
];
