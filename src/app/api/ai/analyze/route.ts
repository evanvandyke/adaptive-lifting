import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { buildWeeklyAnalysisPrompt } from "@/lib/ai-prompts";
import Anthropic from "@anthropic-ai/sdk";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const [workoutsRes, prevWorkoutsRes, bodyWeightRes] = await Promise.all([
    supabase
      .from("lifting_workouts")
      .select("*, lifting_sets(*, lifting_exercises(name))")
      .eq("user_id", user.id)
      .gte("date", sevenDaysAgo.toISOString().split("T")[0])
      .order("date", { ascending: true }),
    supabase
      .from("lifting_workouts")
      .select("*, lifting_sets(weight, reps)")
      .eq("user_id", user.id)
      .gte("date", fourteenDaysAgo.toISOString().split("T")[0])
      .lt("date", sevenDaysAgo.toISOString().split("T")[0]),
    supabase
      .from("lifting_body_weight_log")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", sevenDaysAgo.toISOString().split("T")[0])
      .order("date", { ascending: true }),
  ]);

  if (!workoutsRes.data?.length) {
    return NextResponse.json({
      analysis: "Complete your first week of training to unlock AI analysis. Show up 3 times this week and I'll have something to work with.",
    });
  }

  const currentVolume = (workoutsRes.data ?? []).reduce((total, w) => {
    const sets = (w.lifting_sets ?? []) as { weight?: number; reps?: number }[];
    return total + sets.reduce((s, set) => s + (set.weight ?? 0) * (set.reps ?? 0), 0);
  }, 0);

  const previousVolume = (prevWorkoutsRes.data ?? []).reduce((total, w) => {
    const sets = (w.lifting_sets ?? []) as { weight?: number; reps?: number }[];
    return total + sets.reduce((s, set) => s + (set.weight ?? 0) * (set.reps ?? 0), 0);
  }, 0);

  const workouts = (workoutsRes.data ?? []).map((w) => ({
    ...w,
    sets: (w.lifting_sets ?? []).map((s: Record<string, unknown>) => ({
      ...s,
      exercise: s.lifting_exercises as { name: string } | undefined,
    })),
  }));

  const notes = workouts
    .filter((w) => w.notes)
    .map((w) => w.notes as string);

  const prompt = buildWeeklyAnalysisPrompt({
    workouts,
    currentVolume,
    previousVolume,
    bodyWeight: bodyWeightRes.data ?? [],
    notes,
  });

  try {
    const anthropic = new Anthropic();
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    const analysis = message.content[0].type === "text" ? message.content[0].text : "";

    return NextResponse.json({ analysis });
  } catch {
    return NextResponse.json({
      analysis: "AI analysis temporarily unavailable. Your data is still being tracked — check back later.",
    });
  }
}
