"use server";

import { createClient } from "@/utils/supabase/server";
import { SESSION_TEMPLATES } from "@/lib/types";
import type { WorkoutSet } from "@/lib/types";

export async function createWorkout(sessionType: "A" | "B") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const today = new Date().toISOString().split("T")[0];

  // Check if workout already exists for today
  const { data: existing } = await supabase
    .from("lifting_workouts")
    .select("id")
    .eq("user_id", user.id)
    .eq("date", today)
    .maybeSingle();

  if (existing) {
    return { workoutId: existing.id, alreadyExists: true };
  }

  // Create the workout
  const { data: workout, error: workoutError } = await supabase
    .from("lifting_workouts")
    .insert({
      user_id: user.id,
      date: today,
      session_type: sessionType,
      completed: false,
      notes: null,
    })
    .select("id")
    .single();

  if (workoutError || !workout) {
    throw new Error(workoutError?.message ?? "Failed to create workout");
  }

  // Get template exercises
  const template = SESSION_TEMPLATES.find((t) => t.type === sessionType);
  if (!template) throw new Error("Invalid session type");

  // Look up exercise IDs by name
  const exerciseNames = template.exercises.map((e) => e.exerciseName);
  const { data: exercises } = await supabase
    .from("lifting_exercises")
    .select("id, name")
    .in("name", exerciseNames);

  if (!exercises || exercises.length === 0) {
    throw new Error("Exercises not found in database");
  }

  const exerciseMap = new Map(exercises.map((e) => [e.name, e.id]));

  // Get last weights for these exercises
  const lastWeights = await getLastWeights(
    user.id,
    exercises.map((e) => e.id)
  );

  // If no history, calculate recommended weights from profile + calibration
  const hasAnyHistory = Object.keys(lastWeights).length > 0;
  let recommendedWeights: Record<string, number> = {};

  if (!hasAnyHistory) {
    const [profileRes, calibrationRes] = await Promise.all([
      supabase
        .from("lifting_profiles")
        .select("current_weight, time_off_category")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("lifting_initial_calibration")
        .select("exercise_name, estimated_5rm")
        .eq("user_id", user.id),
    ]);

    const bodyWeight = profileRes.data?.current_weight ?? null;
    const timeOff = profileRes.data?.time_off_category;
    const calibration = calibrationRes.data ?? [];

    const timeOffFactors: Record<string, number> = {
      less_than_1_month: 0.9,
      "1_to_3_months": 0.8,
      "3_to_6_months": 0.7,
      "6_to_12_months": 0.6,
      over_a_year: 0.5,
    };
    const factor = timeOff ? (timeOffFactors[timeOff] ?? 0.7) : 0.7;

    const bodyWeightMultipliers: Record<string, number> = {
      Squat: 0.75,
      "Bench Press": 0.5,
      "Barbell Row": 0.4,
      "Overhead Press": 0.35,
      Deadlift: 1.0,
      "Incline Bench": 0.4,
      "Pull-ups": 0,
      "Lat Pulldown": 0.4,
      "Dumbbell Rows": 0.2,
    };

    for (const exercise of exercises) {
      const calEntry = calibration.find((c) => c.exercise_name === exercise.name);
      if (calEntry?.estimated_5rm) {
        recommendedWeights[exercise.id] = Math.round((calEntry.estimated_5rm * 0.8) / 5) * 5;
      } else if (bodyWeight && bodyWeightMultipliers[exercise.name] !== undefined) {
        const multiplier = bodyWeightMultipliers[exercise.name];
        if (multiplier > 0) {
          recommendedWeights[exercise.id] = Math.round((bodyWeight * multiplier * factor) / 5) * 5;
        }
      }
    }
  }

  // Create sets from template
  const setsToInsert = template.exercises.flatMap((templateExercise) => {
    const exerciseId = exerciseMap.get(templateExercise.exerciseName);
    if (!exerciseId) return [];

    const lastWeight = lastWeights[exerciseId] ?? recommendedWeights[exerciseId] ?? null;

    return Array.from({ length: templateExercise.sets }, (_, i) => ({
      workout_id: workout.id,
      exercise_id: exerciseId,
      set_number: i + 1,
      weight: lastWeight,
      reps: null,
      rpe: null,
      completed: false,
    }));
  });

  if (setsToInsert.length > 0) {
    const { error: setsError } = await supabase
      .from("lifting_sets")
      .insert(setsToInsert);

    if (setsError) {
      throw new Error(setsError.message);
    }
  }

  return { workoutId: workout.id, alreadyExists: false };
}

