import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { exerciseName, muscleGroup, stallDuration, currentWeight, userNotes } =
    await request.json();

  if (!exerciseName || !muscleGroup || !stallDuration || !currentWeight) {
    return NextResponse.json(
      { error: "exerciseName, muscleGroup, stallDuration, and currentWeight are required" },
      { status: 400 }
    );
  }

  const prompt = `This lifter has been stuck on ${exerciseName} at ${currentWeight} lbs for ${stallDuration} weeks. Suggest 2-3 alternative exercises that target ${muscleGroup} and explain why each might help break the plateau. Keep it under 100 words. Coach tone.${userNotes ? `\n\nLifter's notes: ${userNotes}` : ""}`;

  try {
    const anthropic = new Anthropic();
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 256,
      messages: [{ role: "user", content: prompt }],
    });

    const suggestions =
      message.content[0].type === "text" ? message.content[0].text : "";

    return NextResponse.json({ suggestions });
  } catch {
    const fallbackSuggestions: Record<string, string> = {
      chest: "Try dumbbell bench press for better range of motion, or incline press to hit a different angle. Sometimes a variation is all you need to break through.",
      back: "Switch to barbell rows if you're doing cables, or try pull-ups with added weight. Different pulling angles recruit different fibers.",
      legs: "Try front squats or Bulgarian split squats. Unilateral work exposes weaknesses and builds stability you're missing.",
      shoulders: "Try landmine press or Arnold press. Different pressing angles can wake up stalled delts.",
      arms: "Switch grip width or try an incline curl/overhead extension. Small angle changes make big differences for arms.",
    };

    const groupKey = muscleGroup.toLowerCase();
    const fallback =
      fallbackSuggestions[groupKey] ??
      `Try a variation of ${exerciseName} with a different grip, angle, or tempo. Sometimes small changes break big plateaus.`;

    return NextResponse.json({ suggestions: fallback });
  }
}
