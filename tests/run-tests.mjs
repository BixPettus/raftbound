import assert from "node:assert/strict";
import { CONFIG } from "../src/config.js";
import { SeededRandom } from "../src/world/seeded-random.js";
import { tileToWorld, worldToTile } from "../src/world/coordinates.js";
import { Inventory } from "../src/items/inventory.js";
import { Hotbar } from "../src/items/hotbar.js";
import { PlayerInventory, INVENTORY_POLICIES } from "../src/items/player-inventory.js";
import { getRecipe } from "../src/items/recipe-registry.js";
import { CraftingSystem } from "../src/items/crafting-system.js";
import { generateIsland } from "../src/world/island-generator.js";
import { Raft } from "../src/raft/raft.js";
import { BuildingSystem } from "../src/raft/building-system.js";
import { createSaveObject, validateSave, SAVE_VERSION } from "../src/persistence/save-schema.js";
import { SaveManager } from "../src/persistence/save-manager.js";
import { migrateSave } from "../src/persistence/migrations.js";
import { getItemDefinition } from "../src/items/item-registry.js";
import { Player } from "../src/entities/player.js";
import { Input } from "../src/core/input.js";
import { GameClock } from "../src/core/game-clock.js";
import { tryDigTile } from "../src/world/terrain-digging.js";
import { TileMap } from "../src/world/tile-map.js";
import { moveWithCollision } from "../src/core/physics.js";
import { World } from "../src/world/world.js";
import { WorldEditSystem } from "../src/world/world-edit-system.js";
import { TargetResolver } from "../src/world/target-resolver.js";
import { rollDropTable } from "../src/world/tile-damage-system.js";

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

function testPlayerInventoryFacadeAcrossBagAndHotbar() {
  const bag = new Inventory(4);
  const hotbar = new Hotbar();
  bag.addItem("wood", 2);
  hotbar.slots[0] = { itemId: "wood", quantity: 3 };
  hotbar.slots[1] = { itemId: "fibre", quantity: 2 };
  hotbar.select(0);
  const items = new PlayerInventory({ bag, hotbar });

  assert.equal(items.countItem("wood"), 5);
  assert.equal(items.hasItems([{ itemId: "wood", quantity: 5 }]), true);
  const reservation = items.reserveItems([{ itemId: "wood", quantity: 4 }]);
  assert.equal(reservation.ok, true);
  assert.equal(items.commitReservation(reservation), true);
  assert.equal(items.countItem("wood"), 1);

  const rollbackReservation = items.reserveItems([{ itemId: "fibre", quantity: 1 }]);
  items.commitReservation(rollbackReservation);
  assert.equal(items.countItem("fibre"), 1);
  items.rollbackReservation(rollbackReservation);
  assert.equal(items.countItem("fibre"), 2);
}

