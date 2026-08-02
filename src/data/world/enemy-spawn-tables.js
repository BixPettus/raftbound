export const ENEMY_SPAWN_TABLES = [
  {
    id: "temperate_enemies",
    implemented: true,
    budgetBySize: { small: 2, medium: 4, large: 6 },
    entries: [
      { enemyId: "shore_crawler", weight: 3, density: 1, minCount: 1, maxCountBySize: { small: 1, medium: 2, large: 3 } },
      { enemyId: "shore_crawler_alpha", weight: 1, density: 0.75, minCount: 0, maxCountBySize: { small: 1, medium: 1, large: 2 } }
    ]
  },
  {
    id: "desert_enemies",
    implemented: true,
    budgetBySize: { small: 4, medium: 8, large: 12 },
    entries: [
      { enemyId: "sand_stalker", weight: 5, density: 1, minCount: 1, maxCountBySize: { small: 1, medium: 2, large: 4 }, allowedRegion: "desert", minimumPlayerLevel: 2, minimumSpacingTiles: 10, safeZoneExclusionTiles: 12, requiresDryGround: true },
      { enemyId: "shore_crawler", weight: 1, density: 0.25, minCount: 0, maxCountBySize: { small: 0, medium: 1, large: 1 }, allowedRegion: "shore", minimumPlayerLevel: 1, minimumSpacingTiles: 12, safeZoneExclusionTiles: 12 }
    ]
  },
  { id: "jungle_enemies", implemented: false, budgetBySize: { small: 4, medium: 7, large: 10 }, entries: [{ enemyId: "shore_crawler", weight: 1, density: 1.2, minCount: 1, maxCountBySize: { small: 2, medium: 3, large: 5 } }] },
  { id: "volcanic_enemies", implemented: false, budgetBySize: { small: 5, medium: 9, large: 14 }, entries: [{ enemyId: "shore_crawler", weight: 1, density: 1.5, minCount: 2, maxCountBySize: { small: 2, medium: 4, large: 6 } }] }
];
