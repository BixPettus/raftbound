import { CONFIG, encounterDelay, encounterInterval } from "../config.js?v=terrain-inventory-4";
import { Camera } from "./camera.js";
import { GAME_STATES, GameStateController } from "./game-state.js";
import { GameClock } from "./game-clock.js";
import { Input } from "./input.js?v=terrain-inventory-4";
import { Renderer } from "./renderer.js?v=terrain-inventory-4";
import { EventBus } from "./event-bus.js";
import { World } from "../world/world.js?v=terrain-inventory-4";
import { generateIsland, restoreIsland, serializeIsland } from "../world/island-generator.js?v=terrain-inventory-4";
import { SeededRandom } from "../world/seeded-random.js";
import { chooseBiome } from "../world/biome-registry.js";
import { Raft } from "../raft/raft.js?v=terrain-inventory-4";
import { BuildingSystem } from "../raft/building-system.js";
import { Player } from "../entities/player.js?v=terrain-inventory-4";
import { distanceBetween } from "../entities/entity.js";
import { getItemDefinition } from "../items/item-registry.js";
import { getRecipe } from "../items/recipe-registry.js";
import { CraftingSystem } from "../items/crafting-system.js";
import { worldToTile } from "../world/coordinates.js";
import { tryDigTile, tryPlaceTile } from "../world/terrain-digging.js?v=terrain-inventory-4";
import { SaveManager } from "../persistence/save-manager.js";
import { Hud } from "../ui/hud.js";
import { MenuUI } from "../ui/menu-ui.js";
import { InventoryUI } from "../ui/inventory-ui.js?v=terrain-inventory-4";
import { CraftingUI } from "../ui/crafting-ui.js?v=terrain-inventory-4";
import { EncounterUI } from "../ui/encounter-ui.js";
import { BuildUI } from "../ui/build-ui.js";
import { DialogUI } from "../ui/dialog-ui.js";

export class Game {
  constructor(canvas, elements) {
    this.canvas = canvas;
    this.state = new GameStateController();
    this.events = new EventBus();
    this.saveManager = new SaveManager();
    this.input = new Input(canvas);
    this.clock = new GameClock();
    this.camera = new Camera(canvas);
    this.renderer = new Renderer(canvas);
    this.raft = Raft.createInitial();
    this.world = new World({ raft: this.raft });
    this.player = Player.createNew(this.raft.getSpawnWorldPosition());
    this.buildingSystem = new BuildingSystem(this.raft);
    this.craftingSystem = new CraftingSystem();
    this.createdAt = new Date().toISOString();
    this.distanceTravelled = 0;
    this.encounterCount = 0;
    this.encounterTimer = encounterDelay();
    this.pendingEncounter = null;
    this.transitionTimer = 0;
    this.autosaveTimer = CONFIG.AUTOSAVE_SECONDS;
    this.inventoryOpen = false;
    this.openStorageId = null;
    this.dialog = null;
    this.contextPrompt = "";
    this.saveError = null;
    this.currentBiome = null;
    this.simulationCommands = [];
    this.lastFrameStepCount = 0;
    this.lastFrameAccumulator = 0;

    this.ui = {
      menu: new MenuUI(elements.menu, this),
      hud: new Hud(elements.hud, this),
      inventory: new InventoryUI(elements.inventory, this),
      crafting: new CraftingUI(elements.inventory, this),
      encounter: new EncounterUI(elements.encounter, this),
      build: new BuildUI(elements.build, this),
      dialog: new DialogUI(elements.dialog, this)
    };
    this.ui.menu.render();
    this.bindLifecycle();
  }

