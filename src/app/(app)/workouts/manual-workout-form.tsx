"use client";

import { useActionState, useRef, useState } from "react";
import { addWorkout, type ActionResult } from "../actions";

const SPORTS = [
  ["running", "Run"],
  ["cycling", "Ride"],
  ["walking", "Walk"],
  ["strength_training", "Strength"],
  ["swimming", "Swim"],
  ["hiking", "Hike"],
  ["yoga", "Yoga"],
  ["hiit", "HIIT"],
  ["other", "Other"],
] as const;

export function ManualWorkoutForm() {
  const [open, setOpen] = useState(false);
  const startedAtRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [state, action, pending] = useActionState<ActionResult, FormData>(async (prev, formData) => {
    // datetime-local has no timezone; convert using the device's timezone.
    const local = String(formData.get("started_at_local") ?? "");
    formData.set("started_at", local ? new Date(local).toISOString() : "");
    const result = await addWorkout(prev, formData);
    if (result.ok) {
      formRef.current?.reset();
      setOpen(false);
    }
    return result;
  }, {});

  if (!open) {
    return (
      <button
        type="button"
        className="btn-secondary w-full"
        onClick={() => {
          setOpen(true);
          requestAnimationFrame(() => {
            if (startedAtRef.current && !startedAtRef.current.value) startedAtRef.current.value = nowLocalInput();
          });
        }}
      >
        Add workout manually
      </button>
    );
  }

  return (
    <form ref={formRef} action={action} className="card space-y-3">
      <h2 className="font-semibold">New workout</h2>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="sport">Type</label>
          <select id="sport" name="sport" className="input" defaultValue="running">
            {SPORTS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="started_at_local">Start</label>
          <input
            ref={startedAtRef}
            id="started_at_local"
            name="started_at_local"
            type="datetime-local"
            required
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="duration_min">Duration (min)</label>
          <input id="duration_min" name="duration_min" type="number" inputMode="decimal" min={0} step="any" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="distance_km">Distance (km)</label>
          <input id="distance_km" name="distance_km" type="number" inputMode="decimal" min={0} step="any" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="calories">Calories</label>
          <input id="calories" name="calories" type="number" inputMode="numeric" min={0} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="avg_hr">Avg HR (bpm)</label>
          <input id="avg_hr" name="avg_hr" type="number" inputMode="numeric" min={0} className="input" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="title">Title (optional)</label>
        <input id="title" name="title" className="input" placeholder="e.g. Leg day" />
      </div>
      <div>
        <label className="label" htmlFor="notes">Notes (optional)</label>
        <textarea id="notes" name="notes" rows={2} className="input" />
      </div>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <div className="flex gap-2">
        <button type="submit" className="btn-primary flex-1" disabled={pending}>
          {pending ? "Saving…" : "Save workout"}
        </button>
        <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function nowLocalInput() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}
