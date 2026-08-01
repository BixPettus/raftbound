import assert from "node:assert/strict";
import { CONFIG } from "../src/config.js";
import { SeededRandom } from "../src/world/seeded-random.js";
import { tileToWorld, worldToTile } from "../src/world/coordinates.js";
import { Inventory } from "../src/items/inventory.js";
import { getRecipe } from "../src/items/recipe-registry.js";
import { CraftingSystem } from "../src/items/crafting-system.js";
import { generateIsland } from "../src/world/island-generator.js";
import { Raft } from "../src/raft/raft.js";
import { BuildingSystem } from "../src/raft/building-system.js";
import { createSaveObject, validateSave } from "../src/persistence/save-schema.js";
import { SaveManager } from "../src/persistence/save-manager.js";
import { getItemDefinition } from "../src/items/item-registry.js";
import { Player } from "../src/entities/player.js";
import { Input } from "../src/core/input.js";
import { tryDigTile } from "../src/world/terrain-digging.js";
import { TileMap } from "../src/world/tile-map.js";
import { moveWithCollision } from "../src/core/physics.js";

function testSeededRandomRepeatability() {
  const a = new SeededRandom("same-seed");
  const b = new SeededRandom("same-seed");
  assert.deepEqual([a.next(), a.next(), a.next()], [b.next(), b.next(), b.next()]);
}

function testCoordinates() {
  const world = tileToWorld(3, 7);
  assert.deepEqual(world, { x: 3 * CONFIG.TILE_SIZE, y: 7 * CONFIG.TILE_SIZE });
  assert.deepEqual(worldToTile(world.x + 4, world.y + 31), { tileX: 3, tileY: 7 });
}

function testInventoryStackingAndRemoval() {
  const inventory = new Inventory(2);
  assert.equal(inventory.addItem("wood", 110).remaining, 0);
  assert.equal(inventory.slots[0].quantity, 99);
  assert.equal(inventory.slots[1].quantity, 11);
  assert.equal(inventory.removeItem("wood", 50), true);
  assert.equal(inventory.countItem("wood"), 60);
  assert.equal(inventory.removeItem("wood", 999), false);
}

function testRecipeValidation() {
  const inventory = new Inventory(4);
  inventory.addItem("fibre", 3);
  const crafting = new CraftingSystem();
  const recipe = getRecipe("rope");
  assert.equal(crafting.canCraft(recipe, inventory, true), true);
  assert.equal(crafting.craft(recipe, inventory, true).ok, true);
  assert.equal(inventory.countItem("rope"), 1);
  assert.equal(inventory.countItem("fibre"), 0);
}

function testCraftRollbackWhenOutputIsFull() {
  const inventory = new Inventory(1);
  inventory.addItem("fibre", 1);
  const crafting = new CraftingSystem();
  const recipe = {
    id: "oversized_output",
    output: { itemId: "wood", quantity: 100 },
    ingredients: [{ itemId: "fibre", quantity: 1 }],
    station: null
  };
  assert.equal(crafting.craft(recipe, inventory, true).ok, false);
  assert.equal(inventory.countItem("fibre"), 1);
  assert.equal(inventory.countItem("wood"), 0);
}

function testBuildPlacementValidity() {
  const raft = Raft.createInitial();
  const inventory = new Inventory(4);
  inventory.addItem("raft_foundation", 1);
  const building = new BuildingSystem(raft);
  assert.equal(building.validatePlacement("wood_foundation", 6, 0, inventory).ok, true);
  assert.equal(building.validatePlacement("wood_foundation", 10, 0, inventory).ok, false);
  assert.equal(building.validatePlacement("storage_crate", 0, -1, inventory).ok, false);
}

