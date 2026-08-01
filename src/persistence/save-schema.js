import { CONFIG } from "../config.js";
import { getItemDefinition } from "../items/item-registry.js";

export const SAVE_VERSION = 3;

export function createSaveObject(game) {
  return {
    saveVersion: SAVE_VERSION,
    createdAt: game.createdAt,
    updatedAt: new Date().toISOString(),
    voyage: {
      distanceTravelled: game.distanceTravelled,
      encounterCount: game.encounterCount,
      voyageSeed: game.voyageSeed,
      encounterRollIndex: game.encounterRollIndex,
      debugRollIndex: game.debugRollIndex,
      progression: game.progression,
      currentState: game.state.current,
      pendingEncounter: serializePendingEncounter(game.pendingEncounter),
      currentIsland: game.serializeCurrentIsland()
    },
    player: game.player.serialize(),
    raft: game.raft.serialize()
  };
}

export function sanitizeSaveForRuntimeMode(save, { developmentMode = CONFIG.DEVELOPMENT_MODE } = {}) {
  if (!save || typeof save !== "object") return save;
  const sanitized = structuredClone(save);
  if (developmentMode) return sanitized;

  sanitized.player ??= {};
  sanitized.voyage ??= {};
  sanitized.player.inventory = stripDevelopmentItems(sanitized.player.inventory);
  if (Array.isArray(sanitized.player.hotbar)) sanitized.player.hotbar = stripDevelopmentItems(sanitized.player.hotbar);
  else if (sanitized.player.hotbar?.slots) sanitized.player.hotbar.slots = stripDevelopmentItems(sanitized.player.hotbar.slots);

  if (sanitized.voyage.pendingEncounter?.rollType === "debug") sanitized.voyage.pendingEncounter = null;
  sanitized.voyage.debugRollIndex = 0;
  delete sanitized.voyage.compassOptions;
  delete sanitized.voyage.debugState;
  delete sanitized.pendingCommands;
  delete sanitized.debugState;
  return sanitized;
}

export function validateSave(value, { developmentMode = CONFIG.DEVELOPMENT_MODE } = {}) {
  if (!value || typeof value !== "object") return { ok: false, reason: "Save is not an object." };
  if (value.saveVersion !== SAVE_VERSION) return { ok: false, reason: "Unsupported save version." };
  if (!value.voyage || !value.player || !value.raft) return { ok: false, reason: "Save is missing required sections." };
  if (!Array.isArray(value.player.inventory)) return { ok: false, reason: "Player inventory is invalid." };
  if (containsProductionOnlyInvalidItem(value.player.inventory, developmentMode) || containsProductionOnlyInvalidItem(value.player.hotbar?.slots ?? value.player.hotbar ?? [], developmentMode)) {
    return { ok: false, reason: "Save contains development-only items in production." };
  }
  if (!Array.isArray(value.raft.structures)) return { ok: false, reason: "Raft structures are invalid." };
  if (!Array.isArray(value.raft.blocks)) return { ok: false, reason: "Raft blocks are invalid." };
  for (const block of value.raft.blocks) {
    if (!block.tileId || !Number.isFinite(block.gridX) || !Number.isFinite(block.gridY)) return { ok: false, reason: "Raft block is invalid." };
  }
  const islandDrops = value.voyage.currentIsland?.itemDrops;
  if (islandDrops && !Array.isArray(islandDrops)) return { ok: false, reason: "Island drops are invalid." };
  return { ok: true };
}

function serializePendingEncounter(encounter) {
  if (!encounter) return null;
  return {
    rollType: encounter.rollType,
    rollIndex: encounter.rollIndex,
    seed: encounter.seed,
    templateId: encounter.templateId,
    size: encounter.size,
    recipeHash: encounter.recipeHash,
    catalogVersion: encounter.catalogVersion,
    generationVersion: encounter.generationVersion,
    remaining: encounter.remaining
  };
}

function containsProductionOnlyInvalidItem(slots, developmentMode) {
  if (developmentMode) return false;
  return slots.some((slot) => {
    if (!slot?.itemId) return false;
    try {
      return getItemDefinition(slot.itemId).developmentOnly === true;
    } catch {
      return true;
    }
  });
}

function stripDevelopmentItems(slots) {
  if (!Array.isArray(slots)) return [];
  return slots.map((slot) => {
    if (!slot?.itemId) return slot ?? null;
    try {
      return getItemDefinition(slot.itemId).developmentOnly === true ? null : slot;
    } catch {
      return null;
    }
  });
}