export async function updateSet(
  setId: string,
  data: {
    weight?: number | null;
    reps?: number | null;
    rpe?: number | null;
    completed?: boolean;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("lifting_sets")
    .update(data)
    .eq("id", setId);

  if (error) throw new Error(error.message);

  return { success: true };
}

export async function completeWorkout(workoutId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Mark workout as complete
  const { error } = await supabase
    .from("lifting_workouts")
    .update({ completed: true })
    .eq("id", workoutId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  // Fetch completed sets for summary
  const { data: sets } = await supabase
    .from("lifting_sets")
    .select("*, exercise:lifting_exercises(*)")
    .eq("workout_id", workoutId);

  if (!sets) return { summary: null };

  const completedSets = sets.filter((s) => s.completed);
  const totalVolume = completedSets.reduce((sum, s) => {
    return sum + (s.weight ?? 0) * (s.reps ?? 0);
  }, 0);

  const rpeSets = completedSets.filter((s) => s.rpe != null);
  const avgRpe =
    rpeSets.length > 0
      ? rpeSets.reduce((sum, s) => sum + (s.rpe ?? 0), 0) / rpeSets.length
      : null;

  // Check for PRs — compare against all previous sets for same exercises
  const exerciseIds = [...new Set(completedSets.map((s) => s.exercise_id))];
  const prs: string[] = [];

  for (const exerciseId of exerciseIds) {
    const currentMax = Math.max(
      ...completedSets
        .filter((s) => s.exercise_id === exerciseId && s.weight)
        .map((s) => s.weight ?? 0)
    );

    if (currentMax > 0) {
      const { data: previousBest } = await supabase
        .from("lifting_sets")
        .select("weight, exercise:lifting_exercises(name)")
        .eq("exercise_id", exerciseId)
        .eq("completed", true)
        .neq("workout_id", workoutId)
        .order("weight", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!previousBest || currentMax > (previousBest.weight ?? 0)) {
        const exerciseName =
          completedSets.find((s) => s.exercise_id === exerciseId)?.exercise
            ?.name ?? "Unknown";
        prs.push(`${exerciseName}: ${currentMax} lbs`);
      }
    }
  }

  // Update streak
  await updateStreak(user.id);

  // Calculate and store progression recommendations per exercise
  const weekStart = getWeekStart(new Date());
  for (const exerciseId of exerciseIds) {
    const exerciseSets = completedSets.filter((s) => s.exercise_id === exerciseId);
    const exerciseVolume = exerciseSets.reduce((sum, s) => sum + (s.weight ?? 0) * (s.reps ?? 0), 0);
    const exerciseAvgWeight = exerciseSets.length > 0
      ? exerciseSets.reduce((sum, s) => sum + (s.weight ?? 0), 0) / exerciseSets.length
      : 0;
    const exerciseAvgRpe = exerciseSets.filter((s) => s.rpe != null).length > 0
      ? exerciseSets.filter((s) => s.rpe != null).reduce((sum, s) => sum + (s.rpe ?? 0), 0) / exerciseSets.filter((s) => s.rpe != null).length
      : null;

    const exerciseName = exerciseSets[0]?.exercise?.name ?? "Unknown";
    const allRepsHit = exerciseSets.every((s) => (s.reps ?? 0) >= 5);
    const isUpperBody = ["Bench Press", "Overhead Press", "Incline Bench"].includes(exerciseName);
    const increment = isUpperBody ? 2.5 : 5;

    let recommendation = "Maintain current weight";
    if (allRepsHit && exerciseAvgRpe !== null && exerciseAvgRpe <= 8) {
      recommendation = `+${increment} lbs next session — RPE ${exerciseAvgRpe.toFixed(1)} means you've got room to grow`;
    } else if (allRepsHit && exerciseAvgRpe !== null && exerciseAvgRpe > 8 && exerciseAvgRpe <= 9) {
      recommendation = "Hold weight — solid effort, build capacity here before adding";
    } else if (!allRepsHit || (exerciseAvgRpe !== null && exerciseAvgRpe >= 10)) {
      recommendation = "Drop 10% and rebuild — no shame, this is how you get stronger";
    }

    await supabase.from("lifting_progressions").upsert(
      {
        user_id: user.id,
        exercise_id: exerciseId,
        week_start: weekStart,
        avg_weight: Math.round(exerciseAvgWeight),
        total_volume: exerciseVolume,
        avg_rpe: exerciseAvgRpe ? Math.round(exerciseAvgRpe * 10) / 10 : null,
        sets_completed: exerciseSets.length,
        ai_recommendation: recommendation,
      },
      { onConflict: "user_id,exercise_id,week_start" }
    );
  }

  return {
    summary: {
      totalVolume,
      setsCompleted: completedSets.length,
      totalSets: sets.length,
      avgRpe,
      prs,
    },
  };
}

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d.toISOString().split("T")[0];
}

export async function getLastWeights(
  userId: string,
  exerciseIds: string[]
): Promise<Record<string, number>> {
  const supabase = await createClient();
  const weights: Record<string, number> = {};

  for (const exerciseId of exerciseIds) {
    const { data } = await supabase
      .from("lifting_sets")
      .select("weight, workout:lifting_workouts!inner(user_id)")
      .eq("exercise_id", exerciseId)
      .eq("completed", true)
      .eq("workout.user_id", userId)
      .not("weight", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data?.weight) {
      weights[exerciseId] = data.weight;
    }
  }

  return weights;
}

export async function getTodayWorkout() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const today = new Date().toISOString().split("T")[0];

  const { data: workout } = await supabase
    .from("lifting_workouts")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", today)
    .maybeSingle();

  if (!workout) return null;

  const { data: sets } = await supabase
    .from("lifting_sets")
    .select("*, exercise:lifting_exercises(*)")
    .eq("workout_id", workout.id)
    .order("set_number", { ascending: true });

  return { workout, sets: sets ?? [] };
}

