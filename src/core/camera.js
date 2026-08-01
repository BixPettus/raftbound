import { CONFIG } from "../config.js";

export class Camera {
  constructor(canvas) {
    this.canvas = canvas;
    this.x = 0;
    this.y = 0;
  }

  follow(target, worldWidthPx, worldHeightPx) {
    const targetX = target.x + target.width / 2 - this.canvas.width / 2;
    const targetY = target.y + target.height / 2 - this.canvas.height * 0.55;
    this.x += (targetX - this.x) * 0.12;
    this.y += (targetY - this.y) * 0.12;
    this.x = Math.max(0, Math.min(Math.max(0, worldWidthPx - this.canvas.width), this.x));
    this.y = Math.max(0, Math.min(Math.max(0, worldHeightPx - this.canvas.height), this.y));
  }

  resizeToDisplay() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.max(640, Math.floor(this.canvas.clientWidth * ratio));
    const height = Math.max(360, Math.floor(this.canvas.clientHeight * ratio));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }

  worldBounds(widthTiles, heightTiles) {
    return {
      widthPx: widthTiles * CONFIG.TILE_SIZE,
      heightPx: heightTiles * CONFIG.TILE_SIZE
    };
  }
}
