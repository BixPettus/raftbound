export const STRATA_PROFILES = [
  {
    id: "temperate_standard",
    layers: [
      { maximumDepthRatio: 0.11, primaryTile: "dirt" },
      { maximumDepthRatio: 0.26, primaryTile: "dirt", alternateTile: "stone", alternateModulo: 5 },
      { maximumDepthRatio: 0.94, primaryTile: "stone" },
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
      { maximumDepthRatio: 0.12, primaryTile: "dirt" },
      { maximumDepthRatio: 0.94, primaryTile: "stone" },
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
