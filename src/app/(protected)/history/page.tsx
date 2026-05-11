import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getWorkoutHistory } from "../workout/actions";
import HistoryClient from "./HistoryClient";

export default async function HistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const workouts = await getWorkoutHistory();

  return <HistoryClient workouts={workouts} />;
}
