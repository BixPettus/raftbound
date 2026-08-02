import { getCaveProfile } from "../content/biome-profile-registry.js";

export function createCaveGraph(context) {
  const entrances = placeEntrances(context);
  const upper = placeChambers(context, "UPPER_CHAMBER", context.profile.caveTargets.upper, 0.14, 0.28, 5, 8);
  const mid = placeChambers(context, "MID_CHAMBER", context.profile.caveTargets.mid, 0.36, 0.62, 8, 14);
  const deep = placeChambers(context, "DEEP_CAVERN", context.profile.caveTargets.deep, 0.68, 0.86, 13, 22);
  const side = placeChambers(context, "SIDE_CHAMBER", context.profile.caveTargets.side, 0.25, 0.72, 5, 10);
  context.caveGraph.nodes.push(...entrances, ...upper, ...mid, ...deep, ...side);

  for (let i = 0; i < entrances.length; i += 1) connect(context, entrances[i], upper[i % upper.length], "MAIN_ROUTE");
  const main = [...upper, ...mid, ...deep];
  for (let i = 0; i < main.length - 1; i += 1) connect(context, main[i], main[i + 1], "MAIN_ROUTE");
  side.forEach((node, index) => connect(context, node, main[index % main.length], "BRANCH"));
  if (context.definition.size !== "small" && main.length > 3) {
    connect(context, main[1], main[Math.min(main.length - 1, 4)], "LOOP");
  }
  return context.caveGraph;
}

function placeEntrances(context) {
  const random = context.randomStreams.get("cave-entrances");
  const count = context.profile.caveTargets.entrances;
  const nodes = [];
  const minX = context.profile.startX + context.recipe.edgeProfiles.arrival.width + 12;
  const maxX = context.definition.width - context.profile.endMargin - context.recipe.edgeProfiles.far.width - 8;
  for (let i = 0; i < count; i += 1) {
    const anchor = count === 1 ? minX + 2 : minX + ((i + 0.45) / count) * (maxX - minX);
    const x = clamp(Math.round(anchor + random.int(-5, 5)), minX, maxX);
    const profile = getCaveProfile(context.getBiomeAt(x).caves.profileId);
    const isSinkhole = count > 1 && profile.entrances.styles.includes("sinkhole") && i === count - 1;
    const y = context.surfaceHeights[x] + (isSinkhole ? 5 : 2);
    nodes.push(node(context, `entrance-${i}`, isSinkhole ? "SINKHOLE_ENTRANCE" : "SURFACE_ENTRANCE", x, y, isSinkhole ? 2.8 : 2.4, isSinkhole ? 4.8 : 2.2, "surface", true));
  }
  return nodes;
}

function placeChambers(context, type, count, minDepth, maxDepth, minRadiusX, maxRadiusX) {
  const random = context.randomStreams.get("cave-chambers");
  const nodes = [];
  const minX = context.profile.startX + context.recipe.edgeProfiles.arrival.width + 18;
  const maxX = context.definition.width - context.profile.endMargin - context.recipe.edgeProfiles.far.width - 12;
  const depthRange = adjustedDepthRange(context, type, minDepth, maxDepth);
  for (let i = 0; i < count; i += 1) {
    const x = chamberX(context, type, i, count, minX, maxX, random);
    const surfaceY = context.surfaceHeights[x];
    const y = Math.round(surfaceY + (context.definition.height - surfaceY) * random.range(depthRange.min, depthRange.max));
    const caveProfile = getCaveProfile(context.getBiomeAt(x).caves.profileId);
    const rx = random.range(minRadiusX, maxRadiusX) * caveProfile.carving.tunnelWidthMultiplier;
    const ry = (type === "DEEP_CAVERN" ? random.range(7, 12) : random.range(4, 7)) * caveProfile.carving.tunnelHeightMultiplier;
    nodes.push(node(context, `${type.toLowerCase()}-${i}`, type, x, y, rx, ry, type.toLowerCase(), true));
  }
  return nodes;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function adjustedDepthRange(context, type, minDepth, maxDepth) {
  if (context.definition.size !== "small") return { min: minDepth, max: maxDepth };
  if (type === "UPPER_CHAMBER") return { min: Math.min(minDepth, 0.1), max: Math.min(maxDepth, 0.22) };
  if (type === "MID_CHAMBER") return { min: Math.min(minDepth, 0.3), max: Math.min(maxDepth, 0.48) };
  if (type === "DEEP_CAVERN") return { min: Math.min(minDepth, 0.58), max: Math.min(maxDepth, 0.72) };
  return { min: minDepth, max: maxDepth };
}

function chamberX(context, type, index, count, minX, maxX, random) {
  if (type === "SIDE_CHAMBER") return random.int(minX, maxX);
  const bands = context.definition.size === "small" ? {
    UPPER_CHAMBER: [0.28, 0.36],
    MID_CHAMBER: [0.52, 0.72],
    DEEP_CAVERN: [0.8, 0.94]
  } : {
    UPPER_CHAMBER: [0.04, 0.2],
    MID_CHAMBER: [0.38, 0.7],
    DEEP_CAVERN: [0.78, 0.94]
  };
  const [start, end] = bands[type] ?? [0.15, 0.85];
  const t = count <= 1 ? (start + end) / 2 : start + ((index + 0.5) / count) * (end - start);
  const span = maxX - minX;
  const jitter = random.int(-Math.max(4, Math.round(span * 0.025)), Math.max(4, Math.round(span * 0.025)));
  return clamp(Math.round(minX + span * t + jitter), minX, maxX);
}

function node(context, id, type, centerX, centerY, radiusX, radiusY, depthBand, required) {
  return { id, type, centerX, centerY, radiusX, radiusY, depthBand, required, metadata: {} };
}

function connect(context, from, to, type) {
  const random = context.randomStreams.get("cave-connectors");
  const caveProfile = getCaveProfile(context.getBiomeAt(Math.round((from.centerX + to.centerX) / 2)).caves.profileId);
  if (type === "BRANCH" && random.next() > caveProfile.graph.branchingMultiplier) return;
  if (type === "LOOP" && random.next() > caveProfile.graph.loopMultiplier) return;
  context.caveGraph.edges.push({
    from: from.id,
    to: to.id,
    type,
    widthProfile: (type === "MAIN_ROUTE" ? [3.8, 4.8] : [2.2, 3.0]).map((value) => value * caveProfile.carving.tunnelWidthMultiplier),
    curvature: random.range(-0.8, 0.8),
    seed: `${from.id}->${to.id}:${type}`
  });
}
