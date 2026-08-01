import { CONFIG } from "../config.js";
import { Entity, createEntityId, distanceBetween } from "./entity.js";
import { moveWithCollision } from "../core/physics.js";

export const CRAWLER_STATES = Object.freeze({
  IDLE: "IDLE",
  PATROL: "PATROL",
  CHASE: "CHASE",
  ATTACK: "ATTACK",
  HURT: "HURT",
  DEAD: "DEAD"
});

export class ShoreCrawler extends Entity {
  constructor({ id, x, y }) {
    super({ id, x, y, width: 30, height: 22 });
    this.state = CRAWLER_STATES.PATROL;
    this.health = 60;
    this.maxHealth = 60;
    this.direction = 1;
    this.homeX = x;
    this.attackCooldown = 0;
    this.hurtTimer = 0;
  }

  static create(tileX, tileY) {
    return new ShoreCrawler({
      id: createEntityId("shore-crawler"),
      x: tileX * CONFIG.TILE_SIZE,
      y: (tileY + 1) * CONFIG.TILE_SIZE - 22
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
      if (playerDistance < 48) this.state = CRAWLER_STATES.ATTACK;
      else if (playerDistance < 230) this.state = CRAWLER_STATES.CHASE;
      else this.state = CRAWLER_STATES.PATROL;
    }

    if (this.state === CRAWLER_STATES.ATTACK && this.attackCooldown <= 0) {
      context.player.damage(10);
      this.attackCooldown = 1.2;
    }

    const speed = this.state === CRAWLER_STATES.CHASE ? 95 : 45;
    if (this.state === CRAWLER_STATES.CHASE) {
      this.direction = context.player.x < this.x ? -1 : 1;
    } else if (Math.abs(this.x - this.homeX) > 96) {
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
      inventory.addItem("crawler_chitin", 1);
    }
    return true;
  }
}
