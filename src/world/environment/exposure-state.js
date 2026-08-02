export class ExposureState {
  constructor() {
    this.values = new Map();
    this.statuses = new Map();
  }

  value(effectId) {
    return this.values.get(effectId) ?? 0;
  }

  status(effectId) {
    return this.statuses.get(effectId) ?? null;
  }

  set(effectId, value, status = null) {
    this.values.set(effectId, value);
    if (status) this.statuses.set(effectId, status);
    else this.statuses.delete(effectId);
  }

  relevantEffects() {
    return [...this.values.entries()].filter(([, value]) => value > 0);
  }
}
