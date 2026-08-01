import { ITEM_DEFINITIONS } from "../data/items.js";

const itemMap = new Map(ITEM_DEFINITIONS.map((item) => [item.id, Object.freeze({ ...item })]));

export function getItemDefinition(itemId) {
  const item = itemMap.get(itemId);
  if (!item) throw new Error(`Unknown item id: ${itemId}`);
  return item;
}

export function listItems() {
  return [...itemMap.values()];
}
