"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveMeal } from "../../actions";
import { MEAL_TYPES, type MealType } from "@/lib/types";
import type { MealAnalysis } from "@/lib/nutrition";
import { CameraIcon, PlusIcon, TrashIcon } from "@/components/icons";

// Numbers are kept as strings while editing so fields can be cleared.
type EditableItem = {
  name: string;
  portion: string;
  calories: string;
  protein_g: string;
  carbs_g: string;
  fat_g: string;
};

type Draft = {
  title: string;
  meal_type: MealType;
  eatenAtLocal: string;
  items: EditableItem[];
  fiber_g: string;
  ai_notes: string | null;
  confidence: MealAnalysis["confidence"] | null;
  photo_path: string | null;
};

const MACROS = [
  { key: "calories", label: "kcal" },
  { key: "protein_g", label: "P g" },
  { key: "carbs_g", label: "C g" },
  { key: "fat_g", label: "F g" },
] as const;

const emptyItem = (): EditableItem => ({ name: "", portion: "", calories: "", protein_g: "", carbs_g: "", fat_g: "" });

export function MealScanner() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  async function handleFile(file: File) {
    setError(null);
    setDraft(null);
    setAnalyzing(true);
    try {
      const resized = await resizeImage(file, 1568);
      setPreview(URL.createObjectURL(resized));

      const body = new FormData();
      body.append("photo", resized, "meal.jpg");
      if (note.trim()) body.append("note", note.trim());

      const res = await fetch("/api/meals/analyze", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Analysis failed");

      const { analysis, photoPath } = json as { analysis: MealAnalysis; photoPath: string };
      if (!analysis.is_food) {
        setError("That doesn't look like food. Try another photo, or enter the meal manually.");
      }
      setDraft({
        title: analysis.title,
        meal_type: analysis.meal_type,
        eatenAtLocal: nowLocalInput(),
        items: analysis.items.map((i) => ({
          name: i.name,
          portion: i.portion,
          calories: String(Math.round(i.calories)),
          protein_g: String(round1(i.protein_g)),
          carbs_g: String(round1(i.carbs_g)),
          fat_g: String(round1(i.fat_g)),
        })),
        fiber_g: String(round1(analysis.fiber_g)),
        ai_notes: analysis.notes,
        confidence: analysis.confidence,
        photo_path: photoPath,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setAnalyzing(false);
    }
  }

  function startManual() {
    setError(null);
    setDraft({
      title: "",
      meal_type: guessMealType(),
      eatenAtLocal: nowLocalInput(),
      items: [emptyItem()],
      fiber_g: "0",
      ai_notes: null,
      confidence: null,
      photo_path: null,
    });
  }

  function updateItem(index: number, patch: Partial<EditableItem>) {
    setDraft((d) => d && { ...d, items: d.items.map((it, i) => (i === index ? { ...it, ...patch } : it)) });
  }

  function save() {
    if (!draft) return;
    const items = draft.items
      .filter((i) => i.name.trim())
      .map((i) => ({
        name: i.name.trim(),
        portion: i.portion.trim(),
        calories: toNum(i.calories),
        protein_g: toNum(i.protein_g),
        carbs_g: toNum(i.carbs_g),
        fat_g: toNum(i.fat_g),
      }));
    if (!draft.title.trim()) return setError("Give the meal a name.");
    if (items.length === 0) return setError("Add at least one item.");

    setError(null);
    startSaving(async () => {
      const result = await saveMeal({
        title: draft.title.trim(),
        meal_type: draft.meal_type,
        eaten_at: new Date(draft.eatenAtLocal).toISOString(),
        photo_path: draft.photo_path,
        items,
        fiber_g: toNum(draft.fiber_g),
        ai_notes: draft.ai_notes,
      });
      if (result.error) setError(result.error);
      else router.push("/");
    });
  }

  const totals = draft
    ? draft.items.reduce(
        (t, i) => ({
          calories: t.calories + toNum(i.calories),
          protein_g: t.protein_g + toNum(i.protein_g),
          carbs_g: t.carbs_g + toNum(i.carbs_g),
          fat_g: t.fat_g + toNum(i.fat_g),
        }),
        { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
      )
    : null;

  return (
    <div className="space-y-4">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) handleFile(file);
        }}
      />

      {!draft && (
        <div className="card space-y-3">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- local object URL
            <img src={preview} alt="Your meal" className="aspect-[4/3] w-full rounded-xl object-cover" />
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={analyzing}
              className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border text-muted"
            >
              <CameraIcon width={40} height={40} />
              <span className="font-medium">Take or choose a photo</span>
            </button>
          )}
          <div>
            <label className="label" htmlFor="note">Note (optional)</label>
            <input
              id="note"
              className="input"
              placeholder="e.g. 2 eggs fried in olive oil, half the rice"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={analyzing}
            />
          </div>
          {analyzing ? (
            <p className="animate-pulse text-center font-medium text-accent">Analyzing your meal…</p>
          ) : (
            <div className="flex gap-2">
              <button type="button" className="btn-primary flex-1" onClick={() => fileRef.current?.click()}>
                <CameraIcon width={20} height={20} /> {preview ? "Try another photo" : "Scan meal"}
              </button>
              <button type="button" className="btn-secondary" onClick={startManual}>
                Enter manually
              </button>
            </div>
          )}
        </div>
      )}

      {error && <p className="rounded-xl bg-surface-2 p-3 text-sm text-danger">{error}</p>}

      {draft && totals && (
        <div className="space-y-4">
          {preview && draft.photo_path && (
            // eslint-disable-next-line @next/next/no-img-element -- local object URL
            <img src={preview} alt="Your meal" className="aspect-[4/3] w-full rounded-2xl object-cover" />
          )}

          <div className="card grid grid-cols-4 gap-2 text-center">
            <Stat value={Math.round(totals.calories)} label="kcal" />
            <Stat value={Math.round(totals.protein_g)} label="protein" className="text-protein" />
            <Stat value={Math.round(totals.carbs_g)} label="carbs" className="text-carbs" />
            <Stat value={Math.round(totals.fat_g)} label="fat" className="text-fat" />
          </div>

          {draft.ai_notes && (
            <p className="text-sm text-muted">
              {draft.confidence && <span className="font-semibold capitalize">{draft.confidence} confidence. </span>}
              {draft.ai_notes}
            </p>
          )}

          <div className="card space-y-3">
            <div>
              <label className="label" htmlFor="title">Meal</label>
              <input
                id="title"
                className="input"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="meal_type">Type</label>
                <select
                  id="meal_type"
                  className="input capitalize"
                  value={draft.meal_type}
                  onChange={(e) => setDraft({ ...draft, meal_type: e.target.value as MealType })}
                >
                  {MEAL_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="eaten_at">Time</label>
                <input
                  id="eaten_at"
                  type="datetime-local"
                  className="input"
                  value={draft.eatenAtLocal}
                  onChange={(e) => setDraft({ ...draft, eatenAtLocal: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="font-semibold">Items</h2>
            {draft.items.map((item, i) => (
              <div key={i} className="card space-y-2 p-3">
                <div className="flex gap-2">
                  <input
                    className="input flex-1"
                    placeholder="Food"
                    aria-label="Food"
                    value={item.name}
                    onChange={(e) => updateItem(i, { name: e.target.value })}
                  />
                  <input
                    className="input w-28"
                    placeholder="Portion"
                    aria-label="Portion"
                    value={item.portion}
                    onChange={(e) => updateItem(i, { portion: e.target.value })}
                  />
                  <button
                    type="button"
                    aria-label="Remove item"
                    className="px-1 text-muted hover:text-danger"
                    onClick={() => setDraft({ ...draft, items: draft.items.filter((_, j) => j !== i) })}
                  >
                    <TrashIcon width={18} height={18} />
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {MACROS.map(({ key, label }) => (
                    <label key={key} className="text-xs text-muted">
                      {label}
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="any"
                        className="input mt-0.5 px-2"
                        value={item[key]}
                        onChange={(e) => updateItem(i, { [key]: e.target.value })}
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <button
              type="button"
              className="flex items-center gap-1 text-sm font-semibold text-accent"
              onClick={() => setDraft({ ...draft, items: [...draft.items, emptyItem()] })}
            >
              <PlusIcon width={18} height={18} /> Add item
            </button>
          </div>

          <div className="flex gap-2">
            <button type="button" className="btn-primary flex-1" disabled={saving} onClick={save}>
              {saving ? "Saving…" : "Save meal"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={saving}
              onClick={() => {
                setDraft(null);
                setPreview(null);
                setError(null);
              }}
            >
              Start over
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ value, label, className = "" }: { value: number; label: string; className?: string }) {
  return (
    <div>
      <div className={`text-xl font-bold tabular-nums ${className}`}>{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}

const toNum = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};
const round1 = (n: number) => Math.round(n * 10) / 10;

function nowLocalInput() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function guessMealType(): MealType {
  const h = new Date().getHours();
  if (h < 11) return "breakfast";
  if (h < 16) return "lunch";
  if (h < 21) return "dinner";
  return "snack";
}

// Phone photos are large; downscale to the size Claude's vision works with
// and re-encode as JPEG (this also converts HEIC from iPhones).
async function resizeImage(file: File, maxSide: number): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not process the photo"))), "image/jpeg", 0.85),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