  start() {
    const frame = (time) => {
      this.camera.resizeToDisplay();
      this.input.capturePointerPosition(this.camera);
      const frameResult = this.clock.advance(time);
      this.lastFrameStepCount = frameResult.steps;
      this.lastFrameAccumulator = frameResult.accumulator;
      for (let i = 0; i < frameResult.steps; i += 1) {
        const tickInput = this.input.beginTick(this.clock.nextTickTime());
        this.routeInput(tickInput);
        this.update(frameResult.fixedTimestep, tickInput);
        this.input.endTick(tickInput);
        this.clock.commitTick();
      }
      this.render(frameResult.alpha);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  advanceFrame(deltaSeconds) {
    this.camera.resizeToDisplay();
    this.input.capturePointerPosition(this.camera);
    if (this.clock.lastTime == null) this.clock.lastTime = 0;
    const now = (this.clock.lastTime ?? 0) + deltaSeconds * 1000;
    const frameResult = this.clock.advance(now);
    this.lastFrameStepCount = frameResult.steps;
    this.lastFrameAccumulator = frameResult.accumulator;
    for (let i = 0; i < frameResult.steps; i += 1) {
      const tickInput = this.input.beginTick(this.clock.nextTickTime());
      this.routeInput(tickInput);
      this.update(frameResult.fixedTimestep, tickInput);
      this.input.endTick(tickInput);
      this.clock.commitTick();
    }
    return frameResult;
  }

  advanceTicks(count) {
    const frameResult = this.clock.advanceTicks(count);
    for (let i = 0; i < frameResult.steps; i += 1) {
      const tickInput = this.input.beginTick(this.clock.nextTickTime());
      this.routeInput(tickInput);
      this.update(frameResult.fixedTimestep, tickInput);
      this.input.endTick(tickInput);
      this.clock.commitTick();
    }
    return frameResult;
  }

  bindLifecycle() {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden" && this.state.isActive()) this.saveManager.save(this);
    });
    window.addEventListener("beforeunload", () => {
      if (this.state.isActive()) this.saveManager.save(this);
    });
  }

  startNewVoyage() {
    this.raft = Raft.createInitial();
    this.world = new World({ raft: this.raft });
    this.player = Player.createNew(this.raft.getSpawnWorldPosition());
    this.buildingSystem = new BuildingSystem(this.raft);
    this.createdAt = new Date().toISOString();
    this.distanceTravelled = 0;
    this.encounterCount = 0;
    this.encounterTimer = encounterDelay();
    this.pendingEncounter = null;
    this.currentBiome = null;
    this.inventoryOpen = false;
    this.dialog = null;
    this.state = new GameStateController(GAME_STATES.MAIN_MENU);
    this.state.transition(GAME_STATES.SAILING);
    this.clock = new GameClock();
    this.input.clearAll();
    this.ui.menu.hide();
    this.canvas.focus?.({ preventScroll: true });
    this.saveManager.save(this);
  }

  continueVoyage() {
    const result = this.saveManager.load();
    if (!result.ok) {
      this.saveError = result.reason;
      this.ui.menu.render();
      return;
    }
    this.restoreFromSave(result.save);
    this.ui.menu.hide();
  }

  restoreFromSave(save) {
    this.createdAt = save.createdAt;
    this.distanceTravelled = save.voyage.distanceTravelled ?? 0;
    this.encounterCount = save.voyage.encounterCount ?? 0;
    this.raft = new Raft(save.raft);
    const island = restoreIsland(save.voyage.currentIsland);
    if (island) this.raft.setDock(island.raftDockTile.tileX, island.raftDockTile.tileY);
    else this.raft.setDock(8, CONFIG.SEA_LEVEL_TILE + CONFIG.RAFT_WATERLINE_TILE_OFFSET);
    this.world = new World({ raft: this.raft, island });
    this.currentBiome = island ? { id: island.biome, palette: { sky: "#86d5f0", water: "#2d91c9" } } : null;
    const position = save.player.position ?? this.raft.getSpawnWorldPosition();
    this.player = new Player({
      x: position.x,
      y: position.y,
      health: save.player.health,
      oxygen: save.player.oxygen,
      inventory: save.player.inventory,
      hotbar: save.player.hotbar
    });
    this.buildingSystem = new BuildingSystem(this.raft);
    this.state = new GameStateController(island ? GAME_STATES.ISLAND_ANCHORED : GAME_STATES.SAILING);
    this.encounterTimer = encounterInterval();
    this.pendingEncounter = null;
    this.inventoryOpen = false;
    this.dialog = null;
    this.clock = new GameClock();
    this.input.clearAll();
    this.canvas.focus?.({ preventScroll: true });
  }

