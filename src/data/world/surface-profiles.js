export const SURFACE_PROFILES = [
  {
    id: "temperate_rolling",
    envelope: { inlandHeightMultiplier: 1, broadFrequency: 2.4, mediumFrequency: 8.5, detailFrequency: 12 },
    slope: { normalMaximum: 1, cliffChance: 0, cliffMaximum: 1 },
    landmarks: [],
    surfaceVariation: { duneAmplitude: 0, terraceChance: 0 }
  },
  {
    id: "desert_dunes",
    envelope: { inlandHeightMultiplier: 0.85, broadFrequency: 1.8, mediumFrequency: 6.2, detailFrequency: 13 },
    slope: { normalMaximum: 1, cliffChance: 0.04, cliffMaximum: 2 },
    landmarks: [{ type: "mesa", probability: 0.35, minimumWidth: 14, maximumWidth: 30, heightRange: [3, 6] }],
    surfaceVariation: { duneAmplitude: 2.5, terraceChance: 0.12 }
  },
  {
    id: "jungle_dense",
    envelope: { inlandHeightMultiplier: 1, broadFrequency: 2.6, mediumFrequency: 9, detailFrequency: 14 },
    slope: { normalMaximum: 1, cliffChance: 0, cliffMaximum: 1 },
    landmarks: [],
    surfaceVariation: { duneAmplitude: 0, terraceChance: 0 }
  },
  {
    id: "volcanic_ridges",
    envelope: { inlandHeightMultiplier: 1, broadFrequency: 2.8, mediumFrequency: 8, detailFrequency: 12 },
    slope: { normalMaximum: 1, cliffChance: 0, cliffMaximum: 1 },
    landmarks: [],
    surfaceVariation: { duneAmplitude: 0, terraceChance: 0 }
  }
];
