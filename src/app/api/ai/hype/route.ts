import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { buildHypeManPrompt } from "@/lib/ai-prompts";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workoutId } = await request.json();
  if (!workoutId) {
    return NextResponse.json({ error: "workoutId required" }, { status: 400 });
  }

  const [workoutRes, streakRes] = await Promise.all([
    supabase
      .from("lifting_workouts")
      .select("*, lifting_sets(*, lifting_exercises(name))")
      .eq("id", workoutId)
      .single(),
    supabase
      .from("lifting_streaks")
      .select("*")
      .eq("user_id", user.id)
      .single(),
  ]);

  if (!workoutRes.data) {
    return NextResponse.json({ error: "Workout not found" }, { status: 404 });
  }

  const workout = workoutRes.data;
  const sets = (workout.lifting_sets ?? []) as (Record<string, unknown> & {
    weight?: number;
    reps?: number;
    rpe?: number;
    completed?: boolean;
    lifting_exercises?: { name: string };
  })[];

  const completedSets = sets.filter((s) => s.completed);
  const totalVolume = completedSets.reduce(
    (sum, s) => sum + (s.weight ?? 0) * (s.reps ?? 0),
    0
  );
  const avgRpe = completedSets.length > 0
    ? completedSets.reduce((sum, s) => sum + (s.rpe ?? 0), 0) / completedSets.length
    : 0;

  const exerciseMap = new Map<string, { maxWeight: number; sets: number }>();
  for (const set of completedSets) {
    const name = set.lifting_exercises?.name ?? "Unknown";
    const existing = exerciseMap.get(name) ?? { maxWeight: 0, sets: 0 };
    existing.maxWeight = Math.max(existing.maxWeight, set.weight ?? 0);
    existing.sets++;
    exerciseMap.set(name, existing);
  }

  const exercisesSummary = Array.from(exerciseMap.entries())
    .map(([name, data]) => `${name} (${data.sets} sets, max ${data.maxWeight} lbs)`)
    .join(", ");

  const prsHit: string[] = [];
  for (const [name, data] of exerciseMap.entries()) {
    const { data: previousBest } = await supabase
      .from("lifting_sets")
      .select("weight, lifting_exercises!inner(name)")
      .eq("lifting_exercises.name", name)
      .eq("completed", true)
      .neq("workout_id", workoutId)
      .order("weight", { ascending: false })
      .limit(1)
      .single();

    if (previousBest && data.maxWeight > (previousBest.weight ?? 0)) {
      prsHit.push(`${name}: ${data.maxWeight} lbs`);
    }
  }

  const prompt = buildHypeManPrompt({
    exercisesSummary,
    totalVolume,
    avgRpe,
    prsHit,
    streak: streakRes.data?.current_streak ?? 1,
    showedUpDespiteSkipping: false,
  });

  try {
    const anthropic = new Anthropic();
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      messages: [{ role: "user", content: prompt }],
    });

    const hype = message.content[0].type === "text" ? message.content[0].text : "";
    return NextResponse.json({ hype });
  } catch {
    const fallbackMessages = [
      "You showed up. That's the win. See you next session.",
      "Another one in the books. Consistency beats perfection.",
      "The hardest rep is the one that gets you to the gym. You did that today.",
    ];
    return NextResponse.json({
      hype: fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)],
    });
  }
}
