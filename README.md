# Raftbound

Raftbound is a static browser baseline for a 2D side-scrolling survival game. The raft is the permanent world state; islands are deterministic, temporary expeditions that are discarded when the player sails away.

## Run

From this folder:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Tests

```bash
npm test
npm run test:generation
```

`npm test` runs the fast unit and integration suite. `npm run test:catalog` validates the island catalog and recipe compiler. `npm run test:generation` runs the deterministic Generation V4 matrix across validated catalog templates and allowed sizes.

`npm run report:catalog` writes `reports/island-catalog-report.json`.

In development mode, deterministic island inspection is available at `/?debugIsland=<seed>&debugSize=<small|medium|large>&debugTemplate=<templateId>`.

## Controls

- `A` / `Left`: move left
- `D` / `Right`: move right
- `Space`: jump or swim upward
- `S` / `Down`: swim downward
- `E`: interact with raft storage or sailing prompt
- Left mouse: gather, attack, or place while building
- Right mouse: cancel build mode
- `1-9`: select hotbar slot
- Mouse wheel: cycle hotbar
- `I` / `Tab`: inventory and crafting
- `B`: build mode
- `R`: cycle build piece
- `Escape`: pause or close overlay

## Architecture

The project uses vanilla JavaScript ES modules, Canvas 2D, browser `localStorage`, and `requestAnimationFrame`. Runtime coordination lives in `src/core/game.js`, with an explicit state machine in `src/core/game-state.js`. Tile conversion and collision use a shared grid model with `TILE_SIZE = 32`.

Persistent raft data is handled separately from island generation in `src/raft`. Disposable islands are generated through `src/world/island-generator.js`, which delegates to a staged Generation V4 pipeline under `src/world/generation`. Islands are selected from the versioned catalog in `src/data/world`, compiled into immutable recipes, then generated with deterministic named random substreams, island-local sea levels, biome regions, sandy edge profiles, cave graphs, static water masks, strata, ore clusters, enemy spawn budgets, validation reports, and stable generated feature IDs.

Items, recipes, tiles, structures, and biomes are data-driven through modules in `src/data` and registry wrappers in each system folder. UI modules read game state and call system APIs instead of mutating inventories or raft structures directly.

## Implemented Systems

- Main menu, sailing, island transition, island anchored, paused, and death states
- Fixed timestep update loop
- Smooth player movement, jumping, swimming, oxygen, damage, death, and raft respawn
- Persistent raft with foundations, sail, storage crate, workbench, and build placement
- Deterministic Generation V4 catalog islands with broad surfaces, sandy beaches at both ends, cave networks, deep caverns, static water masks, ore clusters, diagnostics, enemy spawn budgets, and biome placeholders
- Versioned island catalog with archetypes, templates, biome schemas, edge profiles, special attributes, danger tiers, enemy definitions, spawn tables, deterministic encounter rolls, and recipe hashes
- Development Surveyor's Compass for deterministic debug encounter rolls while sailing
- Wood, stone, and fibre resource nodes
- Inventory, hotbar selection, recipe crafting, and storage transfer
- Shore crawler enemy with patrol, chase, attack, hurt, and death states
- Encounter timer with investigate and sail-on choices
- Sail-away confirmation that discards the island
- Versioned save/load, autosave, reset, and invalid-save preservation

## Save Reset

Use **Reset save** on the main menu. If the save is invalid, the game keeps the raw invalid value under a backup key and shows a reset option instead of crashing.

For manual reset, remove the `raftbound.save.v1` item from the browser's local storage for this site.

## Known Limitations

- Art is generated with simple Canvas shapes and tile colors.
- Only temperate catalog templates have full generation and validation; desert, jungle, and volcanic content is schema-complete placeholder data for WP5.
- The enemy uses direct chase movement rather than pathfinding.
- Island modifications are limited to removed resources and modified tiles.
- Storage supports a single open crate interaction at a time.
- Browser smoke testing depends on local browser tooling availability.
