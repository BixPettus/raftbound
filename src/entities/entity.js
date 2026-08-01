let entityCounter = 0;

export class Entity {
  constructor({ id, x, y, width, height }) {
    this.id = id ?? createEntityId(this.constructor.name.toLowerCase());
    this.x = x;
    this.y = y;
    this.previousX = x;
    this.previousY = y;
    this.width = width;
    this.height = height;
    this.vx = 0;
    this.vy = 0;
    this.destroyed = false;
  }

  get bounds() {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }

  center() {
    return { x: this.x + this.width / 2, y: this.y + this.height / 2 };
  }

  recordPreviousPosition() {
    this.previousX = this.x;
    this.previousY = this.y;
  }

  syncPreviousPosition() {
    this.previousX = this.x;
    this.previousY = this.y;
  }

  getRenderPosition(alpha = 1) {
    const t = Math.max(0, Math.min(1, alpha));
    return {
      x: this.previousX + (this.x - this.previousX) * t,
      y: this.previousY + (this.y - this.previousY) * t
    };
  }
}

export function createEntityId(prefix) {
  entityCounter += 1;
  return `${prefix}-${entityCounter}`;
}

export function distanceBetween(a, b) {
  const ac = a.center ? a.center() : a;
  const bc = b.center ? b.center() : b;
  return Math.hypot(ac.x - bc.x, ac.y - bc.y);
}