  routeInput(tickInput) {
    if (tickInput.consumePressed("Escape")) {
      if (this.dialog) this.dialog = null;
      else if (this.inventoryOpen) this.closeInventory();
      else if (this.state.current === GAME_STATES.PAUSED) this.state.resume();
      else if (this.state.isActive()) {
        this.state.transition(GAME_STATES.PAUSED);
        this.saveManager.save(this);
      }
    }
    if (this.state.current === GAME_STATES.MAIN_MENU || this.state.current === GAME_STATES.PAUSED) return;
    if (tickInput.consumePressed("KeyI") || tickInput.consumePressed("Tab")) this.toggleInventory();
    if (this.isGameplayBlockedByContext()) return;
    if (tickInput.consumePressed("KeyB")) this.enqueueCommand({ type: "toggle_build" });
    if (tickInput.consumePressed("KeyR")) this.enqueueCommand({ type: "cycle_build" });
    for (let i = 1; i <= 9; i += 1) {
      if (tickInput.consumePressed(`Digit${i}`)) this.enqueueCommand({ type: "select_hotbar", index: i - 1 });
    }
    if (tickInput.mouse.wheelDelta !== 0) this.enqueueCommand({ type: "cycle_hotbar", direction: tickInput.mouse.wheelDelta > 0 ? 1 : -1 });
    if (tickInput.consumeSecondaryClick()) this.enqueueCommand({ type: "cancel_build" });
    if (tickInput.consumePressed("KeyE")) this.enqueueCommand({ type: "interact" });
    if (tickInput.consumePrimaryClick()) {
      this.enqueueCommand({
        type: "primary_action",
        worldX: tickInput.mouse.worldX,
        worldY: tickInput.mouse.worldY
      });
    }
  }

  enqueueCommand(command) {
    this.simulationCommands.push(command);
  }

  executeSimulationCommands() {
    const commands = this.simulationCommands;
    this.simulationCommands = [];
    for (const command of commands) {
      if (this.isGameplayBlockedByContext() && command.type !== "select_hotbar") continue;
      if (command.type === "toggle_build") this.buildingSystem.toggle();
      else if (command.type === "cycle_build") this.buildingSystem.cycle();
      else if (command.type === "select_hotbar") this.player.hotbar.select(command.index);
      else if (command.type === "cycle_hotbar") this.player.hotbar.cycle(command.direction);
      else if (command.type === "cancel_build") this.buildingSystem.cancel();
      else if (command.type === "interact") this.interact();
      else if (command.type === "primary_action") this.handlePrimaryAction(command);
    }
  }

  isGameplayBlockedByContext() {
    return Boolean(this.dialog || this.inventoryOpen || this.state.current === GAME_STATES.ISLAND_TRANSITION || this.state.current === GAME_STATES.PLAYER_DEAD);
  }

  isSimulationPausedByContext() {
    return Boolean(this.dialog || this.inventoryOpen);
  }

