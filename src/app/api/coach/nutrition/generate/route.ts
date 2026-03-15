/**
 * POST /api/coach/nutrition/generate
 *
 * Runs meal plan generation on the server to avoid browser Supabase client
 * hanging after tab background/foreground (see supabase#36046).
 * Body: GeneratorConfig (JSON). Returns { result, foodsBySlot } (foodsBySlot as plain object).
 * Pre-validates config before generation; returns 400 with validationErrors if impossible.
 */

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  generateMealPlanWithClient,
  validateGeneratorConfig,
} from "@/lib/mealPlanGeneratorService";
import type { GeneratorConfig } from "@/lib/mealPlanGeneratorService";

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: authError?.message ?? "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const config = body as GeneratorConfig;

    if (!config || typeof config.mealCount !== "number" || typeof config.targetKcal !== "number") {
      return NextResponse.json(
        { error: "Invalid config: mealCount and targetKcal required" },
        { status: 400 }
      );
    }

    const validation = await validateGeneratorConfig(supabase, config);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: "Configuration is invalid. Please fix the issues below.",
          validationErrors: validation.errors,
        },
        { status: 400 }
      );
    }

    const output = await generateMealPlanWithClient(supabase, config);

    // Serialize Map for JSON (client will do new Map(Object.entries(...)))
    const foodsBySlotObj = Object.fromEntries(output.foodsBySlot);

    return NextResponse.json({
      result: output.result,
      foodsBySlot: foodsBySlotObj,
    });
  } catch (err) {
    console.error("[coach/nutrition/generate]", err);
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
