export const ISLAND_ARCHETYPES = [
  {
    id: "standard",
    name: "Standard Island",
    implemented: true,
    generation: { surfaceComplexityMultiplier: 1, caveComplexityMultiplier: 1, chamberMultiplier: 1, pointOfInterestBudgetMultiplier: 1, enemyBudgetMultiplier: 1 },
    dangerModifier: 0,
    compatibility: { minimumBiomes: 1, maximumBiomes: 3, allowedSpecialAttributes: ["starter_safe", "resource_rich", "cavernous", "hostile"] }
  },
  {
    id: "cavernous",
    name: "Cavernous Island",
    implemented: true,
    generation: { surfaceComplexityMultiplier: 1, caveComplexityMultiplier: 1.25, chamberMultiplier: 1.25, pointOfInterestBudgetMultiplier: 1, enemyBudgetMultiplier: 1 },
    dangerModifier: 3,
    compatibility: { minimumBiomes: 1, maximumBiomes: 3, allowedSpecialAttributes: ["cavernous", "resource_rich", "hostile"] }
  },
  {
    id: "resource_rich",
    name: "Resource-rich Island",
    implemented: true,
    generation: { surfaceComplexityMultiplier: 1, caveComplexityMultiplier: 1, chamberMultiplier: 1, pointOfInterestBudgetMultiplier: 1, enemyBudgetMultiplier: 0.9 },
    dangerModifier: -1,
    compatibility: { minimumBiomes: 1, maximumBiomes: 3, allowedSpecialAttributes: ["starter_safe", "resource_rich", "cavernous"] }
  },
  {
    id: "hostile",
    name: "Hostile Island",
    implemented: false,
    generation: { surfaceComplexityMultiplier: 1.1, caveComplexityMultiplier: 1.1, chamberMultiplier: 1, pointOfInterestBudgetMultiplier: 1, enemyBudgetMultiplier: 1.6 },
    dangerModifier: 12,
    compatibility: { minimumBiomes: 1, maximumBiomes: 3, allowedSpecialAttributes: ["hostile", "storm_exposed"] }
  },
  {
    id: "boss",
    name: "Boss Island",
    implemented: false,
    generation: { surfaceComplexityMultiplier: 1.2, caveComplexityMultiplier: 1.2, chamberMultiplier: 1.2, pointOfInterestBudgetMultiplier: 1.5, enemyBudgetMultiplier: 2 },
    dangerModifier: 20,
    compatibility: { minimumBiomes: 1, maximumBiomes: 2, allowedSpecialAttributes: ["boss_presence", "quest_locked"] }
  },
  {
    id: "quest",
    name: "Quest Island",
    implemented: false,
    generation: { surfaceComplexityMultiplier: 1, caveComplexityMultiplier: 1, chamberMultiplier: 1, pointOfInterestBudgetMultiplier: 2, enemyBudgetMultiplier: 1 },
    dangerModifier: 0,
    compatibility: { minimumBiomes: 1, maximumBiomes: 3, allowedSpecialAttributes: ["quest_locked", "ancient_ruins"] }
  }
];