export async function getNextSessionType(): Promise<"A" | "B"> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return "A";

  const { data: lastWorkout } = await supabase
    .from("lifting_workouts")
    .select("session_type")
    .eq("user_id", user.id)
    .eq("completed", true)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!lastWorkout?.session_type) return "A";
  return lastWorkout.session_type === "A" ? "B" : "A";
}

export async function getWorkoutHistory() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data: workouts } = await supabase
    .from("lifting_workouts")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .limit(50);

  if (!workouts) return [];

  // Fetch sets for each workout
  const workoutIds = workouts.map((w) => w.id);
  const { data: allSets } = await supabase
    .from("lifting_sets")
    .select("*, exercise:lifting_exercises(*)")
    .in("workout_id", workoutIds)
    .order("set_number", { ascending: true });

  return workouts.map((workout) => ({
    ...workout,
    sets: (allSets ?? []).filter((s) => s.workout_id === workout.id),
  }));
}

async function updateStreak(userId: string) {
  const supabase = await createClient();

  const { data: streak } = await supabase
    .from("lifting_streaks")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!streak) return;

  const today = new Date().toISOString().split("T")[0];
  const lastDate = streak.last_workout_date;

  let newStreak = streak.current_streak;
  if (lastDate) {
    const last = new Date(lastDate);
    const now = new Date(today);
    const diffDays = Math.floor(
      (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays === 1 || diffDays === 2) {
      newStreak += 1;
    } else if (diffDays > 2) {
      newStreak = 1;
    }
  } else {
    newStreak = 1;
  }

  await supabase
    .from("lifting_streaks")
    .update({
      current_streak: newStreak,
      longest_streak: Math.max(newStreak, streak.longest_streak),
      last_workout_date: today,
      workouts_this_week: streak.workouts_this_week + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
}
