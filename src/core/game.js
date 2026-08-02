import { CONFIG, encounterDelay, encounterInterval } from "../config.js?v=wp5-desert-1";
import { Camera } from "./camera.js";
import { GAME_STATES, GameStateController } from "./game-state.js";
import { GameClock } from "./game-clock.js";
import { Input } from "./input.js?v=wp5-desert-1";
import { Renderer } from "./renderer.js?v=wp5-desert-1";
import { EventBus } from "./event-bus.js";
import { World } from "../world/world.js?v=wp5-desert-1";
import { generateIsland, restoreIsland, serializeIsland } from "../world/island-generator.js?v=wp5-desert-1";
import { getBiomeDefinition } from "../world/biome-registry.js";
import { restorePendingEncounter, rollIslandEncounter } from "../world/catalog/encounter-roller.js";
import { biomeBlendAt } from "../world/catalog/biome-region-planner.js";
import { Raft } from "../raft/raft.js?v=wp5-desert-1";
import { BuildingSystem } from "../raft/building-system.js";
import { Player } from "../entities/player.js?v=wp5-desert-1";
import { distanceBetween } from "../entities/entity.js";
import { getItemDefinition } from "../items/item-registry.js";
import { getRecipe } from "../items/recipe-registry.js";
import { CraftingSystem } from "../items/crafting-system.js";
import { INVENTORY_POLICIES } from "../items/player-inventory.js";
import { WorldEditSystem } from "../world/world-edit-system.js";
import { TargetResolver } from "../world/target-resolver.js";
import { getActionSpec } from "../data/action-specs.js";
import { ItemDrop } from "../entities/item-drop.js";
import { SaveManager } from "../persistence/save-manager.js";
import { Hud } from "../ui/hud.js?v=wp5-desert-1";
import { MenuUI } from "../ui/menu-ui.js";
import { InventoryUI } from "../ui/inventory-ui.js?v=wp5-desert-1";
import { CraftingUI } from "../ui/crafting-ui.js?v=wp5-desert-1";
import { EncounterUI } from "../ui/encounter-ui.js";
import { BuildUI } from "../ui/build-ui.js";
import { DialogUI } from "../ui/dialog-ui.js";
import { EnvironmentEffectSystem } from "../world/environment/environment-effect-system.js";
import { createEnvironmentContext } from "../world/environment/environment-context.js";
import { getHazardDefinition } from "../world/content/hazard-registry.js";

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
    this.worldEditSystem = new WorldEditSystem();
    this.targetResolver = new TargetResolver();
    this.createdAt = new Date().toISOString();
    this.distanceTravelled = 0;
    this.encounterCount = 0;
    this.voyageSeed = createVoyageSeed();
    this.encounterRollIndex = 0;
    this.debugRollIndex = 0;
    this.progression = { level: 1, experience: 0, unlocks: [] };
    this.compassOptions = { includeExperimental: false, includePlaceholders: false, ignoreLevelGate: false, forcedTemplateId: null, forcedSize: null };
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
    this.currentPalette = null;
    this.environmentEffects = new EnvironmentEffectSystem();
    this.hazardCooldowns = new Map();
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
    this.worldEditSystem = new WorldEditSystem();
    this.targetResolver = new TargetResolver();
    this.createdAt = new Date().toISOString();
    this.distanceTravelled = 0;
    this.encounterCount = 0;
    this.voyageSeed = createVoyageSeed();
    this.encounterRollIndex = 0;
    this.debugRollIndex = 0;
    this.progression = { level: 1, experience: 0, unlocks: [] };
    this.encounterTimer = encounterDelay();
    this.pendingEncounter = null;
    this.currentBiome = null;
    this.currentPalette = null;
    this.environmentEffects = new EnvironmentEffectSystem();
    this.hazardCooldowns = new Map();
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

  loadDebugIsland({ seed, biome = "temperate", size = "small", templateId = "temperate_haven" }) {
    const island = generateIsland({ seed, biome, size, templateId, generationVersion: CONFIG.GENERATION_VERSION });
    this.raft = Raft.createInitial();
    this.raft.setDock(island.raftDockTile.tileX, island.raftDockTile.tileY);
    this.world = new World({ raft: this.raft, island });
    this.player = Player.createNew(this.raft.getSpawnWorldPosition());
    this.buildingSystem = new BuildingSystem(this.raft);
    this.worldEditSystem = new WorldEditSystem();
    this.targetResolver = new TargetResolver();
    this.currentBiome = getBiomeDefinition(biome);
    this.currentPalette = this.currentBiome.palette;
    this.environmentEffects = new EnvironmentEffectSystem();
    this.hazardCooldowns = new Map();
    this.pendingEncounter = null;
    this.acceptedEncounter = null;
    this.inventoryOpen = false;
    this.dialog = null;
    this.state = new GameStateController(GAME_STATES.ISLAND_ANCHORED);
    this.clock = new GameClock();
    this.input.clearAll();
    this.ui.menu.hide();
    this.canvas.focus?.({ preventScroll: true });
    return island.generationReport;
  }

  restoreFromSave(save) {
    this.createdAt = save.createdAt;
    this.distanceTravelled = save.voyage.distanceTravelled ?? 0;
    this.encounterCount = save.voyage.encounterCount ?? 0;
    this.voyageSeed = save.voyage.voyageSeed ?? createVoyageSeed();
    this.encounterRollIndex = save.voyage.encounterRollIndex ?? 0;
    this.debugRollIndex = save.voyage.debugRollIndex ?? 0;
    this.progression = normalizeProgression(save.voyage.progression);
    this.raft = new Raft(save.raft);
    const island = restoreIsland(save.voyage.currentIsland);
    if (save.voyage.generationMigrationNotice) this.saveError = save.voyage.generationMigrationNotice;
    else if (save.voyage.currentIsland && !island) this.saveError = "Active island discarded after catalog migration. Persistent raft and player progress were preserved.";
    if (island) this.raft.setDock(island.raftDockTile.tileX, island.raftDockTile.tileY);
    else this.raft.setDock(8, CONFIG.SEA_LEVEL_TILE + CONFIG.RAFT_WATERLINE_TILE_OFFSET);
    this.world = new World({ raft: this.raft, island });
    this.currentBiome = island ? getBiomeDefinition(island.biome) : null;
    this.currentPalette = this.currentBiome?.palette ?? null;
    this.environmentEffects = new EnvironmentEffectSystem();
    this.hazardCooldowns = new Map();
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
    this.worldEditSystem = new WorldEditSystem();
    this.targetResolver = new TargetResolver();
    this.state = new GameStateController(island ? GAME_STATES.ISLAND_ANCHORED : GAME_STATES.SAILING);
    this.encounterTimer = encounterInterval();
    this.pendingEncounter = restorePendingEncounter(save.voyage.pendingEncounter);
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
      else if (command.type === "craft") this.executeCraft(command.recipeId);
      else if (command.type === "debug_roll_encounter") this.debugRollEncounter();
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
    this.updateItemDrops(dt);
    this.autosaveTimer -= dt;
    if (this.autosaveTimer <= 0 && this.state.isActive() && this.saveManager.isDirty()) {
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
      this.updateLocalBiomeAndEnvironment(dt);
      this.updateHazardContacts(dt);
    }

    if (this.state.current === GAME_STATES.ISLAND_ANCHORED) {
      for (const enemy of this.world.island.enemies) {
        enemy.update(dt, {
          player: this.player,
          tileMap: this.world.tileMap,
          collisionWorld: this.world.getCollisionWorld()
        });
      }
    }
    this.updateContextPrompts();

    this.updatePlacementPreview();

    if (this.player.health <= 0 && this.state.current !== GAME_STATES.PLAYER_DEAD) this.killPlayer();
    const bounds = this.camera.worldBounds(this.world.width, this.world.height);
    this.camera.follow(this.player, bounds.widthPx, bounds.heightPx);
  }

  updateItemDrops(dt) {
    const drops = this.world.island?.itemDrops ?? [];
    for (const drop of drops) {
      if (drop.destroyed) continue;
      drop.update(dt);
      if (drop.pickupDelay > 0) continue;
      if (distanceBetween(drop, this.player) > CONFIG.TILE_SIZE * 1.2) continue;
      const result = this.player.items.addItem(drop.itemId, drop.quantity, INVENTORY_POLICIES.ALL_PLAYER_CONTAINERS);
      drop.quantity = result.remaining;
      if (drop.quantity <= 0) drop.destroyed = true;
      if (result.added > 0) this.saveManager.markDirty("pickup_item_drop");
    }
    if (this.world.island) this.world.island.itemDrops = drops.filter((drop) => !drop.destroyed);
  }

  updatePlacementPreview() {
    const selected = this.player.hotbar.getSelectedHotbarItem();
    const item = selected ? getItemDefinition(selected.itemId) : null;
    if (!this.buildingSystem.enabled && !item?.placement) {
      this.worldEditSystem.previewState = null;
      return;
    }
    const placementItem = this.buildingSystem.enabled
      ? getItemDefinition(this.buildingSystem.selectedStructure.itemId)
      : item;
    if (!placementItem) {
      this.worldEditSystem.previewState = null;
      return;
    }
    const target = this.targetResolver.resolve({
      actor: this.player,
      pointerWorldX: this.input.mouse.worldX,
      pointerWorldY: this.input.mouse.worldY,
      actionType: "place",
      itemDefinition: placementItem,
      world: this.world,
      buildingSystem: this.buildingSystem
    });
    if (!target.ok) {
      this.worldEditSystem.previewState = target;
      return;
    }
    this.worldEditSystem.preview({
      operation: placementItem.placement.type === "structure" ? "PLACE_STRUCTURE" : "PLACE_BLOCK",
      target,
      itemDefinition: placementItem
    }, this.editContext());
  }

  editContext() {
    return {
      player: this.player,
      world: this.world,
      tick: this.clock.tick,
      spawnItemDrop: (itemId, quantity, x, y) => this.spawnItemDrop(itemId, quantity, x, y)
    };
  }

  spawnItemDrop(itemId, quantity, x, y) {
    if (!this.world.island) return null;
    const existing = this.world.island.itemDrops.find((drop) => !drop.destroyed && drop.itemId === itemId && Math.hypot(drop.x - x, drop.y - y) < CONFIG.TILE_SIZE);
    if (existing) {
      existing.quantity += quantity;
      return existing;
    }
    const drop = new ItemDrop({
      itemId,
      quantity,
      x,
      y,
      vx: ((this.clock.tick % 3) - 1) * 18,
      vy: -20,
      createdTick: this.clock.tick
    });
    this.world.island.itemDrops.push(drop);
    return drop;
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
    this.currentBiome = getBiomeDefinition(island.biome);
    this.currentPalette = this.currentBiome.palette;
    this.environmentEffects = new EnvironmentEffectSystem();
    this.hazardCooldowns = new Map();
    this.acceptedEncounter = null;
    this.state.transition(GAME_STATES.ISLAND_ANCHORED);
    this.saveManager.save(this);
  }

  createEncounter() {
    this.pendingEncounter = rollIslandEncounter({
      voyageSeed: this.voyageSeed,
      rollIndex: this.encounterRollIndex,
      playerProgression: this.progression,
      rollType: "natural"
    });
    this.encounterRollIndex += 1;
  }

  acceptEncounter() {
    if (!this.pendingEncounter) return;
    this.acceptedEncounter = {
      seed: this.pendingEncounter.seed,
      recipe: this.pendingEncounter.recipe,
      templateId: this.pendingEncounter.templateId,
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

  handleDebugCompass() {
    if (!CONFIG.DEVELOPMENT_MODE) return;
    if (this.state.current !== GAME_STATES.SAILING) {
      this.contextPrompt = "Return to sailing to survey for another island.";
      return;
    }
    this.enqueueCommand({ type: "debug_roll_encounter" });
  }

  debugRollEncounter() {
    if (!CONFIG.DEVELOPMENT_MODE || this.state.current !== GAME_STATES.SAILING) return;
    this.pendingEncounter = rollIslandEncounter({
      voyageSeed: this.voyageSeed,
      rollIndex: this.debugRollIndex,
      playerProgression: this.progression,
      debugOptions: this.compassOptions,
      rollType: "debug"
    });
    this.debugRollIndex += 1;
  }

  setCompassOptions(options = {}) {
    if (!CONFIG.DEVELOPMENT_MODE) return;
    this.compassOptions = { ...this.compassOptions, ...options };
  }

  setDebugLevel(level) {
    if (!CONFIG.DEVELOPMENT_MODE) return;
    this.progression = { ...this.progression, level: Math.max(1, Math.floor(level)) };
  }

  updateContextPrompts() {
    if (this.state.current !== GAME_STATES.ISLAND_ANCHORED && this.state.current !== GAME_STATES.SAILING) return;
    const storage = this.raft.findNearbyStorage(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2);
    if (storage) {
      this.contextPrompt = "E: open storage crate";
      return;
    }
    if (this.state.current === GAME_STATES.ISLAND_ANCHORED && this.isPlayerOnRaft() && this.isPlayerNearSail()) this.contextPrompt = "E: leave this island and sail away";
  }

  interact() {
    if (this.state.current !== GAME_STATES.ISLAND_ANCHORED && this.state.current !== GAME_STATES.SAILING) return;
    const storage = this.raft.findNearbyStorage(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2);
    if (storage) {
      this.openStorageId = storage.id;
      this.inventoryOpen = true;
      this.input.clearAll();
      return;
    }
    if (this.state.current === GAME_STATES.ISLAND_ANCHORED && this.isPlayerOnRaft() && this.isPlayerNearSail()) this.showSailAwayDialog();
  }

  handlePrimaryAction(command = this.input.mouse) {
    const worldX = command.worldX ?? this.input.mouse.worldX;
    const worldY = command.worldY ?? this.input.mouse.worldY;
    const slot = this.player.hotbar.getSelectedHotbarItem();
    const item = this.buildingSystem.enabled
      ? getItemDefinition(this.buildingSystem.selectedStructure.itemId)
      : slot ? getItemDefinition(slot.itemId) : null;
    if (!item) return;
    if (item.toolType === "debug_compass") {
      this.handleDebugCompass();
      return;
    }
    if (item.category === "consumable" && item.heal) {
      this.startPlayerAction({
        actionType: "consume",
        intent: { item },
        validate: () => this.player.items.hasItems([{ itemId: item.id, quantity: 1 }], INVENTORY_POLICIES.SELECTED_STACK)
          ? { ok: true }
          : { ok: false, code: "MISSING_ITEM", message: "Missing item." },
        execute: () => {
          this.player.heal(item.heal);
          this.player.items.consumeSelected(1);
          this.saveManager.markDirty("consume_item");
          return { ok: true };
        }
      });
      return;
    }
    if (item.placement || this.buildingSystem.enabled) {
      const target = this.targetResolver.resolve({
        actor: this.player,
        pointerWorldX: worldX,
        pointerWorldY: worldY,
        actionType: "place",
        itemDefinition: item,
        world: this.world,
        buildingSystem: this.buildingSystem
      });
      const operation = item.placement?.type === "structure" ? "PLACE_STRUCTURE" : "PLACE_BLOCK";
      this.startPlayerAction({
        actionType: "place",
        intent: { operation, target, itemDefinition: item },
        validate: () => target.ok ? this.worldEditSystem.validate({ operation, target, itemDefinition: item }, this.editContext()) : target,
        execute: () => {
          const result = this.worldEditSystem.execute({ operation, target, itemDefinition: item }, this.editContext());
          this.handleEditResult(result);
          return result;
        }
      });
      return;
    }
    if (this.state.current !== GAME_STATES.ISLAND_ANCHORED) return;
    if (item.toolType === "spear") {
      const target = this.targetResolver.resolve({ actor: this.player, pointerWorldX: worldX, pointerWorldY: worldY, actionType: "spear", itemDefinition: item, world: this.world });
      this.startPlayerAction({
        actionType: "spear",
        intent: { target, item },
        validate: () => target,
        execute: () => {
          if (!target.ok) return target;
          target.enemy.hit(item.damage ?? 20, {
            playerItems: this.player.items,
            spawnItemDrop: (itemId, quantity, x, y) => this.spawnItemDrop(itemId, quantity, x, y)
          });
          return { ok: true };
        }
      });
      return;
    }
    const resourceTarget = this.targetResolver.resolve({ actor: this.player, pointerWorldX: worldX, pointerWorldY: worldY, actionType: "harvest", itemDefinition: item, world: this.world });
    if (resourceTarget.ok) {
      this.startPlayerAction({
        actionType: "harvest",
        intent: { target: resourceTarget, item },
        validate: () => resourceTarget,
        execute: () => {
          const result = resourceTarget.node.hit(item, null);
          if (result.destroyed) {
            this.world.island.removedResourceIds.add(resourceTarget.node.id);
            for (const drop of result.drops ?? []) {
              const addResult = this.player.items.addItem(drop.itemId, drop.quantity, INVENTORY_POLICIES.ALL_PLAYER_CONTAINERS);
              if (addResult.remaining > 0) this.spawnItemDrop(drop.itemId, addResult.remaining, resourceTarget.node.x, resourceTarget.node.y);
            }
            this.saveManager.markDirty("resource_destroyed");
          }
          return result;
        }
      });
      return;
    }
    if (item.toolType === "pickaxe") {
      const target = this.targetResolver.resolve({ actor: this.player, pointerWorldX: worldX, pointerWorldY: worldY, actionType: "mine", itemDefinition: item, world: this.world });
      this.startPlayerAction({
        actionType: "mine",
        intent: { target, tool: item },
        validate: () => target.ok ? this.worldEditSystem.validate({ operation: "DAMAGE_TERRAIN", target, tool: item }, this.editContext()) : target,
        execute: () => {
          const result = this.worldEditSystem.execute({ operation: "DAMAGE_TERRAIN", target, tool: item }, this.editContext());
          this.handleEditResult(result);
          return result;
        }
      });
    }
  }

  startPlayerAction({ actionType, intent, validate, execute }) {
    const validation = validate();
    if (!validation.ok) {
      this.player.actionController.block(validation);
      this.contextPrompt = validation.message ?? validation.reason ?? "";
      return validation;
    }
    return this.player.actionController.start({
      intent,
      spec: getActionSpec(actionType),
      execute
    });
  }

  handleEditResult(result) {
    if (!result.ok) {
      this.contextPrompt = result.message ?? result.reason ?? "";
      return;
    }
    if (result.saveDirty) this.saveManager.markDirty(result.operation);
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
    this.enqueueCommand({ type: "craft", recipeId });
  }

  executeCraft(recipeId) {
    const recipe = getRecipe(recipeId);
    const hasStation = recipe.station ? this.raft.hasStation(recipe.station) : true;
    const result = this.craftingSystem.craft(recipe, this.player.items, hasStation);
    if (result.ok) this.saveManager.markDirty("craft");
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
    for (const itemId of ["wood", "stone", "fibre", "sand_block", "salt", "rope", "crawler_chitin"]) {
      const count = this.player.items.countItem(itemId, INVENTORY_POLICIES.ALL_PLAYER_CONTAINERS);
      if (count <= 0) continue;
      const accepted = storage.addItem(itemId, count);
      this.player.items.removeItem(itemId, count - accepted.remaining, INVENTORY_POLICIES.ALL_PLAYER_CONTAINERS);
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
    const result = this.player.items.addItem(slot.itemId, slot.quantity, INVENTORY_POLICIES.ALL_PLAYER_CONTAINERS);
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
    this.collectRaftAreaDrops();
    this.world.clearIsland();
    this.raft.setDock(8, CONFIG.SEA_LEVEL_TILE + CONFIG.RAFT_WATERLINE_TILE_OFFSET);
    const spawn = this.raft.getSpawnWorldPosition();
    this.teleportPlayer(spawn.x, spawn.y);
    this.player.vx = 0;
    this.player.vy = 0;
    this.currentBiome = null;
    this.currentPalette = null;
    this.environmentEffects = new EnvironmentEffectSystem();
    this.hazardCooldowns = new Map();
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
      const count = this.player.items.countItem(itemId, INVENTORY_POLICIES.ALL_PLAYER_CONTAINERS);
      const loss = Math.floor(count * CONFIG.BASIC_RESOURCE_DEATH_DROP_PERCENT);
      if (loss > 0) this.player.items.removeItem(itemId, loss, INVENTORY_POLICIES.ALL_PLAYER_CONTAINERS);
    }
  }

  updateLocalBiomeAndEnvironment(dt) {
    const localBiome = this.getLocalBiomeDefinition();
    this.currentBiome = localBiome;
    this.currentPalette = this.getLocalPalette();
    if (!this.world.island) return;
    this.environmentEffects.update(dt, createEnvironmentContext({
      player: this.player,
      world: this.world,
      localBiome
    }), this.player);
  }

  getLocalBiomeDefinition() {
    const island = this.world.island;
    if (!island) return null;
    const tileX = Math.floor((this.player.x + this.player.width / 2) / CONFIG.TILE_SIZE);
    const region = island.recipe?.biomeRegions?.find((entry) => tileX >= entry.startX && tileX < entry.endX);
    return getBiomeDefinition(region?.biomeId ?? island.biome);
  }

  getLocalPalette() {
    const island = this.world.island;
    if (!island?.recipe?.biomeRegions) return this.currentBiome?.palette ?? null;
    const tileX = Math.floor((this.player.x + this.player.width / 2) / CONFIG.TILE_SIZE);
    const blend = biomeBlendAt(island.recipe.biomeRegions, tileX);
    if (!blend || blend.primaryBiomeId === blend.secondaryBiomeId) return getBiomeDefinition(blend?.primaryBiomeId ?? island.biome).palette;
    const a = getBiomeDefinition(blend.primaryBiomeId).palette;
    const b = getBiomeDefinition(blend.secondaryBiomeId).palette;
    return {
      sky: mixHex(a.sky, b.sky, blend.blend),
      water: mixHex(a.water, b.water, blend.blend),
      tint: blend.blend < 0.5 ? a.tint : b.tint
    };
  }

  updateHazardContacts(dt) {
    if (!this.world.island) return;
    for (const [hazardId, remaining] of this.hazardCooldowns) this.hazardCooldowns.set(hazardId, Math.max(0, remaining - dt));
    for (const node of this.world.island.resources) {
      if (node.destroyed || !node.hazardId) continue;
      if (!rectsOverlap(this.player.bounds, node.bounds)) continue;
      const hazard = getHazardDefinition(node.hazardId);
      if (!hazard.damage) continue;
      if ((this.hazardCooldowns.get(hazard.id) ?? 0) > 0) continue;
      this.player.applyDamage({ amount: hazard.damage.amount, type: hazard.damage.type, grantsInvulnerability: false });
      this.hazardCooldowns.set(hazard.id, hazard.damage.cooldownSeconds);
    }
  }

  isPlayerOnRaft() {
    const footProbe = {
      x: this.player.x + this.player.width * 0.25,
      y: this.player.y + this.player.height,
      width: this.player.width * 0.5,
      height: 2
    };
    return this.raft.querySolidRects(footProbe).some((rect) => rect.source === "raft" || rect.source === "raft_block");
  }

  isPlayerNearSail() {
    const sail = this.raft.structures.find((structure) => structure.structureType === "sail");
    if (!sail) return false;
    const pos = this.raft.gridToWorld(sail.gridX, sail.gridY);
    return Math.hypot(pos.x + CONFIG.TILE_SIZE / 2 - this.player.center().x, pos.y + CONFIG.TILE_SIZE - this.player.center().y) <= CONFIG.PLAYER_INTERACTION_RANGE_TILES * CONFIG.TILE_SIZE;
  }

  collectRaftAreaDrops() {
    for (const drop of this.world.island?.itemDrops ?? []) {
      const probe = { x: drop.x, y: drop.y, width: drop.width, height: drop.height };
      if (!this.raft.querySolidRects(probe).length) continue;
      const result = this.player.items.addItem(drop.itemId, drop.quantity, INVENTORY_POLICIES.ALL_PLAYER_CONTAINERS);
      drop.quantity = result.remaining;
      if (drop.quantity <= 0) drop.destroyed = true;
    }
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

function createVoyageSeed() {
  if (globalThis.crypto?.getRandomValues) {
    const values = new Uint32Array(2);
    globalThis.crypto.getRandomValues(values);
    return `voyage-${values[0].toString(16)}-${values[1].toString(16)}`;
  }
  return `voyage-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

function normalizeProgression(progression) {
  return {
    level: Math.max(1, Math.floor(progression?.level ?? 1)),
    experience: Math.max(0, Math.floor(progression?.experience ?? 0)),
    unlocks: Array.isArray(progression?.unlocks) ? [...progression.unlocks] : []
  };
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

function rectsOverlap(a, b) {
  return a.x < b.x + b.width
    && a.x + a.width > b.x
    && a.y < b.y + b.height
    && a.y + a.height > b.y;
}

function mixHex(a, b, t) {
  const ca = parseHex(a);
  const cb = parseHex(b);
  return `#${[0, 1, 2].map((index) => Math.round(ca[index] + (cb[index] - ca[index]) * t).toString(16).padStart(2, "0")).join("")}`;
}

function parseHex(value) {
  const hex = value.replace("#", "");
  return [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
}
