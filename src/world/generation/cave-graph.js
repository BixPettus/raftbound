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
  const minX = context.profile.startX + context.profile.arrivalFlatTiles + 12;
  const maxX = context.definition.width - context.profile.endMargin - 18;
  for (let i = 0; i < count; i += 1) {
    const x = Math.round(minX + ((i + 0.45) / count) * (maxX - minX) + random.int(-8, 8));
    const y = context.surfaceHeights[x] + 2;
    nodes.push(node(context, `entrance-${i}`, "SURFACE_ENTRANCE", x, y, 2.4, 2.2, "surface", true));
  }
  return nodes;
}

function placeChambers(context, type, count, minDepth, maxDepth, minRadiusX, maxRadiusX) {
  const random = context.randomStreams.get("cave-chambers");
  const nodes = [];
  const minX = context.profile.startX + context.profile.arrivalFlatTiles + 18;
  const maxX = context.definition.width - context.profile.endMargin - 22;
  for (let i = 0; i < count; i += 1) {
    const x = random.int(minX, maxX);
    const surfaceY = context.surfaceHeights[x];
    const y = Math.round(surfaceY + (context.definition.height - surfaceY) * random.range(minDepth, maxDepth));
    const rx = random.range(minRadiusX, maxRadiusX);
    const ry = type === "DEEP_CAVERN" ? random.range(7, 12) : random.range(4, 7);
    nodes.push(node(context, `${type.toLowerCase()}-${i}`, type, x, y, rx, ry, type.toLowerCase(), true));
  }
  return nodes;
}

function node(context, id, type, centerX, centerY, radiusX, radiusY, depthBand, required) {
  return { id, type, centerX, centerY, radiusX, radiusY, depthBand, required, metadata: {} };
}

function connect(context, from, to, type) {
  const random = context.randomStreams.get("cave-connectors");
  context.caveGraph.edges.push({
    from: from.id,
    to: to.id,
    type,
    widthProfile: type === "MAIN_ROUTE" ? [2.1, 2.8] : [1.7, 2.3],
    curvature: random.range(-0.8, 0.8),
    seed: `${from.id}->${to.id}:${type}`
  });
}
