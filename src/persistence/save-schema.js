export const SAVE_VERSION = 1;

export function createSaveObject(game) {
  return {
    saveVersion: SAVE_VERSION,
    createdAt: game.createdAt,
    updatedAt: new Date().toISOString(),
    voyage: {
      distanceTravelled: game.distanceTravelled,
      encounterCount: game.encounterCount,
      currentState: game.state.current,
      currentIsland: game.serializeCurrentIsland()
    },
    player: game.player.serialize(),
    raft: game.raft.serialize()
  };
}

export function validateSave(value) {
  if (!value || typeof value !== "object") return { ok: false, reason: "Save is not an object." };
  if (value.saveVersion !== SAVE_VERSION) return { ok: false, reason: "Unsupported save version." };
  if (!value.voyage || !value.player || !value.raft) return { ok: false, reason: "Save is missing required sections." };
  if (!Array.isArray(value.player.inventory)) return { ok: false, reason: "Player inventory is invalid." };
  if (!Array.isArray(value.raft.structures)) return { ok: false, reason: "Raft structures are invalid." };
  return { ok: true };
}
