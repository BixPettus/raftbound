import { SandStalker, ShoreCrawler, VineStalker } from "../enemy.js";
import { getRuntimeEnemyDefinition } from "./enemy-registry.js";

const BEHAVIOR_TO_CLASS = Object.freeze({
  shore_crawler: ShoreCrawler,
  sand_stalker: SandStalker,
  vine_stalker: VineStalker
});

export function createEnemy(enemyId, tileX, tileY, id = null) {
  const definition = getRuntimeEnemyDefinition(enemyId);
  if (!definition.implemented) throw new Error(`Enemy is not implemented: ${enemyId}`);
  const EnemyClass = BEHAVIOR_TO_CLASS[definition.behaviorId];
  if (!EnemyClass) throw new Error(`Unknown enemy behavior: ${definition.behaviorId}`);
  return EnemyClass.create(tileX, tileY, id, definition);
}

