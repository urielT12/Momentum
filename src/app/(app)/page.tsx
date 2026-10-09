import Link from "next/link";
import { deleteMeal, deleteWorkout } from "./actions";
import { ActivityForm } from "./activity-form";
import { requireUser } from "@/lib/auth";
import { formatDayLabel, formatDuration, isValidDay, localDay, shiftDay } from "@/lib/dates";
import type { DailyActivity, Meal, Workout } from "@/lib/types";
import { CalorieRing, MacroBar } from "@/components/progress";
import { DeleteButton } from "@/components/delete-button";
import { ChevronLeftIcon, ChevronRightIcon, FlameIcon, FootprintsIcon, PlusIcon } from "@/components/icons";

export default async function TodayPage({ searchParams }: PageProps<"/">) {
  const { supabase, profile } = await requireUser();
  const { date } = await searchParams;

  const today = localDay(new Date(), profile.timezone);
  const day = typeof date === "string" && isValidDay(date) && date <= today ? date : today;

  const [{ data: meals }, { data: workouts }, { data: activity }] = await Promise.all([
    supabase.from("meals").select("*").eq("day", day).order("eaten_at").returns<Meal[]>(),
    supabase.from("workouts").select("*").eq("day", day).order("started_at").returns<Workout[]>(),
    supabase.from("daily_activity").select("*").eq("day", day).maybeSingle<DailyActivity>(),
  ]);

  const photoPaths = (meals ?? []).map((m) => m.photo_path).filter((p): p is string => Boolean(p));
  const { data: signed } = photoPaths.length
    ? await supabase.storage.from("meal-photos").createSignedUrls(photoPaths, 3600)
    : { data: [] };
  const photoUrl = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  const totals = (meals ?? []).reduce(
    (t, m) => ({
      calories: t.calories + m.calories,
      protein: t.protein + Number(m.protein_g),
      carbs: t.carbs + Number(m.carbs_g),
      fat: t.fat + Number(m.fat_g),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const workoutCalories = (workouts ?? []).reduce((sum, w) => sum + (w.calories ?? 0), 0);
  // Garmin's active calories already include workouts; fall back to the workout sum.
  const burned = activity?.active_calories ?? workoutCalories;
  const steps = activity?.steps ?? 0;
  const stepsPct = profile.steps_goal ? Math.min((steps / profile.steps_goal) * 100, 100) : 0;

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <Link href={`/?date=${shiftDay(day, -1)}`} className="rounded-lg p-2 text-muted" aria-label="Previous day">
          <ChevronLeftIcon />
        </Link>
        <div className="text-center">
          <h1 className="text-xl font-bold">{formatDayLabel(day, today)}</h1>
          {profile.display_name && day === today && (
            <p className="text-sm text-muted">Keep it moving, {profile.display_name}</p>
          )}
        </div>
        {day < today ? (
          <Link href={`/?date=${shiftDay(day, 1)}`} className="rounded-lg p-2 text-muted" aria-label="Next day">
            <ChevronRightIcon />
          </Link>
        ) : (
          <span className="w-10" />
        )}
      </header>

      <section className="card flex items-center gap-5">
        <CalorieRing eaten={totals.calories} goal={profile.calorie_goal} />
        <dl className="grid flex-1 gap-3 text-sm">
          <div>
            <dt className="text-muted">Eaten</dt>
            <dd className="text-lg font-semibold tabular-nums">{totals.calories.toLocaleString()} kcal</dd>
          </div>
          <div>
            <dt className="text-muted">Goal</dt>
            <dd className="font-semibold tabular-nums">{profile.calorie_goal.toLocaleString()} kcal</dd>
          </div>
          <div>
            <dt className="text-muted">Burned (active)</dt>
            <dd className="font-semibold tabular-nums">{burned.toLocaleString()} kcal</dd>
          </div>
        </dl>
      </section>

      <section className="card space-y-3">
        <MacroBar label="Protein" value={totals.protein} goal={profile.protein_goal_g} colorClass="bg-protein" />
        <MacroBar label="Carbs" value={totals.carbs} goal={profile.carbs_goal_g} colorClass="bg-carbs" />
        <MacroBar label="Fat" value={totals.fat} goal={profile.fat_goal_g} colorClass="bg-fat" />
      </section>

      <section className="card">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-accent-soft p-2 text-accent">
            <FootprintsIcon />
          </div>
          <div className="flex-1">
            <div className="flex items-baseline justify-between">
              <span className="font-semibold">Steps</span>
              <span className="text-sm tabular-nums text-muted">
                <span className="text-foreground">{steps.toLocaleString()}</span> / {profile.steps_goal.toLocaleString()}
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-accent" style={{ width: `${stepsPct}%` }} />
            </div>
          </div>
        </div>
        <ActivityForm
          key={day}
          day={day}
          steps={activity?.steps ?? null}
          activeCalories={activity?.active_calories ?? null}
        />
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Meals</h2>
          <Link href="/meals/new" className="flex items-center gap-1 text-sm font-semibold text-accent">
            <PlusIcon width={18} height={18} /> Add meal
          </Link>
        </div>
        {meals?.length ? (
          <ul className="space-y-2">
            {meals.map((meal) => {
              const url = meal.photo_path ? photoUrl.get(meal.photo_path) : undefined;
              return (
                <li key={meal.id} className="card flex items-center gap-3 p-3">
                  {url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
                    <img src={url} alt="" className="size-14 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <div className="size-14 shrink-0 rounded-xl bg-surface-2" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{meal.title}</p>
                    <p className="text-xs capitalize text-muted">
                      {meal.meal_type} ·{" "}
                      {new Date(meal.eaten_at).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                        timeZone: profile.timezone,
                      })}
                    </p>
                    <p className="mt-0.5 text-xs tabular-nums">
                      <span className="font-semibold">{meal.calories} kcal</span>
                      <span className="text-protein"> · P {Math.round(Number(meal.protein_g))}g</span>
                      <span className="text-carbs"> · C {Math.round(Number(meal.carbs_g))}g</span>
                      <span className="text-fat"> · F {Math.round(Number(meal.fat_g))}g</span>
                    </p>
                  </div>
                  <DeleteButton onDelete={deleteMeal.bind(null, meal.id)} label={meal.title} />
                </li>
              );
            })}
          </ul>
        ) : (
          <Link href="/meals/new" className="card block text-center text-sm text-muted">
            No meals logged. Snap a photo of your next meal.
          </Link>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Workouts</h2>
          <Link href="/workouts" className="flex items-center gap-1 text-sm font-semibold text-accent">
            <PlusIcon width={18} height={18} /> Add workout
          </Link>
        </div>
        {workouts?.length ? (
          <ul className="space-y-2">
            {workouts.map((w) => (
              <li key={w.id} className="card flex items-center gap-3 p-3">
                <div className="rounded-xl bg-accent-soft p-2 text-accent">
                  <FlameIcon />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{w.title ?? w.sport}</p>
                  <p className="text-xs tabular-nums text-muted">
                    {formatDuration(w.duration_s)}
                    {w.distance_m ? ` · ${(Number(w.distance_m) / 1000).toFixed(2)} km` : ""}
                    {w.calories ? ` · ${w.calories} kcal` : ""}
                    {w.avg_hr ? ` · ${w.avg_hr} bpm` : ""}
                  </p>
                </div>
                <DeleteButton onDelete={deleteWorkout.bind(null, w.id)} label={w.title ?? "workout"} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="card text-center text-sm text-muted">No workouts on this day.</p>
        )}
      </section>
    </div>
  );
}
