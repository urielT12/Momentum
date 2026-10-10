import "server-only";
import { ApiError, GoogleGenAI } from "@google/genai";
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
// Gemini takes a plain JSON Schema; drop the "$schema" meta key zod adds.
const RESPONSE_SCHEMA: Record<string, unknown> = { ...z.toJSONSchema(MealAnalysisSchema) };
delete RESPONSE_SCHEMA.$schema;

let client: GoogleGenAI | null = null;

export function isMealScanConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

export async function analyzeMealPhoto(input: {
  imageBase64: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp";
  localTime: string;
  note?: string;
}): Promise<MealAnalysis> {
  if (!isMealScanConfigured()) throw new Error("Photo scanning is not set up yet.");

  const userText = [
    `Local time: ${input.localTime}.`,
    input.note ? `User note: ${input.note}` : null,
    "Analyze this meal.",
  ]
    .filter(Boolean)
    .join("\n");

  client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  let text: string | undefined;
  try {
    const response = await client.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-flash-latest",
      contents: [
        {
          role: "user",
          parts: [{ inlineData: { mimeType: input.mediaType, data: input.imageBase64 } }, { text: userText }],
        },
      ],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseJsonSchema: RESPONSE_SCHEMA,
      },
    });
    text = response.text;
  } catch (err) {
    if (err instanceof ApiError && err.status === 429) {
      throw new Error("Free scan limit reached for now. Try again in a minute, or enter the meal manually.");
    }
    throw err;
  }

  const parsed = MealAnalysisSchema.safeParse(text ? JSON.parse(text) : null);
  if (!parsed.success) throw new Error("Could not read the analysis result. Please try again.");
  return parsed.data;
}
