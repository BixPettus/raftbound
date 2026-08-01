export const BIOME_DEFINITIONS = [
  {
    id: "temperate",
    name: "Temperate",
    weight: 0.5,
    risk: "Low",
    tiles: { surface: "grass", subsurface: "dirt", deep: "stone", water: "water" },
    resources: ["tree", "surface_stone", "fibre_plant"],
    palette: { sky: "#86d5f0", water: "#2d91c9", tint: "rgba(188, 236, 191, 0.05)" },
    implemented: true
  },
  { id: "desert", name: "Desert", weight: 0.25, risk: "Medium", implemented: false },
  { id: "jungle", name: "Jungle", weight: 0.2, risk: "Medium", implemented: false },
  { id: "volcanic", name: "Volcanic", weight: 0.05, risk: "High", implemented: false }
];
