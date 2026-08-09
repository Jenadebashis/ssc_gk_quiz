import { supabase } from "./supabase";

export async function incrementWrongCount({
  userId,
  questionId,
}) {
  const { data: existing, error: fetchError } =
    await supabase
      .from("question_progress")
      .select("id, wrong_count")
      .eq("user_id", userId)
      .eq("question_id", questionId)
      .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  if (!existing) {
    const { error } = await supabase
      .from("question_progress")
      .insert({
        user_id: userId,
        question_id: questionId,
        wrong_count: 1,
      });

    if (error) {
      throw error;
    }

    return 1;
  }

  const newCount = existing.wrong_count + 1;

  const { error } = await supabase
    .from("question_progress")
    .update({
      wrong_count: newCount,
      updated_at: new Date(),
    })
    .eq("id", existing.id);

  if (error) {
    throw error;
  }

  return newCount;
}