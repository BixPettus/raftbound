import { SURFACE_PROFILES } from "../../data/world/surface-profiles.js";
import { STRATA_PROFILES } from "../../data/world/strata-profiles.js";
import { CAVE_PROFILES } from "../../data/world/cave-profiles.js";
import { ORE_PROFILES } from "../../data/world/ore-profiles.js";

const surfaceProfiles = freezeById(SURFACE_PROFILES);
const strataProfiles = freezeById(STRATA_PROFILES);
const caveProfiles = freezeById(CAVE_PROFILES);
const oreProfiles = freezeById(ORE_PROFILES);

export function getSurfaceProfile(id) {
  return mustFind(surfaceProfiles, id, "surface profile");
}

export function getStrataProfile(id) {
  return mustFind(strataProfiles, id, "strata profile");
}

export function getCaveProfile(id) {
  return mustFind(caveProfiles, id, "cave profile");
}

export function getOreProfile(id) {
  return mustFind(oreProfiles, id, "ore profile");
}

export function listSurfaceProfiles() {
  return [...surfaceProfiles.values()];
}

export function listStrataProfiles() {
  return [...strataProfiles.values()];
}

export function listCaveProfiles() {
  return [...caveProfiles.values()];
}

export function listOreProfiles() {
  return [...oreProfiles.values()];
}

function freezeById(records) {
  return new Map(records.map((record) => [record.id, deepFreeze(structuredClone(record))]));
}

function mustFind(map, id, label) {
  const record = map.get(id);
  if (!record) throw new Error(`Unknown ${label}: ${id}`);
  return record;
}

function deepFreeze(value) {
  if (!value || typeof value !== "object") return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}