function testRaftFloatsAtWaterline() {
  const raft = Raft.createInitial();
  const foundation = raft.structures.find((structure) => structure.structureType === "wood_foundation");
  const world = raft.gridToWorld(foundation.gridX, foundation.gridY);
  const seaY = CONFIG.SEA_LEVEL_TILE * CONFIG.TILE_SIZE;
  const submergedPixels = CONFIG.RAFT_SUBMERGED_TILES * CONFIG.TILE_SIZE;
  assert.equal(world.y, seaY - submergedPixels);
  assert.equal(world.y + CONFIG.TILE_SIZE, seaY + submergedPixels);

  const island = generateIsland({ seed: "dock-waterline", biome: "temperate", size: "small", generationVersion: CONFIG.GENERATION_VERSION });
  raft.setDock(island.raftDockTile.tileX, island.raftDockTile.tileY);
  const docked = raft.gridToWorld(foundation.gridX, foundation.gridY);
  assert.equal(docked.y, seaY - submergedPixels);
  assert.equal(docked.y + CONFIG.TILE_SIZE, seaY + submergedPixels);
}

function testArrivalBeachMeetsRaftDeck() {
  const raft = Raft.createInitial();
  const island = generateIsland({ seed: "arrival-alignment", biome: "temperate", size: "small", generationVersion: CONFIG.GENERATION_VERSION });
  raft.setDock(island.raftDockTile.tileX, island.raftDockTile.tileY);

  const foundationTiles = raft.structures.filter((structure) => structure.structureType === "wood_foundation").length;
  const firstBeachTileX = island.raftDockTile.tileX + foundationTiles;
  const raftDeckY = raft.gridToWorld(0, 0).y;
  const beachTopY = (CONFIG.SEA_LEVEL_TILE - 1) * CONFIG.TILE_SIZE;

  assert.equal(firstBeachTileX, 32);
  assert.equal(raftDeckY - beachTopY, CONFIG.RAFT_SUBMERGED_TILES * CONFIG.TILE_SIZE);
  assert.equal(island.tileMap.getTile(firstBeachTileX, CONFIG.SEA_LEVEL_TILE - 1), "grass");
  assert.equal(island.tileMap.isSolidTile(firstBeachTileX - 1, CONFIG.SEA_LEVEL_TILE - 1), false);
}

function testPlayerUsesTwoByThreeTileBounds() {
  const raft = Raft.createInitial();
  const player = Player.createNew(raft.getSpawnWorldPosition());
  assert.equal(player.width, CONFIG.TILE_SIZE * 2);
  assert.equal(player.height, CONFIG.TILE_SIZE * 3);
  assert.equal(player.y + player.height, raft.gridToWorld(0, 0).y);
}

function testPlayerAnimationAndBufferedJump() {
  const player = new Player({ x: 0, y: 0 });
  player.onGround = true;
  const input = createInput(["Space"]);
  const context = {
    waterSystem: {
      containsPoint: () => false,
      isHeadUnderwater: () => false
    },
    tileMap: null,
    collisionWorld: { isSolidTile: () => false }
  };

  player.update(CONFIG.FIXED_TIMESTEP, input, context);
  assert.equal(player.vy < 0, true);
  assert.equal(player.getAnimationState(), "jump");

  player.startAction("spear");
  assert.equal(player.getAnimationState(), "spear");
  player.damage(5);
  assert.equal(player.getAnimationState(), "hurt");
}

function testJumpIgnoresSideBlockFace() {
  const tileMap = new TileMap(8, 8, "air", CONFIG.SEA_LEVEL_TILE);
  tileMap.setTile(3, 4, "grass");
  const player = new Player({ x: 32.5, y: 64 });
  player.vy = -CONFIG.JUMP_FORCE;
  const result = moveWithCollision(player, { querySolidRects: (bounds) => tileMap.querySolidRects(bounds) }, CONFIG.FIXED_TIMESTEP);
  assert.equal(result.onGround, false);
  assert.equal(player.vy < 0, true);
}

