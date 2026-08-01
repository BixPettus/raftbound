import { SeededRandom } from "../seeded-random.js";

export const GENERATION_STREAM_NAMES = Object.freeze([
  "surface",
  "surface-landmarks",
  "strata",
  "cave-entrances",
  "cave-chambers",
  "cave-connectors",
  "cave-detail",
  "water",
  "ores",
  "surface-resources",
  "underground-resources",
  "enemies",
  "points-of-interest",
  "validation-repair"
]);

export class RandomStreams {
  constructor(definition, attempt) {
    this.definition = definition;
    this.attempt = attempt;
    this.streams = new Map();
  }

  get(name) {
    if (!this.streams.has(name)) {
      this.streams.set(name, new SeededRandom(`${this.definition.generationVersion}:${this.definition.seed}:${this.definition.biome}:${this.definition.size}:${name}:${this.attempt}`));
    }
    return this.streams.get(name);
  }
}