  update(dt, tickInput = this.input) {
    this.contextPrompt = "";
    this.input.update(dt);
    if (this.state.current === GAME_STATES.PAUSED || this.state.current === GAME_STATES.MAIN_MENU) return;
    this.executeSimulationCommands();
    if (this.isSimulationPausedByContext()) return;
    if (this.state.current === GAME_STATES.PLAYER_DEAD) {
      this.transitionTimer -= dt;
      if (this.transitionTimer <= 0) this.respawnPlayer();
      return;
    }
    this.world.update(dt);
    this.autosaveTimer -= dt;
    if (this.autosaveTimer <= 0 && this.state.isActive()) {
      this.saveManager.save(this);
      this.autosaveTimer = CONFIG.AUTOSAVE_SECONDS;
    }

    if (this.state.current === GAME_STATES.SAILING) this.updateSailing(dt);
    if (this.state.current === GAME_STATES.ISLAND_TRANSITION) this.updateTransition(dt);

    if (this.state.current !== GAME_STATES.ISLAND_TRANSITION) {
      this.player.update(dt, tickInput, {
        tileMap: this.world.tileMap,
        waterSystem: this.world.waterSystem,
        collisionWorld: this.world.getCollisionWorld()
      });
    }

    if (this.state.current === GAME_STATES.ISLAND_ANCHORED) {
      for (const enemy of this.world.island.enemies) {
        enemy.update(dt, {
          player: this.player,
          tileMap: this.world.tileMap,
          collisionWorld: this.world.getCollisionWorld()
        });
      }
      this.updateAnchoredPrompts();
    }

    if (this.buildingSystem.enabled) {
      this.buildingSystem.updatePreview(this.input.mouse.worldX, this.input.mouse.worldY, this.player.inventory);
    }

    if (this.player.health <= 0 && this.state.current !== GAME_STATES.PLAYER_DEAD) this.killPlayer();
    const bounds = this.camera.worldBounds(this.world.width, this.world.height);
    this.camera.follow(this.player, bounds.widthPx, bounds.heightPx);
  }

  updateSailing(dt) {
    this.distanceTravelled += dt * 7;
    if (this.pendingEncounter) {
      this.pendingEncounter.remaining -= dt;
      if (this.pendingEncounter.remaining <= 0) this.declineEncounter();
      return;
    }
    this.encounterTimer -= dt;
    if (this.encounterTimer <= 0) this.createEncounter();
  }

  updateTransition(dt) {
    this.transitionTimer -= dt;
    if (this.transitionTimer > 0) return;
    const island = generateIsland(this.acceptedEncounter);
    this.world.setIsland(island);
    this.raft.setDock(island.raftDockTile.tileX, island.raftDockTile.tileY);
    const spawn = this.raft.getSpawnWorldPosition();
    this.teleportPlayer(spawn.x, spawn.y);
    this.player.vx = 0;
    this.player.vy = 0;
    this.currentBiome = this.acceptedEncounter.biome;
    this.acceptedEncounter = null;
    this.state.transition(GAME_STATES.ISLAND_ANCHORED);
    this.saveManager.save(this);
  }

  createEncounter() {
    const seed = `voyage-${Date.now()}-${this.encounterCount + 1}`;
    const random = new SeededRandom(seed);
    const biome = chooseBiome(random);
    const sizes = ["small", "medium", "large"];
    this.pendingEncounter = {
      seed,
      biome,
      size: sizes[random.int(0, sizes.length - 1)],
      generationVersion: CONFIG.GENERATION_VERSION,
      remaining: CONFIG.ENCOUNTER_RESPONSE_SECONDS
    };
  }

  acceptEncounter() {
    if (!this.pendingEncounter) return;
    this.acceptedEncounter = {
      seed: this.pendingEncounter.seed,
      biome: this.pendingEncounter.biome.id,
      size: this.pendingEncounter.size,
      generationVersion: this.pendingEncounter.generationVersion
    };
    this.pendingEncounter = null;
    this.encounterCount += 1;
    this.transitionTimer = 1.2;
    this.state.transition(GAME_STATES.ISLAND_TRANSITION);
  }

  declineEncounter() {
    this.pendingEncounter = null;
    this.encounterTimer = encounterInterval();
  }

  updateAnchoredPrompts() {
    const storage = this.raft.findNearbyStorage(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2);
    if (storage) {
      this.contextPrompt = "E: open storage crate";
      return;
    }
    if (this.isPlayerOnRaft()) this.contextPrompt = "E: leave this island and sail away";
  }

