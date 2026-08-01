export const ENEMY_SPAWN_TABLES = [
  {
    id: "temperate_enemies",
    implemented: true,
    budgetBySize: { small: 2, medium: 4, large: 6 },
    entries: [{ enemyId: "shore_crawler", weight: 1, density: 1, minCount: 1, maxCountBySize: { small: 1, medium: 2, large: 3 } }]
  },
  {
    id: "desert_enemies",
    implemented: false,
    budgetBySize: { small: 3, medium: 6, large: 9 },
    entries: [{ enemyId: "sand_stalker", weight: 1, density: 1, minCount: 1, maxCountBySize: { small: 1, medium: 2, large: 4 } }]
  },
  { id: "jungle_enemies", implemented: false, budgetBySize: { small: 4, medium: 7, large: 10 }, entries: [{ enemyId: "shore_crawler", weight: 1, density: 1.2, minCount: 1, maxCountBySize: { small: 2, medium: 3, large: 5 } }] },
  { id: "volcanic_enemies", implemented: false, budgetBySize: { small: 5, medium: 9, large: 14 }, entries: [{ enemyId: "shore_crawler", weight: 1, density: 1.5, minCount: 2, maxCountBySize: { small: 2, medium: 4, large: 6 } }] }
];

