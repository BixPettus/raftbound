export const RECIPE_DEFINITIONS = [
  {
    id: "rope",
    name: "Rope",
    output: { itemId: "rope", quantity: 1 },
    ingredients: [{ itemId: "fibre", quantity: 3 }],
    station: null
  },
  {
    id: "wood_foundation",
    name: "Wooden Foundation",
    output: { itemId: "raft_foundation", quantity: 1 },
    ingredients: [
      { itemId: "wood", quantity: 4 },
      { itemId: "fibre", quantity: 2 }
    ],
    station: null
  },
  {
    id: "wood_wall",
    name: "Wooden Wall",
    output: { itemId: "wood_wall", quantity: 1 },
    ingredients: [{ itemId: "wood", quantity: 3 }],
    station: null
  },
  {
    id: "storage_crate",
    name: "Storage Crate",
    output: { itemId: "storage_crate", quantity: 1 },
    ingredients: [
      { itemId: "wood", quantity: 6 },
      { itemId: "rope", quantity: 1 }
    ],
    station: "workbench"
  },
  {
    id: "wooden_spear",
    name: "Wooden Spear",
    output: { itemId: "wooden_spear", quantity: 1 },
    ingredients: [
      { itemId: "wood", quantity: 3 },
      { itemId: "fibre", quantity: 2 }
    ],
    station: null
  },
  {
    id: "healing_food",
    name: "Healing Food",
    output: { itemId: "healing_food", quantity: 1 },
    ingredients: [
      { itemId: "fibre", quantity: 4 },
      { itemId: "crawler_chitin", quantity: 1 }
    ],
    station: null
  }
];
