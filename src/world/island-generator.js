import { CONFIG } from "../config.js?v=terrain-inventory-4";
import { TileMap } from "./tile-map.js?v=terrain-inventory-4";
import { SeededRandom } from "./seeded-random.js";
import { getBiomeDefinition } from "./biome-registry.js";
import { ResourceNode } from "../entities/resource-node.js";
import { ShoreCrawler } from "../entities/enemy.js";

const SIZE_RESOURCE_MULTIPLIER = { small: 1, medium: 1.35, large: 1.7 };

export function createIslandDefinition({ seed, biome = "temperate", size = "small", generationVersion = CONFIG.GENERATION_VERSION }) {
  const biomeDef = getBiomeDefinition(biome);
  const width = CONFIG.ISLAND_WIDTHS[size] ?? CONFIG.ISLAND_WIDTHS.small;
  const height = CONFIG.ISLAND_HEIGHT;
  return { seed, biome: biomeDef.id, size, generationVersion, width, height };
}

export function generateIsland(options) {
  const definition = createIslandDefinition(options);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const attemptSeed = `${definition.generationVersion}:${definition.seed}:${definition.biome}:${definition.size}:${attempt}`;
    const generated = generateAttempt(definition, attemptSeed);
    if (validateIsland(generated)) return generated;
  }
  return generateAttempt(definition, `${definition.seed}:fallback`, true);
}

function generateAttempt(definition, attemptSeed, forceSafe = false) {
  const random = new SeededRandom(attemptSeed);
  const biome = getBiomeDefinition(definition.biome);
  const tileMap = new TileMap(definition.width, definition.height, "air", CONFIG.SEA_LEVEL_TILE);
  const surface = [];
  const startX = 32;
  const endX = definition.width - 16;

  for (let x = startX; x < endX; x += 1) {
    const y = surfaceHeightAt(attemptSeed, x, startX, endX);
    surface[x] = y;
    fillTerrainColumn(tileMap, biome, attemptSeed, x, y);
  }

  placeOre(tileMap, surface, attemptSeed, startX, endX);
  carveCaves(tileMap, surface, random, startX, endX);
  carveArrival(tileMap, startX, surface);
  const resources = placeResources(definition, tileMap, surface, random, forceSafe);
  const enemies = placeEnemies(definition, surface, random);
  return {
    ...definition,
    tileMap,
    resources,
    enemies,
    removedResourceIds: new Set(),
    openedContainerIds: new Set(),
    raftDockTile: { tileX: startX - 6, tileY: CONFIG.SEA_LEVEL_TILE + CONFIG.RAFT_WATERLINE_TILE_OFFSET },
    playerSpawnTile: { tileX: startX - 7, tileY: CONFIG.SEA_LEVEL_TILE - 3 }
  };
}

function surfaceHeightAt(seed, x, startX, endX) {
  const shoreBlend = Math.min(1, Math.max(0, (x - startX) / 20));
  const farShoreBlend = Math.min(1, Math.max(0, (endX - x) / 16));
  const islandBlend = Math.min(shoreBlend, farShoreBlend);
  const rolling = fbm(seed, x * 0.035, 10.5, 4);
  const detail = fbm(seed, x * 0.11, 21.25, 3);
  const ridge = Math.pow(Math.max(0, fbm(seed, x * 0.018, 50.75, 3)), 1.35);
  const height = 1 + islandBlend * (2 + rolling * 5 + ridge * 4) + detail * 1.4;
  return Math.round(Math.max(CONFIG.SEA_LEVEL_TILE - 10, Math.min(CONFIG.SEA_LEVEL_TILE - 1, CONFIG.SEA_LEVEL_TILE - height)));
}

function fillTerrainColumn(tileMap, biome, seed, x, surfaceY) {
  const topThickness = 3 + Math.floor(fbm(seed, x * 0.065, 80.5, 3) * 4);
  const stoneLift = Math.floor(fbm(seed, x * 0.045, 130.2, 3) * 3);
  tileMap.setTile(x, surfaceY, biome.tiles.surface);
  for (let y = surfaceY + 1; y < tileMap.height; y += 1) {
    const depth = y - surfaceY;
    if (depth <= topThickness) {
      tileMap.setTile(x, y, biome.tiles.subsurface);
    } else if (depth <= topThickness + 3 && fbm(seed, x * 0.18, y * 0.18, 2) < 0.55) {
      tileMap.setTile(x, y, biome.tiles.subsurface);
    } else {
      tileMap.setTile(x, y, depth > topThickness + stoneLift ? biome.tiles.deep : biome.tiles.subsurface);
    }
  }
}

