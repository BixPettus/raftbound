import { CONFIG } from "../config.js";
import { Entity, createEntityId, distanceBetween } from "./entity.js";
import { moveWithCollision } from "../core/physics.js";
import { getEnemyDefinition } from "../world/catalog/island-catalog.js";

export const CRAWLER_STATES = Object.freeze({
  IDLE: "IDLE",
  PATROL: "PATROL",
  CHASE: "CHASE",
  ATTACK: "ATTACK",
  HURT: "HURT",
  DEAD: "DEAD"
});

export class ShoreCrawler extends Entity {
  constructor({ id, x, y, definition = getEnemyDefinition("shore_crawler") }) {
    super({ id, x, y, width: definition.collider.width, height: definition.collider.height });
    this.enemyType = definition.id;
    this.definition = definition;
    this.state = CRAWLER_STATES.PATROL;
    this.health = definition.combat.health;
    this.maxHealth = definition.combat.health;
    this.level = definition.level;
    this.threatCost = definition.threatCost;
    this.direction = 1;
    this.homeX = x;
    this.attackCooldown = 0;
    this.hurtTimer = 0;
  }

  static create(tileX, tileY, id = null, definition = getEnemyDefinition("shore_crawler")) {
    return new ShoreCrawler({
      id: id ?? createEntityId("shore-crawler"),
      definition,
      x: tileX * CONFIG.TILE_SIZE,
      y: (tileY + 1) * CONFIG.TILE_SIZE - definition.collider.height
    });
  }

  update(dt, context) {
    if (this.destroyed || this.state === CRAWLER_STATES.DEAD) return;
    this.recordPreviousPosition();
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    if (this.hurtTimer > 0) {
      this.hurtTimer -= dt;
      this.state = CRAWLER_STATES.HURT;
    }

    const playerDistance = distanceBetween(this, context.player);
    if (this.hurtTimer <= 0) {
      if (playerDistance < this.definition.combat.attackRange) this.state = CRAWLER_STATES.ATTACK;
      else if (playerDistance < this.definition.movement.chaseRange) this.state = CRAWLER_STATES.CHASE;
      else this.state = CRAWLER_STATES.PATROL;
    }

    if (this.state === CRAWLER_STATES.ATTACK && this.attackCooldown <= 0) {
      context.player.damage(this.definition.combat.contactDamage);
      this.attackCooldown = this.definition.combat.attackCooldownSeconds;
    }

    const speed = this.state === CRAWLER_STATES.CHASE ? this.definition.movement.chaseSpeed : this.definition.movement.patrolSpeed;
    if (this.state === CRAWLER_STATES.CHASE) {
      this.direction = context.player.x < this.x ? -1 : 1;
    } else if (Math.abs(this.x - this.homeX) > this.definition.movement.patrolRadius) {
      this.direction *= -1;
    }

    if (this.state !== CRAWLER_STATES.ATTACK && this.state !== CRAWLER_STATES.HURT) {
      this.vx = this.direction * speed;
    } else {
      this.vx = 0;
    }
    this.vy += CONFIG.GRAVITY * dt;
    moveWithCollision(this, context.collisionWorld, dt);
  }

  hit(damage, inventory) {
    if (this.destroyed) return false;
    this.health -= damage;
    this.hurtTimer = 0.2;
    if (this.health <= 0) {
      this.state = CRAWLER_STATES.DEAD;
      this.destroyed = true;
      for (const drop of this.definition.drops) inventory.addItem(drop.itemId, drop.quantity);
    }
    return true;
  }
}
