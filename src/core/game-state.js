export const GAME_STATES = Object.freeze({
  MAIN_MENU: "MAIN_MENU",
  SAILING: "SAILING",
  ISLAND_TRANSITION: "ISLAND_TRANSITION",
  ISLAND_ANCHORED: "ISLAND_ANCHORED",
  PAUSED: "PAUSED",
  PLAYER_DEAD: "PLAYER_DEAD"
});

const ACTIVE_STATES = new Set([GAME_STATES.SAILING, GAME_STATES.ISLAND_TRANSITION, GAME_STATES.ISLAND_ANCHORED]);

const ALLOWED_TRANSITIONS = {
  [GAME_STATES.MAIN_MENU]: [GAME_STATES.SAILING],
  [GAME_STATES.SAILING]: [GAME_STATES.ISLAND_TRANSITION, GAME_STATES.PLAYER_DEAD, GAME_STATES.PAUSED],
  [GAME_STATES.ISLAND_TRANSITION]: [GAME_STATES.ISLAND_ANCHORED, GAME_STATES.PAUSED],
  [GAME_STATES.ISLAND_ANCHORED]: [GAME_STATES.SAILING, GAME_STATES.PLAYER_DEAD, GAME_STATES.PAUSED],
  [GAME_STATES.PLAYER_DEAD]: [GAME_STATES.ISLAND_ANCHORED, GAME_STATES.SAILING],
  [GAME_STATES.PAUSED]: [GAME_STATES.SAILING, GAME_STATES.ISLAND_TRANSITION, GAME_STATES.ISLAND_ANCHORED]
};

export class GameStateController {
  constructor(initialState = GAME_STATES.MAIN_MENU) {
    this.current = initialState;
    this.previous = null;
  }

  transition(nextState) {
    if (nextState === GAME_STATES.PAUSED && ACTIVE_STATES.has(this.current)) {
      this.previous = this.current;
      this.current = nextState;
      return;
    }
    if (!ALLOWED_TRANSITIONS[this.current]?.includes(nextState)) {
      throw new Error(`Invalid game state transition: ${this.current} -> ${nextState}`);
    }
    this.previous = this.current;
    this.current = nextState;
  }

  resume() {
    if (this.current !== GAME_STATES.PAUSED) return;
    this.current = this.previous ?? GAME_STATES.SAILING;
  }

  isActive() {
    return ACTIVE_STATES.has(this.current);
  }
}
