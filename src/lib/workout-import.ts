import "server-only";
import FitParser from "fit-file-parser";
import type { ImportedWorkout } from "@/lib/types";

// Parses a Garmin .FIT activity file (Garmin Connect → activity → ⚙ → Export Original)
// into one workout per session.
export async function parseFit(buffer: ArrayBuffer): Promise<ImportedWorkout[]> {
  const parser = new FitParser({ force: true, mode: "list", lengthUnit: "m", speedUnit: "m/s" });
  const data = await parser.parseAsync(buffer);

  const sessions = (data.sessions ?? []) as Array<Record<string, unknown>>;
  return sessions.map((s) => {
    const sport = String(s.sub_sport && s.sub_sport !== "generic" ? s.sub_sport : (s.sport ?? "other"));
    const startedAt = toDate(s.start_time) ?? toDate(s.timestamp) ?? new Date();
    return {
      started_at: startedAt.toISOString(),
      sport: normalizeSport(sport),
      title: titleFor(sport),
      duration_s: roundOrNull(s.total_timer_time ?? s.total_elapsed_time),
      distance_m: roundOrNull(s.total_distance),
      calories: roundOrNull(s.total_calories),
      avg_hr: roundOrNull(s.avg_heart_rate),
      max_hr: roundOrNull(s.max_heart_rate),
      source: "fit",
    };
  });
}

// Parses a .GPX track: duration from first/last timestamp, distance from the points.
export function parseGpx(xml: string): ImportedWorkout[] {
  const points = [...xml.matchAll(/<trkpt[^>]*lat="([-\d.]+)"[^>]*lon="([-\d.]+)"[^>]*>([\s\S]*?)<\/trkpt>/g)].map(
    (m) => ({
      lat: Number(m[1]),
      lon: Number(m[2]),
      time: m[3].match(/<time>([^<]+)<\/time>/)?.[1],
    }),
  );
  if (points.length === 0) return [];

  let distance = 0;
  for (let i = 1; i < points.length; i++) distance += haversine(points[i - 1], points[i]);

  const times = points.map((p) => (p.time ? Date.parse(p.time) : NaN)).filter((t) => !isNaN(t));
  const start = times.length ? new Date(Math.min(...times)) : new Date();
  const duration = times.length > 1 ? (Math.max(...times) - Math.min(...times)) / 1000 : null;

  const type = xml.match(/<trk>[\s\S]*?<type>([^<]+)<\/type>/)?.[1] ?? "other";
  const name = xml.match(/<trk>[\s\S]*?<name>([^<]+)<\/name>/)?.[1];

  return [
    {
      started_at: start.toISOString(),
      sport: normalizeSport(type),
      title: name ?? titleFor(type),
      duration_s: duration ? Math.round(duration) : null,
      distance_m: Math.round(distance),
      calories: null,
      avg_hr: null,
      max_hr: null,
      source: "gpx",
    },
  ];
}

function haversine(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function roundOrNull(value: unknown): number | null {
  return typeof value === "number" && isFinite(value) ? Math.round(value) : null;
}

export function normalizeSport(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "other";
}

export function titleFor(sport: string): string {
  const s = normalizeSport(sport).replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}
