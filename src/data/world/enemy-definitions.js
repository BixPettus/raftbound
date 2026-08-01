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
    implemented: false,
    level: 2,
    threatCost: 4,
    behaviorId: "shore_crawler",
    collider: { width: 30, height: 22 },
    combat: { health: 80, contactDamage: 14, attackRange: 48, attackCooldownSeconds: 1.2 },
    movement: { patrolSpeed: 50, chaseSpeed: 105, chaseRange: 245, patrolRadius: 104 },
    drops: [{ itemId: "crawler_chitin", quantity: 1 }],
    spawnConstraints: { minDistanceFromEdges: 30, minDistanceFromDock: 40, minimumSpacingTiles: 8, requiresSurface: true }
  }
];
