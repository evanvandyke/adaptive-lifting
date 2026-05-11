import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import type { Profile } from "@/lib/types";
import { NutritionPageClient } from "./NutritionPageClient";

export default async function NutritionPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const today = new Date().toISOString().split("T")[0];
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const startDate = sevenDaysAgo.toISOString().split("T")[0];

  const [profileRes, todayRes, weekRes] = await Promise.all([
    supabase.from("lifting_profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("lifting_nutrition_log")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", today)
      .order("created_at", { ascending: true }),
    supabase
      .from("lifting_nutrition_log")
      .select("date, protein_grams")
      .eq("user_id", user.id)
      .gte("date", startDate)
      .order("date", { ascending: true }),
  ]);

  const profile = profileRes.data as Profile | null;
  const proteinTarget = Math.round((profile?.current_weight ?? 200) * 0.8);
  const todayEntries = todayRes.data ?? [];

  // Build weekly data
  const dailyTotals: Record<string, number> = {};
  for (const entry of weekRes.data ?? []) {
    dailyTotals[entry.date] =
      (dailyTotals[entry.date] ?? 0) + (entry.protein_grams ?? 0);
  }

  // Fill in all 7 days
  const weeklyData: { date: string; label: string; total: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    weeklyData.push({
      date: dateStr,
      label: d.toLocaleDateString("en-US", { weekday: "short" }),
      total: dailyTotals[dateStr] ?? 0,
    });
  }

  const daysWithData = weeklyData.filter((d) => d.total > 0).length;
  const weeklyAvg =
    daysWithData > 0
      ? Math.round(
          weeklyData.reduce((s, d) => s + d.total, 0) / daysWithData
        )
      : 0;

  return (
    <NutritionPageClient
      todayEntries={todayEntries}
      proteinTarget={proteinTarget}
      weeklyData={weeklyData}
      weeklyAvg={weeklyAvg}
    />
  );
}
