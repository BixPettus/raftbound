import { contextIndex } from "./generation-context.js";

export function fillStrata(context) {
  const { width, height } = context.definition;
  const biome = context.biome;
  for (let x = 0; x < width; x += 1) {
    const surfaceY = context.surfaceHeights[x];
    for (let y = 0; y < height; y += 1) {
      if (y < surfaceY) {
        context.tileMap.setTile(x, y, "air");
        continue;
      }
      const ratio = (y - surfaceY) / Math.max(1, height - surfaceY);
      context.depthBands[contextIndex(context, x, y)] = ratio;
      if (y >= height - 3 || ratio >= 0.94) context.tileMap.setTile(x, y, "bedrock");
      else if (y === surfaceY) context.tileMap.setTile(x, y, biome.tiles.surface);
      else if (ratio < 0.11) context.tileMap.setTile(x, y, biome.tiles.subsurface);
      else if (ratio < 0.26 && (x + y) % 5 === 0) context.tileMap.setTile(x, y, biome.tiles.subsurface);
      else context.tileMap.setTile(x, y, biome.tiles.deep);
    }
  }
}
