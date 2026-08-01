export const STRUCTURE_DEFINITIONS = [
  {
    id: "wood_foundation",
    name: "Wooden Foundation",
    itemId: "raft_foundation",
    tileId: "wood_foundation_tile",
    width: 1,
    height: 1,
    maxHealth: 100,
    solid: true,
    requiresSupport: false,
    mustConnect: true,
    cost: [{ itemId: "raft_foundation", quantity: 1 }]
  },
  {
    id: "wood_wall",
    name: "Wooden Wall",
    itemId: "wood_wall",
    tileId: "wood_wall_tile",
    width: 1,
    height: 1,
    maxHealth: 80,
    solid: true,
    requiresSupport: true,
    mustConnect: false,
    cost: [{ itemId: "wood_wall", quantity: 1 }]
  },
  {
    id: "storage_crate",
    name: "Storage Crate",
    itemId: "storage_crate",
    width: 1,
    height: 1,
    maxHealth: 70,
    solid: false,
    requiresSupport: true,
    mustConnect: false,
    storageSlots: 12,
    cost: [{ itemId: "storage_crate", quantity: 1 }]
  },
  {
    id: "workbench",
    name: "Workbench",
    itemId: "workbench",
    width: 1,
    height: 1,
    maxHealth: 90,
    solid: false,
    requiresSupport: true,
    mustConnect: false,
    stationType: "workbench",
    cost: [{ itemId: "workbench", quantity: 1 }]
  },
  {
    id: "sail",
    name: "Sail",
    width: 1,
    height: 2,
    maxHealth: 120,
    solid: false,
    requiresSupport: true,
    mustConnect: false
  }
];
