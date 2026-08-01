import { CONFIG } from "../config.js?v=terrain-inventory-4";
import { Entity } from "./entity.js";
import { moveWithCollision } from "../core/physics.js?v=terrain-inventory-4";
import { Inventory } from "../items/inventory.js";
import { Hotbar } from "../items/hotbar.js";

export class Player extends Entity {
  constructor({ x = 0, y = 0, health = CONFIG.MAX_HEALTH, oxygen = CONFIG.MAX_OXYGEN, inventory = null, hotbar = null } = {}) {
    super({ id: "player", x, y, width: CONFIG.PLAYER_WIDTH, height: CONFIG.PLAYER_HEIGHT });
    this.health = health;
    this.oxygen = oxygen;
    this.inventory = new Inventory(CONFIG.INVENTORY_SIZE, inventory);
    this.hotbar = new Hotbar(hotbar?.slots ?? hotbar);
    if (hotbar?.selectedIndex != null) this.hotbar.select(hotbar.selectedIndex);
    this.onGround = false;
    this.inWater = false;
    this.facing = 1;
    this.lastGroundVy = 0;
    this.invulnerability = 0;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.jumpHeldLastTick = false;
    this.animationTime = 0;
    this.actionTimer = 0;
    this.actionType = null;
    this.hurtTimer = 0;
  }

  static createNew(spawn) {
    const player = new Player({ x: spawn.x, y: spawn.y });
    player.hotbar.slots[0] = { itemId: "basic_axe", quantity: 1 };
    player.hotbar.slots[1] = { itemId: "basic_pickaxe", quantity: 1 };
    player.hotbar.slots[2] = { itemId: "building_hammer", quantity: 1 };
    player.hotbar.slots[3] = { itemId: "wooden_spear", quantity: 1 };
    return player;
  }

  update(dt, input, context) {
    this.recordPreviousPosition();
    this.animationTime += dt;
    this.invulnerability = Math.max(0, this.invulnerability - dt);
    this.actionTimer = Math.max(0, this.actionTimer - dt);
    this.hurtTimer = Math.max(0, this.hurtTimer - dt);
    if (this.actionTimer === 0) this.actionType = null;
    this.inWater = context.waterSystem.containsPoint(this.x + this.width / 2, this.y + this.height * 0.65, context.tileMap);

    const left = input.isDown("KeyA") || input.isDown("ArrowLeft");
    const right = input.isDown("KeyD") || input.isDown("ArrowRight");
    const down = input.isDown("KeyS") || input.isDown("ArrowDown");
    const jumpPressed = input.consumePressed("Space");
    const holdJump = input.isDown("Space");
    const jumpReleased = this.jumpHeldLastTick && !holdJump;
    this.jumpHeldLastTick = holdJump;
    this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);
    if (jumpPressed) this.jumpBufferTimer = CONFIG.PLAYER_JUMP_BUFFER_SECONDS;
    this.coyoteTimer = this.onGround ? CONFIG.PLAYER_COYOTE_SECONDS : Math.max(0, this.coyoteTimer - dt);

    const direction = (right ? 1 : 0) - (left ? 1 : 0);
    if (direction !== 0) this.facing = direction;

    const accel = this.inWater ? CONFIG.WATER_ACCELERATION : CONFIG.MOVE_ACCELERATION;
    const maxSpeed = this.inWater ? CONFIG.MAX_SWIM_SPEED : CONFIG.MAX_RUN_SPEED;
    this.vx += direction * accel * dt;
    this.vx = Math.max(-maxSpeed, Math.min(maxSpeed, this.vx));

    if (direction === 0) {
      const friction = this.onGround ? CONFIG.GROUND_FRICTION : this.inWater ? CONFIG.WATER_DRAG : CONFIG.AIR_DRAG;
      this.vx = approach(this.vx, 0, friction * dt);
    }

