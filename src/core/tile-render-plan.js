export function buildTileRenderPlan(map, tileId, tileX, tileY, seed = "") {
  const above = map.getTile(tileX, tileY - 1);
  const left = map.getTile(tileX - 1, tileY);
  const right = map.getTile(tileX + 1, tileY);
  const group = materialGroup(tileId);
  const aboveGroup = materialGroup(above);
  const hash = coordinateHash(`${seed}:${tileId}:${tileX}:${tileY}`);
  return {
    drawTopBoundary: above === "air" || above === "water" || map.isWaterTile(tileX, tileY - 1) || aboveGroup !== group,
    drawLeftBoundary: left !== "air" && materialGroup(left) !== group,
    drawRightBoundary: right !== "air" && materialGroup(right) !== group,
    textureVariant: hash % 7,
    textureOffsetX: 5 + ((hash >>> 3) % 18),
    textureOffsetY: 9 + ((hash >>> 8) % 15),
    drawTexture: (hash % 11) < 4,
    subtleTopBoundary: above !== "air" && above !== "water" && aboveGroup !== group
  };
}

export function materialGroup(tileId) {
  if (tileId === "grass" || tileId === "jungle_grass" || tileId === "dirt" || tileId === "rich_soil" || tileId === "rooted_soil") return "soil";
  if (tileId === "sand") return "sand";
  if (tileId === "sandstone" || tileId === "compacted_sandstone") return "sandstone";
  if (tileId === "stone" || tileId === "wet_stone") return "rock";
  if (tileId === "copper_ore" || tileId === "iron_ore" || tileId === "salt_rock") return "ore";
  if (tileId === "bedrock") return "bedrock";
  if (tileId === "wood_foundation_tile" || tileId === "wood_wall_tile") return "constructed";
  return tileId;
}

function coordinateHash(input) {
  let hash = 2166136261;
  const text = String(input);
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 2246822507);
  hash ^= hash >>> 13;
  return hash >>> 0;
}