function testPlayerStepsFromRaftOntoBeach() {
  const raft = Raft.createInitial();
  const island = generateIsland({ seed: "shore-step", biome: "temperate", size: "small", generationVersion: CONFIG.GENERATION_VERSION });
  raft.setDock(island.raftDockTile.tileX, island.raftDockTile.tileY);
  const beachX = island.raftDockTile.tileX + raft.structures.filter((structure) => structure.structureType === "wood_foundation").length;
  const beachTopY = (CONFIG.SEA_LEVEL_TILE - 1) * CONFIG.TILE_SIZE;
  const deckY = raft.gridToWorld(0, 0).y;
  const player = new Player({
    x: beachX * CONFIG.TILE_SIZE - CONFIG.PLAYER_WIDTH - 2,
    y: deckY - CONFIG.PLAYER_HEIGHT
  });
  player.onGround = true;
  player.vx = CONFIG.MAX_RUN_SPEED;
  player.vy = CONFIG.GRAVITY * CONFIG.FIXED_TIMESTEP;

  const collisionWorld = {
    querySolidRects: (bounds) => [
      ...island.tileMap.querySolidRects(bounds),
      ...raft.querySolidRects(bounds)
    ]
  };

  for (let i = 0; i < 20; i += 1) {
    const result = moveWithCollision(player, collisionWorld, CONFIG.FIXED_TIMESTEP);
    player.onGround = result.onGround;
    player.vy = CONFIG.GRAVITY * CONFIG.FIXED_TIMESTEP;
  }

  assert.equal(player.y + player.height, beachTopY);
  assert.equal(player.x + player.width > beachX * CONFIG.TILE_SIZE, true);
}

function testInputQueuesLateFramePresses() {
  const listeners = {};
  const canvasListeners = {};
  globalThis.window = {
    addEventListener: (type, handler) => {
      listeners[type] = handler;
    }
  };
  const canvas = {
    width: 1280,
    height: 720,
    focused: false,
    focus: () => {
      canvas.focused = true;
    },
    addEventListener: (type, handler) => {
      canvasListeners[type] = handler;
    },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 720 })
  };
  const input = new Input(canvas);

  input.beginFrame({ x: 0, y: 0 });
  listeners.keydown({ key: " ", preventDefault: () => {} });
  canvasListeners.mousedown({ button: 0, clientX: 400, clientY: 240 });
  input.endFrame();

  input.beginFrame({ x: 0, y: 0 });
  assert.equal(input.consumePressed("Space"), true);
  assert.equal(input.consumePrimaryClick(), true);
  assert.equal(canvas.focused, true);
  assert.deepEqual({ x: input.mouse.worldX, y: input.mouse.worldY }, { x: 400, y: 240 });
  input.endFrame();

  input.beginFrame({ x: 0, y: 0 });
  assert.equal(input.consumePressed("Space"), false);
  assert.equal(input.consumePrimaryClick(), false);

  const clickOnlyInput = new Input(canvas);
  canvasListeners.click({ button: 0, clientX: 512, clientY: 256 });
  clickOnlyInput.beginFrame({ x: 0, y: 0 });
  assert.equal(clickOnlyInput.consumePrimaryClick(), true);
  assert.deepEqual({ x: clickOnlyInput.mouse.worldX, y: clickOnlyInput.mouse.worldY }, { x: 512, y: 256 });
}

function testIslandGeneration() {
  const options = { seed: "deterministic", biome: "temperate", size: "small", generationVersion: CONFIG.GENERATION_VERSION };
  const a = generateIsland(options);
  const b = generateIsland(options);
  assert.equal(a.tileMap.tiles.join("|"), b.tileMap.tiles.join("|"));
  assert.deepEqual(a.resources.map((node) => `${node.type}:${node.tileX}:${node.tileY}`), b.resources.map((node) => `${node.type}:${node.tileX}:${node.tileY}`));
  const types = new Set(a.resources.map((node) => node.type));
  assert.equal(types.has("tree"), true);
  assert.equal(types.has("surface_stone"), true);
  assert.equal(types.has("fibre_plant"), true);
  const c = generateIsland({ ...options, seed: "different" });
  assert.notEqual(a.tileMap.tiles.join("|"), c.tileMap.tiles.join("|"));
}

