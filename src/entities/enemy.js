import { CONFIG } from "../config.js";
import { Entity, createEntityId, distanceBetween } from "./entity.js";
import { moveWithCollision } from "../core/physics.js";
import { getEnemyDefinition } from "../world/catalog/island-catalog.js";
import { giveOrDropItems, rollDrops } from "../items/drop-pipeline.js";

export const CRAWLER_STATES = Object.freeze({
  IDLE: "IDLE",
  PATROL: "PATROL",
  CHASE: "CHASE",
  ATTACK: "ATTACK",
  HURT: "HURT",
  DEAD: "DEAD"
});

export const SAND_STALKER_STATES = Object.freeze({
  HIDDEN: "HIDDEN",
  EMERGING: "EMERGING",
  PATROL: "PATROL",
  CHASE: "CHASE",
  ATTACK: "ATTACK",
  RECOVERY: "RECOVERY",
  RETREAT: "RETREAT",
  HURT: "HURT",
  DEAD: "DEAD"
});

export const VINE_STALKER_STATES = Object.freeze({
  DORMANT: "DORMANT",
  WATCHING: "WATCHING",
  STALKING: "STALKING",
  LUNGE: "LUNGE",
  RECOVERY: "RECOVERY",
  RETREAT: "RETREAT",
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

  hit(damage, dropContext = null) {
    if (this.destroyed) return false;
    this.health -= damage;
    this.hurtTimer = 0.2;
    if (this.health <= 0) {
      this.state = CRAWLER_STATES.DEAD;
      this.destroyed = true;
      applyEnemyDrops(this, dropContext);
    }
    return true;
  }
}

export class SandStalker extends Entity {
  constructor({ id, x, y, definition = getEnemyDefinition("sand_stalker") }) {
    super({ id, x, y, width: definition.collider.width, height: definition.collider.height });
    this.enemyType = definition.id;
    this.definition = definition;
    this.state = SAND_STALKER_STATES.HIDDEN;
    this.health = definition.combat.health;
    this.maxHealth = definition.combat.health;
    this.level = definition.level;
    this.threatCost = definition.threatCost;
    this.direction = 1;
    this.homeX = x;
    this.stateTimer = 0;
    this.attackCooldown = 0;
    this.hurtTimer = 0;
    this.hasLungedThisAttack = false;
  }

  static create(tileX, tileY, id = null, definition = getEnemyDefinition("sand_stalker")) {
    return new SandStalker({
      id: id ?? createEntityId("sand-stalker"),
      definition,
      x: tileX * CONFIG.TILE_SIZE,
      y: (tileY + 1) * CONFIG.TILE_SIZE - definition.collider.height
    });
  }

  update(dt, context) {
    if (this.destroyed || this.state === SAND_STALKER_STATES.DEAD) return;
    this.recordPreviousPosition();
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.stateTimer = Math.max(0, this.stateTimer - dt);
    this.hurtTimer = Math.max(0, this.hurtTimer - dt);
    const playerDistance = distanceBetween(this, context.player);

    if (this.hurtTimer > 0) this.state = SAND_STALKER_STATES.HURT;
    else if (this.state === SAND_STALKER_STATES.HIDDEN && playerDistance < this.definition.movement.chaseRange) {
      this.state = SAND_STALKER_STATES.EMERGING;
      this.stateTimer = this.definition.movement.emergeSeconds;
    } else if (this.state === SAND_STALKER_STATES.EMERGING && this.stateTimer <= 0) {
      this.state = SAND_STALKER_STATES.CHASE;
    } else if (this.state === SAND_STALKER_STATES.RECOVERY && this.stateTimer <= 0) {
      this.state = playerDistance < this.definition.movement.chaseRange ? SAND_STALKER_STATES.CHASE : SAND_STALKER_STATES.RETREAT;
    } else if (![SAND_STALKER_STATES.EMERGING, SAND_STALKER_STATES.RECOVERY, SAND_STALKER_STATES.HURT].includes(this.state)) {
      if (playerDistance < this.definition.combat.attackRange && this.attackCooldown <= 0) {
        this.state = SAND_STALKER_STATES.ATTACK;
        this.stateTimer = this.definition.movement.lungeSeconds;
        this.hasLungedThisAttack = false;
      } else if (playerDistance < this.definition.movement.chaseRange) this.state = SAND_STALKER_STATES.CHASE;
      else if (Math.abs(this.x - this.homeX) > this.definition.movement.retreatDistance) this.state = SAND_STALKER_STATES.RETREAT;
      else this.state = SAND_STALKER_STATES.PATROL;
    }

    this.vx = 0;
    if (this.state === SAND_STALKER_STATES.CHASE) {
      this.direction = context.player.x < this.x ? -1 : 1;
      this.vx = this.direction * this.definition.movement.chaseSpeed;
    } else if (this.state === SAND_STALKER_STATES.PATROL) {
      if (Math.abs(this.x - this.homeX) > this.definition.movement.patrolRadius) this.direction *= -1;
      this.vx = this.direction * this.definition.movement.patrolSpeed;
    } else if (this.state === SAND_STALKER_STATES.RETREAT) {
      this.direction = this.x < this.homeX ? 1 : -1;
      this.vx = this.direction * this.definition.movement.patrolSpeed;
      if (Math.abs(this.x - this.homeX) < 12) this.state = SAND_STALKER_STATES.HIDDEN;
    } else if (this.state === SAND_STALKER_STATES.ATTACK) {
      this.direction = context.player.x < this.x ? -1 : 1;
      this.vx = this.direction * this.definition.movement.lungeSpeed;
      if (!this.hasLungedThisAttack && playerDistance < this.definition.combat.attackRange + 14) {
        context.player.applyDamage({ amount: this.definition.combat.lungeDamage, type: "combat", grantsInvulnerability: true });
        this.hasLungedThisAttack = true;
      }
      if (this.stateTimer <= 0) {
        this.state = SAND_STALKER_STATES.RECOVERY;
        this.stateTimer = 0.35;
        this.attackCooldown = this.definition.combat.attackCooldownSeconds;
      }
    }

    this.vy += CONFIG.GRAVITY * dt;
    moveWithCollision(this, context.collisionWorld, dt);
  }

  hit(damage, dropContext = null) {
    if (this.destroyed) return false;
    this.health -= damage;
    this.hurtTimer = 0.2;
    if (this.health <= 0) {
      this.state = SAND_STALKER_STATES.DEAD;
      this.destroyed = true;
      applyEnemyDrops(this, dropContext);
    }
    return true;
  }
}

export class VineStalker extends Entity {
  constructor({ id, x, y, definition = getEnemyDefinition("vine_stalker") }) {
    super({ id, x, y, width: definition.collider.width, height: definition.collider.height });
    this.enemyType = definition.id;
    this.definition = definition;
    this.state = VINE_STALKER_STATES.DORMANT;
    this.health = definition.combat.health;
    this.maxHealth = definition.combat.health;
    this.level = definition.level;
    this.threatCost = definition.threatCost;
    this.direction = 1;
    this.homeX = x;
    this.stateTimer = 0;
    this.attackCooldown = 0;
    this.hurtTimer = 0;
    this.hasLungedThisAttack = false;
  }

  static create(tileX, tileY, id = null, definition = getEnemyDefinition("vine_stalker")) {
    return new VineStalker({
      id: id ?? createEntityId("vine-stalker"),
      definition,
      x: tileX * CONFIG.TILE_SIZE,
      y: (tileY + 1) * CONFIG.TILE_SIZE - definition.collider.height
    });
  }

  update(dt, context) {
    if (this.destroyed || this.state === VINE_STALKER_STATES.DEAD) return;
    this.recordPreviousPosition();
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.stateTimer = Math.max(0, this.stateTimer - dt);
    this.hurtTimer = Math.max(0, this.hurtTimer - dt);
    const movement = this.definition.movement;
    const playerDistance = distanceBetween(this, context.player);

    if (this.hurtTimer > 0) this.state = VINE_STALKER_STATES.HURT;
    else if (this.state === VINE_STALKER_STATES.DORMANT && playerDistance < movement.detectionRange) {
      this.state = VINE_STALKER_STATES.WATCHING;
      this.stateTimer = movement.watchSeconds;
    } else if (this.state === VINE_STALKER_STATES.WATCHING && this.stateTimer <= 0) {
      this.state = VINE_STALKER_STATES.STALKING;
    } else if (this.state === VINE_STALKER_STATES.RECOVERY && this.stateTimer <= 0) {
      this.state = playerDistance < movement.detectionRange ? VINE_STALKER_STATES.STALKING : VINE_STALKER_STATES.RETREAT;
    } else if (![VINE_STALKER_STATES.WATCHING, VINE_STALKER_STATES.RECOVERY, VINE_STALKER_STATES.HURT].includes(this.state)) {
      if (playerDistance < this.definition.combat.attackRange && this.attackCooldown <= 0) {
        this.state = VINE_STALKER_STATES.LUNGE;
        this.stateTimer = movement.lungeSeconds;
        this.hasLungedThisAttack = false;
      } else if (playerDistance < movement.detectionRange) this.state = VINE_STALKER_STATES.STALKING;
      else if (Math.abs(this.x - this.homeX) > movement.retreatDistance) this.state = VINE_STALKER_STATES.RETREAT;
      else this.state = VINE_STALKER_STATES.DORMANT;
    }

    this.vx = 0;
    if (this.state === VINE_STALKER_STATES.STALKING) {
      this.direction = context.player.x < this.x ? -1 : 1;
      this.vx = this.direction * movement.stalkSpeed;
    } else if (this.state === VINE_STALKER_STATES.RETREAT) {
      this.direction = this.x < this.homeX ? 1 : -1;
      this.vx = this.direction * movement.patrolSpeed;
      if (Math.abs(this.x - this.homeX) < 12) this.state = VINE_STALKER_STATES.DORMANT;
    } else if (this.state === VINE_STALKER_STATES.LUNGE) {
      this.direction = context.player.x < this.x ? -1 : 1;
      this.vx = this.direction * movement.lungeSpeed;
      if (!this.hasLungedThisAttack && playerDistance < this.definition.combat.attackRange + 18) {
        context.player.applyDamage({ amount: this.definition.combat.lungeDamage, type: "combat", grantsInvulnerability: true });
        this.hasLungedThisAttack = true;
      }
      if (this.stateTimer <= 0) {
        this.state = VINE_STALKER_STATES.RECOVERY;
        this.stateTimer = movement.recoverySeconds;
        this.attackCooldown = this.definition.combat.attackCooldownSeconds;
      }
    }

    this.vy += CONFIG.GRAVITY * dt;
    moveWithCollision(this, context.collisionWorld, dt);
  }

  hit(damage, dropContext = null) {
    if (this.destroyed) return false;
    this.health -= damage;
    this.hurtTimer = 0.2;
    if (this.health <= 0) {
      this.state = VINE_STALKER_STATES.DEAD;
      this.destroyed = true;
      applyEnemyDrops(this, dropContext);
    }
    return true;
  }
}

function applyEnemyDrops(enemy, dropContext) {
  const drops = rollDrops(enemy.definition.drops);
  if (!dropContext) return;
  if (dropContext.addItem) {
    for (const drop of drops) dropContext.addItem(drop.itemId, drop.quantity);
    return;
  }
  giveOrDropItems({
    drops,
    playerItems: dropContext.playerItems,
    spawnItemDrop: dropContext.spawnItemDrop,
    x: enemy.x + enemy.width / 2,
    y: enemy.y + enemy.height / 2
  });
}