  interact() {
    if (this.state.current !== GAME_STATES.ISLAND_ANCHORED) return;
    const storage = this.raft.findNearbyStorage(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2);
    if (storage) {
      this.openStorageId = storage.id;
      this.inventoryOpen = true;
      this.input.clearAll();
      return;
    }
    if (this.isPlayerOnRaft()) this.showSailAwayDialog();
  }

  handlePrimaryAction(command = this.input.mouse) {
    const worldX = command.worldX ?? this.input.mouse.worldX;
    const worldY = command.worldY ?? this.input.mouse.worldY;
    if (this.buildingSystem.enabled) {
      const result = this.buildingSystem.placeSelected(worldX, worldY, this.player.inventory);
      if (result.ok) {
        this.player.startAction("build");
        this.saveManager.save(this);
      }
      return;
    }
    const slot = this.player.hotbar.getSelectedHotbarItem();
    if (!slot) return;
    const item = getItemDefinition(slot.itemId);
    if (item.category === "consumable" && item.heal) {
      this.player.startAction("consume");
      this.player.heal(item.heal);
      this.player.hotbar.removeItem(item.id, 1);
      return;
    }
    if (item.tileId && this.state.current === GAME_STATES.ISLAND_ANCHORED) {
      this.player.startAction("build");
      if (this.tryPlaceTerrainTile(item, slot, worldX, worldY)) this.saveManager.save(this);
      return;
    }
    if (item.toolType || item.category === "weapon") this.player.startAction(actionTypeForItem(item));
    if (this.state.current !== GAME_STATES.ISLAND_ANCHORED) return;
    const interactionRange = CONFIG.PLAYER_INTERACTION_RANGE_TILES * CONFIG.TILE_SIZE;
    if (item.toolType === "spear") {
      const enemy = nearestInRange(this.world.island.enemies.filter((enemy) => !enemy.destroyed), this.player, interactionRange);
      if (enemy) enemy.hit(item.damage ?? 20, this.player.inventory);
      return;
    }
    const activeResources = this.world.island.resources.filter((node) => !node.destroyed);
    const node = nearestInRange(activeResources, { center: () => ({ x: worldX, y: worldY }) }, 72)
      ?? nearestInRange(activeResources, this.player, interactionRange);
    if (node) {
      const result = node.hit(item, this.player.inventory);
      if (result.destroyed) {
        this.world.island.removedResourceIds.add(node.id);
        this.saveManager.save(this);
      }
      return;
    }
    if (this.tryDigTerrain(item, worldX, worldY)) this.saveManager.save(this);
  }

  tryDigTerrain(item, worldX = this.input.mouse.worldX, worldY = this.input.mouse.worldY) {
    if (item.toolType !== "pickaxe") return false;
    const target = this.findTargetTerrainTile(worldX, worldY);
    if (!target) return false;
    if (!this.isTileInInteractionRange(target.tileX, target.tileY)) return false;
    return tryDigTile(this.world.tileMap, target.tileX, target.tileY, item, this.player.inventory).ok;
  }

  tryPlaceTerrainTile(item, slot, worldX = this.input.mouse.worldX, worldY = this.input.mouse.worldY) {
    const target = worldToTile(worldX, worldY);
    if (!this.isTileInInteractionRange(target.tileX, target.tileY)) return false;
    if (this.playerOverlapsTile(target.tileX, target.tileY)) return false;
    const result = tryPlaceTile(this.world.tileMap, target.tileX, target.tileY, item.tileId);
    if (!result.ok) return false;
    this.player.hotbar.removeItem(slot.itemId, 1);
    return true;
  }

  findTargetTerrainTile(worldX = this.input.mouse.worldX, worldY = this.input.mouse.worldY) {
    const mouseTile = worldToTile(worldX, worldY);
    const candidates = [
      mouseTile,
      { tileX: mouseTile.tileX, tileY: mouseTile.tileY + 1 }
    ];
    return candidates.find(({ tileX, tileY }) => this.world.tileMap.getTile(tileX, tileY) !== "air") ?? null;
  }

