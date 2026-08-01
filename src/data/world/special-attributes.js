export const SPECIAL_ATTRIBUTES = [
  { id: "starter_safe", name: "Starter Safe", implemented: true, dangerModifier: -8, requirements: { minimumGenerationRating: 1, compatibleArchetypes: ["standard", "resource_rich"] }, generationModifiers: { enemyBudgetMultiplier: 0.65 } },
  { id: "resource_rich", name: "Resource-rich", implemented: true, dangerModifier: -1, requirements: { minimumGenerationRating: 2, compatibleArchetypes: ["standard", "resource_rich", "cavernous"] }, generationModifiers: { resourceMultiplier: 1.35 } },
  { id: "cavernous", name: "Cavernous", implemented: true, dangerModifier: 4, requirements: { minimumGenerationRating: 2, compatibleArchetypes: ["standard", "cavernous", "resource_rich"] }, generationModifiers: { caveAirRatioMultiplier: 1.15, chamberMultiplier: 1.25, deepCavernMultiplier: 1.25 } },
  { id: "hostile", name: "Hostile", implemented: false, dangerModifier: 12, requirements: { minimumGenerationRating: 3, compatibleArchetypes: ["standard", "cavernous", "hostile"] }, generationModifiers: { enemyBudgetMultiplier: 1.5 } },
  { id: "boss_presence", name: "Boss Presence", implemented: false, dangerModifier: 18, requirements: { minimumGenerationRating: 5, compatibleArchetypes: ["boss"] }, generationModifiers: { enemyBudgetMultiplier: 2 } },
  { id: "quest_locked", name: "Quest Locked", implemented: false, dangerModifier: 0, requirements: { minimumGenerationRating: 3, compatibleArchetypes: ["quest", "boss"] }, generationModifiers: {} },
  { id: "storm_exposed", name: "Storm Exposed", implemented: false, dangerModifier: 10, requirements: { minimumGenerationRating: 3, compatibleArchetypes: ["hostile", "standard"] }, generationModifiers: {} },
  { id: "ancient_ruins", name: "Ancient Ruins", implemented: false, dangerModifier: 5, requirements: { minimumGenerationRating: 3, compatibleArchetypes: ["quest", "standard"] }, generationModifiers: { pointOfInterestBudget: 2 } }
];

