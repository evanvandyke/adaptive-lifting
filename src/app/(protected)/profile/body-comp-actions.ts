"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Navy Method body fat estimation (male formula):
 * BF% = 86.010 × log10(waist - neck) - 70.041 × log10(height) + 36.76
 */
function calculateNavyBF(
  waistInches: number,
  neckInches: number,
  heightInches: number
): number {
  const bf =
    86.01 * Math.log10(waistInches - neckInches) -
    70.041 * Math.log10(heightInches) +
    36.76;
  return Math.round(bf * 10) / 10;
}

export async function logBodyComposition(
  weight: number,
  waistInches: number,
  neckInches: number
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Get height from profile
  const { data: profile } = await supabase
    .from("lifting_profiles")
    .select("height_inches")
    .eq("id", user.id)
    .single();

  if (!profile?.height_inches) {
    throw new Error("Height not set in profile. Please update your profile first.");
  }

  if (waistInches <= neckInches) {
    throw new Error("Waist measurement must be greater than neck measurement.");
  }

  const estimatedBfPct = calculateNavyBF(
    waistInches,
    neckInches,
    profile.height_inches
  );
  const fatMass = Math.round((weight * estimatedBfPct) / 100 * 10) / 10;
  const leanMass = Math.round((weight - fatMass) * 10) / 10;

  const { error } = await supabase.from("lifting_body_composition").upsert(
    {
      user_id: user.id,
      date: new Date().toISOString().split("T")[0],
      weight,
      waist_inches: waistInches,
      neck_inches: neckInches,
      estimated_bf_pct: estimatedBfPct,
      lean_mass: leanMass,
      fat_mass: fatMass,
    },
    { onConflict: "user_id,date" }
  );

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/profile");
}

export async function getBodyCompHistory() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const twelveWeeksAgo = new Date();
  twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);
  const startDate = twelveWeeksAgo.toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("lifting_body_composition")
    .select("*")
    .eq("user_id", user.id)
    .gte("date", startDate)
    .order("date", { ascending: true });

  if (error) throw new Error(error.message);

  return data ?? [];
}
