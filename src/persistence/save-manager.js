import { CONFIG } from "../config.js";
import { createSaveObject, validateSave } from "./save-schema.js";
import { migrateSave } from "./migrations.js";

export class SaveManager {
  constructor(storage = window.localStorage) {
    this.storage = storage;
    this.lastError = null;
    this.dirtyReasons = new Set();
  }

  hasSave() {
    return Boolean(this.storage.getItem(CONFIG.SAVE_KEY));
  }

  save(game) {
    const save = createSaveObject(game);
    this.storage.setItem(CONFIG.SAVE_KEY, JSON.stringify(save));
    this.dirtyReasons.clear();
    return save;
  }

  markDirty(reason = "world_changed") {
    this.dirtyReasons.add(reason);
  }

  isDirty() {
    return this.dirtyReasons.size > 0;
  }

  load() {
    const raw = this.storage.getItem(CONFIG.SAVE_KEY);
    if (!raw) return { ok: false, reason: "No save found." };
    try {
      const parsed = JSON.parse(raw);
      const migrated = migrateSave(parsed);
      const validation = validateSave(migrated);
      if (!validation.ok) {
        this.preserveInvalid(raw);
        return validation;
      }
      return { ok: true, save: migrated };
    } catch (error) {
      this.preserveInvalid(raw);
      this.lastError = error;
      return { ok: false, reason: "Save could not be parsed." };
    }
  }

  reset() {
    this.storage.removeItem(CONFIG.SAVE_KEY);
  }

  preserveInvalid(raw) {
    try {
      this.storage.setItem(CONFIG.INVALID_SAVE_KEY, raw);
    } catch {
      // localStorage can be full or unavailable; invalid saves should not block play.
    }
  }
}
