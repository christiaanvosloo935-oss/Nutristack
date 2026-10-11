export interface RecipeIngredient {
  name: string;
  measure: string;
}

export interface Recipe {
  id: string;
  name: string;
  category: string;
  area: string;
  thumb: string;
  ingredients: RecipeIngredient[];
  instructions: string;
  source?: string;
}

export interface Match {
  recipe: Recipe;
  have: string[];
  missing: string[];
  staples: string[];
}

export interface AiRecipe {
  title: string;
  description: string;
  ingredients: string[];
  steps: string[];
  basedOn?: string;
}
