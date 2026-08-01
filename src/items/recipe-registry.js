import { RECIPE_DEFINITIONS } from "../data/recipes.js";

const recipeMap = new Map(RECIPE_DEFINITIONS.map((recipe) => [recipe.id, Object.freeze({ ...recipe })]));

export function getRecipe(recipeId) {
  const recipe = recipeMap.get(recipeId);
  if (!recipe) throw new Error(`Unknown recipe id: ${recipeId}`);
  return recipe;
}

export function listRecipes() {
  return [...recipeMap.values()];
}
