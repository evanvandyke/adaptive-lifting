"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

type Goal = "fat_loss" | "strength" | "recomp";
type ActivityLevel = "sedentary" | "light" | "moderate" | "active";
type TimeOffCategory =
  | "less_than_1_month"
  | "1_to_3_months"
  | "3_to_6_months"
  | "6_to_12_months"
  | "over_a_year";

const GOALS: { value: Goal; label: string; description: string }[] = [
  {
    value: "fat_loss",
    label: "Fat Loss",
    description: "Lean out while keeping strength",
  },
  {
    value: "strength",
    label: "Strength",
    description: "Get stronger, plain and simple",
  },
  {
    value: "recomp",
    label: "Recomposition",
    description: "Build muscle and lose fat simultaneously",
  },
];

const ACTIVITY_LEVELS: {
  value: ActivityLevel;
  label: string;
  description: string;
}[] = [
  {
    value: "sedentary",
    label: "Sedentary",
    description: "Desk job, minimal movement",
  },
  {
    value: "light",
    label: "Lightly Active",
    description: "Some walking, light activity",
  },
  {
    value: "moderate",
    label: "Moderately Active",
    description: "Regular exercise or active job",
  },
  {
    value: "active",
    label: "Very Active",
    description: "Intense exercise + active lifestyle",
  },
];

const TIME_OFF_OPTIONS: {
  value: TimeOffCategory;
  label: string;
  description: string;
  factor: number;
}[] = [
  {
    value: "less_than_1_month",
    label: "Less than 1 month",
    description: "Just getting back into it",
    factor: 0.9,
  },
  {
    value: "1_to_3_months",
    label: "1–3 months",
    description: "Took a short break",
    factor: 0.8,
  },
  {
    value: "3_to_6_months",
    label: "3–6 months",
    description: "Been a while",
    factor: 0.7,
  },
  {
    value: "6_to_12_months",
    label: "6–12 months",
    description: "Significant time off",
    factor: 0.6,
  },
  {
    value: "over_a_year",
    label: "Over a year",
    description: "Starting fresh",
    factor: 0.5,
  },
];

const STARTING_LIFTS = [
  {
    key: "squat",
    label: "Squat",
    placeholder: "e.g. 185",
    multiplier: 0.75,
  },
  {
    key: "bench",
    label: "Bench Press",
    placeholder: "e.g. 135",
    multiplier: 0.5,
  },
  {
    key: "deadlift",
    label: "Deadlift",
    placeholder: "e.g. 225",
    multiplier: 1.0,
  },
  {
    key: "ohp",
    label: "Overhead Press",
    placeholder: "e.g. 95",
    multiplier: 0.35,
  },
];

function calculateBMI(weightLbs: number, heightInches: number): number {
  return (weightLbs / (heightInches * heightInches)) * 703;
}

function getBMICategory(bmi: number): {
  label: string;
  color: string;
} {
  if (bmi < 18.5) return { label: "Underweight", color: "var(--amber)" };
  if (bmi < 25) return { label: "Normal", color: "var(--success)" };
  if (bmi < 30) return { label: "Overweight", color: "var(--amber)" };
  return { label: "Obese", color: "var(--error)" };
}