function testCraftingUsesHotbarIngredients() {
  const player = new Player();
  player.hotbar.slots[0] = { itemId: "fibre", quantity: 3 };
  const crafting = new CraftingSystem();
  assert.equal(crafting.craft(getRecipe("rope"), player.items, true).ok, true);
  assert.equal(player.items.countItem("rope"), 1);
  assert.equal(player.items.countItem("fibre"), 0);
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

function testPlayerSeparatesColliderFromSpriteBounds() {
  const raft = Raft.createInitial();
  const player = Player.createNew(raft.getSpawnWorldPosition());
  assert.equal(player.width, CONFIG.PLAYER_WIDTH);
  assert.equal(player.height, CONFIG.PLAYER_HEIGHT);
  assert.equal(CONFIG.PLAYER_SPRITE_WIDTH, CONFIG.TILE_SIZE * 2);
  assert.equal(CONFIG.PLAYER_SPRITE_HEIGHT, CONFIG.TILE_SIZE * 3);
  const spawnDeck = raft.querySolidRects({
    x: player.x,
    y: player.y + player.height,
    width: player.width,
    height: 1
  })[0];
  assert.equal(player.y + player.height, spawnDeck.y);
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

function testDrowningDamageBypassesCombatInvulnerability() {
  const player = new Player({ x: 0, y: 0, oxygen: 0 });
  player.invulnerability = 10;
  const context = {
    waterSystem: {
      containsPoint: () => true,
      isHeadUnderwater: () => true
    },
    tileMap: null,
    collisionWorld: { isSolidTile: () => false }
  };

  player.update(1, createInput(), context);
  assert.equal(player.health, CONFIG.MAX_HEALTH - CONFIG.DROWN_DAMAGE_PER_SECOND);
  assert.equal(player.invulnerability, 9);
}

function testPlayerFallSpeedIsClamped() {
  const player = new Player({ x: 0, y: 0 });
  player.vy = CONFIG.PLAYER_MAX_FALL_SPEED * 4;
  const context = {
    waterSystem: {
      containsPoint: () => false,
      isHeadUnderwater: () => false
    },
    tileMap: null,
    collisionWorld: { isSolidTile: () => false }
  };

  player.update(CONFIG.FIXED_TIMESTEP, createInput(), context);
  assert.equal(player.vy <= CONFIG.PLAYER_MAX_FALL_SPEED, true);
}

function testJumpReleaseCutsRisingVelocity() {
  const player = new Player({ x: 0, y: 0 });
  player.onGround = true;
  const context = {
    waterSystem: {
      containsPoint: () => false,
      isHeadUnderwater: () => false
    },
    tileMap: null,
    collisionWorld: { isSolidTile: () => false }
  };

  player.update(CONFIG.FIXED_TIMESTEP, createInput(["Space"], ["Space"]), context);
  const heldVelocity = player.vy;
  player.update(CONFIG.FIXED_TIMESTEP, createInput(), context);
  assert.equal(player.vy > heldVelocity, true);
  assert.equal(Math.abs(player.vy) < Math.abs(heldVelocity), true);
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
    y: beachTopY - CONFIG.PLAYER_HEIGHT
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

function testGameClockCapsCatchUpSteps() {
  const clock = new GameClock({ fixedTimestep: 1 / 60, maxFrameTime: 0.25, maxCatchUpSteps: 8 });
  assert.equal(clock.advance(0).steps, 0);
  const stalled = clock.advance(1000);
  assert.equal(stalled.steps, 8);
  assert.equal(stalled.alpha, 0);
}

function testInputPressSurvivesZeroTickFrames() {
  const { input, listeners } = createBoundInput();
  input.capturePointerPosition({ x: 0, y: 0 });
  listeners.window.keydown({ code: "Space", preventDefault: () => {}, timeStamp: 1 });
  for (let i = 0; i < 5; i += 1) input.capturePointerPosition({ x: 0, y: 0 });

  const tick = input.beginTick(1);
  assert.equal(tick.consumePressed("Space"), true);
  input.endTick(tick);

  const nextTick = input.beginTick(2);
  assert.equal(nextTick.consumePressed("Space"), false);
}

function testInputTapBetweenTicksRegistersOnce() {
  const { input, listeners } = createBoundInput();
  listeners.window.keydown({ code: "Space", preventDefault: () => {}, timeStamp: 1 });
  listeners.window.keyup({ code: "Space" });

  const tick = input.beginTick(1);
  assert.equal(tick.consumePressed("Space"), true);
  assert.equal(tick.isDown("Space"), false);
  input.endTick(tick);

  const nextTick = input.beginTick(2);
  assert.equal(nextTick.consumePressed("Space"), false);
}

function testInputHoldDoesNotRepeatPressEdges() {
  const { input, listeners } = createBoundInput();
  listeners.window.keydown({ code: "Space", preventDefault: () => {}, timeStamp: 1 });
  let tick = input.beginTick(1);
  assert.equal(tick.consumePressed("Space"), true);
  assert.equal(tick.isDown("Space"), true);
  input.endTick(tick);

  tick = input.beginTick(2);
  assert.equal(tick.consumePressed("Space"), false);
  assert.equal(tick.isDown("Space"), true);
}

function testInputBlurClearsHeldAndQueuedState() {
  const { input, listeners } = createBoundInput();
  listeners.window.keydown({ code: "KeyD", preventDefault: () => {}, timeStamp: 1 });
  listeners.window.blur();

  const tick = input.beginTick(1);
  assert.equal(tick.consumePressed("KeyD"), false);
  assert.equal(tick.isDown("KeyD"), false);
}

function testPointerDownIsCanonicalAndNotDebounced() {
  const { input, canvas, listeners } = createBoundInput();
  assert.equal(listeners.canvas.mousedown, undefined);
  assert.equal(listeners.canvas.click, undefined);

  listeners.canvas.pointerdown({ button: 0, pointerId: 1, clientX: 400, clientY: 240, preventDefault: () => {}, timeStamp: 1 });
  listeners.canvas.pointerdown({ button: 2, pointerId: 1, clientX: 400, clientY: 240, preventDefault: () => {}, timeStamp: 2 });
  listeners.canvas.pointerdown({ button: 0, pointerId: 1, clientX: 410, clientY: 240, preventDefault: () => {}, timeStamp: 3 });
  input.capturePointerPosition({ x: 10, y: 20 });

  const tick = input.beginTick(1);
  assert.equal(tick.consumePrimaryClick(), true);
  assert.equal(tick.consumeSecondaryClick(), true);
  assert.equal(tick.consumePrimaryClick(), true);
  assert.equal(tick.consumePrimaryClick(), false);
  assert.equal(canvas.focused, true);
  assert.equal(canvas.capturedPointerId, 1);
  assert.deepEqual({ x: tick.mouse.worldX, y: tick.mouse.worldY }, { x: 420, y: 260 });
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
  assert.equal(inventory.countItem("dirt_block") >= 1, true);

  const stoneY = CONFIG.SEA_LEVEL_TILE + 6;
  assert.equal(island.tileMap.getTile(grassX, stoneY), "stone");
  const stoneResult = tryDigTile(island.tileMap, grassX, stoneY, pickaxe, inventory);
  assert.equal(stoneResult.ok, true);
  assert.equal(island.tileMap.getTile(grassX, stoneY), "air");
  assert.equal(inventory.countItem("stone") >= 1, true);
}

function testTileDamageAccumulatesBeforeBreaking() {
  const tileMap = new TileMap(8, 8, "air", CONFIG.SEA_LEVEL_TILE);
  tileMap.setTile(3, 3, "stone");
  const raft = Raft.createInitial();
  const world = new World({ raft, island: { tileMap, itemDrops: [], resources: [], enemies: [] } });
  const player = new Player({ x: 3 * CONFIG.TILE_SIZE, y: CONFIG.TILE_SIZE });
  const edit = new WorldEditSystem();
  const context = editTestContext({ player, world });
  const tool = getItemDefinition("basic_pickaxe");
  const target = { ok: true, tileX: 3, tileY: 3 };

  const first = edit.execute({ operation: "DAMAGE_TERRAIN", target, tool }, context);
  assert.equal(first.ok, true);
  assert.equal(first.saveDirty, false);
  assert.equal(tileMap.getTile(3, 3), "stone");

  edit.execute({ operation: "DAMAGE_TERRAIN", target, tool }, context);
  const third = edit.execute({ operation: "DAMAGE_TERRAIN", target, tool }, context);
  assert.equal(third.saveDirty, true);
  assert.equal(tileMap.getTile(3, 3), "air");
  assert.equal(context.player.items.countItem("stone") >= 1, true);
}

function testDropRangeUsesInclusiveMinMax() {
  assert.deepEqual(rollDropTable([{ itemId: "stone", min: 2, max: 4 }], { int: () => 4 }), [{ itemId: "stone", quantity: 4 }]);
}

function testIslandAndRaftDirtPlacementLifecycle() {
  const island = generateIsland({ seed: "dirt-lifecycle", biome: "temperate", size: "small", generationVersion: CONFIG.GENERATION_VERSION });
  const raft = Raft.createInitial();
  raft.setDock(island.raftDockTile.tileX, island.raftDockTile.tileY);
  const world = new World({ raft, island });
  const player = Player.createNew({ x: 33 * CONFIG.TILE_SIZE, y: (CONFIG.SEA_LEVEL_TILE - 4) * CONFIG.TILE_SIZE });
  player.hotbar.slots[0] = { itemId: "dirt_block", quantity: 2 };
  player.hotbar.select(0);
  const edit = new WorldEditSystem();
  const context = editTestContext({ player, world });
  const itemDefinition = getItemDefinition("dirt_block");

  const islandTarget = {
    domain: "island_terrain",
    tileX: 33,
    tileY: CONFIG.SEA_LEVEL_TILE - 2,
    tileId: "dirt",
    itemDefinition
  };
  const islandResult = edit.execute({ operation: "PLACE_BLOCK", target: islandTarget, itemDefinition }, context);
  assert.equal(islandResult.ok, true);
  assert.equal(world.tileMap.getTile(islandTarget.tileX, islandTarget.tileY), "dirt");
  assert.equal(player.items.countItem("dirt_block"), 1);

  const raftSpawn = raft.getSpawnWorldPosition();
  player.x = raftSpawn.x;
  player.y = raftSpawn.y;
  player.syncPreviousPosition();
  const raftTarget = {
    domain: "raft_block",
    gridX: 0,
    gridY: -1,
    tileId: "dirt",
    itemDefinition
  };
  const raftResult = edit.execute({ operation: "PLACE_BLOCK", target: raftTarget, itemDefinition }, context);
  assert.equal(raftResult.ok, true);
  assert.equal(raft.hasBlock(0, -1), true);
  assert.equal(player.items.countItem("dirt_block"), 0);
}

function testFailedRaftPlacementConsumesNothing() {
  const raft = Raft.createInitial();
  const world = new World({ raft });
  const player = Player.createNew(raft.getSpawnWorldPosition());
  const nearOpenWater = raft.gridToWorld(6, 0);
  player.x = nearOpenWater.x;
  player.y = nearOpenWater.y - CONFIG.PLAYER_HEIGHT;
  player.hotbar.slots[0] = { itemId: "dirt_block", quantity: 1 };
  player.hotbar.select(0);
  const edit = new WorldEditSystem();
  const itemDefinition = getItemDefinition("dirt_block");
  const result = edit.execute({
    operation: "PLACE_BLOCK",
    target: { domain: "raft_block", gridX: 8, gridY: -1, tileId: "dirt", itemDefinition },
    itemDefinition
  }, editTestContext({ player, world }));

  assert.equal(result.ok, false);
  assert.equal(result.code, "NO_SUPPORT");
  assert.equal(player.items.countItem("dirt_block"), 1);
  assert.equal(raft.hasBlock(8, -1), false);
}

function testRaftBoundsAndBlockPersistence() {
  const raft = Raft.createInitial();
  assert.equal(raft.grid.inBounds(CONFIG.RAFT_EXTENTS.minX, CONFIG.RAFT_EXTENTS.minY), true);
  assert.equal(raft.grid.inBounds(CONFIG.RAFT_EXTENTS.maxX, CONFIG.RAFT_EXTENTS.maxY), true);
  assert.equal(raft.grid.inBounds(CONFIG.RAFT_EXTENTS.minX - 1, 0), false);
  assert.equal(raft.grid.inBounds(CONFIG.RAFT_EXTENTS.maxX + 1, 0), false);
  assert.equal(raft.grid.inBounds(0, CONFIG.RAFT_EXTENTS.minY - 1), false);
  assert.equal(raft.grid.inBounds(0, CONFIG.RAFT_EXTENTS.maxY + 1), false);

  raft.addBlock("dirt", 0, -1);
  const restored = new Raft(raft.serialize());
  assert.equal(restored.hasBlock(0, -1), true);
}

function testStableResourceIdsIgnoreGenerationHistory() {
  const options = { seed: "stable-feature", biome: "temperate", size: "small", generationVersion: CONFIG.GENERATION_VERSION };
  generateIsland({ ...options, seed: "unrelated-a" });
  const a = generateIsland(options);
  generateIsland({ ...options, seed: "unrelated-b" });
  const b = generateIsland(options);
  assert.deepEqual(a.resources.map((node) => node.id), b.resources.map((node) => node.id));
}

function testSaveVersionOneMigrationAddsBlocksAndDrops() {
  const raft = Raft.createInitial();
  const v1 = {
    saveVersion: 1,
    createdAt: new Date().toISOString(),
    voyage: {
      distanceTravelled: 1,
      encounterCount: 0,
      currentState: "SAILING",
      currentIsland: null
    },
    player: {
      health: 100,
      oxygen: 100,
      position: { x: 0, y: 0 },
      inventory: new Inventory().serialize(),
      hotbar: { selectedIndex: 0, slots: [] }
    },
    raft: raft.serialize()
  };
  delete v1.raft.blocks;
  const migrated = migrateSave(v1);
  assert.equal(migrated.saveVersion, SAVE_VERSION);
  assert.deepEqual(migrated.raft.blocks, []);
  assert.equal(validateSave(migrated).ok, true);
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
  const player = new Player(raft.getSpawnWorldPosition());
  const buildPos = raft.gridToWorld(5, 0);
  player.x = buildPos.x;
  player.y = buildPos.y - CONFIG.PLAYER_HEIGHT;
  player.inventory = playerInventory;
  player.items = new PlayerInventory({ bag: player.inventory, hotbar: player.hotbar });
  const edit = new WorldEditSystem();
  const foundationItem = getItemDefinition("raft_foundation");
  const foundationTarget = { domain: "raft_structure", gridX: 6, gridY: 0, structureType: "wood_foundation", itemDefinition: foundationItem };
  assert.equal(edit.execute({ operation: "PLACE_STRUCTURE", target: foundationTarget, itemDefinition: foundationItem }, editTestContext({ player, world: new World({ raft }) })).ok, true);

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
  testPlayerInventoryFacadeAcrossBagAndHotbar,
  testCraftingUsesHotbarIngredients,
  testBuildPlacementValidity,
  testRaftFloatsAtWaterline,
  testArrivalBeachMeetsRaftDeck,
  testPlayerSeparatesColliderFromSpriteBounds,
  testPlayerAnimationAndBufferedJump,
  testDrowningDamageBypassesCombatInvulnerability,
  testPlayerFallSpeedIsClamped,
  testJumpReleaseCutsRisingVelocity,
  testJumpIgnoresSideBlockFace,
  testPlayerStepsFromRaftOntoBeach,
  testGameClockCapsCatchUpSteps,
  testInputPressSurvivesZeroTickFrames,
  testInputTapBetweenTicksRegistersOnce,
  testInputHoldDoesNotRepeatPressEdges,
  testInputBlurClearsHeldAndQueuedState,
  testPointerDownIsCanonicalAndNotDebounced,
  testIslandGeneration,
  testIslandNoiseCavesAndOres,
  testTerrainDigging,
  testTileDamageAccumulatesBeforeBreaking,
  testDropRangeUsesInclusiveMinMax,
  testIslandAndRaftDirtPlacementLifecycle,
  testFailedRaftPlacementConsumesNothing,
  testRaftBoundsAndBlockPersistence,
  testStableResourceIdsIgnoreGenerationHistory,
  testSaveVersionOneMigrationAddsBlocksAndDrops,
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

function createBoundInput() {
  const listeners = { window: {}, document: {}, canvas: {} };
  globalThis.window = {
    devicePixelRatio: 1,
    addEventListener: (type, handler) => {
      listeners.window[type] = handler;
    }
  };
  globalThis.document = {
    visibilityState: "visible",
    addEventListener: (type, handler) => {
      listeners.document[type] = handler;
    }
  };
  const canvas = {
    width: 1280,
    height: 720,
    clientWidth: 1280,
    clientHeight: 720,
    focused: false,
    capturedPointerId: null,
    focus: () => {
      canvas.focused = true;
    },
    setPointerCapture: (pointerId) => {
      canvas.capturedPointerId = pointerId;
    },
    addEventListener: (type, handler) => {
      listeners.canvas[type] = handler;
    },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 720 })
  };
  const input = new Input(canvas);
  return { input, canvas, listeners };
}

function editTestContext({ player, world }) {
  return {
    player,
    world,
    tick: 1,
    spawnItemDrop: (itemId, quantity, x, y) => {
      world.island ??= { itemDrops: [] };
      world.island.itemDrops ??= [];
      world.island.itemDrops.push({ itemId, quantity, x, y, destroyed: false, serialize: () => ({ itemId, quantity, x, y }) });
    }
  };
}
