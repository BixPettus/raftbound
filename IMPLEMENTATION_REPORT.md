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

## Work Package 3 Update

Branch: `codex/generation-v3-cave-foundation`

Base SHA: `d0177debb0f88d9ea484003684626b7742612204`

Generation version: `2 -> 3`

Save version: unchanged at `2`

### Generation Architecture

- Added a staged Generation V3 pipeline under `src/world/generation/`.
- The public `src/world/island-generator.js` path remains a compatibility entry point.
- Generation context owns definition, profile, island-local `TileMap`, surface heights, cave graph, cave mask, water mask, resources, enemies and diagnostics.
- Named deterministic RNG substreams isolate surface, cave, water, ore, resource and enemy generation.
- Island dimensions are now data-driven by size with island-local sea levels.
- Temperate V3 now creates broad surfaces, strata, planned surface entrances, upper/mid chambers, deep caverns, branches and loops.

### Cave Graph

- Node types: `SURFACE_ENTRANCE`, `UPPER_CHAMBER`, `MID_CHAMBER`, `DEEP_CAVERN`, `SIDE_CHAMBER`.
- Edge types: `MAIN_ROUTE`, `BRANCH`, `LOOP`.
- Medium and large islands include loops; large islands include substantial deep caverns.
- A sealed dry cave pocket is carved separately from the ocean-connected cave path to validate static water separation.

### Static Water

- `TileMap` now supports a generated `waterMask`.
- Water is boundary-flooded from ocean-connected non-solid cells at or below the island sea level.
- Sealed cave air below sea level remains dry.
- Rendering uses visible water-mask cells instead of a universal underwater overlay when a mask is present.
- Player water checks use `TileMap.isWaterTile`, so swimming/oxygen follow the mask.

### Validation

- Validation checks required resource types, cave graph requirements, cave-air ratio, water-on-solid, surface slope and actual player reachability.
- Reachability uses explicit walk, fall, jump-arc and swimming transitions, and every transition checks swept collider clearance.
- Valid islands must prove reachable guaranteed wood, stone and fibre, at least one cave entrance, an upper chamber, a mid chamber, and a deep cavern on medium and large islands.
- Fallback generation now runs through the same validation path and throws explicitly if the safe fallback is invalid.
- Generation reports include dimensions, selected attempt, fallback use, tile counts, cave counts, water counts, ore counts, timings and validation failures.
- Development mode exposes the latest generation report, a helper after an island is generated, and deterministic debug island URLs via `?debugIsland=<seed>&debugSize=<size>`.

### Save Compatibility

- Active saved islands with `generationVersion < 3` are discarded on load.
- Player health, inventory, hotbar, voyage progress, complete raft, raft blocks, structures and storage are preserved.
- The player returns to sailing with a migration notice.
- Generation V3 island saves restore seed, biome, size, generation version, removed resource IDs, tile modifications, opened containers and active island drops.

### Matrix Results

- Command: `npm run test:generation`
- Seeds: `matrix-000` through `matrix-099`
- Sizes: `small`, `medium`, `large`
- Islands generated: `300`
- Fallback count: `0`
- Attempt distribution: attempt 0 = `260`, attempt 1 = `34`, attempt 2 = `6`
- Timing: p95 `110.31 ms`, p99 `121.07 ms`, max `128.56 ms`
- Cave-air ratio range: `0.114` to `0.2779`

### Regression Tests

- Command: `npm test`
- Result: `42 checks passed`
- Added `testTraversalCannotCrossSealedWall`, which proves the traversal graph cannot cross a solid wall sealed from floor to ceiling.

### Browser Validation

- Local app served on `http://localhost:4174/`.
- In-app browser manually inspected deterministic debug seeds:
  - Small: `http://localhost:4174/?debugIsland=inspect-small&debugSize=small`
  - Medium: `http://localhost:4174/?debugIsland=inspect-medium&debugSize=medium`
  - Large: `http://localhost:4174/?debugIsland=inspect-large&debugSize=large`
- Each rendered an anchored island with the correct seed visible in the HUD.
- Browser console warnings/errors: none.

### Known Limitations

- Full biome implementation remains out of scope; only temperate V3 is tuned.
- Traversal validation is conservative and abstract rather than a full reproduction of runtime physics.
- Debug visualisation is exposed through diagnostics/report data, not a full in-game toggleable overlay.

## Work Package 4 Update

Branch: `codex/island-catalog-encounter-foundation`

Base SHA: `eaf20e606ec8214f0f7bd770a27232543e3d497e`

Generation version: `3 -> 4`

Save version: `2 -> 3`

Island catalog version: `1`

### Baseline

- Existing unit-test count: `42`
- Existing generation matrix: `300` islands, fallback count `0`, p95 `107.69 ms`, p99 `125.07 ms`, max `163.52 ms`

