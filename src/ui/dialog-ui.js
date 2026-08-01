export class DialogUI {
  constructor(element, game) {
    this.element = element;
    this.game = game;
    this.renderedKey = null;
    this.element.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button || !this.element.contains(button) || !this.game.dialog) return;
      this.game.dialog.actions[Number(button.dataset.action)]?.run();
    });
  }

  render() {
    const dialog = this.game.dialog;
    if (!dialog) {
      this.element.classList.add("hidden");
      this.renderedKey = null;
      return;
    }
    this.element.classList.remove("hidden");
    const key = `${dialog.title}:${dialog.message}:${dialog.actions.map((action) => action.label).join("|")}`;
    if (this.renderedKey !== key) {
      this.element.innerHTML = `
        <div class="dialog-card">
          <h2>${dialog.title}</h2>
          <p>${dialog.message}</p>
          <div class="dialog-actions">
            ${dialog.actions.map((action, index) => `<button data-action="${index}" class="${action.danger ? "danger" : ""}">${action.label}</button>`).join("")}
          </div>
        </div>`;
      this.renderedKey = key;
    }
  }
}