function roundToNearest5(n: number): number {
  return Math.round(n / 5) * 5;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showRPEInfo, setShowRPEInfo] = useState(false);

  // Form state
  const [displayName, setDisplayName] = useState("");
  const [currentWeight, setCurrentWeight] = useState("");
  const [age, setAge] = useState("");
  const [heightFeet, setHeightFeet] = useState("");
  const [heightInches, setHeightInches] = useState("");
  const [goal, setGoal] = useState<Goal | null>(null);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(
    null
  );
  const [timeOff, setTimeOff] = useState<TimeOffCategory | null>(null);
  const [lifts, setLifts] = useState<Record<string, string>>({
    squat: "",
    bench: "",
    deadlift: "",
    ohp: "",
  });

  const totalSteps = 3;

  // Derived values
  const totalHeightInches =
    heightFeet && heightInches
      ? parseInt(heightFeet) * 12 + parseInt(heightInches)
      : heightFeet
        ? parseInt(heightFeet) * 12
        : null;

  const bmi =
    currentWeight && totalHeightInches
      ? calculateBMI(parseFloat(currentWeight), totalHeightInches)
      : null;

  const bmiCategory = bmi ? getBMICategory(bmi) : null;

  const timeOffFactor =
    TIME_OFF_OPTIONS.find((t) => t.value === timeOff)?.factor ?? 0.7;

  // Pre-fill starting weights when entering Step 2
  useEffect(() => {
    if (step === 2 && currentWeight) {
      const weight = parseFloat(currentWeight);
      if (weight > 0) {
        const hasAnyLift = Object.values(lifts).some((v) => v !== "");
        if (!hasAnyLift) {
          const prefilled: Record<string, string> = {};
          for (const lift of STARTING_LIFTS) {
            const estimated = roundToNearest5(
              weight * lift.multiplier * timeOffFactor
            );
            prefilled[lift.key] = String(estimated);
          }
          setLifts(prefilled);
        }
      }
    }
    // Only run when step changes to 2
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  function canAdvance(): boolean {
    if (step === 0) return displayName.trim().length > 0;
    if (step === 1)
      return goal !== null && activityLevel !== null && timeOff !== null;
    if (step === 2) return true; // Lifts are optional
    return false;
  }

  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("You must be signed in to complete onboarding.");
        setSubmitting(false);
        return;
      }

      // Insert profile
      const { error: profileError } = await supabase
        .from("lifting_profiles")
        .upsert({
          id: user.id,
          display_name: displayName.trim(),
          current_weight: currentWeight ? parseFloat(currentWeight) : null,
          age: age ? parseInt(age) : null,
          height_inches: totalHeightInches ?? null,
          goal,
          activity_level: activityLevel,
          time_off_category: timeOff,
        });

      if (profileError) {
        setError(profileError.message);
        setSubmitting(false);
        return;
      }

      // Insert starting calibration weights if any were provided
      const calibrationEntries = STARTING_LIFTS.filter(
        (lift) => lifts[lift.key] && parseFloat(lifts[lift.key]) > 0
      ).map((lift) => ({
        user_id: user.id,
        exercise_name: lift.label,
        estimated_5rm: parseFloat(lifts[lift.key]),
      }));

      if (calibrationEntries.length > 0) {
        await supabase
          .from("lifting_initial_calibration")
          .upsert(calibrationEntries, {
            onConflict: "user_id,exercise_name",
          });
      }

      // Initialize streak tracking
      await supabase.from("lifting_streaks").upsert(
        {
          user_id: user.id,
          current_streak: 0,
          longest_streak: 0,
          weekly_target: 3,
          workouts_this_week: 0,
          week_start: new Date().toISOString().split("T")[0],
        },
        { onConflict: "user_id" }
      );

      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            {step === 0 && "Let’s get to know you"}
            {step === 1 && "What’s your goal?"}
            {step === 2 && "Where are you starting?"}
          </h1>
          <p
            className="mt-2 text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            {step === 0 &&
              "Just a few things so we can calibrate your program."}
            {step === 1 && "This shapes how the app adjusts your training."}
            {step === 2 &&
              "We’ve estimated starting weights based on your info. Adjust as needed."}
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === step ? 32 : 12,
                background:
                  i <= step ? "var(--teal)" : "rgba(255, 255, 255, 0.12)",
              }}
            />
          ))}
        </div>

        {/* Error */}
        {error && (
          <div
            className="mb-6 px-4 py-3 rounded-md text-sm"
            style={{
              background: "rgba(248, 113, 113, 0.1)",
              border: "1px solid rgba(248, 113, 113, 0.3)",
              color: "var(--error)",
            }}
          >
            {error}
          </div>
        )}

        {/* Step 0: Basic Info */}
        {step === 0 && (
          <div className="glass-card p-8 space-y-5">
            <div>
              <label
                htmlFor="displayName"
                className="block text-sm font-medium mb-1.5"
                style={{ color: "var(--text-secondary)" }}
              >
                What should we call you?
              </label>
              <input
                id="displayName"
                type="text"
                className="glass-input"
                placeholder="Your name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoFocus
              />
            </div>

            <div>
              <label
                htmlFor="age"
                className="block text-sm font-medium mb-1.5"
                style={{ color: "var(--text-secondary)" }}
              >
                Age{" "}
                <span style={{ color: "var(--text-tertiary)" }}>
                  (years, optional)
                </span>
              </label>
              <input
                id="age"
                type="number"
                className="glass-input"
                placeholder="e.g. 28"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                min={13}
                max={120}
              />
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: "var(--text-secondary)" }}
              >
                Height{" "}
                <span style={{ color: "var(--text-tertiary)" }}>(optional)</span>
              </label>
              <div className="flex gap-3">
                <div className="flex-1">
                  <input
                    id="heightFeet"
                    type="number"
                    className="glass-input"
                    placeholder="ft"
                    value={heightFeet}
                    onChange={(e) => setHeightFeet(e.target.value)}
                    min={3}
                    max={8}
                  />
                </div>
                <div className="flex-1">
                  <input
                    id="heightInches"
                    type="number"
                    className="glass-input"
                    placeholder="in"
                    value={heightInches}
                    onChange={(e) => setHeightInches(e.target.value)}
                    min={0}
                    max={11}
                  />
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="currentWeight"
                className="block text-sm font-medium mb-1.5"
                style={{ color: "var(--text-secondary)" }}
              >
                Current body weight{" "}
                <span style={{ color: "var(--text-tertiary)" }}>
                  (lbs, optional)
                </span>
              </label>
              <input
                id="currentWeight"
                type="number"
                className="glass-input"
                placeholder="e.g. 180"
                value={currentWeight}
                onChange={(e) => setCurrentWeight(e.target.value)}
                min={0}
                step={0.1}
              />
            </div>
          </div>
        )}

        {/* Step 1: Goal + Activity + Time Off */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="glass-card p-6">
              <h3
                className="text-sm font-medium mb-4"
                style={{ color: "var(--text-secondary)" }}
              >
                Primary Goal
              </h3>
              <div className="space-y-2">
                {GOALS.map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setGoal(g.value)}
                    className="w-full text-left px-4 py-3 rounded-lg transition-all duration-150"
                    style={{
                      background:
                        goal === g.value
                          ? "rgba(45, 212, 191, 0.12)"
                          : "rgba(255, 255, 255, 0.03)",
                      border:
                        goal === g.value
                          ? "1px solid var(--teal)"
                          : "1px solid transparent",
                    }}
                  >
                    <span
                      className="block text-sm font-medium"
                      style={{
                        color:
                          goal === g.value
                            ? "var(--teal)"
                            : "var(--text-primary)",
                      }}
                    >
                      {g.label}
                    </span>
                    <span
                      className="block text-xs mt-0.5"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {g.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="glass-card p-6">
              <h3
                className="text-sm font-medium mb-4"
                style={{ color: "var(--text-secondary)" }}
              >
                Activity Level
              </h3>
              <div className="space-y-2">
                {ACTIVITY_LEVELS.map((a) => (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => setActivityLevel(a.value)}
                    className="w-full text-left px-4 py-3 rounded-lg transition-all duration-150"
                    style={{
                      background:
                        activityLevel === a.value
                          ? "rgba(45, 212, 191, 0.12)"
                          : "rgba(255, 255, 255, 0.03)",
                      border:
                        activityLevel === a.value
                          ? "1px solid var(--teal)"
                          : "1px solid transparent",
                    }}
                  >
                    <span
                      className="block text-sm font-medium"
                      style={{
                        color:
                          activityLevel === a.value
                            ? "var(--teal)"
                            : "var(--text-primary)",
                      }}
                    >
                      {a.label}
                    </span>
                    <span
                      className="block text-xs mt-0.5"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {a.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="glass-card p-6">
              <h3
                className="text-sm font-medium mb-4"
                style={{ color: "var(--text-secondary)" }}
              >
                How long since you last worked out regularly?
              </h3>
              <div className="space-y-2">
                {TIME_OFF_OPTIONS.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTimeOff(t.value)}
                    className="w-full text-left px-4 py-3 rounded-lg transition-all duration-150"
                    style={{
                      background:
                        timeOff === t.value
                          ? "rgba(45, 212, 191, 0.12)"
                          : "rgba(255, 255, 255, 0.03)",
                      border:
                        timeOff === t.value
                          ? "1px solid var(--teal)"
                          : "1px solid transparent",
                    }}
                  >
                    <span
                      className="block text-sm font-medium"
                      style={{
                        color:
                          timeOff === t.value
                            ? "var(--teal)"
                            : "var(--text-primary)",
                      }}
                    >
                      {t.label}
                    </span>
                    <span
                      className="block text-xs mt-0.5"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {t.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Starting Weights + BMI + RPE */}
        {step === 2 && (
          <div className="space-y-6">
            {/* BMI Info */}
            {bmi !== null && bmiCategory !== null && (
              <div
                className="glass-card p-4 flex items-center justify-between"
                style={{
                  border: `1px solid ${bmiCategory.color}33`,
                }}
              >
                <div>
                  <span
                    className="text-sm font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    BMI:{" "}
                    <span style={{ color: "var(--teal)" }}>
                      {bmi.toFixed(1)}
                    </span>
                  </span>
                </div>
                <span
                  className="text-xs font-medium px-2.5 py-1 rounded-full"
                  style={{
                    background: `${bmiCategory.color}1A`,
                    color: bmiCategory.color,
                    border: `1px solid ${bmiCategory.color}33`,
                  }}
                >
                  {bmiCategory.label}
                </span>
              </div>
            )}

            <div className="glass-card p-8">
              <p
                className="text-xs mb-5"
                style={{ color: "var(--text-tertiary)" }}
              >
                These are conservative estimates based on your body weight and
                time off. Start light &mdash; you can always go up.
              </p>
              <div className="space-y-4">
                {STARTING_LIFTS.map((lift) => (
                  <div key={lift.key}>
                    <label
                      htmlFor={lift.key}
                      className="block text-sm font-medium mb-1.5"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {lift.label}{" "}
                      <span style={{ color: "var(--text-tertiary)" }}>
                        (lbs)
                      </span>
                    </label>
                    <input
                      id={lift.key}
                      type="number"
                      className="glass-input"
                      placeholder={lift.placeholder}
                      value={lifts[lift.key]}
                      onChange={(e) =>
                        setLifts((prev) => ({
                          ...prev,
                          [lift.key]: e.target.value,
                        }))
                      }
                      min={0}
                      step={5}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* RPE Info */}
            <div className="glass-card p-4">
              <button
                type="button"
                onClick={() => setShowRPEInfo(!showRPEInfo)}
                className="w-full flex items-center justify-between"
              >
                <span
                  className="text-sm font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  What is RPE?
                </span>
                <span
                  className="text-xs"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {showRPEInfo ? "▲" : "▼"}
                </span>
              </button>
              {showRPEInfo && (
                <div
                  className="mt-3 pt-3 space-y-2 text-xs"
                  style={{
                    color: "var(--text-tertiary)",
                    borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                  }}
                >
                  <p style={{ color: "var(--text-secondary)" }}>
                    RPE (Rate of Perceived Exertion) measures how hard a set
                    felt on a 1&ndash;10 scale:
                  </p>
                  <div className="space-y-1.5 pl-1">
                    <div className="flex gap-2">
                      <span
                        className="font-medium shrink-0"
                        style={{ color: "var(--success)" }}
                      >
                        6&ndash;7
                      </span>
                      <span>Could do 3&ndash;4 more reps</span>
                    </div>
                    <div className="flex gap-2">
                      <span
                        className="font-medium shrink-0"
                        style={{ color: "var(--teal)" }}
                      >
                        8
                      </span>
                      <span>Could do 2 more reps</span>
                    </div>
                    <div className="flex gap-2">
                      <span
                        className="font-medium shrink-0"
                        style={{ color: "var(--amber)" }}
                      >
                        9
                      </span>
                      <span>Could do 1 more rep</span>
                    </div>
                    <div className="flex gap-2">
                      <span
                        className="font-medium shrink-0"
                        style={{ color: "var(--error)" }}
                      >
                        10
                      </span>
                      <span>Maximum effort, couldn&apos;t do another rep</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          {step > 0 ? (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setStep((s) => s - 1)}
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {step < totalSteps - 1 ? (
            <button
              type="button"
              className="btn-primary"
              disabled={!canAdvance()}
              onClick={() => setStep((s) => s + 1)}
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary"
              disabled={submitting}
              onClick={handleSubmit}
            >
              {submitting ? "Setting up..." : "Let's Go"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
