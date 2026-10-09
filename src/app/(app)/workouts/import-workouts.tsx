"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function ImportWorkouts() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ imported: number; errors: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload(files: FileList) {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const body = new FormData();
      for (const file of Array.from(files)) body.append("files", file);
      const res = await fetch("/api/workouts/import", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Import failed");
      setResult(json);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card space-y-3">
      <div>
        <h2 className="font-semibold">Import from Garmin</h2>
        <details className="mt-1 text-sm text-muted">
          <summary className="cursor-pointer">How to export a workout</summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Open an activity on connect.garmin.com.</li>
            <li>Tap the gear icon → <b>Export Original</b> (a .zip with a .fit file inside) or <b>Export to GPX</b>.</li>
            <li>Unzip it and upload the .fit file here. You can select several at once.</li>
          </ol>
        </details>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept=".fit,.gpx,application/octet-stream,application/gpx+xml"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) upload(e.target.files);
          e.target.value = "";
        }}
      />
      <button type="button" className="btn-primary w-full" disabled={busy} onClick={() => fileRef.current?.click()}>
        {busy ? "Importing…" : "Upload .FIT / .GPX files"}
      </button>
      {error && <p className="text-sm text-danger">{error}</p>}
      {result && (
        <div className="text-sm">
          <p className="font-medium text-accent">
            Imported {result.imported} workout{result.imported === 1 ? "" : "s"}.
          </p>
          {result.errors.map((e) => (
            <p key={e} className="text-muted">{e}</p>
          ))}
        </div>
      )}
    </section>
  );
}
