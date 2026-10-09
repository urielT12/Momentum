"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isValidTimeZone } from "@/lib/dates";

export type AuthState = { error?: string; message?: string };

export async function authenticate(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const mode = formData.get("mode") === "signup" ? "signup" : "signin";
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const tz = String(formData.get("timezone") ?? "");

  if (!email || password.length < 8) {
    return { error: "Enter your email and a password of at least 8 characters." };
  }

  const supabase = await createClient();

  if (mode === "signin") {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    redirect("/");
  }

  const origin = (await headers()).get("origin") ?? "";
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/confirm`,
      data: {
        display_name: String(formData.get("display_name") ?? "").trim() || undefined,
        timezone: isValidTimeZone(tz) ? tz : "UTC",
      },
    },
  });
  if (error) return { error: error.message };

  // With email confirmation disabled, sign-up returns a session right away.
  if (data.session) redirect("/");
  return { message: "Check your email to confirm your account, then sign in here." };
}