function placeOre(tileMap, surface, seed, startX, endX) {
  for (let x = startX; x < endX; x += 1) {
    for (let y = surface[x] + 5; y < tileMap.height - 2; y += 1) {
      if (tileMap.getTile(x, y) === "air") continue;
      const depth = y - surface[x];
      const copperNoise = fbm(seed, x * 0.28, y * 0.28 + 300, 3);
      const ironNoise = fbm(seed, x * 0.24 + 700, y * 0.24, 3);
      if (depth >= 6 && depth <= 17 && copperNoise > 0.68) {
        tileMap.setTile(x, y, "copper_ore");
      } else if (depth >= 12 && y > CONFIG.SEA_LEVEL_TILE + 5 && ironNoise > 0.72) {
        tileMap.setTile(x, y, "iron_ore");
      }
    }
  }
}

function carveCaves(tileMap, surface, random, startX, endX) {
  const caveCount = Math.max(2, Math.floor((endX - startX) / 72));
  for (let i = 0; i < caveCount; i += 1) {
    let x = random.int(startX + 24, endX - 24);
    let y = surface[x] + random.int(3, 8);
    let heading = random.range(-0.35, 0.35);
    const length = random.int(34, 58);
    carveCaveMouth(tileMap, x, surface[x]);
    for (let step = 0; step < length; step += 1) {
      const radiusX = random.range(1.3, 2.6);
      const radiusY = random.range(1.1, 2.1);
      carveEllipse(tileMap, Math.round(x), Math.round(y), radiusX, radiusY);
      heading += random.range(-0.28, 0.28);
      heading = Math.max(-0.9, Math.min(0.9, heading));
      x += Math.cos(heading) * random.range(0.6, 1.25);
      y += Math.sin(heading) * 0.75 + 0.18;
      x = Math.max(startX + 8, Math.min(endX - 8, x));
      y = Math.max(surface[Math.round(x)] + 2, Math.min(tileMap.height - 5, y));
    }
  }
}

function carveCaveMouth(tileMap, centerX, surfaceY) {
  for (let y = surfaceY - 1; y <= surfaceY + 4; y += 1) {
    const width = y <= surfaceY ? 1 : 2;
    for (let x = centerX - width; x <= centerX + width; x += 1) {
      if (tileMap.inBounds(x, y)) tileMap.setTile(x, y, "air");
    }
  }
}

function carveEllipse(tileMap, centerX, centerY, radiusX, radiusY) {
  for (let y = Math.floor(centerY - radiusY); y <= Math.ceil(centerY + radiusY); y += 1) {
    for (let x = Math.floor(centerX - radiusX); x <= Math.ceil(centerX + radiusX); x += 1) {
      const dx = (x - centerX) / radiusX;
      const dy = (y - centerY) / radiusY;
      if (dx * dx + dy * dy <= 1 && tileMap.inBounds(x, y)) tileMap.setTile(x, y, "air");
    }
  }
}

function carveArrival(tileMap, startX, surface) {
  for (let x = startX - 2; x <= startX + 8; x += 1) {
    for (let y = CONFIG.SEA_LEVEL_TILE - 8; y < CONFIG.SEA_LEVEL_TILE; y += 1) {
      tileMap.setTile(x, y, "air");
    }
  }
  for (let x = startX; x <= startX + 8; x += 1) {
    surface[x] = CONFIG.SEA_LEVEL_TILE - 1;
    tileMap.setTile(x, CONFIG.SEA_LEVEL_TILE - 1, "grass");
    for (let y = CONFIG.SEA_LEVEL_TILE; y < tileMap.height; y += 1) {
      tileMap.setTile(x, y, y > CONFIG.SEA_LEVEL_TILE + 5 ? "stone" : "dirt");
    }
  }
}

