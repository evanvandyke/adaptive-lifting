import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

  const [profileRes, nutritionRes, bodyWeightRes] = await Promise.all([
    supabase
      .from("lifting_profiles")
      .select("*")
      .eq("id", user.id)
      .single(),
    supabase
      .from("lifting_nutrition_log")
      .select("date, protein_grams, meal_description")
      .eq("user_id", user.id)
      .gte("date", sevenDaysAgo.toISOString().split("T")[0])
      .order("date", { ascending: true }),
    supabase
      .from("lifting_body_weight_log")
      .select("date, weight")
      .eq("user_id", user.id)
      .gte("date", fourWeeksAgo.toISOString().split("T")[0])
      .order("date", { ascending: true }),
  ]);

  const profile = profileRes.data as {
    current_weight: number | null;
    goal: string | null;
  } | null;

  const nutritionEntries = nutritionRes.data ?? [];
  const bodyWeightEntries = bodyWeightRes.data ?? [];

  // Need at least some nutrition data
  if (nutritionEntries.length === 0) {
    return NextResponse.json({
      coaching: "Log protein for a week to unlock AI coaching. I need data to give you real advice.",
    });
  }

  // Calculate daily protein averages
  const dailyProtein: Record<string, number> = {};
  for (const entry of nutritionEntries) {
    dailyProtein[entry.date] =
      (dailyProtein[entry.date] ?? 0) + (entry.protein_grams ?? 0);
  }
  const daysTracked = Object.keys(dailyProtein).length;
  const avgDailyProtein =
    daysTracked > 0
      ? Math.round(
          Object.values(dailyProtein).reduce((a, b) => a + b, 0) / daysTracked
        )
      : 0;

  const currentWeight = profile?.current_weight ?? 200;
  const proteinTarget = Math.round(currentWeight * 0.8);
  const goal = profile?.goal ?? "strength";

  // Weight trend
  let weightTrend = "No weigh-ins logged";
  if (bodyWeightEntries.length >= 2) {
    const first = bodyWeightEntries[0].weight;
    const last = bodyWeightEntries[bodyWeightEntries.length - 1].weight;
    const change = last - first;
    weightTrend = `${first} → ${last} lbs (${change > 0 ? "+" : ""}${change.toFixed(1)} lbs over ${bodyWeightEntries.length} weigh-ins)`;
  } else if (bodyWeightEntries.length === 1) {
    weightTrend = `${bodyWeightEntries[0].weight} lbs (single weigh-in)`;
  }

  const goalContext: Record<string, string> = {
    fat_loss:
      "Goal: fat loss. Prioritize caloric deficit while maintaining high protein to preserve muscle. Sustainable deficit > aggressive cut.",
    strength:
      "Goal: strength. Needs adequate calories to fuel training. Slight surplus is fine. Protein is king.",
    recomp:
      "Goal: body recomposition. Eat at or near maintenance, high protein. Training drives the changes.",
  };

  const prompt = `Analyze this lifter's nutrition and give actionable coaching:

Average daily protein: ${avgDailyProtein}g (target: ${proteinTarget}g, based on ${currentWeight} lbs bodyweight)
Days tracked this week: ${daysTracked}/7
Body weight trend (last 4 weeks): ${weightTrend}
${goalContext[goal] ?? "Goal: general fitness."}

Provide:
1. How they're doing on protein vs target — be specific
2. What the weight trend means for their goal
3. One concrete, actionable tip for next week

Rules: No meal plans. No obsessive macro counting. Just real talk about protein, calories, and consistency.
Keep it under 120 words. Coach tone — direct, encouraging, no fluff.`;

  try {
    const anthropic = new Anthropic();
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    const coaching =
      message.content[0].type === "text" ? message.content[0].text : "";

    return NextResponse.json({ coaching });
  } catch {
    return NextResponse.json({
      coaching:
        "AI coaching temporarily unavailable. Keep hitting your protein target and check back later.",
    });
  }
}
