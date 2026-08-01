import { CONFIG } from "../config.js";

export class Camera {
  constructor(canvas) {
    this.canvas = canvas;
    this.x = 0;
    this.y = 0;
    this.previousX = 0;
    this.previousY = 0;
    this.logicalWidth = CONFIG.CANVAS_WIDTH;
    this.logicalHeight = CONFIG.CANVAS_HEIGHT;
    this.devicePixelRatio = 1;
  }

  follow(target, worldWidthPx, worldHeightPx) {
    this.previousX = this.x;
    this.previousY = this.y;
    const targetX = target.x + target.width / 2 - this.logicalWidth / 2;
    const targetY = target.y + target.height / 2 - this.logicalHeight * 0.55;
    this.x += (targetX - this.x) * 0.12;
    this.y += (targetY - this.y) * 0.12;
    this.x = Math.max(0, Math.min(Math.max(0, worldWidthPx - this.logicalWidth), this.x));
    this.y = Math.max(0, Math.min(Math.max(0, worldHeightPx - this.logicalHeight), this.y));
  }

  getPresentationState(alpha = 1) {
    const t = Math.max(0, Math.min(1, alpha));
    return {
      x: this.previousX + (this.x - this.previousX) * t,
      y: this.previousY + (this.y - this.previousY) * t,
      logicalWidth: this.logicalWidth,
      logicalHeight: this.logicalHeight
    };
  }

  resizeToDisplay() {
    const ratio = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const logicalWidth = Math.max(640, Math.floor(this.canvas.clientWidth || CONFIG.CANVAS_WIDTH));
    const logicalHeight = Math.max(360, Math.floor(this.canvas.clientHeight || CONFIG.CANVAS_HEIGHT));
    const backingWidth = Math.floor(logicalWidth * ratio);
    const backingHeight = Math.floor(logicalHeight * ratio);
    this.logicalWidth = logicalWidth;
    this.logicalHeight = logicalHeight;
    this.devicePixelRatio = ratio;
    if (this.canvas.width !== backingWidth || this.canvas.height !== backingHeight) {
      this.canvas.width = backingWidth;
      this.canvas.height = backingHeight;
    }
  }

  worldBounds(widthTiles, heightTiles) {
    return {
      widthPx: widthTiles * CONFIG.TILE_SIZE,
      heightPx: heightTiles * CONFIG.TILE_SIZE
    };
  }
}
