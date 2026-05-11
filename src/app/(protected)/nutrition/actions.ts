"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function logProtein(
  grams: number,
  mealType?: string,
  description?: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Use a timestamped meal_type to allow multiple entries
  const type = mealType || `entry_${Date.now()}`;

  const { error } = await supabase.from("lifting_nutrition_log").upsert(
    {
      user_id: user.id,
      date: new Date().toISOString().split("T")[0],
      protein_grams: grams,
      meal_type: type,
      meal_description: description || null,
    },
    { onConflict: "user_id,date,meal_type" }
  );

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/nutrition");
}

export async function deleteProteinEntry(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("lifting_nutrition_log")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/nutrition");
}

export async function getTodayNutrition() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("lifting_nutrition_log")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", today)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  return data ?? [];
}

export async function getWeeklyProtein() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const startDate = sevenDaysAgo.toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("lifting_nutrition_log")
    .select("date, protein_grams")
    .eq("user_id", user.id)
    .gte("date", startDate)
    .order("date", { ascending: true });

  if (error) throw new Error(error.message);

  // Group by date and sum protein
  const dailyTotals: Record<string, number> = {};
  for (const entry of data ?? []) {
    dailyTotals[entry.date] =
      (dailyTotals[entry.date] ?? 0) + (entry.protein_grams ?? 0);
  }

  const days = Object.entries(dailyTotals);
  const total = days.reduce((sum, [, g]) => sum + g, 0);
  const daysWithData = days.length;

  return {
    dailyTotals,
    average: daysWithData > 0 ? Math.round(total / daysWithData) : 0,
    daysTracked: daysWithData,
  };
}
