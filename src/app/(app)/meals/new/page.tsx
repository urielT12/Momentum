import { connection } from "next/server";
import { MealScanner } from "./meal-scanner";
import { isMealScanConfigured } from "@/lib/nutrition";

export default async function NewMealPage() {
  // Check the key per request, so adding it in Vercel doesn't require a rebuild.
  await connection();
  const scanEnabled = isMealScanConfigured();

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold">Log a meal</h1>
        <p className="text-sm text-muted">
          {scanEnabled
            ? "Snap a photo and we'll estimate calories and macros. You can adjust everything before saving."
            : "Photo scanning isn't set up yet. Add the foods and macros yourself below."}
        </p>
      </header>
      <MealScanner scanEnabled={scanEnabled} />
    </div>
  );
}
