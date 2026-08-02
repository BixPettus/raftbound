export const ENEMY_DEFINITIONS = [
  {
    id: "shore_crawler",
    name: "Shore Crawler",
    implemented: true,
    level: 1,
    threatCost: 2,
    behaviorId: "shore_crawler",
    collider: { width: 30, height: 22 },
    combat: { health: 60, contactDamage: 10, attackRange: 48, attackCooldownSeconds: 1.2 },
    movement: { patrolSpeed: 45, chaseSpeed: 95, chaseRange: 230, patrolRadius: 96 },
    drops: [{ itemId: "crawler_chitin", quantity: 1 }],
    spawnConstraints: { minDistanceFromEdges: 28, minDistanceFromDock: 35, minimumSpacingTiles: 8, requiresSurface: true }
  },
  {
    id: "shore_crawler_alpha",
    name: "Shore Crawler Alpha",
    implemented: true,
    level: 1,
    threatCost: 2,
    behaviorId: "shore_crawler",
    collider: { width: 32, height: 24 },
    combat: { health: 75, contactDamage: 12, attackRange: 48, attackCooldownSeconds: 1.25 },
    movement: { patrolSpeed: 42, chaseSpeed: 90, chaseRange: 235, patrolRadius: 104 },
    drops: [{ itemId: "crawler_chitin", quantity: 1 }],
    spawnConstraints: { minDistanceFromEdges: 30, minDistanceFromDock: 42, minimumSpacingTiles: 9, requiresSurface: true }
  },
  {
    id: "sand_stalker",
    name: "Sand Stalker",
    implemented: true,
    level: 2,
    threatCost: 4,
    behaviorId: "sand_stalker",
    collider: { width: 34, height: 24 },
    combat: { health: 86, contactDamage: 16, lungeDamage: 18, attackRange: 54, attackCooldownSeconds: 1.35 },
    movement: { hiddenSpeed: 0, emergeSeconds: 0.55, patrolSpeed: 36, chaseSpeed: 118, chaseRange: 260, lungeSpeed: 220, lungeSeconds: 0.22, patrolRadius: 116, retreatDistance: 180 },
    drops: [{ itemId: "crawler_chitin", minimum: 1, maximum: 2, chance: 1 }],
    spawnConstraints: { minDistanceFromEdges: 30, minDistanceFromDock: 46, minimumSpacingTiles: 10, requiresSurface: true, requiresDryGround: true, allowedRegion: "desert", safeZoneExclusionTiles: 12 }
  },
  {
    id: "vine_stalker",
    name: "Vine Stalker",
    implemented: true,
    level: 3,
    threatCost: 6,
    behaviorId: "vine_stalker",
    collider: { width: 34, height: 30 },
    combat: { health: 108, contactDamage: 14, lungeDamage: 22, attackRange: 62, attackCooldownSeconds: 1.45 },
    movement: { dormantSpeed: 0, watchSeconds: 0.35, patrolSpeed: 42, stalkSpeed: 105, detectionRange: 275, lungeSpeed: 260, lungeSeconds: 0.2, recoverySeconds: 0.55, patrolRadius: 128, retreatDistance: 210 },
    drops: [
      { itemId: "vine", minimum: 1, maximum: 2, chance: 1 },
      { itemId: "resin", minimum: 1, maximum: 1, chance: 0.45 },
      { itemId: "medicinal_herb", minimum: 1, maximum: 1, chance: 0.12 }
    ],
    spawnConstraints: { minDistanceFromEdges: 32, minDistanceFromDock: 50, minimumSpacingTiles: 11, requiresSurface: true, requiresDryGround: true, allowedRegion: "jungle", safeZoneExclusionTiles: 14 }
  }
];
