export class EncounterUI {
  constructor(element, game) {
    this.element = element;
    this.game = game;
    this.renderedKey = null;
    this.element.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button || !this.element.contains(button)) return;
      if (button.dataset.action === "accept") this.game.acceptEncounter();
      if (button.dataset.action === "decline") this.game.declineEncounter();
    });
  }

  render() {
    const encounter = this.game.pendingEncounter;
    if (!encounter) {
      this.element.classList.add("hidden");
      this.renderedKey = null;
      return;
    }
    this.element.classList.remove("hidden");
    const key = `${encounter.seed}:${encounter.templateId}:${encounter.size}:${encounter.recipeHash}`;
    if (this.renderedKey !== key) {
      this.element.innerHTML = `
        <div class="encounter-card">
          <h2>${encounter.templateName}</h2>
          <p><strong>${capitalize(encounter.size)}</strong> island</p>
          <p>Generation rating: ${encounter.generationRating} - ${generationLabel(encounter.generationRating)}</p>
          <p>Level: ${encounter.level.rating} (${encounter.level.recommendedMinimum}-${encounter.level.recommendedMaximum})</p>
          <p>Danger: ${encounter.danger.finalScore} - ${encounter.danger.tier}</p>
          <p>Biome: ${encounter.biomeSummary.map((biome) => biome.name).join(", ")}</p>
          <p>Attributes: ${encounter.specialAttributes.length ? encounter.specialAttributes.map((attribute) => attribute.name).join(", ") : "None"}</p>
          <p class="dev-meta">Template: ${encounter.templateId} | Hash: ${encounter.recipeHash} | Catalog: ${encounter.catalogVersion}</p>
          <p class="dev-meta">Seed: ${encounter.seed}</p>
          <p>Respond in <span data-countdown></span>s</p>
          <div class="encounter-actions">
            <button data-action="accept">Investigate</button>
            <button data-action="decline">Sail onward</button>
          </div>
        </div>`;
      this.renderedKey = key;
    }
    this.element.querySelector("[data-countdown]").textContent = Math.ceil(encounter.remaining);
  }
}

function generationLabel(rating) {
  return ["", "Basic", "Developed", "Rich", "Complex", "Signature"][rating] ?? "Unknown";
}

function capitalize(value) {
  return `${value}`.charAt(0).toUpperCase() + `${value}`.slice(1);
}
