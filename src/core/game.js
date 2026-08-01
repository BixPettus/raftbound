import { CONFIG, encounterDelay, encounterInterval } from "../config.js?v=terrain-inventory-4";
import { Camera } from "./camera.js";
import { GAME_STATES, GameStateController } from "./game-state.js";
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
    let lastTime = performance.now();
    let accumulator = 0;
    const frame = (time) => {
      const rawDt = Math.min(CONFIG.MAX_FRAME_TIME, (time - lastTime) / 1000);
      lastTime = time;
      accumulator += rawDt;
      this.camera.resizeToDisplay();
      this.input.beginFrame(this.camera);
      this.handleGlobalInput();
      while (accumulator >= CONFIG.FIXED_TIMESTEP) {
        this.update(CONFIG.FIXED_TIMESTEP);
        accumulator -= CONFIG.FIXED_TIMESTEP;
      }
      this.render();
      this.input.endFrame();
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
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
    this.canvas.focus?.({ preventScroll: true });
  }

  handleGlobalInput() {
    if (this.input.consumePressed("Escape")) {
      if (this.dialog) this.dialog = null;
      else if (this.inventoryOpen) this.closeInventory();
      else if (this.state.current === GAME_STATES.PAUSED) this.state.resume();
      else if (this.state.isActive()) {
        this.state.transition(GAME_STATES.PAUSED);
        this.saveManager.save(this);
      }
    }
    if (this.state.current === GAME_STATES.MAIN_MENU || this.state.current === GAME_STATES.PAUSED) return;
    if (this.input.consumePressed("KeyI") || this.input.consumePressed("Tab")) this.toggleInventory();
    if (this.input.consumePressed("KeyB")) this.buildingSystem.toggle();
    if (this.input.consumePressed("KeyR")) this.buildingSystem.cycle();
    for (let i = 1; i <= 9; i += 1) {
      if (this.input.consumePressed(`Digit${i}`)) this.player.hotbar.select(i - 1);
    }
    if (this.input.mouse.wheelDelta !== 0) this.player.hotbar.cycle(this.input.mouse.wheelDelta > 0 ? 1 : -1);
    if (this.input.consumeSecondaryClick()) this.buildingSystem.cancel();
    if (this.input.consumePressed("KeyE")) this.interact();
    if (this.input.consumePrimaryClick()) this.handlePrimaryAction();
  }

  update(dt) {
    this.contextPrompt = "";
    this.input.update(dt);
    if (this.state.current === GAME_STATES.PAUSED || this.state.current === GAME_STATES.MAIN_MENU) return;
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
      this.player.update(dt, this.input, {
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
    this.player.x = spawn.x;
    this.player.y = spawn.y;
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
      return;
    }
    if (this.isPlayerOnRaft()) this.showSailAwayDialog();
  }

  handlePrimaryAction() {
    if (this.buildingSystem.enabled) {
      const result = this.buildingSystem.placeSelected(this.input.mouse.worldX, this.input.mouse.worldY, this.player.inventory);
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
      if (this.tryPlaceTerrainTile(item, slot)) this.saveManager.save(this);
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
    const node = nearestInRange(activeResources, { center: () => ({ x: this.input.mouse.worldX, y: this.input.mouse.worldY }) }, 72)
      ?? nearestInRange(activeResources, this.player, interactionRange);
    if (node) {
      const result = node.hit(item, this.player.inventory);
      if (result.destroyed) {
        this.world.island.removedResourceIds.add(node.id);
        this.saveManager.save(this);
      }
      return;
    }
    if (this.tryDigTerrain(item)) this.saveManager.save(this);
  }

  tryDigTerrain(item) {
    if (item.toolType !== "pickaxe") return false;
    const target = this.findTargetTerrainTile();
    if (!target) return false;
    if (!this.isTileInInteractionRange(target.tileX, target.tileY)) return false;
    return tryDigTile(this.world.tileMap, target.tileX, target.tileY, item, this.player.inventory).ok;
  }

  tryPlaceTerrainTile(item, slot) {
    const target = worldToTile(this.input.mouse.worldX, this.input.mouse.worldY);
    if (!this.isTileInInteractionRange(target.tileX, target.tileY)) return false;
    if (this.playerOverlapsTile(target.tileX, target.tileY)) return false;
    const result = tryPlaceTile(this.world.tileMap, target.tileX, target.tileY, item.tileId);
    if (!result.ok) return false;
    this.player.hotbar.removeItem(slot.itemId, 1);
    return true;
  }

  findTargetTerrainTile() {
    const mouseTile = worldToTile(this.input.mouse.worldX, this.input.mouse.worldY);
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
  }

  closeInventory() {
    this.inventoryOpen = false;
    this.openStorageId = null;
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
  }

  sailAway() {
    this.dialog = null;
    this.closeInventory();
    this.world.clearIsland();
    this.raft.setDock(8, CONFIG.SEA_LEVEL_TILE + CONFIG.RAFT_WATERLINE_TILE_OFFSET);
    const spawn = this.raft.getSpawnWorldPosition();
    this.player.x = spawn.x;
    this.player.y = spawn.y;
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
    this.player.x = spawn.x;
    this.player.y = spawn.y;
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

  serializeCurrentIsland() {
    return serializeIsland(this.world.island);
  }

  render() {
    this.renderer.render(this);
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
