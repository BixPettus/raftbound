import { CONFIG } from "../config.js";

export class GameClock {
  constructor({
    fixedTimestep = CONFIG.FIXED_TIMESTEP,
    maxFrameTime = CONFIG.MAX_FRAME_TIME,
    maxCatchUpSteps = CONFIG.MAX_CATCH_UP_STEPS
  } = {}) {
    this.fixedTimestep = fixedTimestep;
    this.maxFrameTime = maxFrameTime;
    this.maxCatchUpSteps = maxCatchUpSteps;
    this.lastTime = null;
    this.accumulator = 0;
    this.simulationTime = 0;
    this.tick = 0;
    this.lastStepCount = 0;
  }

  advance(nowMs) {
    if (this.lastTime == null) {
      this.lastTime = nowMs;
      this.lastStepCount = 0;
      return this.snapshot();
    }

    const deltaSeconds = Math.min(this.maxFrameTime, Math.max(0, (nowMs - this.lastTime) / 1000));
    this.lastTime = nowMs;
    this.accumulator += deltaSeconds;

    let steps = Math.floor(this.accumulator / this.fixedTimestep);
    if (steps > this.maxCatchUpSteps) {
      steps = this.maxCatchUpSteps;
      this.accumulator = 0;
    } else {
      this.accumulator -= steps * this.fixedTimestep;
    }

    this.lastStepCount = steps;
    return this.snapshot();
  }

  nextTickTime() {
    return this.simulationTime + this.fixedTimestep;
  }

  commitTick() {
    this.simulationTime += this.fixedTimestep;
    this.tick += 1;
  }

  advanceTicks(count) {
    const steps = Math.max(0, Math.floor(count));
    this.lastStepCount = steps;
    return {
      steps,
      alpha: 0,
      fixedTimestep: this.fixedTimestep,
      accumulator: this.accumulator,
      simulationTime: this.simulationTime,
      tick: this.tick
    };
  }

  snapshot() {
    return {
      steps: this.lastStepCount,
      alpha: this.fixedTimestep > 0 ? this.accumulator / this.fixedTimestep : 0,
      fixedTimestep: this.fixedTimestep,
      accumulator: this.accumulator,
      simulationTime: this.simulationTime,
      tick: this.tick
    };
  }
}
