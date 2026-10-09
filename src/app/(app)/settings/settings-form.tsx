"use client";

import { useActionState } from "react";
import { updateProfile, type ActionResult } from "../actions";
import type { Profile } from "@/lib/types";

const GOALS = [
  { name: "calorie_goal", label: "Calories (kcal)" },
  { name: "protein_goal_g", label: "Protein (g)" },
  { name: "carbs_goal_g", label: "Carbs (g)" },
  { name: "fat_goal_g", label: "Fat (g)" },
  { name: "steps_goal", label: "Steps" },
] as const;

export function SettingsForm({ profile, timezones }: { profile: Profile; timezones: string[] }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(updateProfile, {});

  return (
    <form action={action} className="space-y-4">
      <section className="card space-y-3">
        <h2 className="font-semibold">Profile</h2>
        <div>
          <label className="label" htmlFor="display_name">Name</label>
          <input id="display_name" name="display_name" className="input" defaultValue={profile.display_name ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="timezone">Timezone</label>
          <select id="timezone" name="timezone" className="input" defaultValue={profile.timezone}>
            {!timezones.includes(profile.timezone) && <option value={profile.timezone}>{profile.timezone}</option>}
            {timezones.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">Daily goals</h2>
        <div className="grid grid-cols-2 gap-3">
          {GOALS.map(({ name, label }) => (
            <div key={name}>
              <label className="label" htmlFor={name}>{label}</label>
              <input
                id={name}
                name={name}
                type="number"
                inputMode="numeric"
                min={0}
                className="input"
                defaultValue={profile[name]}
              />
            </div>
          ))}
        </div>
      </section>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      {state.ok && !pending && <p className="text-sm text-accent">Saved.</p>}
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
