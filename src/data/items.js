export const ITEM_DEFINITIONS = [
  { id: "wood", name: "Wood", stackLimit: 99, category: "resource" },
  { id: "stone", name: "Stone", stackLimit: 99, category: "resource" },
  { id: "copper_ore", name: "Copper Ore", stackLimit: 99, category: "resource" },
  { id: "iron_ore", name: "Iron Ore", stackLimit: 99, category: "resource" },
  {
    id: "dirt_block",
    name: "Dirt",
    stackLimit: 999,
    category: "block",
    placement: {
      type: "block",
      tileId: "dirt",
      allowedDomains: ["island_terrain", "raft_block"]
    }
  },
  {
    id: "sand_block",
    name: "Sand",
    stackLimit: 999,
    category: "block",
    placement: {
      type: "block",
      tileId: "sand",
      allowedDomains: ["island_terrain", "raft_block"]
    }
  },
  { id: "fibre", name: "Fibre", stackLimit: 99, category: "resource" },
  { id: "rope", name: "Rope", stackLimit: 50, category: "material" },
  { id: "healing_food", name: "Healing Food", stackLimit: 10, category: "consumable", heal: 25 },
  { id: "basic_axe", name: "Basic Axe", stackLimit: 1, category: "tool", toolType: "axe", toolPower: 1, damage: 18 },
  { id: "basic_pickaxe", name: "Basic Pickaxe", stackLimit: 1, category: "tool", toolType: "pickaxe", toolPower: 1, damage: 18 },
  { id: "building_hammer", name: "Building Hammer", stackLimit: 1, category: "tool", toolType: "hammer", toolPower: 1 },
  { id: "wooden_spear", name: "Wooden Spear", stackLimit: 1, category: "weapon", toolType: "spear", toolPower: 1, damage: 28 },
  { id: "debug_compass", name: "Surveyor's Compass", stackLimit: 1, category: "debug_tool", toolType: "debug_compass", developmentOnly: true },
  { id: "raft_foundation", name: "Wooden Foundation", stackLimit: 20, category: "structure", structureType: "wood_foundation", placement: { type: "structure", structureType: "wood_foundation", allowedDomains: ["raft_structure"] } },
  { id: "wood_wall", name: "Wooden Wall", stackLimit: 20, category: "structure", structureType: "wood_wall", tileId: "wood_wall_tile", placement: { type: "structure", structureType: "wood_wall", allowedDomains: ["raft_structure"] } },
  { id: "storage_crate", name: "Storage Crate", stackLimit: 10, category: "structure", structureType: "storage_crate", placement: { type: "structure", structureType: "storage_crate", allowedDomains: ["raft_structure"] } },
  { id: "workbench", name: "Workbench", stackLimit: 5, category: "structure", structureType: "workbench", placement: { type: "structure", structureType: "workbench", allowedDomains: ["raft_structure"] } },
  { id: "crawler_chitin", name: "Crawler Chitin", stackLimit: 25, category: "material" }
];