### Catalog Architecture

- Added source catalog data under `src/data/world/`.
- Added runtime catalog modules under `src/world/catalog/`.
- Added archetypes, templates, complete biome schemas, edge profiles, special attributes, danger tiers, enemy definitions and enemy spawn tables.
- Initial natural templates: `temperate_haven`, `temperate_caverns`.
- Placeholder templates/biomes exist for future desert, jungle and volcanic work, but natural encounter rolls exclude incomplete content.

### Recipe Compiler

- Generation now consumes a compiled island recipe carrying template identity, catalog version, biome regions, edge profiles, special attributes, generation modifiers, enemy spawn plan and `recipeHash`.
- Compatibility callers may still pass `seed`, `biome`, `size` and optional `templateId`; these are compiled into a recipe before generation.
- Recipe hashes are deterministic and exclude runtime diagnostics.

### Danger And Level

- Biome danger formula: `environment * 0.30 + hostility * 0.35 + navigation * 0.20 + scarcity * 0.15`.
- Multi-biome danger starts from the arithmetic mean of distinct biome scores, then applies archetype, special-attribute and template modifiers.
- Danger tiers are derived centrally: Safe, Low, Moderate, High, Extreme.
- Level rating and minimum access level are authored independently from danger.

Examples:

- `temperate_haven`: danger `1.6`, tier `Safe`, level `1`.
- `temperate_caverns`: danger `22.6`, tier `Low`, level `2`.

### Edges And Sand

- Added the `sandy_beach` edge profile plus placeholder future edge profiles.
- Enabled WP4 templates use sandy arrival and far edges.
- Added edge shaping before strata fill.
- Arrival repair now uses compiled edge materials instead of hard-coded grass/dirt/stone.
- Added `sand`, `sandstone` and `sand_block`. Sand mines to `sand_block`; sandstone currently drops `stone`.

### Enemies

- Added enemy data registry, factory and spawn-budget system.
- Shore Crawler runtime stats now come from `enemy-definitions.js`.
- Spawn tables separate `weight`, `density`, count bounds and budget.
- Generation reports include enemy budgets, counts by type, enemy levels and realised threat.

### Encounters And Debug Compass

- Natural encounters now roll templates through `rollIslandEncounter`.
- Voyage saves persist `voyageSeed`, `encounterRollIndex`, `debugRollIndex` and progression.
- Encounter UI displays island type, size, generation rating, level, danger, biomes, attributes, template ID, recipe hash, seed and catalog version.
- Added development-only `debug_compass` / Surveyor's Compass, granted on new development voyages.
- Compass rolls debug encounters while sailing, replaces pending encounters, increments only `debugRollIndex`, and does not abandon anchored islands.
- Development helper: `window.__RAFTBOUND_COMPASS__.setOptions(...)` and `.setLevel(...)`.
- Production safeguards strip/reject development-only inventory items when `CONFIG.DEVELOPMENT_MODE` is false.

### Migration

- Save V2 and older saves migrate to V3 with level-1 progression, new voyage seed and zeroed roll indices.
- Active Generation V3 islands are discarded rather than mapped to catalog templates.
- Player, inventory, hotbar, raft, raft blocks, storage, distance and encounter count are preserved.

### Validation

- `npm test`: `42 checks passed`
- `npm run test:catalog`: `catalog validation passed`
- `npm run test:generation`: `144` islands across `temperate_haven` and `temperate_caverns`; fallback count `0`; p95 `124.94 ms`; p99 `133.54 ms`; max `185.47 ms`
- `npm run report:catalog`: `reports/island-catalog-report.json`

### Browser Acceptance

Local app served on `http://localhost:4175/`.

Inspected:

- `temperate_caverns`, medium, seed `voyage-f5d312ac-64d179a9:debug:0:temperate_caverns:medium`, recipe hash `e4b824be`
- `temperate_haven`, small, seed `voyage-f5d312ac-64d179a9:debug:1:temperate_haven:small`, recipe hash `edbb8dd4`

Confirmed:

- New development voyage grants Surveyor's Compass.
- One compass click while sailing creates one encounter with full metadata.
- Repeated compass click replaces the pending encounter.
- Accepting `temperate_caverns` generates an anchored island with sandy arrival beach.
- HUD restores template ID and recipe hash after reload/continue.
- Sail-away returns to sailing.
- Compass works again after sail-away and uses the next debug roll index.
- Browser warning/error log: none.

### Known Limitations And WP5 Scope

- Full desert, jungle and volcanic terrain production was not included.
- Multi-biome recipes compile and validate at catalog level, but only one-biome temperate recipes are matrix validated.
- No graphical compass filter panel yet; options are exposed through development APIs.
- WP5 should implement desert, jungle and volcanic terrain/resource/enemy production, additional edge behavior, biome transitions beyond schema support, and richer encounter filtering.
