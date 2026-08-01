# Raftbound Implementation Report

## Files Created

- `index.html`, `styles.css`, `package.json`
- `src/main.js`
- `src/config.js`
- `src/core/*`
- `src/world/*`
- `src/raft/*`
- `src/entities/*`
- `src/items/*`
- `src/persistence/*`
- `src/ui/*`
- `src/data/*`
- `tests/run-tests.mjs`
- `README.md`

## Architectural Decisions

- The raft and island are separate model roots. Raft structures persist across island transitions, while island entities are regenerated from seed and abandoned on sail-away.
- One tile size and coordinate conversion module are used by terrain, raft placement, resources, collision, rendering, and build previews.
- Game state is centralized in a small state machine rather than scattered booleans.
- Registries expose item, recipe, tile, biome, structure, and resource definitions to keep gameplay systems data-driven.
- The simulation uses a fixed timestep and caps accumulated time to avoid large jumps after inactive tabs.
- Save access is isolated in the save manager and validated before restore.

## Tests Performed

- Seeded random repeatability
- Tile coordinate conversion
- Inventory stacking and removal
- Recipe validation and crafting rollback behavior
- Build placement validity
- Save serialization/deserialization
- Island determinism and required resource generation
- Raft persistence across island transitions

## Remaining Gaps

- Biome-specific generation for desert, jungle, and volcanic is placeholder-only.
- Combat feedback and particles are minimal.
- Storage transfer is intentionally simple.
- There is no advanced accessibility pass or mobile control scheme.

## Recommended Next Milestone

Harden the anchored expedition experience: improve resource feedback, add tile damage visuals, expand enemy behavior modestly, and add a focused browser test harness that exercises the full loop automatically.

## Work Package 2 Update

Branch: `codex/world-edit-placement-foundation`

Base SHA: `c9debfbb374a6a310d9e9a7bb02a96a87c80225e`

### Architecture

- Added `PlayerInventory` as the ownership facade over bag and hotbar. Crafting, structure placement, death loss, storage deposit, withdrawal, and block placement now use explicit inventory policies.
- Added `PlayerActionController` with `IDLE`, `WINDUP`, `ACTIVE`, `RECOVERY`, and `BLOCKED` states. Primary gameplay effects execute during the active phase.
- Added action specs, target resolution, tile damage, placement validation, and `WorldEditSystem` transactions for terrain damage, island block placement, raft block placement, and raft structure placement.
- Added persistent `raft.blocks` for dirt blocks placed on supported raft cells. Raft block collision and rendering are separate from island tile maps.
- Added world item drops for overflow from mining/resource harvesting and automatic pickup near the player.
- Added deterministic generated feature IDs for resources and enemies.
- Corrected raft build bounds to explicit configured extents.

### Save Migration

- Save schema is now version 2.
- Version 2 saves include `raft.blocks` and active-island `itemDrops`.
- Version 1 saves migrate by adding an empty raft block layer and empty island drop list.
- Version 1 saves with old removed-resource IDs return the player to sailing while preserving player, raft, inventory, hotbar, structures, and storage. This avoids relying on untranslatable process-counter resource IDs.

### Tests

- Automated suite covers inventory facade policies, hotbar crafting ingredients, progressive tile damage, inclusive drop ranges, dirt island/raft lifecycle, failed placement rollback, raft bounds, raft block persistence, stable resource IDs, and save v1 migration.
- Generation V3 was not included.
