export function generateSurface(context) {
  const random = context.randomStreams.get("surface");
  const { width, seaLevelTile } = context.definition;
  const startX = context.profile.startX;
  const endX = width - context.profile.endMargin;
  let previous = seaLevelTile - 1;

  for (let x = 0; x < width; x += 1) {
    if (x < startX || x >= endX) {
      context.surfaceHeights[x] = seaLevelTile + 4;
      continue;
    }
    const t = (x - startX) / Math.max(1, endX - startX);
    const envelope = Math.sin(Math.PI * t);
    const broad = Math.sin(t * Math.PI * 2.4 + random.range(-0.5, 0.5)) * 3.2;
    const medium = Math.sin(t * Math.PI * 8.5 + random.range(-1, 1)) * 1.3;
    const target = Math.round(seaLevelTile - 1 - envelope * (7 + broad) - medium);
    const maxStep = x < startX + context.recipe.edgeProfiles.arrival.width ? 0 : 1;
    previous = clamp(target, previous - maxStep, previous + maxStep);
    context.surfaceHeights[x] = clamp(previous, seaLevelTile - 13, seaLevelTile - 1);
  }

  enforceArrival(context);
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
