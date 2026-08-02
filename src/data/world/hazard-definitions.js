export const HAZARD_DEFINITIONS = [
  {
    id: "cactus_contact",
    trigger: "contact",
    damage: { amount: 4, cooldownSeconds: 0.7, type: "environmental" }
  },
  {
    id: "thorn_vine_contact",
    trigger: "contact",
    damage: { amount: 5, cooldownSeconds: 0.8, type: "environmental" }
  },
  {
    id: "poison_bloom_toxin",
    trigger: "proximity",
    effectId: "jungle_toxin",
    radiusTiles: 3
  }
];
