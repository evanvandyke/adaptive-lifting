import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getTodayWorkout, getNextSessionType } from "./actions";
import WorkoutClient from "./WorkoutClient";

export default async function WorkoutPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const todayData = await getTodayWorkout();
  const nextSessionType = await getNextSessionType();

  // Get session template info for mapping exercise names to template data
  const { SESSION_TEMPLATES } = await import("@/lib/types");

  // If there's an existing workout, enrich with template data
  let templateInfo: Record<
    string,
    { targetReps: string; isHeavy: boolean }
  > = {};

  if (todayData?.workout.session_type) {
    const template = SESSION_TEMPLATES.find(
      (t) => t.type === todayData.workout.session_type
    );
    if (template) {
      template.exercises.forEach((ex) => {
        templateInfo[ex.exerciseName] = {
          targetReps: ex.targetReps,
          isHeavy: ex.isHeavy,
        };
      });
    }
  }

  // Also build template info for the next session type (for starting new workouts)
  const nextTemplate = SESSION_TEMPLATES.find(
    (t) => t.type === nextSessionType
  );
  if (nextTemplate) {
    nextTemplate.exercises.forEach((ex) => {
      if (!templateInfo[ex.exerciseName]) {
        templateInfo[ex.exerciseName] = {
          targetReps: ex.targetReps,
          isHeavy: ex.isHeavy,
        };
      }
    });
  }

  return (
    <WorkoutClient
      initialWorkout={todayData?.workout ?? null}
      initialSets={todayData?.sets ?? []}
      nextSessionType={nextSessionType}
      templateInfo={templateInfo}
    />
  );
}
