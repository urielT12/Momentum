"use client";

import { useActionState, useState } from "react";
import { saveActivity, type ActionResult } from "./actions";

export function ActivityForm({
  day,
  steps,
  activeCalories,
}: {
  day: string;
  steps: number | null;
  activeCalories: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ActionResult, FormData>(async (prev, formData) => {
    const result = await saveActivity(prev, formData);
    if (result.ok) setOpen(false);
    return result;
  }, {});

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-3 text-sm font-semibold text-accent">
        {steps === null ? "Enter steps & calories from Garmin" : "Edit steps & calories"}
      </button>
    );
  }

  return (
    <form action={action} className="mt-3 space-y-3">
      <input type="hidden" name="day" value={day} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="steps">Steps</label>
          <input id="steps" name="steps" type="number" inputMode="numeric" min={0} defaultValue={steps ?? ""} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="active_calories">Active kcal</label>
          <input
            id="active_calories"
            name="active_calories"
            type="number"
            inputMode="numeric"
            min={0}
            defaultValue={activeCalories ?? ""}
            className="input"
          />
        </div>
      </div>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <div className="flex gap-2">
        <button type="submit" className="btn-primary flex-1" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </button>
        <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
