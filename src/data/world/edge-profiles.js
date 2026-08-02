export const EDGE_PROFILES = [
  {
    id: "sandy_beach",
    name: "Sandy Beach",
    implemented: true,
    surface: { widthRange: [26, 46], maximumSlope: 1, surfaceTile: "sand", subsurfaceTile: "sand", deepTransitionTile: "sandstone", transitionDepth: 5 },
    geometry: {
      offshoreShelfWidthRange: [10, 16],
      foreshoreWidthRange: [4, 8],
      dryBeachWidthRange: [14, 24],
      inlandTransitionWidthRange: [8, 14],
      offshoreDepthRange: [3, 5],
      maximumColumnStep: 1,
      dryBeachMaximumRise: 2
    },
    materials: {
      surfaceTile: "sand",
      capTile: "sand",
      capDepthRange: [4, 8],
      substrateTile: "sandstone",
      deepSubstrateTile: "stone"
    },
    generation: { flattenDockArea: true, excludeCaveEntrances: true, excludeEnemies: true, vegetationMultiplier: 0.15 },
    compatibility: { canBeArrivalEdge: true, canBeFarEdge: true, allowedBiomeTags: ["*"] }
  },
  { id: "rocky_shore", name: "Rocky Shore", implemented: false, surface: { widthRange: [8, 14], maximumSlope: 2, surfaceTile: "stone", subsurfaceTile: "stone", deepTransitionTile: "stone", transitionDepth: 4 }, generation: { flattenDockArea: false, excludeCaveEntrances: false, excludeEnemies: false, vegetationMultiplier: 0.4 }, compatibility: { canBeArrivalEdge: false, canBeFarEdge: true, allowedBiomeTags: ["rocky", "*"] } },
  { id: "mangrove_edge", name: "Mangrove Edge", implemented: false, surface: { widthRange: [12, 20], maximumSlope: 1, surfaceTile: "dirt", subsurfaceTile: "dirt", deepTransitionTile: "stone", transitionDepth: 4 }, generation: { flattenDockArea: false, excludeCaveEntrances: true, excludeEnemies: false, vegetationMultiplier: 1.2 }, compatibility: { canBeArrivalEdge: false, canBeFarEdge: true, allowedBiomeTags: ["wet"] } },
  { id: "basalt_cliff", name: "Basalt Cliff", implemented: false, surface: { widthRange: [8, 16], maximumSlope: 4, surfaceTile: "stone", subsurfaceTile: "stone", deepTransitionTile: "stone", transitionDepth: 5 }, generation: { flattenDockArea: false, excludeCaveEntrances: false, excludeEnemies: true, vegetationMultiplier: 0 }, compatibility: { canBeArrivalEdge: false, canBeFarEdge: true, allowedBiomeTags: ["hot", "rocky"] } },
  { id: "marsh_edge", name: "Marsh Edge", implemented: false, surface: { widthRange: [14, 22], maximumSlope: 1, surfaceTile: "dirt", subsurfaceTile: "dirt", deepTransitionTile: "stone", transitionDepth: 3 }, generation: { flattenDockArea: false, excludeCaveEntrances: true, excludeEnemies: false, vegetationMultiplier: 0.8 }, compatibility: { canBeArrivalEdge: false, canBeFarEdge: true, allowedBiomeTags: ["wet"] } },
  { id: "ice_shelf", name: "Ice Shelf", implemented: false, surface: { widthRange: [12, 20], maximumSlope: 1, surfaceTile: "stone", subsurfaceTile: "stone", deepTransitionTile: "stone", transitionDepth: 3 }, generation: { flattenDockArea: false, excludeCaveEntrances: true, excludeEnemies: true, vegetationMultiplier: 0 }, compatibility: { canBeArrivalEdge: false, canBeFarEdge: true, allowedBiomeTags: ["cold"] } }
];

