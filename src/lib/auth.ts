import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

// Data Access Layer entry point: every page, action and route handler that
// touches user data goes through here, so authorization never relies on the proxy alone.
export async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || !userId) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single<Profile>();
  if (!profile) redirect("/login");

  return { supabase, userId, profile };
}

// Same as requireUser, but for route handlers that must answer with JSON.
export async function getUserForApi() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single<Profile>();
  if (!profile) return null;

  return { supabase, userId, profile };
}
