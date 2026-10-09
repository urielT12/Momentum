"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { authenticate, type AuthState } from "./actions";

export function LoginForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [state, action, pending] = useActionState<AuthState, FormData>(authenticate, {});
  const tzRef = useRef<HTMLInputElement>(null);

  // The browser knows the user's timezone; store it on the profile at sign-up.
  useEffect(() => {
    if (tzRef.current) tzRef.current.value = Intl.DateTimeFormat().resolvedOptions().timeZone;
  }, []);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="timezone" ref={tzRef} />

      {mode === "signup" && (
        <div>
          <label className="label" htmlFor="display_name">Name</label>
          <input id="display_name" name="display_name" className="input" autoComplete="name" />
        </div>
      )}
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required className="input" autoComplete="email" />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          className="input"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
        />
      </div>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      {state.message && <p className="text-sm text-accent">{state.message}</p>}

      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
      </button>

      <button
        type="button"
        className="w-full text-sm text-muted"
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
      >
        {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
      </button>
    </form>
  );
}
