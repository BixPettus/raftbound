export class MenuUI {
  constructor(element, game) {
    this.element = element;
    this.game = game;
  }

  render() {
    const hasSave = this.game.saveManager.hasSave();
    this.element.classList.remove("hidden");
    this.element.innerHTML = `
      <div class="menu-card">
        <h1>Raftbound</h1>
        <p>The raft is permanent. Islands are temporary expeditions.</p>
        ${this.game.saveError ? `<p class="muted">${this.game.saveError}</p>` : ""}
        <div class="menu-actions">
          <button data-action="new">New voyage</button>
          <button data-action="continue" ${hasSave ? "" : "disabled"}>Continue</button>
          <button data-action="reset" class="danger" ${hasSave ? "" : "disabled"}>Reset save</button>
        </div>
      </div>`;
    this.element.querySelector('[data-action="new"]').onclick = () => this.game.startNewVoyage();
    this.element.querySelector('[data-action="continue"]').onclick = () => this.game.continueVoyage();
    this.element.querySelector('[data-action="reset"]').onclick = () => {
      this.game.saveManager.reset();
      this.game.saveError = null;
      this.render();
    };
  }

  hide() {
    this.element.classList.add("hidden");
  }
}
