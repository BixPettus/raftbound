export function shapeEdges(context) {
  shapeEdge(context, context.recipe.edgeProfiles.arrival, context.profile.startX, "arrival");
  const farStart = context.definition.width - context.profile.endMargin - context.recipe.edgeProfiles.far.width;
  shapeEdge(context, context.recipe.edgeProfiles.far, farStart, "far");
  smoothInteriorTransition(context, context.profile.startX + context.recipe.edgeProfiles.arrival.width, 1);
  smoothInteriorTransition(context, farStart - 1, -1);
}

function shapeEdge(context, edge, startX, side) {
  const sea = context.definition.seaLevelTile;
  const width = edge.width;
  for (let i = 0; i < width; i += 1) {
    const x = startX + i;
    if (x < context.profile.startX || x >= context.definition.width - context.profile.endMargin) continue;
    const t = side === "arrival" ? 0 : i / Math.max(1, width - 1);
    const heightLift = side === "far" ? Math.min(2, Math.round((1 - t) * 2)) : 0;
    context.surfaceHeights[x] = sea - 1 - heightLift;
  }
}

function smoothInteriorTransition(context, startX, direction) {
  for (let i = 0; i < 10; i += 1) {
    const x = startX + i * direction;
    const previousX = x - direction;
    if (x <= context.profile.startX || x >= context.definition.width - context.profile.endMargin) continue;
    const previous = context.surfaceHeights[previousX];
    context.surfaceHeights[x] = Math.max(previous - 1, Math.min(previous + 1, context.surfaceHeights[x]));
  }
}
