import { getSurfaceProfile } from "../content/biome-profile-registry.js";

export function generateSurface(context) {
  const random = context.randomStreams.get("surface");
  const { width, seaLevelTile } = context.definition;
  const startX = context.profile.startX;
  const endX = width - context.profile.endMargin;
  let previous = seaLevelTile - 1;
  const mesaBands = planMesaBands(context, random, startX, endX);

  for (let x = 0; x < width; x += 1) {
    if (x < startX || x >= endX) {
      context.surfaceHeights[x] = seaLevelTile + 4;
      continue;
    }
    const t = (x - startX) / Math.max(1, endX - startX);
    const surfaceProfile = getSurfaceProfile(context.getBiomeAt(x).terrain.surfaceProfileId);
    const envelope = Math.sin(Math.PI * t);
    const broad = Math.sin(t * Math.PI * surfaceProfile.envelope.broadFrequency + random.range(-0.5, 0.5)) * 3.2;
    const medium = Math.sin(t * Math.PI * surfaceProfile.envelope.mediumFrequency + random.range(-1, 1)) * 1.3;
    const detail = Math.sin(t * Math.PI * surfaceProfile.envelope.detailFrequency + random.range(-1, 1)) * (surfaceProfile.surfaceVariation.duneAmplitude ?? 0) * 0.24;
    const mesa = mesaBands.find((band) => x >= band.startX && x <= band.endX);
    const terrace = surfaceProfile.surfaceVariation.terraceChance > 0 && ((x + context.diagnostics.attempt) % 11 === 0) ? 1 : 0;
    const target = Math.round(seaLevelTile - 1 - envelope * (7 * surfaceProfile.envelope.inlandHeightMultiplier + broad) - medium - detail - (mesa?.height ?? 0) + terrace);
    const maxStep = x < startX + context.recipe.edgeProfiles.arrival.width ? 0 : 1;
    previous = clamp(target, previous - maxStep, previous + maxStep);
    context.surfaceHeights[x] = clamp(previous, seaLevelTile - 13, seaLevelTile - 1);
  }

  enforceArrival(context);
}

function planMesaBands(context, random, startX, endX) {
  const bands = [];
  for (const region of context.recipe.biomeRegions) {
    const surfaceProfile = getSurfaceProfile(context.getBiomeAt(region.startX).terrain.surfaceProfileId);
    for (const landmark of surfaceProfile.landmarks ?? []) {
      if (landmark.type !== "mesa" || random.next() > landmark.probability) continue;
      const minX = Math.max(region.startX + region.transitionWidth + 8, startX + context.recipe.edgeProfiles.arrival.width + 24);
      const maxX = Math.min(region.endX - region.transitionWidth - landmark.maximumWidth, endX - context.recipe.edgeProfiles.far.width - 20);
      if (minX >= maxX) continue;
      const width = random.int(landmark.minimumWidth, landmark.maximumWidth);
      const mesaStart = random.int(minX, maxX);
      bands.push({ startX: mesaStart, endX: mesaStart + width, height: random.int(landmark.heightRange[0], landmark.heightRange[1]) });
    }
  }
  return bands;
}

function enforceArrival(context) {
  const { seaLevelTile } = context.definition;
  const startX = context.profile.startX;
  const end = startX + context.recipe.edgeProfiles.arrival.width;
  for (let x = startX; x <= end; x += 1) {
    context.surfaceHeights[x] = seaLevelTile - 1;
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
