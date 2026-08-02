export const RESOURCE_DEFINITIONS = [
  {
    id: "tree",
    name: "Tree",
    collider: { width: 54, height: 168 },
    tool: { requiredType: "axe", minimumPower: 1, health: 54 },
    placement: { zones: ["surface"], biomeIds: ["temperate"], minimumSpacingTiles: 5, requiresDryGround: false },
    drops: [{ itemId: "wood", minimum: 5, maximum: 5, chance: 1 }],
    rendererId: "tree",
    resourceTags: ["wood", "food_chain"]
  },
  {
    id: "surface_stone",
    name: "Surface Stone",
    collider: { width: 38, height: 30 },
    tool: { requiredType: "pickaxe", minimumPower: 1, health: 42 },
    placement: { zones: ["surface"], biomeIds: ["temperate", "desert", "jungle"], minimumSpacingTiles: 4, requiresDryGround: false },
    drops: [{ itemId: "stone", minimum: 4, maximum: 4, chance: 1 }],
    rendererId: "surface_stone",
    resourceTags: ["stone"]
  },
  {
    id: "fibre_plant",
    name: "Fibre Plant",
    collider: { width: 32, height: 42 },
    tool: { requiredType: "axe", minimumPower: 1, health: 24 },
    placement: { zones: ["surface"], biomeIds: ["temperate"], minimumSpacingTiles: 4, requiresDryGround: false },
    drops: [{ itemId: "fibre", minimum: 5, maximum: 5, chance: 1 }],
    rendererId: "fibre_plant",
    resourceTags: ["fibre"]
  },
  {
    id: "desert_cactus",
    name: "Cactus",
    collider: { width: 30, height: 78 },
    tool: { requiredType: "axe", minimumPower: 1, health: 38 },
    placement: { zones: ["surface"], biomeIds: ["desert"], minimumSpacingTiles: 3, requiresDryGround: true },
    drops: [
      { itemId: "fibre", minimum: 2, maximum: 4, chance: 1 },
      { itemId: "healing_food", minimum: 1, maximum: 1, chance: 0.18 }
    ],
    hazardId: "cactus_contact",
    rendererId: "desert_cactus",
    resourceTags: ["fibre", "healing", "desert_specific"]
  },
  {
    id: "dry_shrub",
    name: "Dry Shrub",
    collider: { width: 42, height: 48 },
    tool: { requiredType: "axe", minimumPower: 1, health: 26 },
    placement: { zones: ["surface"], biomeIds: ["desert"], minimumSpacingTiles: 6, requiresDryGround: true },
    drops: [
      { itemId: "wood", minimum: 2, maximum: 3, chance: 1 },
      { itemId: "fibre", minimum: 1, maximum: 2, chance: 1 }
    ],
    rendererId: "dry_shrub",
    resourceTags: ["wood", "fibre"]
  },
  {
    id: "salt_outcrop",
    name: "Salt Outcrop",
    collider: { width: 36, height: 28 },
    tool: { requiredType: "pickaxe", minimumPower: 1, health: 34 },
    placement: { zones: ["surface"], biomeIds: ["desert"], minimumSpacingTiles: 8, requiresDryGround: true },
    drops: [{ itemId: "salt", minimum: 1, maximum: 3, chance: 1 }],
    rendererId: "salt_outcrop",
    resourceTags: ["desert_specific", "salt"]
  },
  {
    id: "hardwood_tree",
    name: "Hardwood Tree",
    collider: { width: 58, height: 184 },
    tool: { requiredType: "axe", minimumPower: 1, health: 68 },
    placement: { zones: ["surface"], biomeIds: ["jungle"], minimumSpacingTiles: 7, requiresDryGround: true },
    drops: [
      { itemId: "wood", minimum: 5, maximum: 7, chance: 1 },
      { itemId: "hardwood", minimum: 1, maximum: 2, chance: 0.65 }
    ],
    rendererId: "hardwood_tree",
    resourceTags: ["wood", "jungle_specific"]
  },
  {
    id: "vine_cluster",
    name: "Vine Cluster",
    collider: { width: 38, height: 58 },
    tool: { requiredType: "axe", minimumPower: 1, health: 30 },
    placement: { zones: ["surface"], biomeIds: ["jungle"], minimumSpacingTiles: 5, requiresDryGround: true },
    drops: [
      { itemId: "fibre", minimum: 3, maximum: 5, chance: 1 },
      { itemId: "vine", minimum: 1, maximum: 2, chance: 1 }
    ],
    rendererId: "vine_cluster",
    resourceTags: ["fibre", "vine", "jungle_specific"]
  },
  {
    id: "medicinal_plant",
    name: "Medicinal Plant",
    collider: { width: 28, height: 36 },
    tool: { requiredType: "axe", minimumPower: 1, health: 20 },
    placement: { zones: ["surface"], biomeIds: ["jungle"], minimumSpacingTiles: 7, requiresDryGround: true },
    drops: [
      { itemId: "medicinal_herb", minimum: 1, maximum: 2, chance: 1 },
      { itemId: "healing_food", minimum: 1, maximum: 1, chance: 0.25 }
    ],
    rendererId: "medicinal_plant",
    resourceTags: ["healing", "jungle_specific"]
  },
  {
    id: "resin_node",
    name: "Resin Node",
    collider: { width: 32, height: 34 },
    tool: { requiredType: "pickaxe", minimumPower: 1, health: 36 },
    placement: { zones: ["surface"], biomeIds: ["jungle"], minimumSpacingTiles: 7, requiresDryGround: true },
    drops: [{ itemId: "resin", minimum: 1, maximum: 3, chance: 1 }],
    rendererId: "resin_node",
    resourceTags: ["resin", "jungle_specific"]
  },
  {
    id: "thorn_vine",
    name: "Thorn Vine",
    collider: { width: 42, height: 52 },
    tool: { requiredType: "axe", minimumPower: 1, health: 34 },
    placement: { zones: ["surface"], biomeIds: ["jungle"], minimumSpacingTiles: 8, requiresDryGround: true },
    drops: [
      { itemId: "fibre", minimum: 1, maximum: 2, chance: 1 },
      { itemId: "vine", minimum: 1, maximum: 1, chance: 0.55 }
    ],
    hazardId: "thorn_vine_contact",
    rendererId: "thorn_vine",
    resourceTags: ["hazard", "fibre"]
  },
  {
    id: "poison_bloom",
    name: "Poison Bloom",
    collider: { width: 36, height: 44 },
    tool: { requiredType: "axe", minimumPower: 1, health: 26 },
    placement: { zones: ["surface"], biomeIds: ["jungle"], minimumSpacingTiles: 9, requiresDryGround: true },
    drops: [{ itemId: "medicinal_herb", minimum: 1, maximum: 1, chance: 0.35 }],
    hazardId: "poison_bloom_toxin",
    rendererId: "poison_bloom",
    resourceTags: ["hazard", "toxin"]
  }
];
