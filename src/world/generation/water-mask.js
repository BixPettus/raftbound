import { contextIndex } from "./generation-context.js";

export function generateWaterMask(context) {
  const { width, height, seaLevelTile } = context.definition;
  const queue = [];
  const enqueue = (x, y) => {
    if (!context.tileMap.inBounds(x, y) || y < seaLevelTile || context.tileMap.isSolidTile(x, y)) return;
    const index = contextIndex(context, x, y);
    if (context.waterMask[index]) return;
    context.waterMask[index] = 1;
    queue.push([x, y]);
  };

  for (let y = seaLevelTile; y < height; y += 1) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }
  for (let x = 0; x < width; x += 1) {
    enqueue(x, seaLevelTile);
  }

  for (let i = 0; i < queue.length; i += 1) {
    const [x, y] = queue[i];
    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }

  context.tileMap.setWaterMask(context.waterMask);
}
