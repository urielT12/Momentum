import { deleteWorkout } from "../actions";
import { ImportWorkouts } from "./import-workouts";
import { ManualWorkoutForm } from "./manual-workout-form";
import { requireUser } from "@/lib/auth";
import { formatDuration } from "@/lib/dates";
import type { Workout } from "@/lib/types";
import { DeleteButton } from "@/components/delete-button";

export default async function WorkoutsPage() {
  const { supabase, profile } = await requireUser();
  const { data: workouts } = await supabase
    .from("workouts")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(50)
    .returns<Workout[]>();

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold">Workouts</h1>
        <p className="text-sm text-muted">Import activities from Garmin or add them by hand.</p>
      </header>

      <ImportWorkouts />
      <ManualWorkoutForm />

      <section>
        <h2 className="mb-2 text-lg font-semibold">Recent</h2>
        {workouts?.length ? (
          <ul className="space-y-2">
            {workouts.map((w) => (
              <li key={w.id} className="card flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{w.title ?? w.sport}</p>
                  <p className="text-xs text-muted">
                    {new Date(w.started_at).toLocaleString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                      timeZone: profile.timezone,
                    })}
                    {w.source !== "manual" && ` · ${w.source.toUpperCase()}`}
                  </p>
                  <p className="mt-0.5 text-xs tabular-nums">
                    {formatDuration(w.duration_s)}
                    {w.distance_m ? ` · ${(Number(w.distance_m) / 1000).toFixed(2)} km` : ""}
                    {w.calories ? ` · ${w.calories} kcal` : ""}
                    {w.avg_hr ? ` · avg ${w.avg_hr} bpm` : ""}
                  </p>
                </div>
                <DeleteButton onDelete={deleteWorkout.bind(null, w.id)} label={w.title ?? "workout"} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="card text-center text-sm text-muted">No workouts yet.</p>
        )}
      </section>
    </div>
  );
}
