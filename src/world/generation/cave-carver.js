import { contextIndex } from "./generation-context.js";

export function carveCaves(context) {
  for (const node of context.caveGraph.nodes) carveEllipse(context, node.centerX, node.centerY, node.radiusX, node.radiusY);
  for (const edge of context.caveGraph.edges) carveConnector(context, edge);
  carveSealedDryPocket(context);
  carveOceanConnectedCave(context);
  cleanupCaves(context);
}

export function carveEllipse(context, centerX, centerY, radiusX, radiusY) {
  for (let y = Math.floor(centerY - radiusY); y <= Math.ceil(centerY + radiusY); y += 1) {
    for (let x = Math.floor(centerX - radiusX); x <= Math.ceil(centerX + radiusX); x += 1) {
      if (!context.tileMap.inBounds(x, y) || y >= context.definition.height - 3) continue;
      const dx = (x - centerX) / radiusX;
      const dy = (y - centerY) / radiusY;
      if (dx * dx + dy * dy <= 1) clearCaveCell(context, x, y);
    }
  }
}

function carveConnector(context, edge) {
  const from = context.caveGraph.nodes.find((node) => node.id === edge.from);
  const to = context.caveGraph.nodes.find((node) => node.id === edge.to);
  const random = context.randomStreams.get("cave-connectors");
  const steps = Math.max(16, Math.ceil(Math.hypot(to.centerX - from.centerX, to.centerY - from.centerY) * 1.5));
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const curve = Math.sin(t * Math.PI) * edge.curvature * 8;
    const x = from.centerX + (to.centerX - from.centerX) * t + curve;
    const y = from.centerY + (to.centerY - from.centerY) * t + Math.sin(t * Math.PI * 2) * edge.curvature * 2;
    const width = random.range(edge.widthProfile[0], edge.widthProfile[1]);
    carveEllipse(context, Math.round(x), Math.round(y), width, Math.max(1.8, width * 0.82));
  }
}

function carveOceanConnectedCave(context) {
  if (context.definition.size === "small") return;
  const y = context.definition.seaLevelTile + 3;
  const start = context.definition.width - context.profile.endMargin;
  const end = Math.max(context.profile.startX + 60, start - 42);
  for (let x = start; x >= end; x -= 1) carveEllipse(context, x, y + Math.sin(x * 0.2) * 2, 2.2, 1.8);
}

function carveSealedDryPocket(context) {
  const x = context.profile.startX + context.profile.arrivalFlatTiles + 8;
  const y = Math.min(context.definition.height - 8, context.definition.seaLevelTile + 12);
  carveEllipse(context, x, y, 4.5, 3.2);
}

function cleanupCaves(context) {
  const toClear = [];
  for (let y = 1; y < context.definition.height - 2; y += 1) {
    for (let x = context.profile.startX; x < context.definition.width - context.profile.endMargin; x += 1) {
      if (!context.tileMap.isSolidTile(x, y)) continue;
      const airNeighbors = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => !context.tileMap.isSolidTile(x + dx, y + dy)).length;
      if (airNeighbors >= 3) toClear.push([x, y]);
    }
  }
  for (const [x, y] of toClear) clearCaveCell(context, x, y);
}

function clearCaveCell(context, x, y) {
  context.tileMap.setTile(x, y, "air");
  context.caveMask[contextIndex(context, x, y)] = 1;
}
