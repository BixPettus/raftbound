import { Game } from "./core/game.js?v=terrain-inventory-4";
import { CONFIG } from "./config.js?v=terrain-inventory-4";

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
}
