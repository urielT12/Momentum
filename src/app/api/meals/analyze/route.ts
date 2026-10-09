import { NextResponse } from "next/server";
import { getUserForApi } from "@/lib/auth";
import { analyzeMealPhoto } from "@/lib/nutrition";

export const maxDuration = 120;

const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"] as const;
type Allowed = (typeof ALLOWED)[number];

// Uploads the meal photo to private storage and returns Claude's nutrition estimate.
// Nothing is written to the meals table here; the user reviews and saves on the client.
export async function POST(request: Request) {
  const auth = await getUserForApi();
  if (!auth) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { supabase, userId, profile } = auth;

  const form = await request.formData();
  const photo = form.get("photo");
  const note = String(form.get("note") ?? "").slice(0, 500).trim();

  if (!(photo instanceof File)) {
    return NextResponse.json({ error: "No photo uploaded" }, { status: 400 });
  }
  if (!ALLOWED.includes(photo.type as Allowed)) {
    return NextResponse.json({ error: "Use a JPEG, PNG or WebP photo" }, { status: 400 });
  }
  if (photo.size > MAX_BYTES) {
    return NextResponse.json({ error: "Photo is too large (max 4 MB)" }, { status: 400 });
  }

  const bytes = Buffer.from(await photo.arrayBuffer());
  const ext = photo.type.split("/")[1];
  const photoPath = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("meal-photos")
    .upload(photoPath, bytes, { contentType: photo.type });
  if (uploadError) {
    return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
  }

  try {
    const localTime = new Date().toLocaleTimeString("en-US", {
      timeZone: profile.timezone,
      hour: "2-digit",
      minute: "2-digit",
    });
    const analysis = await analyzeMealPhoto({
      imageBase64: bytes.toString("base64"),
      mediaType: photo.type as Allowed,
      localTime,
      note: note || undefined,
    });
    return NextResponse.json({ photoPath, analysis });
  } catch (err) {
    await supabase.storage.from("meal-photos").remove([photoPath]);
    console.error("Meal analysis failed", err);
    const message = err instanceof Error ? err.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
