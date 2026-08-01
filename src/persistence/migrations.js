import { SAVE_VERSION, validateSave } from "./save-schema.js";

export function migrateSave(rawSave) {
  if (rawSave?.saveVersion === SAVE_VERSION) return validateSave(rawSave).ok ? rawSave : null;
  return null;
}
