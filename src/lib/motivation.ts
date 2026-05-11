import type { Streak, Workout } from "./types";

export interface MotivationMessage {
  type: "streak" | "pr" | "accountability" | "milestone";
  title: string;
  message: string;
  urgency: "low" | "medium" | "high";
}

export function getMotivationMessages(
  streak: Streak | null,
  recentWorkouts: Workout[],
  prs: string[]
): MotivationMessage[] {
  const messages: MotivationMessage[] = [];

  if (!streak) return messages;

  if (streak.workouts_this_week >= streak.weekly_target) {
    messages.push({
      type: "streak",
      title: "Weekly Target Hit! 🔥",
      message: `${streak.workouts_this_week}/${streak.weekly_target} sessions this week. You're on fire.`,
      urgency: "low",
    });
  } else if (streak.workouts_this_week === streak.weekly_target - 1) {
    messages.push({
      type: "accountability",
      title: "One More This Week",
      message: "One session away from hitting your weekly target. Don't leave it on the table.",
      urgency: "medium",
    });
  }

  if (streak.current_streak >= 4 && streak.current_streak % 4 === 0) {
    messages.push({
      type: "milestone",
      title: `${streak.current_streak} Sessions Strong 💪`,
      message: "Consistency is the strategy. You're proving it.",
      urgency: "low",
    });
  }

  const daysSinceLastWorkout = streak.last_workout_date
    ? Math.floor(
        (Date.now() - new Date(streak.last_workout_date).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  if (daysSinceLastWorkout !== null && daysSinceLastWorkout >= 3) {
    messages.push({
      type: "accountability",
      title: "Missing You",
      message:
        daysSinceLastWorkout >= 5
          ? "It's been 5+ days. The hardest part is showing up. Just go."
          : "It's been a few days. What's blocking you?",
      urgency: "high",
    });
  }

  for (const pr of prs) {
    messages.push({
      type: "pr",
      title: "New PR! 🏆",
      message: pr,
      urgency: "low",
    });
  }

  return messages;
}
