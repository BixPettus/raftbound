import { listEnvironmentalEffects } from "../content/environmental-effect-registry.js";
import { ExposureState } from "./exposure-state.js";

export class EnvironmentEffectSystem {
  constructor({ exposureState = new ExposureState() } = {}) {
    this.exposureState = exposureState;
  }

  update(dt, context, player) {
    for (const effect of listEnvironmentalEffects()) {
      const active = isActive(effect, context);
      const current = this.exposureState.value(effect.id);
      const meter = effect.meter;
      const next = active
        ? Math.min(meter.maximum, current + meter.increasePerSecond * dt)
        : Math.max(0, current - meter.recoveryPerSecond * dt);
      const status = [...effect.thresholds].reverse().find((threshold) => next >= threshold.value && threshold.status)?.status ?? null;
      this.exposureState.set(effect.id, next, status);
      for (const threshold of effect.thresholds) {
        if (next >= threshold.value && threshold.damagePerSecond) {
          player.applyDamage({ amount: threshold.damagePerSecond * dt, type: "environmental", grantsInvulnerability: false });
        }
      }
    }
  }
}

function isActive(effect, context) {
  const activation = effect.activation;
  if (!activation.biomeIds.includes(context.biomeId)) return false;
  if (activation.zones?.length && !activation.zones.includes(context.zone)) return false;
  if (activation.disabledInWater && context.inWater) return false;
  if (activation.disabledUnderground && context.underground) return false;
  if (activation.disabledInSafeZone && context.safeZone) return false;
  return true;
}