function testIslandNoiseCavesAndOres() {
  const island = generateIsland({ seed: "noise-caves-ores", biome: "temperate", size: "medium", generationVersion: CONFIG.GENERATION_VERSION });
  let caveAirBelowSurface = 0;
  let copper = 0;
  let iron = 0;
  for (let x = 32; x < island.width - 16; x += 1) {
    for (let y = CONFIG.SEA_LEVEL_TILE + 1; y < island.height; y += 1) {
      const tile = island.tileMap.getTile(x, y);
      if (tile === "air") caveAirBelowSurface += 1;
      if (tile === "copper_ore") copper += 1;
      if (tile === "iron_ore") iron += 1;
    }
  }
  assert.equal(caveAirBelowSurface > 10, true);
  assert.equal(copper > 0, true);
  assert.equal(iron > 0, true);
}

function testTerrainDigging() {
  const island = generateIsland({ seed: "terrain-digging", biome: "temperate", size: "small", generationVersion: CONFIG.GENERATION_VERSION });
  const inventory = new Inventory(4);
  const axe = getItemDefinition("basic_axe");
  const pickaxe = getItemDefinition("basic_pickaxe");
  const grassX = 32;
  const grassY = CONFIG.SEA_LEVEL_TILE - 1;
  assert.equal(island.tileMap.getTile(grassX, grassY), "grass");
  assert.equal(tryDigTile(island.tileMap, grassX, grassY, axe, inventory).ok, false);
  const grassResult = tryDigTile(island.tileMap, grassX, grassY, pickaxe, inventory);
  assert.equal(grassResult.ok, true);
  assert.equal(island.tileMap.getTile(grassX, grassY), "air");
  assert.equal(inventory.countItem("fibre") >= 1, true);

  const stoneY = CONFIG.SEA_LEVEL_TILE + 6;
  assert.equal(island.tileMap.getTile(grassX, stoneY), "stone");
  const stoneResult = tryDigTile(island.tileMap, grassX, stoneY, pickaxe, inventory);
  assert.equal(stoneResult.ok, true);
  assert.equal(island.tileMap.getTile(grassX, stoneY), "air");
  assert.equal(inventory.countItem("stone") >= 1, true);
}

function testSaveSerialization() {
  const raft = Raft.createInitial();
  const game = {
    createdAt: new Date().toISOString(),
    distanceTravelled: 12,
    encounterCount: 1,
    state: { current: "SAILING" },
    serializeCurrentIsland: () => null,
    player: {
      serialize: () => ({
        health: 100,
        oxygen: 100,
        position: { x: 1, y: 2 },
        inventory: new Inventory().serialize(),
        hotbar: { selectedIndex: 0, slots: [] }
      })
    },
    raft
  };
  const save = createSaveObject(game);
  assert.equal(validateSave(save).ok, true);
  const before = JSON.stringify(raft.serialize());
  generateIsland({ seed: "temporary", biome: "temperate", size: "small", generationVersion: CONFIG.GENERATION_VERSION });
  assert.equal(JSON.stringify(raft.serialize()), before);
}

function testSaveDeserialization() {
  const store = new Map();
  const storage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => store.delete(key)
  };
  const manager = new SaveManager(storage);
  const raft = Raft.createInitial();
  const game = {
    createdAt: new Date().toISOString(),
    distanceTravelled: 3,
    encounterCount: 0,
    state: { current: "SAILING" },
    serializeCurrentIsland: () => null,
    player: {
      serialize: () => ({
        health: 90,
        oxygen: 88,
        position: { x: 10, y: 20 },
        inventory: new Inventory().serialize(),
        hotbar: { selectedIndex: 0, slots: [] }
      })
    },
    raft
  };
  manager.save(game);
  const loaded = manager.load();
  assert.equal(loaded.ok, true);
  assert.equal(loaded.save.player.health, 90);
  store.set(CONFIG.SAVE_KEY, "{invalid");
  assert.equal(manager.load().ok, false);
  assert.equal(store.has(CONFIG.INVALID_SAVE_KEY), true);
}