  isTileInInteractionRange(tileX, tileY) {
    const tileCenter = {
      x: (tileX + 0.5) * CONFIG.TILE_SIZE,
      y: (tileY + 0.5) * CONFIG.TILE_SIZE
    };
    const playerCenter = this.player.center();
    return Math.hypot(tileCenter.x - playerCenter.x, tileCenter.y - playerCenter.y) <= CONFIG.TERRAIN_DIG_RANGE_TILES * CONFIG.TILE_SIZE;
  }

  playerOverlapsTile(tileX, tileY) {
    const rect = {
      x: tileX * CONFIG.TILE_SIZE,
      y: tileY * CONFIG.TILE_SIZE,
      width: CONFIG.TILE_SIZE,
      height: CONFIG.TILE_SIZE
    };
    return this.player.x < rect.x + rect.width
      && this.player.x + this.player.width > rect.x
      && this.player.y < rect.y + rect.height
      && this.player.y + this.player.height > rect.y;
  }

  craft(recipeId) {
    const recipe = getRecipe(recipeId);
    const hasStation = recipe.station ? this.raft.hasStation(recipe.station) : true;
    const result = this.craftingSystem.craft(recipe, this.player.inventory, hasStation);
    if (result.ok) this.saveManager.save(this);
    this.render();
  }

  toggleInventory() {
    this.inventoryOpen = !this.inventoryOpen;
    if (!this.inventoryOpen) this.openStorageId = null;
    this.input.clearAll();
  }

  closeInventory() {
    this.inventoryOpen = false;
    this.openStorageId = null;
    this.input.clearAll();
  }

  depositBasicResources() {
    const storage = this.raft.storage.get(this.openStorageId);
    if (!storage) return;
    for (const itemId of ["wood", "stone", "fibre", "rope", "crawler_chitin"]) {
      const count = this.player.inventory.countItem(itemId);
      if (count <= 0) continue;
      const accepted = storage.addItem(itemId, count);
      this.player.inventory.removeItem(itemId, count - accepted.remaining);
    }
    this.saveManager.save(this);
    this.render();
  }

  withdrawFirstStorageStack() {
    const storage = this.raft.storage.get(this.openStorageId);
    if (!storage) return;
    const index = storage.slots.findIndex(Boolean);
    if (index === -1) return;
    const slot = storage.slots[index];
    const result = this.player.inventory.addItem(slot.itemId, slot.quantity);
    storage.removeItem(slot.itemId, slot.quantity - result.remaining);
    this.saveManager.save(this);
    this.render();
  }

  moveItemStack(from, to) {
    const source = this.resolveItemContainer(from?.container);
    const target = this.resolveItemContainer(to?.container);
    const fromIndex = Number(from?.index);
    const toIndex = Number(to?.index);
    if (!source || !target || !Number.isInteger(fromIndex) || !Number.isInteger(toIndex)) return false;
    if (!source.slots[fromIndex] || !target.slots || toIndex < 0 || toIndex >= target.slots.length) return false;
    let moved = false;
    if (source === target) {
      moved = source.moveStack(fromIndex, toIndex);
    } else {
      moved = moveStackBetween(source, fromIndex, target, toIndex);
    }
    if (!moved) return false;
    this.saveManager.save(this);
    this.render();
    return true;
  }

  resolveItemContainer(container) {
    if (container === "inventory") return this.player.inventory;
    if (container === "hotbar") return this.player.hotbar;
    if (container === "storage" && this.openStorageId) return this.raft.storage.get(this.openStorageId);
    return null;
  }

