export type RecipeIngredientItem = {
  name: string;
  is_deal: boolean;
  quantity: string;
};

export type RecipeStep = {
  step_number: number;
  instruction: string;
};

export type ApiRecipeResponse = {
  recipe_name: string;
  description: string;
  prep_time: string;
  cook_time: string;
  difficulty: string;
  ingredients: RecipeIngredientItem[];
  instructions: RecipeStep[];
  waste_saved_summary: string;
};
