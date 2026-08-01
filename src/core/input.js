import { CONFIG } from "../config.js?v=terrain-inventory-4";
import { screenToWorld } from "../world/coordinates.js";

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.down = new Set();
    this.queuedPressed = [];
    this.mouseDown = new Set();
    this.queuedPointerPresses = [];
    this.queuedWheelDelta = 0;
    this.mouse = { x: 0, y: 0, worldX: 0, worldY: 0, leftDown: false, rightDown: false, wheelDelta: 0 };
    this.primaryClickFeedbackTimer = 0;
    this.currentTick = null;
    this.bind();
  }

  bind() {
    window.addEventListener("keydown", (event) => {
      const code = normalizeKeyCode(event);
      if (["Space", "Tab", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(code)) event.preventDefault();
      if (!this.down.has(code)) this.queuedPressed.push({ code, time: event.timeStamp ?? performance.now() });
      this.down.add(code);
    });
    window.addEventListener("keyup", (event) => this.down.delete(normalizeKeyCode(event)));
    window.addEventListener("blur", () => this.clearAll());
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") this.clearAll();
      });
    }
    this.canvas.addEventListener("pointermove", (event) => {
      this.mouse.x = event.clientX;
      this.mouse.y = event.clientY;
    });
    this.canvas.addEventListener("pointerdown", (event) => this.queuePointerPress(event));
    this.canvas.addEventListener("pointerup", (event) => this.releasePointerButton(event));
    this.canvas.addEventListener("pointercancel", (event) => this.releasePointerButton(event));
    this.canvas.addEventListener("contextmenu", (event) => event.preventDefault());
    this.canvas.addEventListener("wheel", (event) => {
      event.preventDefault();
      this.queuedWheelDelta += Math.sign(event.deltaY);
    }, { passive: false });
  }

  queuePointerPress(event) {
    const button = event.button ?? 0;
    const isLeft = button <= 0;
    const isRight = button === 2;
    if (!isLeft && !isRight) return;
    event.preventDefault?.();
    this.canvas.focus?.({ preventScroll: true });
    this.canvas.setPointerCapture?.(event.pointerId);
    this.mouse.x = event.clientX;
    this.mouse.y = event.clientY;
    this.mouseDown.add(button);
    this.queuedPointerPresses.push({ button, pointerId: event.pointerId ?? 0, time: event.timeStamp ?? performance.now() });
    if (isLeft) this.primaryClickFeedbackTimer = CONFIG.PRIMARY_CLICK_FEEDBACK_SECONDS;
  }

  releasePointerButton(event) {
    this.mouseDown.delete(event.button ?? 0);
  }

  update(dt) {
    this.primaryClickFeedbackTimer = Math.max(0, this.primaryClickFeedbackTimer - dt);
  }

  getPrimaryClickFeedbackProgress() {
    if (this.primaryClickFeedbackTimer <= 0) return 0;
    return 1 - this.primaryClickFeedbackTimer / CONFIG.PRIMARY_CLICK_FEEDBACK_SECONDS;
  }

  capturePointerPosition(camera) {
    const world = screenToWorld(this.mouse.x, this.mouse.y, camera, this.canvas);
    this.mouse.worldX = world.x;
    this.mouse.worldY = world.y;
  }

  beginTick(tickTime = 0) {
    const tick = new TickInput({
      pressed: this.queuedPressed.map((event) => event.code),
      down: this.down,
      pointerPresses: this.queuedPointerPresses,
      pointerDown: this.mouseDown,
      wheelDelta: this.queuedWheelDelta,
      mouse: this.mouse,
      tickTime
    });
    this.queuedPressed = [];
    this.queuedPointerPresses = [];
    this.queuedWheelDelta = 0;
    this.currentTick = tick;
    return tick;
  }

  endTick(tickInput) {
    if (this.currentTick === tickInput) this.currentTick = null;
    this.mouse.wheelDelta = 0;
  }

  clearAll() {
    this.down.clear();
    this.queuedPressed = [];
    this.mouseDown.clear();
    this.queuedPointerPresses = [];
    this.queuedWheelDelta = 0;
    this.currentTick = null;
  }

  isDown(code) {
    return this.currentTick?.isDown(code) ?? this.down.has(code);
  }

  consumePressed(code) {
    return this.currentTick?.consumePressed(code) ?? false;
  }

  consumePrimaryClick() {
    return this.currentTick?.consumePrimaryClick() ?? false;
  }

  consumeSecondaryClick() {
    return this.currentTick?.consumeSecondaryClick() ?? false;
  }

  get queueSize() {
    return this.queuedPressed.length + this.queuedPointerPresses.length;
  }
}

export class TickInput {
  constructor({ pressed, down, pointerPresses, pointerDown, wheelDelta, mouse, tickTime }) {
    this.tickTime = tickTime;
    this.pressed = new Set(pressed);
    this.down = new Set(down);
    this.pointerPresses = pointerPresses.map((event) => ({ ...event }));
    this.pointerDown = new Set(pointerDown);
    this.mouse = {
      x: mouse.x,
      y: mouse.y,
      worldX: mouse.worldX,
      worldY: mouse.worldY,
      leftDown: pointerDown.has(0),
      rightDown: pointerDown.has(2),
      wheelDelta,
      leftPressed: pointerPresses.some((event) => event.button === 0),
      rightPressed: pointerPresses.some((event) => event.button === 2)
    };
  }

  isDown(code) {
    return this.down.has(code);
  }

  consumePressed(code) {
    if (!this.pressed.has(code)) return false;
    this.pressed.delete(code);
    return true;
  }

  consumePrimaryClick() {
    const index = this.pointerPresses.findIndex((event) => event.button === 0);
    if (index === -1) return false;
    this.pointerPresses.splice(index, 1);
    this.mouse.leftPressed = this.pointerPresses.some((event) => event.button === 0);
    return true;
  }

  consumeSecondaryClick() {
    const index = this.pointerPresses.findIndex((event) => event.button === 2);
    if (index === -1) return false;
    this.pointerPresses.splice(index, 1);
    this.mouse.rightPressed = this.pointerPresses.some((event) => event.button === 2);
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
