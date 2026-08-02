export const RESOURCE_TABLES = [
  {
    id: "temperate_surface",
    requiredTags: ["wood", "stone", "fibre"],
    densityBySize: { small: 1, medium: 1.35, large: 1.7 },
    entries: [
      { resourceId: "tree", weight: 8, baseCount: 8, guarantee: 1 },
      { resourceId: "surface_stone", weight: 7, baseCount: 7, guarantee: 1 },
      { resourceId: "fibre_plant", weight: 10, baseCount: 10, guarantee: 1 }
    ]
  },
  {
    id: "desert_surface",
    requiredTags: ["wood", "stone", "fibre", "healing", "desert_specific"],
    densityBySize: { small: 0.8, medium: 1.05, large: 1.35 },
    entries: [
      { resourceId: "dry_shrub", weight: 7, baseCount: 6, guarantee: 2 },
      { resourceId: "desert_cactus", weight: 5, baseCount: 5, guarantee: 2 },
      { resourceId: "surface_stone", weight: 4, baseCount: 5, guarantee: 1 },
      { resourceId: "salt_outcrop", weight: 2, baseCount: 2, guarantee: 1 }
    ]
  },
  {
    id: "jungle_surface",
    requiredTags: ["wood", "stone", "fibre"],
    densityBySize: { small: 1, medium: 1.2, large: 1.5 },
    entries: [
      { resourceId: "tree", weight: 8, baseCount: 8, guarantee: 1 },
      { resourceId: "surface_stone", weight: 5, baseCount: 5, guarantee: 1 },
      { resourceId: "fibre_plant", weight: 8, baseCount: 8, guarantee: 1 }
    ]
  },
  {
    id: "volcanic_surface",
    requiredTags: ["stone"],
    densityBySize: { small: 0.8, medium: 1, large: 1.2 },
    entries: [
      { resourceId: "surface_stone", weight: 8, baseCount: 8, guarantee: 1 }
    ]
  }
];
