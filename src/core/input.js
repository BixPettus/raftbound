import { CONFIG } from "../config.js?v=terrain-inventory-4";
import { screenToWorld } from "../world/coordinates.js";

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.down = new Set();
    this.queuedPressed = new Set();
    this.framePressed = new Set();
    this.queuedMouse = { leftPressed: false, rightPressed: false, wheelDelta: 0 };
    this.mouse = { x: 0, y: 0, worldX: 0, worldY: 0, leftPressed: false, rightPressed: false, wheelDelta: 0 };
    this.lastPointerPressAt = -Infinity;
    this.primaryClickFeedbackTimer = 0;
    this.bind();
  }

  bind() {
    window.addEventListener("keydown", (event) => {
      const code = normalizeKeyCode(event);
      if (["Space", "Tab", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(code)) event.preventDefault();
      if (!this.down.has(code)) this.queuedPressed.add(code);
      this.down.add(code);
    });
    window.addEventListener("keyup", (event) => this.down.delete(normalizeKeyCode(event)));
    const queueWindowPointerPress = (event) => {
      if (event.target === this.canvas) this.queuePointerPress(event);
    };
    window.addEventListener("pointerdown", queueWindowPointerPress, true);
    window.addEventListener("mousedown", queueWindowPointerPress, true);
    window.addEventListener("click", queueWindowPointerPress, true);
    this.canvas.addEventListener("mousemove", (event) => {
      this.mouse.x = event.clientX;
      this.mouse.y = event.clientY;
    });
    const queuePointerPress = (event) => this.queuePointerPress(event);
    this.canvas.addEventListener("pointerdown", queuePointerPress);
    this.canvas.addEventListener("mousedown", queuePointerPress);
    this.canvas.addEventListener("click", queuePointerPress);
    this.canvas.addEventListener("contextmenu", (event) => event.preventDefault());
    this.canvas.addEventListener("wheel", (event) => {
      event.preventDefault();
      this.queuedMouse.wheelDelta += Math.sign(event.deltaY);
    }, { passive: false });
  }

  queuePointerPress(event) {
    const button = event.button ?? 0;
    const isLeft = button <= 0;
    const isRight = button === 2;
    if (!isLeft && !isRight) return;
    const now = performance.now();
    if (now - this.lastPointerPressAt < 180) return;
    this.lastPointerPressAt = now;
    this.canvas.focus?.({ preventScroll: true });
    this.mouse.x = event.clientX;
    this.mouse.y = event.clientY;
    if (isLeft) this.queuedMouse.leftPressed = true;
    if (isRight) this.queuedMouse.rightPressed = true;
    if (isLeft) this.primaryClickFeedbackTimer = CONFIG.PRIMARY_CLICK_FEEDBACK_SECONDS;
  }

  update(dt) {
    this.primaryClickFeedbackTimer = Math.max(0, this.primaryClickFeedbackTimer - dt);
  }

  getPrimaryClickFeedbackProgress() {
    if (this.primaryClickFeedbackTimer <= 0) return 0;
    return 1 - this.primaryClickFeedbackTimer / CONFIG.PRIMARY_CLICK_FEEDBACK_SECONDS;
  }

  beginFrame(camera) {
    this.framePressed = new Set(this.queuedPressed);
    this.queuedPressed.clear();
    this.mouse.leftPressed = this.queuedMouse.leftPressed;
    this.mouse.rightPressed = this.queuedMouse.rightPressed;
    this.mouse.wheelDelta = this.queuedMouse.wheelDelta;
    this.queuedMouse.wheelDelta = 0;
    const world = screenToWorld(this.mouse.x, this.mouse.y, camera, this.canvas);
    this.mouse.worldX = world.x;
    this.mouse.worldY = world.y;
  }

  endFrame() {
    this.framePressed.clear();
    this.mouse.leftPressed = false;
    this.mouse.rightPressed = false;
    this.mouse.wheelDelta = 0;
  }

  isDown(code) {
    return this.down.has(code);
  }

  consumePressed(code) {
    if (!this.framePressed.has(code)) return false;
    this.framePressed.delete(code);
    return true;
  }

  consumePrimaryClick() {
    if (!this.queuedMouse.leftPressed) return false;
    this.queuedMouse.leftPressed = false;
    this.mouse.leftPressed = false;
    return true;
  }

  consumeSecondaryClick() {
    if (!this.queuedMouse.rightPressed) return false;
    this.queuedMouse.rightPressed = false;
    this.mouse.rightPressed = false;
    return true;
  }
}

function normalizeKeyCode(event) {
  if (event.code) return event.code;
  if (event.key === " " || event.key === "Spacebar") return "Space";
  if (event.key?.length === 1) {
    const upper = event.key.toUpperCase();
    if (upper >= "A" && upper <= "Z") return `Key${upper}`;
    if (upper >= "0" && upper <= "9") return `Digit${upper}`;
  }
  return event.key;
}
