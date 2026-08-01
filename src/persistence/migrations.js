import { SAVE_VERSION, validateSave } from "./save-schema.js";
import { CONFIG } from "../config.js";

export function migrateSave(rawSave) {
  if (rawSave?.saveVersion === SAVE_VERSION) {
    const save = discardLegacyIsland(rawSave);
    return validateSave(save).ok ? save : null;
  }
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
    const compatible = discardLegacyIsland(migrated);
    return validateSave(compatible).ok ? compatible : null;
  }
  return null;
}

function discardLegacyIsland(save) {
  const island = save?.voyage?.currentIsland;
  if (!island || (island.generationVersion ?? 0) >= CONFIG.GENERATION_VERSION) return save;
  return {
    ...save,
    voyage: {
      ...save.voyage,
      currentState: "SAILING",
      currentIsland: null,
      generationMigrationNotice: "Legacy active island discarded for Generation V3. Persistent raft and player progress were preserved."
    }
  };
}
