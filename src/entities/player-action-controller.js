export const PLAYER_ACTION_STATES = Object.freeze({
  IDLE: "IDLE",
  WINDUP: "WINDUP",
  ACTIVE: "ACTIVE",
  RECOVERY: "RECOVERY",
  BLOCKED: "BLOCKED"
});

export class PlayerActionController {
  constructor(player) {
    this.player = player;
    this.state = PLAYER_ACTION_STATES.IDLE;
    this.actionType = null;
    this.timer = 0;
    this.spec = null;
    this.intent = null;
    this.executed = false;
    this.execute = null;
    this.lastResult = null;
  }

  get busy() {
    return this.state !== PLAYER_ACTION_STATES.IDLE && this.state !== PLAYER_ACTION_STATES.BLOCKED;
  }

  start({ intent, spec, execute }) {
    if (this.busy) return { ok: false, code: "ACTION_RECOVERING", message: "Still recovering." };
    this.intent = intent;
    this.spec = spec;
    this.execute = execute;
    this.actionType = spec.actionType;
    this.state = PLAYER_ACTION_STATES.WINDUP;
    this.timer = spec.windupSeconds;
    this.executed = false;
    this.lastResult = null;
    return { ok: true };
  }

  block(result) {
    this.state = PLAYER_ACTION_STATES.BLOCKED;
    this.actionType = null;
    this.timer = 0.12;
    this.intent = null;
    this.spec = null;
    this.execute = null;
    this.executed = true;
    this.lastResult = result;
  }

  update(dt) {
    if (this.state === PLAYER_ACTION_STATES.IDLE) return null;
    this.timer -= dt;
    if (this.state === PLAYER_ACTION_STATES.BLOCKED) {
      if (this.timer <= 0) this.reset();
      return this.lastResult;
    }
    if (this.state === PLAYER_ACTION_STATES.WINDUP && this.timer <= 0) {
      this.state = PLAYER_ACTION_STATES.ACTIVE;
      this.timer = this.spec.activeSeconds;
    }
    if (this.state === PLAYER_ACTION_STATES.ACTIVE && !this.executed) {
      this.executed = true;
      this.lastResult = this.execute?.(this.intent) ?? { ok: true };
    }
    if (this.state === PLAYER_ACTION_STATES.ACTIVE && this.timer <= 0) {
      this.state = PLAYER_ACTION_STATES.RECOVERY;
      this.timer = this.spec.recoverySeconds;
    }
    if (this.state === PLAYER_ACTION_STATES.RECOVERY && this.timer <= 0) {
      this.reset();
    }
    return this.lastResult;
  }

  reset() {
    this.state = PLAYER_ACTION_STATES.IDLE;
    this.actionType = null;
    this.timer = 0;
    this.spec = null;
    this.intent = null;
    this.executed = false;
    this.execute = null;
  }

  animationProgress() {
    if (!this.spec || this.state === PLAYER_ACTION_STATES.IDLE) return 0;
    const total = this.spec.windupSeconds + this.spec.activeSeconds + this.spec.recoverySeconds;
    const remaining = this.state === PLAYER_ACTION_STATES.WINDUP
      ? this.timer + this.spec.activeSeconds + this.spec.recoverySeconds
      : this.state === PLAYER_ACTION_STATES.ACTIVE
        ? this.timer + this.spec.recoverySeconds
        : this.state === PLAYER_ACTION_STATES.RECOVERY
          ? this.timer
          : 0;
    return total > 0 ? 1 - remaining / total : 0;
  }
}
