export const CAVE_PROFILES = [
  {
    id: "temperate_caves",
    entrances: { styles: ["rounded_worm"], verticalBias: 0.05 },
    graph: { branchingMultiplier: 1, loopMultiplier: 1, chamberMultiplier: 1, deepCavernMultiplier: 1 },
    carving: { tunnelWidthMultiplier: 1, tunnelHeightMultiplier: 1, smoothingPasses: 1 },
    water: { wetness: 0.25, undergroundPoolRate: 0.15 }
  },
  {
    id: "desert_caves",
    entrances: { styles: ["wind_cut", "sinkhole"], verticalBias: 0.25 },
    graph: { branchingMultiplier: 0.8, loopMultiplier: 0.7, chamberMultiplier: 0.9, deepCavernMultiplier: 0.85 },
    carving: { tunnelWidthMultiplier: 1.1, tunnelHeightMultiplier: 1.15, smoothingPasses: 1 },
    water: { wetness: 0.04, undergroundPoolRate: 0.03 }
  },
  {
    id: "jungle_caves",
    entrances: { styles: ["rooted"], verticalBias: 0.1 },
    graph: { branchingMultiplier: 1, loopMultiplier: 1, chamberMultiplier: 1, deepCavernMultiplier: 1 },
    carving: { tunnelWidthMultiplier: 1, tunnelHeightMultiplier: 1, smoothingPasses: 1 },
    water: { wetness: 0.4, undergroundPoolRate: 0.28 }
  },
  {
    id: "volcanic_caves",
    entrances: { styles: ["basalt_tube"], verticalBias: 0.1 },
    graph: { branchingMultiplier: 1, loopMultiplier: 1, chamberMultiplier: 1, deepCavernMultiplier: 1 },
    carving: { tunnelWidthMultiplier: 1, tunnelHeightMultiplier: 1, smoothingPasses: 1 },
    water: { wetness: 0.02, undergroundPoolRate: 0.02 }
  }
];
