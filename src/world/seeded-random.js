export function hashSeed(input) {
  let hash = 2166136261;
  const text = String(input);
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export class SeededRandom {
  constructor(seed) {
    this.state = hashSeed(seed) || 1;
  }

  next() {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let value = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  range(min, max) {
    return min + this.next() * (max - min);
  }

  int(min, max) {
    return Math.floor(this.range(min, max + 1));
  }

  choice(items) {
    return items[Math.floor(this.next() * items.length)];
  }

  weighted(items, weightKey = "weight") {
    const total = items.reduce((sum, item) => sum + item[weightKey], 0);
    let roll = this.next() * total;
    for (const item of items) {
      roll -= item[weightKey];
      if (roll <= 0) return item;
    }
    return items[items.length - 1];
  }
}
