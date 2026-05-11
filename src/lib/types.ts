export interface Profile {
  id: string;
  display_name: string | null;
  current_weight: number | null;
  goal: "fat_loss" | "strength" | "recomp" | null;
  activity_level: "sedentary" | "light" | "moderate" | "active" | null;
  age: number | null;
  height_inches: number | null;
  time_off_category: string | null;
  created_at: string;
  updated_at: string;
}

export interface Exercise {
  id: string;
  name: string;
  category: "compound" | "accessory";
  muscle_group: string;
  is_default: boolean;
  user_id: string | null;
  created_at: string;
}

export interface Workout {
  id: string;
  user_id: string;
  date: string;
  session_type: "A" | "B" | null;
  notes: string | null;
  completed: boolean;
  ai_recommendation: string | null;
  created_at: string;
}

export interface WorkoutSet {
  id: string;
  workout_id: string;
  exercise_id: string;
  set_number: number;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  completed: boolean;
  created_at: string;
  exercise?: Exercise;
}

export interface BodyWeightLog {
  id: string;
  user_id: string;
  date: string;
  weight: number;
  created_at: string;
}

export interface Progression {
  id: string;
  user_id: string;
  exercise_id: string;
  week_start: string;
  avg_weight: number | null;
  total_volume: number | null;
  avg_rpe: number | null;
  sets_completed: number | null;
  ai_recommendation: string | null;
  created_at: string;
}

export interface Streak {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_workout_date: string | null;
  weekly_target: number;
  workouts_this_week: number;
  week_start: string | null;
  created_at: string;
  updated_at: string;
}

export type SessionTemplate = {
  name: string;
  type: "A" | "B";
  exercises: {
    exerciseName: string;
    sets: number;
    targetReps: string;
    isHeavy: boolean;
  }[];
};

export type AdvancedTemplate = {
  name: string;
  type: "UA" | "UB" | "LA" | "LB";
  exercises: {
    exerciseName: string;
    sets: number;
    targetReps: string;
    isHeavy: boolean;
  }[];
};

export const SESSION_TEMPLATES: SessionTemplate[] = [
  {
    name: "Session A",
    type: "A",
    exercises: [
      { exerciseName: "Squat", sets: 3, targetReps: "5", isHeavy: true },
      { exerciseName: "Bench Press", sets: 3, targetReps: "5", isHeavy: true },
      { exerciseName: "Barbell Row", sets: 3, targetReps: "8", isHeavy: false },
      { exerciseName: "Overhead Press", sets: 3, targetReps: "8", isHeavy: false },
      { exerciseName: "Plank", sets: 3, targetReps: "30-60s", isHeavy: false },
    ],
  },
  {
    name: "Session B",
    type: "B",
    exercises: [
      { exerciseName: "Deadlift", sets: 3, targetReps: "5", isHeavy: true },
      { exerciseName: "Incline Bench", sets: 3, targetReps: "8", isHeavy: false },
      { exerciseName: "Pull-ups", sets: 3, targetReps: "8-10", isHeavy: false },
      { exerciseName: "Dumbbell Rows", sets: 3, targetReps: "10", isHeavy: false },
      { exerciseName: "Hanging Leg Raises", sets: 3, targetReps: "10-15", isHeavy: false },
    ],
  },
];

export const ADVANCED_TEMPLATES: AdvancedTemplate[] = [
  {
    name: "Upper A",
    type: "UA",
    exercises: [
      { exerciseName: "Bench Press", sets: 4, targetReps: "5", isHeavy: true },
      { exerciseName: "Barbell Row", sets: 4, targetReps: "8", isHeavy: false },
      { exerciseName: "Overhead Press", sets: 3, targetReps: "8", isHeavy: false },
      { exerciseName: "Face Pulls", sets: 3, targetReps: "15", isHeavy: false },
      { exerciseName: "Bicep Curls", sets: 3, targetReps: "12", isHeavy: false },
    ],
  },
  {
    name: "Upper B",
    type: "UB",
    exercises: [
      { exerciseName: "Overhead Press", sets: 4, targetReps: "5", isHeavy: true },
      { exerciseName: "Pull-ups", sets: 4, targetReps: "8", isHeavy: false },
      { exerciseName: "Incline Bench", sets: 3, targetReps: "10", isHeavy: false },
      { exerciseName: "Dumbbell Rows", sets: 3, targetReps: "10", isHeavy: false },
      { exerciseName: "Tricep Pushdowns", sets: 3, targetReps: "12", isHeavy: false },
    ],
  },
  {
    name: "Lower A",
    type: "LA",
    exercises: [
      { exerciseName: "Squat", sets: 4, targetReps: "5", isHeavy: true },
      { exerciseName: "Romanian Deadlift", sets: 3, targetReps: "8", isHeavy: false },
      { exerciseName: "Leg Press", sets: 3, targetReps: "10", isHeavy: false },
      { exerciseName: "Leg Curls", sets: 3, targetReps: "12", isHeavy: false },
      { exerciseName: "Hanging Leg Raises", sets: 3, targetReps: "12", isHeavy: false },
    ],
  },
  {
    name: "Lower B",
    type: "LB",
    exercises: [
      { exerciseName: "Deadlift", sets: 4, targetReps: "5", isHeavy: true },
      { exerciseName: "Front Squat", sets: 3, targetReps: "8", isHeavy: false },
      { exerciseName: "Walking Lunges", sets: 3, targetReps: "10/leg", isHeavy: false },
      { exerciseName: "Calf Raises", sets: 4, targetReps: "15", isHeavy: false },
      { exerciseName: "Plank", sets: 3, targetReps: "45-60s", isHeavy: false },
    ],
  },
];
