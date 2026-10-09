export type Profile = {
  id: string;
  display_name: string | null;
  timezone: string;
  calorie_goal: number;
  protein_goal_g: number;
  carbs_goal_g: number;
  fat_goal_g: number;
  steps_goal: number;
};

export type MealItem = {
  name: string;
  portion: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export type Meal = {
  id: string;
  day: string;
  eaten_at: string;
  meal_type: MealType;
  title: string;
  photo_path: string | null;
  items: MealItem[];
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  ai_notes: string | null;
};

export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export type Workout = {
  id: string;
  day: string;
  started_at: string;
  sport: string;
  title: string | null;
  duration_s: number | null;
  distance_m: number | null;
  calories: number | null;
  avg_hr: number | null;
  max_hr: number | null;
  source: "manual" | "fit" | "gpx";
  notes: string | null;
};

export type DailyActivity = {
  day: string;
  steps: number | null;
  active_calories: number | null;
  distance_m: number | null;
  active_minutes: number | null;
};

// A workout as produced by a file importer, before it is tied to a user/day.
export type ImportedWorkout = Omit<Workout, "id" | "day" | "notes">;