function testCoreLoopPersistence() {
  const raft = Raft.createInitial();
  const playerInventory = new Inventory(24);
  const islandOne = generateIsland({ seed: "loop-one", biome: "temperate", size: "small", generationVersion: CONFIG.GENERATION_VERSION });
  raft.setDock(islandOne.raftDockTile.tileX, islandOne.raftDockTile.tileY);

  const axe = getItemDefinition("basic_axe");
  const pickaxe = getItemDefinition("basic_pickaxe");
  for (const type of ["tree", "surface_stone", "fibre_plant"]) {
    const node = islandOne.resources.find((node) => node.type === type);
    const tool = type === "surface_stone" ? pickaxe : axe;
    while (!node.destroyed) node.hit(tool, playerInventory);
    islandOne.removedResourceIds.add(node.id);
  }

  assert.equal(playerInventory.countItem("wood") >= 4, true);
  assert.equal(playerInventory.countItem("stone") >= 1, true);
  assert.equal(playerInventory.countItem("fibre") >= 2, true);

  const crafting = new CraftingSystem();
  assert.equal(crafting.craft(getRecipe("wood_foundation"), playerInventory, true).ok, true);
  const building = new BuildingSystem(raft);
  assert.equal(building.validatePlacement("wood_foundation", 6, 0, playerInventory).ok, true);
  assert.equal(building.placeSelected(raft.gridToWorld(6, 0).x, raft.gridToWorld(6, 0).y, playerInventory).ok, true);

  const storageId = [...raft.storage.keys()][0];
  const storage = raft.storage.get(storageId);
  const stoneCount = playerInventory.countItem("stone");
  assert.equal(storage.addItem("stone", stoneCount).remaining, 0);
  playerInventory.removeItem("stone", stoneCount);

  const raftAfterIslandOne = JSON.stringify(raft.serialize());
  const islandTwo = generateIsland({ seed: "loop-two", biome: "temperate", size: "small", generationVersion: CONFIG.GENERATION_VERSION });
  assert.notEqual(islandOne.seed, islandTwo.seed);
  assert.equal(JSON.stringify(raft.serialize()), raftAfterIslandOne);
  assert.equal(raft.structures.some((structure) => structure.gridX === 6 && structure.structureType === "wood_foundation"), true);
  assert.equal(storage.countItem("stone"), stoneCount);
}

const tests = [
  testSeededRandomRepeatability,
  testCoordinates,
  testInventoryStackingAndRemoval,
  testRecipeValidation,
  testCraftRollbackWhenOutputIsFull,
  testBuildPlacementValidity,
  testRaftFloatsAtWaterline,
  testArrivalBeachMeetsRaftDeck,
  testPlayerUsesTwoByThreeTileBounds,
  testPlayerAnimationAndBufferedJump,
  testJumpIgnoresSideBlockFace,
  testPlayerStepsFromRaftOntoBeach,
  testInputQueuesLateFramePresses,
  testIslandGeneration,
  testIslandNoiseCavesAndOres,
  testTerrainDigging,
  testSaveSerialization,
  testSaveDeserialization,
  testCoreLoopPersistence
];

for (const test of tests) {
  test();
  console.log(`ok ${test.name}`);
}

console.log(`${tests.length} checks passed`);

function createInput(pressedCodes = [], downCodes = []) {
  const pressed = new Set(pressedCodes);
  const down = new Set(downCodes);
  return {
    isDown: (code) => down.has(code),
    consumePressed: (code) => {
      const has = pressed.has(code);
      pressed.delete(code);
      return has;
    }
  };
}