function placeResources(definition, tileMap, surface, random, forceSafe) {
  const resources = [];
  const multiplier = SIZE_RESOURCE_MULTIPLIER[definition.size] ?? 1;
  const counts = {
    tree: Math.ceil(8 * multiplier),
    surface_stone: Math.ceil(7 * multiplier),
    fibre_plant: Math.ceil(10 * multiplier)
  };

  const guaranteed = [
    { type: "tree", tileX: 44 },
    { type: "surface_stone", tileX: 49 },
    { type: "fibre_plant", tileX: 54 }
  ];
  for (const item of guaranteed) addNode(resources, item.type, item.tileX, surface[item.tileX] - 1);

  for (const [type, count] of Object.entries(counts)) {
    for (let i = 0; i < count; i += 1) {
      const tileX = random.int(42, definition.width - 24);
      const tileY = surface[tileX] - 1;
      if (tileY > 0 && !tileMap.isSolidTile(tileX, tileY)) addNode(resources, type, tileX, tileY);
    }
  }

  if (forceSafe && resources.length < 3) {
    guaranteed.forEach((item, index) => addNode(resources, item.type, item.tileX + index, CONFIG.SEA_LEVEL_TILE - 3));
  }
  return resources;
}

function addNode(resources, type, tileX, tileY) {
  const duplicate = resources.some((node) => node.tileX === tileX && node.tileY === tileY);
  if (!duplicate) resources.push(ResourceNode.create(type, tileX, tileY));
}

function placeEnemies(definition, surface, random) {
  const enemies = [];
  const count = definition.size === "large" ? 3 : definition.size === "medium" ? 2 : 1;
  for (let i = 0; i < count; i += 1) {
    const tileX = random.int(78, definition.width - 34);
    enemies.push(ShoreCrawler.create(tileX, surface[tileX] - 1));
  }
  return enemies;
}

function fbm(seed, x, y, octaves) {
  let total = 0;
  let amplitude = 1;
  let frequency = 1;
  let normalization = 0;
  for (let octave = 0; octave < octaves; octave += 1) {
    total += valueNoise(seed, x * frequency, y * frequency) * amplitude;
    normalization += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return total / normalization;
}

function valueNoise(seed, x, y) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = x0 + 1;
  const y1 = y0 + 1;
  const sx = smoothstep(x - x0);
  const sy = smoothstep(y - y0);
  const top = lerp(hashNoise(seed, x0, y0), hashNoise(seed, x1, y0), sx);
  const bottom = lerp(hashNoise(seed, x0, y1), hashNoise(seed, x1, y1), sx);
  return lerp(top, bottom, sy);
}

function hashNoise(seed, x, y) {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  hash ^= Math.imul(x, 374761393);
  hash = Math.imul(hash, 668265263);
  hash ^= Math.imul(y, 2246822519);
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
  return ((hash ^ (hash >>> 16)) >>> 0) / 4294967295;
}

function smoothstep(value) {
  return value * value * (3 - 2 * value);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function validateIsland(island) {
  const resourceTypes = new Set(island.resources.map((node) => node.type));
  const hasResources = ["tree", "surface_stone", "fibre_plant"].every((type) => resourceTypes.has(type));
  const spawn = island.playerSpawnTile;
  const safeSpawn = !island.tileMap.isSolidTile(spawn.tileX, spawn.tileY) && !island.tileMap.isSolidTile(spawn.tileX, spawn.tileY + 1);
  const dock = island.raftDockTile;
  const safeDock = dock.tileX > 0 && dock.tileY > 0;
  return hasResources && safeSpawn && safeDock;
}

export function serializeIsland(island) {
  if (!island) return null;
  return {
    seed: island.seed,
    biome: island.biome,
    size: island.size,
    generationVersion: island.generationVersion,
    removedResourceIds: [...island.removedResourceIds],
    openedContainerIds: [...island.openedContainerIds],
    modifiedTiles: island.tileMap.serializeModifications()
  };
}

export function restoreIsland(savedIsland) {
  if (!savedIsland) return null;
  const island = generateIsland(savedIsland);
  island.removedResourceIds = new Set(savedIsland.removedResourceIds ?? []);
  island.openedContainerIds = new Set(savedIsland.openedContainerIds ?? []);
  island.tileMap.applyModifications(savedIsland.modifiedTiles ?? []);
  island.resources.forEach((node) => {
    if (island.removedResourceIds.has(node.id)) node.destroyed = true;
  });
  return island;
}
