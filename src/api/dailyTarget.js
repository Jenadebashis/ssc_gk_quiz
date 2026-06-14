import { supabase } from "./supabase";

export async function getDailyTarget(
  userId
) {
  const { data } = await supabase
    .from("daily_targets")
    .select("*")
    .eq("user_id", userId)
    .single();

  return data;
}

export async function saveDailyTarget(
  userId,
  target
) {
  return supabase
    .from("daily_targets")
    .upsert({
      user_id: userId,
      target_questions: target,
    });
}

export async function getTodayProgress(
  userId
) {
  const startOfDay = new Date();

  startOfDay.setHours(
    0,
    0,
    0,
    0
  );

  const { data } = await supabase
    .from("attempts")
    .select("total_questions")
    .eq("user_id", userId)
    .gte(
      "completed_at",
      startOfDay.toISOString()
    );

  return (
    data?.reduce(
      (sum, row) =>
        sum + row.total_questions,
      0
    ) || 0
  );
}