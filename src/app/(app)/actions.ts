"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { isValidDay, isValidTimeZone, localDay } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { MEAL_TYPES } from "@/lib/types";
import { normalizeSport, titleFor } from "@/lib/workout-import";

export type ActionResult = { error?: string; ok?: boolean };

// --- Meals -----------------------------------------------------------------

const num = z.coerce.number().finite().min(0).max(100000);

const MealInput = z.object({
  title: z.string().trim().min(1).max(120),
  meal_type: z.enum(MEAL_TYPES),
  eaten_at: z.iso.datetime({ offset: true }),
  photo_path: z.string().max(300).nullable(),
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(120),
        portion: z.string().trim().max(60),
        calories: num,
        protein_g: num,
        carbs_g: num,
        fat_g: num,
      }),
    )
    .min(1)
    .max(40),
  fiber_g: num,
  ai_notes: z.string().max(1000).nullable(),
});

export type MealInput = z.input<typeof MealInput>;

export async function saveMeal(input: MealInput): Promise<ActionResult> {
  const { supabase, userId, profile } = await requireUser();
  const parsed = MealInput.safeParse(input);
  if (!parsed.success) return { error: "Some fields are missing or invalid." };
  const meal = parsed.data;

  // Photos must live in the caller's own folder.
  if (meal.photo_path && !meal.photo_path.startsWith(`${userId}/`)) {
    return { error: "Invalid photo." };
  }

  const sum = (key: "calories" | "protein_g" | "carbs_g" | "fat_g") =>
    Math.round(meal.items.reduce((acc, item) => acc + item[key], 0) * 10) / 10;

  const { error } = await supabase.from("meals").insert({
    user_id: userId,
    day: localDay(new Date(meal.eaten_at), profile.timezone),
    eaten_at: meal.eaten_at,
    meal_type: meal.meal_type,
    title: meal.title,
    photo_path: meal.photo_path,
    items: meal.items,
    calories: Math.round(sum("calories")),
    protein_g: sum("protein_g"),
    carbs_g: sum("carbs_g"),
    fat_g: sum("fat_g"),
    fiber_g: meal.fiber_g,
    ai_notes: meal.ai_notes,
  });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteMeal(mealId: string) {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("meals").delete().eq("id", mealId).select("photo_path").single();
  if (data?.photo_path) await supabase.storage.from("meal-photos").remove([data.photo_path]);
  revalidatePath("/", "layout");
}

// --- Daily activity ----------------------------------------------------------

export async function saveActivity(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { supabase, userId } = await requireUser();
  const day = String(formData.get("day") ?? "");
  if (!isValidDay(day)) return { error: "Invalid day." };

  const optionalInt = (name: string) => {
    const raw = String(formData.get(name) ?? "").trim();
    if (!raw) return null;
    const n = Math.round(Number(raw));
    return Number.isFinite(n) && n >= 0 ? n : null;
  };

  const { error } = await supabase.from("daily_activity").upsert({
    user_id: userId,
    day,
    steps: optionalInt("steps"),
    active_calories: optionalInt("active_calories"),
    source: "manual",
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

// --- Workouts ------------------------------------------------------------------

export async function addWorkout(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { supabase, userId, profile } = await requireUser();

  const sport = normalizeSport(String(formData.get("sport") ?? "other"));
  const startedAtRaw = String(formData.get("started_at") ?? ""); // ISO with offset, set on the client
  const startedAt = new Date(startedAtRaw);
  if (isNaN(startedAt.getTime())) return { error: "Pick a valid date and time." };

  const optionalNum = (name: string, scale = 1) => {
    const raw = String(formData.get(name) ?? "").trim();
    if (!raw) return null;
    const n = Number(raw) * scale;
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
  };

  const { error } = await supabase.from("workouts").insert({
    user_id: userId,
    day: localDay(startedAt, profile.timezone),
    started_at: startedAt.toISOString(),
    sport,
    title: String(formData.get("title") ?? "").trim() || titleFor(sport),
    duration_s: optionalNum("duration_min", 60),
    distance_m: optionalNum("distance_km", 1000),
    calories: optionalNum("calories"),
    avg_hr: optionalNum("avg_hr"),
    source: "manual",
    notes: String(formData.get("notes") ?? "").trim() || null,
  });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteWorkout(workoutId: string) {
  const { supabase } = await requireUser();
  await supabase.from("workouts").delete().eq("id", workoutId);
  revalidatePath("/", "layout");
}

// --- Settings ------------------------------------------------------------------

export async function updateProfile(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { supabase, userId } = await requireUser();

  const timezone = String(formData.get("timezone") ?? "");
  if (!isValidTimeZone(timezone)) return { error: "Unknown timezone." };

  const goal = (name: string, min: number, max: number) => {
    const n = Math.round(Number(formData.get(name)));
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
  };

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: String(formData.get("display_name") ?? "").trim() || null,
      timezone,
      calorie_goal: goal("calorie_goal", 800, 8000),
      protein_goal_g: goal("protein_goal_g", 0, 500),
      carbs_goal_g: goal("carbs_goal_g", 0, 1000),
      fat_goal_g: goal("fat_goal_g", 0, 400),
      steps_goal: goal("steps_goal", 0, 100000),
    })
    .eq("id", userId);
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