  showSailAwayDialog() {
    this.dialog = {
      title: "Leave this island?",
      message: "This island and anything left on it will be permanently abandoned.",
      actions: [
        { label: "Sail away", danger: true, run: () => this.sailAway() },
        { label: "Stay", run: () => { this.dialog = null; } }
      ]
    };
    this.input.clearAll();
  }

  sailAway() {
    this.dialog = null;
    this.closeInventory();
    this.world.clearIsland();
    this.raft.setDock(8, CONFIG.SEA_LEVEL_TILE + CONFIG.RAFT_WATERLINE_TILE_OFFSET);
    const spawn = this.raft.getSpawnWorldPosition();
    this.teleportPlayer(spawn.x, spawn.y);
    this.player.vx = 0;
    this.player.vy = 0;
    this.currentBiome = null;
    this.encounterTimer = encounterInterval();
    this.state.transition(GAME_STATES.SAILING);
    this.saveManager.save(this);
  }

  killPlayer() {
    this.dropDeathResources();
    this.transitionTimer = 1.5;
    this.state.transition(GAME_STATES.PLAYER_DEAD);
  }

  respawnPlayer() {
    const spawn = this.raft.getSpawnWorldPosition();
    this.teleportPlayer(spawn.x, spawn.y);
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.health = CONFIG.MAX_HEALTH;
    this.player.oxygen = CONFIG.MAX_OXYGEN;
    this.state.transition(this.world.island ? GAME_STATES.ISLAND_ANCHORED : GAME_STATES.SAILING);
    this.saveManager.save(this);
  }

  dropDeathResources() {
    for (const itemId of ["wood", "stone", "fibre"]) {
      const count = this.player.inventory.countItem(itemId);
      const loss = Math.floor(count * CONFIG.BASIC_RESOURCE_DEATH_DROP_PERCENT);
      if (loss > 0) this.player.inventory.removeItem(itemId, loss);
    }
  }

  isPlayerOnRaft() {
    const grid = this.raft.worldToGrid(this.player.x + this.player.width / 2, this.player.y + this.player.height);
    return grid.gridX >= -1 && grid.gridX <= 7 && grid.gridY >= -3 && grid.gridY <= 2;
  }

  teleportPlayer(x, y) {
    this.player.x = x;
    this.player.y = y;
    this.player.syncPreviousPosition();
  }

  serializeCurrentIsland() {
    return serializeIsland(this.world.island);
  }

  render(alpha = 1) {
    this.renderer.render(this, alpha);
    this.ui.hud.render();
    this.ui.inventory.render();
    this.ui.crafting.renderInto();
    this.ui.encounter.render();
    this.ui.build.render();
    this.ui.dialog.render();
  }
}

function actionTypeForItem(item) {
  if (item.toolType === "spear") return "spear";
  if (item.toolType === "hammer") return "build";
  return item.toolType ?? "tool";
}

function nearestInRange(entities, origin, range) {
  let nearest = null;
  let nearestDistance = Infinity;
  for (const entity of entities) {
    const distance = distanceBetween(entity, origin);
    if (distance < range && distance < nearestDistance) {
      nearest = entity;
      nearestDistance = distance;
    }
  }
  return nearest;
}

function moveStackBetween(source, fromIndex, target, toIndex) {
  const sourceSlot = source.slots[fromIndex];
  const targetSlot = target.slots[toIndex];
  if (!targetSlot) {
    target.slots[toIndex] = sourceSlot;
    source.slots[fromIndex] = null;
    return true;
  }
  if (targetSlot.itemId === sourceSlot.itemId) {
    const limit = getItemDefinition(sourceSlot.itemId).stackLimit;
    const moved = Math.min(sourceSlot.quantity, limit - targetSlot.quantity);
    if (moved <= 0) return false;
    targetSlot.quantity += moved;
    sourceSlot.quantity -= moved;
    if (sourceSlot.quantity <= 0) source.slots[fromIndex] = null;
    return true;
  }
  source.slots[fromIndex] = targetSlot;
  target.slots[toIndex] = sourceSlot;
  return true;
}
