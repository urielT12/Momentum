import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getUserForApi } from "@/lib/auth";
import { localDay } from "@/lib/dates";
import { parseFit, parseGpx } from "@/lib/workout-import";
import type { ImportedWorkout } from "@/lib/types";

const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(request: Request) {
  const auth = await getUserForApi();
  if (!auth) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { supabase, userId, profile } = auth;

  const form = await request.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) return NextResponse.json({ error: "No files uploaded" }, { status: 400 });

  const parsed: ImportedWorkout[] = [];
  const errors: string[] = [];

  for (const file of files) {
    if (file.size > MAX_BYTES) {
      errors.push(`${file.name}: too large (max 4 MB)`);
      continue;
    }
    const name = file.name.toLowerCase();
    try {
      if (name.endsWith(".fit")) parsed.push(...(await parseFit(await file.arrayBuffer())));
      else if (name.endsWith(".gpx")) parsed.push(...parseGpx(await file.text()));
      else errors.push(`${file.name}: only .fit and .gpx files are supported`);
    } catch (err) {
      console.error("Workout parse failed", file.name, err);
      errors.push(`${file.name}: could not be read`);
    }
  }

  // Skip workouts that were already imported (same start time).
  let imported = 0;
  if (parsed.length > 0) {
    const { data: existing } = await supabase
      .from("workouts")
      .select("started_at")
      .in("started_at", parsed.map((w) => w.started_at));
    const seen = new Set((existing ?? []).map((w) => new Date(w.started_at).toISOString()));
    const fresh = parsed.filter((w) => !seen.has(w.started_at));

    if (fresh.length > 0) {
      const { error } = await supabase.from("workouts").insert(
        fresh.map((w) => ({
          ...w,
          user_id: userId,
          day: localDay(new Date(w.started_at), profile.timezone),
        })),
      );
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
    imported = fresh.length;
    const skipped = parsed.length - fresh.length;
    if (skipped) errors.push(`${skipped} workout(s) were already imported`);
  }

  revalidatePath("/", "layout");
  return NextResponse.json({ imported, errors });
}
