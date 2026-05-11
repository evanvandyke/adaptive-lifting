import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type { Profile, BodyWeightLog } from "@/lib/types";
import { ProgressChart, type DataPoint } from "../dashboard/components/ProgressChart";
import { SuccessBanner } from "./SuccessBanner";
import PeriodizationCard from "./components/PeriodizationCard";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; logged?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const eightWeeksAgo = new Date();
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
  const eightWeeksAgoStr = eightWeeksAgo.toISOString().split("T")[0];

  const [profileRes, bodyWeightRes, firstWorkoutRes] = await Promise.all([
    supabase
      .from("lifting_profiles")
      .select("*")
      .eq("id", user.id)
      .single(),
    supabase
      .from("lifting_body_weight_log")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", eightWeeksAgoStr)
      .order("date", { ascending: true }),
    supabase
      .from("lifting_workouts")
      .select("date")
      .eq("user_id", user.id)
      .eq("completed", true)
      .order("date", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  const profile = (profileRes.data as Profile | null) ?? null;
  const bodyWeightLog = (bodyWeightRes.data ?? []) as BodyWeightLog[];

  // Calculate weeks training from first workout
  let weeksTraining = 0;
  if (firstWorkoutRes.data?.date) {
    const firstDate = new Date(firstWorkoutRes.data.date);
    const now = new Date();
    const diffMs = now.getTime() - firstDate.getTime();
    weeksTraining = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7));
  }

  const bodyWeightData: DataPoint[] = bodyWeightLog.map((bw) => ({
    label: new Date(bw.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    value: bw.weight,
  }));

  async function updateProfile(formData: FormData) {
    "use server";

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const displayName = formData.get("display_name") as string;
    const currentWeight = formData.get("current_weight")
      ? parseFloat(formData.get("current_weight") as string)
      : null;
    const goal = formData.get("goal") as string | null;
    const activityLevel = formData.get("activity_level") as string | null;

    const { data: existing } = await supabase
      .from("lifting_profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("lifting_profiles")
        .update({
          display_name: displayName || null,
          current_weight: currentWeight,
          goal: goal || null,
          activity_level: activityLevel || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
    } else {
      await supabase
        .from("lifting_profiles")
        .insert({
          id: user.id,
          display_name: displayName || null,
          current_weight: currentWeight,
          goal: goal || null,
          activity_level: activityLevel || null,
        });
    }

    revalidatePath("/profile");
    revalidatePath("/dashboard");
    redirect("/profile?saved=true");
  }

  async function logWeight(formData: FormData) {
    "use server";

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const weight = parseFloat(formData.get("weight") as string);
    if (isNaN(weight) || weight <= 0) return;

    const today = new Date().toISOString().split("T")[0];

    // Upsert — one entry per day
    await supabase
      .from("lifting_body_weight_log")
      .upsert(
        {
          user_id: user.id,
          date: today,
          weight,
        },
        { onConflict: "user_id,date" }
      );

    // Also update profile current_weight
    await supabase
      .from("lifting_profiles")
      .update({ current_weight: weight, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    revalidatePath("/profile");
    revalidatePath("/dashboard");
    redirect("/profile?logged=true");
  }

  async function signOut() {
    "use server";

    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  const goalOptions = [
    { value: "", label: "Select a goal" },
    { value: "fat_loss", label: "Fat Loss" },
    { value: "strength", label: "Strength" },
    { value: "recomp", label: "Body Recomposition" },
  ];

  const activityOptions = [
    { value: "", label: "Select activity level" },
    { value: "sedentary", label: "Sedentary" },
    { value: "light", label: "Lightly Active" },
    { value: "moderate", label: "Moderately Active" },
    { value: "active", label: "Very Active" },
  ];

  return (
    <div className="flex-1 px-4 py-6 pb-24 max-w-lg mx-auto w-full space-y-5">
      {params.saved === "true" && (
        <SuccessBanner message="Profile saved successfully!" />
      )}
      {params.logged === "true" && (
        <SuccessBanner message="Weight logged successfully!" />
      )}

      <h1
        className="text-2xl font-bold"
        style={{ color: "var(--text-primary)" }}
      >
        Profile
      </h1>

      {/* Profile Form */}
      <form action={updateProfile} className="glass-card p-5 space-y-4">
        <h2
          className="text-sm font-medium uppercase tracking-wide"
          style={{ color: "var(--text-secondary)" }}
        >
          Your Info
        </h2>

        <div>
          <label
            htmlFor="display_name"
            className="block text-sm font-medium mb-1.5"
            style={{ color: "var(--text-secondary)" }}
          >
            Display Name
          </label>
          <input
            id="display_name"
            name="display_name"
            type="text"
            className="glass-input"
            defaultValue={profile?.display_name ?? ""}
            placeholder="Your name"
          />
        </div>

        <div>
          <label
            htmlFor="current_weight"
            className="block text-sm font-medium mb-1.5"
            style={{ color: "var(--text-secondary)" }}
          >
            Current Weight (lbs)
          </label>
          <input
            id="current_weight"
            name="current_weight"
            type="number"
            step="0.1"
            className="glass-input"
            defaultValue={profile?.current_weight ?? ""}
            placeholder="185"
          />
        </div>

        <div>
          <label
            htmlFor="goal"
            className="block text-sm font-medium mb-1.5"
            style={{ color: "var(--text-secondary)" }}
          >
            Goal
          </label>
          <select
            id="goal"
            name="goal"
            className="glass-input"
            defaultValue={profile?.goal ?? ""}
          >
            {goalOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="activity_level"
            className="block text-sm font-medium mb-1.5"
            style={{ color: "var(--text-secondary)" }}
          >
            Activity Level
          </label>
          <select
            id="activity_level"
            name="activity_level"
            className="glass-input"
            defaultValue={profile?.activity_level ?? ""}
          >
            {activityOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" className="btn-primary w-full">
          Save Changes
        </button>
      </form>

      {/* Log Weight */}
      <form action={logWeight} className="glass-card p-5 space-y-4">
        <h2
          className="text-sm font-medium uppercase tracking-wide"
          style={{ color: "var(--text-secondary)" }}
        >
          Log Today&apos;s Weight
        </h2>
        <div className="flex gap-3">
          <input
            name="weight"
            type="number"
            step="0.1"
            required
            className="glass-input flex-1"
            placeholder="185.0"
            defaultValue={profile?.current_weight ?? ""}
          />
          <button type="submit" className="btn-primary whitespace-nowrap">
            Log Weight
          </button>
        </div>
      </form>

      {/* Weight History Chart */}
      <ProgressChart
        data={bodyWeightData}
        title="Weight History"
        unit=" lbs"
        color="amber"
      />

      {/* Periodization Planner */}
      {firstWorkoutRes.data?.date && (
        <div className="space-y-2">
          <h2
            className="text-sm font-medium uppercase tracking-wide"
            style={{ color: "var(--text-secondary)" }}
          >
            Training Phase
          </h2>
          <PeriodizationCard weeksTraining={weeksTraining} />
        </div>
      )}

      {/* Account */}
      <section className="glass-card p-5 space-y-4">
        <h2
          className="text-sm font-medium uppercase tracking-wide"
          style={{ color: "var(--text-secondary)" }}
        >
          Account
        </h2>
        <div className="flex items-center justify-between">
          <div>
            <p
              className="text-sm"
              style={{ color: "var(--text-primary)" }}
            >
              {user.email}
            </p>
            <p
              className="text-xs mt-0.5"
              style={{ color: "var(--text-tertiary)" }}
            >
              Member since{" "}
              {new Date(user.created_at).toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
        <form action={signOut}>
          <button type="submit" className="btn-ghost w-full" style={{ color: "var(--error)" }}>
            Sign Out
          </button>
        </form>
      </section>
    </div>
  );
}
