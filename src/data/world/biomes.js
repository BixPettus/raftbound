export const WORLD_BIOMES = [
  {
    id: "temperate",
    name: "Temperate",
    implemented: true,
    implementationStatus: "validated",
    access: { minimumLevel: 1, requiredUnlocks: [] },
    danger: { environment: 18, hostility: 16, navigation: 12, scarcity: 8 },
    terrain: {
      surfaceTile: "grass",
      subsurfaceTile: "dirt",
      middleTile: "stone",
      deepTile: "stone",
      bottomTile: "bedrock",
      surfaceProfileId: "temperate_rolling",
      strataProfileId: "temperate_standard"
    },
    caves: { profileId: "temperate_caves", entranceStyle: "rounded_worm", wetness: 0.25, branching: 1, cavernScale: 1 },
    water: { color: "#2d91c9", undergroundPoolRate: 0.15 },
    resources: { surfaceTableId: "temperate_surface", undergroundTableId: "temperate_underground" },
    ores: { profileId: "temperate_ores" },
    enemies: { spawnTableId: "temperate_enemies" },
    palette: { sky: "#86d5f0", water: "#2d91c9", tint: "rgba(188,236,191,0.05)" },
    tags: ["green", "wet", "starter"]
  },
  {
    id: "desert",
    name: "Desert",
    implemented: false,
    implementationStatus: "placeholder",
    access: { minimumLevel: 2, requiredUnlocks: [] },
    danger: { environment: 44, hostility: 25, navigation: 30, scarcity: 55 },
    terrain: {
      surfaceTile: "sand",
      subsurfaceTile: "sand",
      middleTile: "sandstone",
      deepTile: "stone",
      bottomTile: "bedrock",
      surfaceProfileId: "desert_dunes",
      strataProfileId: "desert_standard"
    },
    caves: { profileId: "desert_caves", entranceStyle: "wind_cut", wetness: 0.05, branching: 0.8, cavernScale: 0.9 },
    water: { color: "#2d91c9", undergroundPoolRate: 0.03 },
    resources: { surfaceTableId: "desert_surface", undergroundTableId: "desert_underground" },
    ores: { profileId: "desert_ores" },
    enemies: { spawnTableId: "desert_enemies" },
    palette: { sky: "#e6c27a", water: "#2d91c9", tint: "rgba(214,176,92,0.08)" },
    tags: ["dry", "hot", "sand"]
  },
  {
    id: "jungle",
    name: "Jungle",
    implemented: false,
    implementationStatus: "placeholder",
    access: { minimumLevel: 3, requiredUnlocks: [] },
    danger: { environment: 58, hostility: 54, navigation: 68, scarcity: 24 },
    terrain: {
      surfaceTile: "grass",
      subsurfaceTile: "dirt",
      middleTile: "stone",
      deepTile: "stone",
      bottomTile: "bedrock",
      surfaceProfileId: "jungle_dense",
      strataProfileId: "jungle_standard"
    },
    caves: { profileId: "jungle_caves", entranceStyle: "rooted", wetness: 0.4, branching: 1.25, cavernScale: 1.05 },
    water: { color: "#247f75", undergroundPoolRate: 0.28 },
    resources: { surfaceTableId: "jungle_surface", undergroundTableId: "jungle_underground" },
    ores: { profileId: "jungle_ores" },
    enemies: { spawnTableId: "jungle_enemies" },
    palette: { sky: "#78c985", water: "#247f75", tint: "rgba(66,125,68,0.08)" },
    tags: ["green", "wet", "dense"]
  },
  {
    id: "volcanic",
    name: "Volcanic",
    implemented: false,
    implementationStatus: "placeholder",
    access: { minimumLevel: 5, requiredUnlocks: [] },
    danger: { environment: 92, hostility: 62, navigation: 78, scarcity: 70 },
    terrain: {
      surfaceTile: "stone",
      subsurfaceTile: "stone",
      middleTile: "stone",
      deepTile: "stone",
      bottomTile: "bedrock",
      surfaceProfileId: "volcanic_ridges",
      strataProfileId: "volcanic_standard"
    },
    caves: { profileId: "volcanic_caves", entranceStyle: "basalt_tube", wetness: 0.02, branching: 1.1, cavernScale: 1.2 },
    water: { color: "#245e7a", undergroundPoolRate: 0.02 },
    resources: { surfaceTableId: "volcanic_surface", undergroundTableId: "volcanic_underground" },
    ores: { profileId: "volcanic_ores" },
    enemies: { spawnTableId: "volcanic_enemies" },
    palette: { sky: "#be6d55", water: "#245e7a", tint: "rgba(160,60,45,0.09)" },
    tags: ["hot", "rocky", "late_game"]
  }
];

