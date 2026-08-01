export const SAVE_VERSION = 2;

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
  if (!Array.isArray(value.raft.blocks)) return { ok: false, reason: "Raft blocks are invalid." };
  for (const block of value.raft.blocks) {
    if (!block.tileId || !Number.isFinite(block.gridX) || !Number.isFinite(block.gridY)) return { ok: false, reason: "Raft block is invalid." };
  }
  const islandDrops = value.voyage.currentIsland?.itemDrops;
  if (islandDrops && !Array.isArray(islandDrops)) return { ok: false, reason: "Island drops are invalid." };
  return { ok: true };
}
