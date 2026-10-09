import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { MEAL_TYPES } from "@/lib/types";

const MealAnalysisSchema = z.object({
  is_food: z.boolean().describe("False if the photo does not show food or drink."),
  title: z.string().describe("Short name for the meal, e.g. 'Chicken rice bowl'."),
  meal_type: z.enum(MEAL_TYPES),
  items: z.array(
    z.object({
      name: z.string(),
      portion: z.string().describe("Estimated amount, e.g. '150 g' or '1 cup'."),
      calories: z.number(),
      protein_g: z.number(),
      carbs_g: z.number(),
      fat_g: z.number(),
    }),
  ),
  fiber_g: z.number(),
  confidence: z.enum(["low", "medium", "high"]),
  notes: z
    .string()
    .describe("One or two sentences on assumptions (hidden oil, sauces, portion uncertainty)."),
});

export type MealAnalysis = z.infer<typeof MealAnalysisSchema>;

const SYSTEM_PROMPT = `You are a nutrition analyst inside a fitness tracking app. The user photographs a meal and you estimate what it contains.

For each distinct food or drink you can see, estimate the portion from visual cues (plate size, utensils, hands, packaging) and give calories and macronutrients for that portion, using standard nutrition databases (USDA-style values) as your reference. Account for likely cooking oil, butter, dressings and sauces, since these are the most common source of underestimation, and mention such assumptions in notes.

If the user adds a note (e.g. "2 eggs, cooked in olive oil"), treat it as more reliable than the photo. If the photo is not food, set is_food to false and return an empty items list. Choose meal_type from the local time of day given, unless the food clearly suggests otherwise.`;

let client: Anthropic | null = null;

export async function analyzeMealPhoto(input: {
  imageBase64: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp";
  localTime: string;
  note?: string;
}): Promise<MealAnalysis> {
  const userText = [
    `Local time: ${input.localTime}.`,
    input.note ? `User note: ${input.note}` : null,
    "Analyze this meal.",
  ]
    .filter(Boolean)
    .join("\n");

  client ??= new Anthropic();
  const response = await client.beta.messages.parse({
    model: process.env.ANTHROPIC_MODEL || "claude-opus-5",
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: input.mediaType, data: input.imageBase64 },
          },
          { type: "text", text: userText },
        ],
      },
    ],
    output_config: { format: betaZodOutputFormat(MealAnalysisSchema) },
  });

  if (response.stop_reason === "refusal") {
    throw new Error("The photo could not be analyzed. Try another photo.");
  }
  if (!response.parsed_output) {
    throw new Error("Could not read the analysis result. Please try again.");
  }
  return response.parsed_output;
}
