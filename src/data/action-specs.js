export const ACTION_SPECS = Object.freeze({
  mine: {
    id: "mine",
    actionType: "mine",
    windupSeconds: 0.12,
    activeSeconds: 0.06,
    recoverySeconds: 0.18,
    repeatMode: "held",
    rangeTiles: 4,
    requiresLineOfSight: true
  },
  harvest: {
    id: "harvest",
    actionType: "harvest",
    windupSeconds: 0.1,
    activeSeconds: 0.06,
    recoverySeconds: 0.18,
    repeatMode: "held",
    rangeTiles: 3.5,
    requiresLineOfSight: true
  },
  spear: {
    id: "spear",
    actionType: "spear",
    windupSeconds: 0.1,
    activeSeconds: 0.08,
    recoverySeconds: 0.28,
    repeatMode: "press",
    rangeTiles: 3,
    requiresLineOfSight: false
  },
  place: {
    id: "place",
    actionType: "place",
    windupSeconds: 0.08,
    activeSeconds: 0.04,
    recoverySeconds: 0.12,
    repeatMode: "press",
    rangeTiles: 4,
    requiresLineOfSight: true
  },
  consume: {
    id: "consume",
    actionType: "consume",
    windupSeconds: 0.12,
    activeSeconds: 0.04,
    recoverySeconds: 0.2,
    repeatMode: "press",
    rangeTiles: 0,
    requiresLineOfSight: false
  }
});

export function getActionSpec(actionType) {
  const spec = ACTION_SPECS[actionType];
  if (!spec) throw new Error(`Unknown action spec: ${actionType}`);
  return spec;
}
