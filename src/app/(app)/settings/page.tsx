import { signOut } from "../actions";
import { SettingsForm } from "./settings-form";
import { requireUser } from "@/lib/auth";

export default async function SettingsPage() {
  const { profile } = await requireUser();
  const timezones = Intl.supportedValuesOf("timeZone");

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Settings</h1>
      <SettingsForm profile={profile} timezones={timezones} />

      <section className="card space-y-2 text-sm">
        <h2 className="font-semibold">Install on your iPhone</h2>
        <p className="text-muted">
          Open this site in Safari, tap the Share button, then <b>Add to Home Screen</b>. Momentum opens full
          screen like a regular app.
        </p>
      </section>

      <form action={signOut}>
        <button type="submit" className="btn-secondary w-full text-danger">Sign out</button>
      </form>
    </div>
  );
}
