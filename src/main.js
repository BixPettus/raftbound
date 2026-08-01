import { Game } from "./core/game.js?v=wp4-catalog-1";
import { CONFIG } from "./config.js?v=wp4-catalog-1";

const canvas = document.getElementById("gameCanvas");
const game = new Game(canvas, {
  hud: document.getElementById("hud"),
  menu: document.getElementById("menu"),
  inventory: document.getElementById("inventory"),
  encounter: document.getElementById("encounter"),
  build: document.getElementById("build"),
  dialog: document.getElementById("dialog")
});

game.start();

if (CONFIG.DEVELOPMENT_MODE) {
  window.__RAFTBOUND_GAME__ = game;
  const debugParams = new URLSearchParams(window.location.search);
  const debugIsland = debugParams.get("debugIsland");
  if (debugIsland) {
    window.__RAFTBOUND_DEBUG_REPORT__ = game.loadDebugIsland({
      seed: debugIsland,
      biome: debugParams.get("debugBiome") ?? "temperate",
      size: debugParams.get("debugSize") ?? "small",
      templateId: debugParams.get("debugTemplate") ?? "temperate_haven"
    });
  }
  window.__RAFTBOUND_COMPASS__ = {
    setOptions: (options) => game.setCompassOptions(options),
    setLevel: (level) => game.setDebugLevel(level),
    roll: () => game.debugRollEncounter()
  };
}
