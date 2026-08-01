import { SAVE_VERSION, sanitizeSaveForRuntimeMode, validateSave } from "./save-schema.js";
import { getSavedIslandCompatibility } from "../world/island-generator.js";

export function migrateSave(rawSave) {
  if (rawSave?.saveVersion === SAVE_VERSION) {
    const save = sanitizeSaveForRuntimeMode(discardIncompatibleIsland(rawSave));
    return validateSave(save).ok ? save : null;
  }
  if (rawSave?.saveVersion === 2) {
    const migrated = {
      ...rawSave,
      saveVersion: SAVE_VERSION,
      voyage: {
        ...rawSave.voyage,
        voyageSeed: rawSave.voyage?.voyageSeed ?? createMigrationVoyageSeed(),
        encounterRollIndex: 0,
        debugRollIndex: 0,
        progression: { level: 1, experience: 0, unlocks: [] },
        currentState: "SAILING",
        currentIsland: null,
        generationMigrationNotice: "Legacy active island discarded for Generation V4 catalog migration. Persistent raft and player progress were preserved."
      }
    };
    const sanitized = sanitizeSaveForRuntimeMode(migrated);
    return validateSave(sanitized).ok ? sanitized : null;
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
        voyageSeed: createMigrationVoyageSeed(),
        encounterRollIndex: 0,
        debugRollIndex: 0,
        progression: { level: 1, experience: 0, unlocks: [] },
        currentState: hasOldRemovedResources ? "SAILING" : rawSave.voyage?.currentState,
        currentIsland: oldIsland && !hasOldRemovedResources ? {
          ...oldIsland,
          itemDrops: []
        } : null
      }
    };
    const compatible = sanitizeSaveForRuntimeMode(discardIncompatibleIsland(migrated));
    return validateSave(compatible).ok ? compatible : null;
  }
  return null;
}

function discardIncompatibleIsland(save) {
  const island = save?.voyage?.currentIsland;
  if (!island || getSavedIslandCompatibility(island).ok) return save;
  return {
    ...save,
    voyage: {
      ...save.voyage,
      currentState: "SAILING",
      currentIsland: null,
      generationMigrationNotice: "Active island discarded after catalog recipe compatibility check. Persistent raft, player progress, and voyage progression were preserved."
    }
  };
}

function createMigrationVoyageSeed() {
  return `migrated-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}