    let jumpedThisStep = false;
    if (this.inWater) {
      this.vy += CONFIG.WATER_GRAVITY * dt;
      if (holdJump) this.vy -= CONFIG.SWIM_FORCE * dt * 3.2;
      if (down) this.vy += CONFIG.SWIM_FORCE * dt * 2;
      this.vy = Math.max(-CONFIG.MAX_SWIM_SPEED, Math.min(CONFIG.MAX_SWIM_SPEED, this.vy));
    } else {
      const gravityMultiplier = this.vy > 50
        ? CONFIG.FALL_GRAVITY_MULTIPLIER
        : Math.abs(this.vy) < 60
          ? CONFIG.JUMP_APEX_GRAVITY_MULTIPLIER
          : 1;
      this.vy += CONFIG.GRAVITY * gravityMultiplier * dt;
      if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
        this.vy = -CONFIG.JUMP_FORCE;
        this.onGround = false;
        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;
        jumpedThisStep = true;
      }
      if (jumpReleased && this.vy < 0) this.vy *= CONFIG.JUMP_CUT_MULTIPLIER;
      this.vy = Math.max(-CONFIG.PLAYER_MAX_RISE_SPEED, Math.min(CONFIG.PLAYER_MAX_FALL_SPEED, this.vy));
    }

    this.lastGroundVy = this.vy;
    const result = moveWithCollision(this, context.collisionWorld, dt);
    this.onGround = result.onGround;
    if (this.onGround) {
      this.coyoteTimer = CONFIG.PLAYER_COYOTE_SECONDS;
      if (!jumpedThisStep && this.jumpBufferTimer > 0 && !this.inWater) {
        this.vy = -CONFIG.JUMP_FORCE;
        this.onGround = false;
        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;
      }
    }
    if (result.landed && this.lastGroundVy > CONFIG.FALL_DAMAGE_THRESHOLD) {
      this.applyDamage({
        amount: Math.floor((this.lastGroundVy - CONFIG.FALL_DAMAGE_THRESHOLD) / 40),
        type: "falling",
        grantsInvulnerability: false
      });
    }

    const headUnder = context.waterSystem.isHeadUnderwater(this, context.tileMap);
    if (headUnder) {
      this.oxygen = Math.max(0, this.oxygen - CONFIG.OXYGEN_DRAIN_PER_SECOND * dt);
      if (this.oxygen <= 0) {
        this.applyDamage({
          amount: CONFIG.DROWN_DAMAGE_PER_SECOND * dt,
          type: "drowning",
          grantsInvulnerability: false
        });
      }
    } else {
      this.oxygen = Math.min(CONFIG.MAX_OXYGEN, this.oxygen + CONFIG.OXYGEN_REFILL_PER_SECOND * dt);
    }
  }

  damage(amount) {
    this.applyDamage({
      amount,
      type: "contact",
      grantsInvulnerability: true,
      invulnerabilityGroup: "combat"
    });
  }

  applyDamage({ amount, grantsInvulnerability = true } = {}) {
    if ((grantsInvulnerability && this.invulnerability > 0) || amount <= 0) return false;
    this.health = Math.max(0, this.health - amount);
    if (grantsInvulnerability) this.invulnerability = 0.35;
    this.hurtTimer = 0.18;
    return true;
  }

  heal(amount) {
    this.health = Math.min(CONFIG.MAX_HEALTH, this.health + amount);
  }

  startAction(actionType = "tool") {
    this.actionType = actionType;
    this.actionTimer = CONFIG.PLAYER_ACTION_SECONDS;
  }

  getAnimationState() {
    if (this.health <= 0) return "dead";
    if (this.hurtTimer > 0) return "hurt";
    if (this.actionTimer > 0) return this.actionType ?? "tool";
    if (this.inWater) return "swim";
    if (!this.onGround && this.vy < -20) return "jump";
    if (!this.onGround && this.vy >= -20) return "fall";
    if (Math.abs(this.vx) > 18) return "run";
    return "idle";
  }

  serialize() {
    return {
      health: this.health,
      oxygen: this.oxygen,
      position: { x: this.x, y: this.y },
      inventory: this.inventory.serialize(),
      hotbar: this.hotbar.serialize()
    };
  }
}

function approach(value, target, maxDelta) {
  if (value < target) return Math.min(value + maxDelta, target);
  if (value > target) return Math.max(value - maxDelta, target);
  return target;
}
