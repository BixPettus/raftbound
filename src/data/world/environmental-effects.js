export const ENVIRONMENTAL_EFFECTS = [
  {
    id: "desert_heat",
    meter: { maximum: 100, increasePerSecond: 6, recoveryPerSecond: 12 },
    activation: {
      biomeIds: ["desert"],
      zones: ["surface"],
      disabledInWater: true,
      disabledUnderground: true,
      disabledInSafeZone: true
    },
    thresholds: [
      { value: 70, status: "overheated" },
      { value: 100, damagePerSecond: 4 }
    ]
  }
];
