import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { SESSION_TEMPLATES } from "@/lib/types";
import type {
  Profile,
  Workout,
  WorkoutSet,
  Streak,
  BodyWeightLog,
  Progression,
} from "@/lib/types";
import { StreakRing } from "./components/StreakRing";
import { ProgressChart, type DataPoint } from "./components/ProgressChart";
import { InsightCard } from "./components/InsightCard";
import { NutritionCard } from "./components/NutritionCard";
import { BodyCompCard } from "./components/BodyCompCard";

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch all data in parallel
  const eightWeeksAgo = new Date();
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
  const eightWeeksAgoStr = eightWeeksAgo.toISOString().split("T")[0];

  const thisWeekStart = getWeekStart(new Date());

  const today = new Date().toISOString().split("T")[0];

  const twelveWeeksAgo = new Date();
  twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);
  const twelveWeeksAgoStr = twelveWeeksAgo.toISOString().split("T")[0];

  const [
    profileRes,
    streakRes,
    recentWorkoutsRes,
    bodyWeightRes,
    progressionsRes,
    thisWeekWorkoutsRes,
    nutritionTodayRes,
    bodyCompRes,
  ] = await Promise.all([
    supabase
      .from("lifting_profiles")
      .select("*")
      .eq("id", user.id)
      .single(),
    supabase
      .from("lifting_streaks")
      .select("*")
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("lifting_workouts")
      .select("*, lifting_sets(*, lifting_exercises(*))")
      .eq("user_id", user.id)
      .eq("completed", true)
      .gte("date", eightWeeksAgoStr)
      .order("date", { ascending: true }),
    supabase
      .from("lifting_body_weight_log")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", eightWeeksAgoStr)
      .order("date", { ascending: true }),
    supabase
      .from("lifting_progressions")
      .select("*, lifting_exercises(*)")
      .eq("user_id", user.id)
      .gte("week_start", eightWeeksAgoStr)
      .order("week_start", { ascending: true }),
    supabase
      .from("lifting_workouts")
      .select("*")
      .eq("user_id", user.id)
      .eq("completed", true)
      .gte("date", thisWeekStart),
    supabase
      .from("lifting_nutrition_log")
      .select("id, protein_grams, meal_type, meal_description")
      .eq("user_id", user.id)
      .eq("date", today)
      .order("created_at", { ascending: true }),
    supabase
      .from("lifting_body_composition")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", twelveWeeksAgoStr)
      .order("date", { ascending: true }),
  ]);

  const profile = (profileRes.data as Profile | null) ?? null;
  const streak = (streakRes.data as Streak | null) ?? null;
  const recentWorkouts = (recentWorkoutsRes.data ?? []) as (Workout & {
    lifting_sets: (WorkoutSet & {
      lifting_exercises: { id: string; name: string } | null;
    })[];
  })[];
  const bodyWeightLog = (bodyWeightRes.data ?? []) as BodyWeightLog[];
  const progressions = (progressionsRes.data ?? []) as (Progression & {
    lifting_exercises: { id: string; name: string } | null;
  })[];
  const thisWeekWorkouts = (thisWeekWorkoutsRes.data ?? []) as Workout[];
  const nutritionToday = (nutritionTodayRes.data ?? []) as {
    id: string;
    protein_grams: number;
    meal_type: string;
    meal_description: string | null;
  }[];
  const bodyCompHistory = (bodyCompRes.data ?? []) as {
    id: string;
    date: string;
    weight: number;
    waist_inches: number;
    neck_inches: number;
    estimated_bf_pct: number;
    lean_mass: number;
    fat_mass: number;
  }[];
  const proteinTarget = Math.round((profile?.current_weight ?? 200) * 0.8);

  const displayName = profile?.display_name ?? "there";
  const workoutsThisWeek = streak?.workouts_this_week ?? thisWeekWorkouts.length;
  const weeklyTarget = streak?.weekly_target ?? 3;
  const currentStreak = streak?.current_streak ?? 0;
  const isRestDay = workoutsThisWeek >= weeklyTarget;

  // Determine next session type
  const lastWorkout = recentWorkouts[recentWorkouts.length - 1];
  const nextSessionType: "A" | "B" =
    lastWorkout?.session_type === "A" ? "B" : "A";
  const nextTemplate = SESSION_TEMPLATES.find(
    (t) => t.type === nextSessionType
  )!;

  // Get recommended weights from the most recent sets for each exercise
  const recommendedWeights: Record<string, number | null> = {};
  for (const exercise of nextTemplate.exercises) {
    const matchingSets = recentWorkouts
      .flatMap((w) => w.lifting_sets)
      .filter(
        (s) =>
          s.lifting_exercises?.name === exercise.exerciseName && s.completed
      )
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    recommendedWeights[exercise.exerciseName] =
      matchingSets.length > 0 ? matchingSets[0].weight : null;
  }

  // If no workout history, calculate starting weights from profile + calibration
  const hasAnyWeights = Object.values(recommendedWeights).some((w) => w !== null);
  if (!hasAnyWeights && profile?.current_weight) {
    const { data: calibrationData } = await supabase
      .from("lifting_initial_calibration")
      .select("exercise_name, estimated_5rm")
      .eq("user_id", user.id);

    const calibration = calibrationData ?? [];

    const timeOffFactors: Record<string, number> = {
      less_than_1_month: 0.9,
      "1_to_3_months": 0.8,
      "3_to_6_months": 0.7,
      "6_to_12_months": 0.6,
      over_a_year: 0.5,
    };
    const factor = profile.time_off_category
      ? (timeOffFactors[profile.time_off_category] ?? 0.7)
      : 0.7;

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

    for (const exercise of nextTemplate.exercises) {
      if (recommendedWeights[exercise.exerciseName] !== null) continue;

      const calEntry = calibration.find(
        (c) => c.exercise_name === exercise.exerciseName
      );
      if (calEntry?.estimated_5rm) {
        recommendedWeights[exercise.exerciseName] =
          Math.round((calEntry.estimated_5rm * 0.8) / 5) * 5;
      } else {
        const multiplier = bodyWeightMultipliers[exercise.exerciseName];
        if (multiplier !== undefined && multiplier > 0) {
          recommendedWeights[exercise.exerciseName] =
            Math.round((profile.current_weight * multiplier * factor) / 5) * 5;
        }
      }
    }
  }

  // Build strength chart data — group by week, pick main compounds
  const compoundNames = [
    "Squat",
    "Bench Press",
    "Deadlift",
    "Overhead Press",
  ];
  const strengthData: Record<string, DataPoint[]> = {};
  for (const name of compoundNames) {
    const exerciseProgressions = progressions.filter(
      (p) => p.lifting_exercises?.name === name
    );
    if (exerciseProgressions.length > 0) {
      strengthData[name] = exerciseProgressions.map((p) => ({
        label: new Date(p.week_start).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        value: p.avg_weight ?? 0,
      }));
    }
  }

  // Body weight chart data
  const bodyWeightData: DataPoint[] = bodyWeightLog.map((bw) => ({
    label: new Date(bw.date + "T12:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    value: bw.weight,
  }));

  // Volume trend — weekly total tonnage
  const weeklyVolume: Record<string, number> = {};
  for (const workout of recentWorkouts) {
    const weekKey = getWeekStart(new Date(workout.date + "T12:00:00"));
    const volume = workout.lifting_sets
      .filter((s) => s.completed && s.weight && s.reps)
      .reduce((sum, s) => sum + (s.weight ?? 0) * (s.reps ?? 0), 0);
    weeklyVolume[weekKey] = (weeklyVolume[weekKey] ?? 0) + volume;
  }
  const volumeData: DataPoint[] = Object.entries(weeklyVolume)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, vol]) => ({
      label: new Date(week).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      value: Math.round(vol),
    }));

  // Latest AI recommendation
  const latestRecommendation =
    progressions
      .filter((p) => p.ai_recommendation)
      .sort(
        (a, b) =>
          new Date(b.week_start).getTime() - new Date(a.week_start).getTime()
      )[0]?.ai_recommendation ?? null;

  // Recent PRs — find max weight per exercise, then check if the latest
  // occurrence is from the last 2 weeks
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const twoWeeksAgoStr = twoWeeksAgo.toISOString().split("T")[0];

  interface PR {
    exerciseName: string;
    weight: number;
    date: string;
  }

  const prMap: Record<string, { weight: number; date: string }> = {};
  for (const workout of recentWorkouts) {
    for (const set of workout.lifting_sets) {
      if (!set.completed || !set.weight || !set.lifting_exercises) continue;
      const name = set.lifting_exercises.name;
      if (!prMap[name] || set.weight > prMap[name].weight) {
        prMap[name] = { weight: set.weight, date: workout.date };
      }
    }
  }
  const recentPRs: PR[] = Object.entries(prMap)
    .filter(([, pr]) => pr.date >= twoWeeksAgoStr)
    .map(([name, pr]) => ({
      exerciseName: name,
      weight: pr.weight,
      date: pr.date,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="flex-1 px-4 py-6 pb-24 max-w-lg mx-auto w-full space-y-5">
      {/* Greeting */}
      <section>
        <h1
          className="text-2xl font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          What&apos;s up, {displayName}
        </h1>
        <p
          className="text-sm mt-1"
          style={{ color: "var(--text-tertiary)" }}
        >
          {formatDate(new Date())}
        </p>
      </section>

      {/* Today's Workout */}
      <section className="glass-card p-5">
        {isRestDay ? (
          <>
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: "var(--success)" }}
              />
              <h2
                className="text-sm font-medium uppercase tracking-wide"
                style={{ color: "var(--text-secondary)" }}
              >
                Rest Day
              </h2>
            </div>
            <p
              className="text-sm leading-relaxed"
              style={{ color: "var(--text-tertiary)" }}
            >
              You&apos;ve hit your {weeklyTarget} sessions this week. Recovery is
              where the gains happen.
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2
                  className="text-sm font-medium uppercase tracking-wide"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Next Up
                </h2>
                <p
                  className="text-lg font-semibold mt-0.5"
                  style={{ color: "var(--text-primary)" }}
                >
                  {nextTemplate.name}
                </p>
              </div>
              <span
                className="text-xs font-mono px-2.5 py-1 rounded-full"
                style={{
                  background: "rgba(45, 212, 191, 0.12)",
                  color: "var(--teal)",
                  border: "1px solid rgba(45, 212, 191, 0.2)",
                }}
              >
                {nextSessionType}
              </span>
            </div>
            <ul className="space-y-2.5 mb-5">
              {nextTemplate.exercises.map((ex) => (
                <li
                  key={ex.exerciseName}
                  className="flex items-center justify-between text-sm"
                >
                  <span style={{ color: "var(--text-primary)" }}>
                    {ex.exerciseName}
                  </span>
                  <span
                    className="font-mono text-xs"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {recommendedWeights[ex.exerciseName]
                      ? `${recommendedWeights[ex.exerciseName]} lbs`
                      : "—"}{" "}
                    · {ex.sets}×{ex.targetReps}
                  </span>
                </li>
              ))}
            </ul>
            <Link href="/workout" className="btn-primary block text-center w-full">
              Start Workout
            </Link>
          </>
        )}
      </section>

      {/* Streak */}
      <section className="glass-card p-5 flex items-center justify-center">
        <StreakRing
          current={workoutsThisWeek}
          target={weeklyTarget}
          streak={currentStreak}
        />
      </section>

      {/* Nutrition */}
      <NutritionCard
        todayEntries={nutritionToday}
        proteinTarget={proteinTarget}
      />

      {/* Body Composition */}
      <BodyCompCard
        history={bodyCompHistory}
        hasHeight={!!profile?.height_inches}
      />

      {/* Progress Charts */}
      {Object.keys(strengthData).length > 0 && (
        <section className="space-y-4">
          <h2
            className="text-sm font-medium uppercase tracking-wide px-1"
            style={{ color: "var(--text-secondary)" }}
          >
            Strength Trends
          </h2>
          {Object.entries(strengthData).map(([name, data]) => (
            <ProgressChart
              key={name}
              data={data}
              title={name}
              unit=" lbs"
              color="teal"
            />
          ))}
        </section>
      )}

      {bodyWeightData.length > 0 && (
        <ProgressChart
          data={bodyWeightData}
          title="Body Weight"
          unit=" lbs"
          color="amber"
        />
      )}

      {volumeData.length > 0 && (
        <ProgressChart
          data={volumeData}
          title="Weekly Volume"
          unit=" lbs"
          color="teal"
        />
      )}

      {/* AI Insights */}
      <InsightCard recommendation={latestRecommendation} />

      {/* Recent PRs */}
      {recentPRs.length > 0 && (
        <section className="glass-card p-5">
          <h2
            className="text-sm font-medium uppercase tracking-wide mb-3"
            style={{ color: "var(--text-secondary)" }}
          >
            Recent PRs 🏆
          </h2>
          <ul className="space-y-3">
            {recentPRs.map((pr) => (
              <li
                key={pr.exerciseName}
                className="flex items-center justify-between"
              >
                <div>
                  <p
                    className="text-sm font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {pr.exerciseName}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {new Date(pr.date + "T12:00:00").toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <span
                  className="text-sm font-mono font-semibold px-3 py-1 rounded-full"
                  style={{
                    color: "var(--teal)",
                    background: "rgba(45, 212, 191, 0.1)",
                    boxShadow: "0 0 12px rgba(45, 212, 191, 0.15)",
                  }}
                >
                  {pr.weight} lbs
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
