import { SAVE_VERSION, validateSave } from "./save-schema.js";

export function migrateSave(rawSave) {
  if (rawSave?.saveVersion === SAVE_VERSION) return validateSave(rawSave).ok ? rawSave : null;
  if (rawSave?.saveVersion === 1) {
    const oldIsland = rawSave.voyage?.currentIsland;
    const hasOldRemovedResources = (oldIsland?.removedResourceIds ?? []).length > 0;
    const migrated = {
      ...rawSave,
      saveVersion: SAVE_VERSION,
      raft: {
        ...rawSave.raft,
        blocks: Array.isArray(rawSave.raft?.blocks) ? rawSave.raft.blocks : []
      },
      voyage: {
        ...rawSave.voyage,
        currentState: hasOldRemovedResources ? "SAILING" : rawSave.voyage?.currentState,
        currentIsland: oldIsland && !hasOldRemovedResources ? {
          ...oldIsland,
          itemDrops: []
        } : null
      }
    };
    return validateSave(migrated).ok ? migrated : null;
  }
  return null;
}
