let entityCounter = 0;

export class Entity {
  constructor({ id, x, y, width, height }) {
    this.id = id ?? createEntityId(this.constructor.name.toLowerCase());
    this.x = x;
    this.y = y;
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
