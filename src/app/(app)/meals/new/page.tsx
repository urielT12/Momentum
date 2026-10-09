import { MealScanner } from "./meal-scanner";

export default function NewMealPage() {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold">Log a meal</h1>
        <p className="text-sm text-muted">Snap a photo and we&apos;ll estimate calories and macros. You can adjust everything before saving.</p>
      </header>
      <MealScanner />
    </div>
  );
}
