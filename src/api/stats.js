import { supabase } from "./supabase";

export async function getUserStats(userId) {
  const { data: attempts } = await supabase
    .from("attempts")
    .select(`
      total_questions,
      correct_answers
    `)
    .eq("user_id", userId);

  const { data: answers } = await supabase
    .from("attempt_answers")
    .select(`
      question_id,
      is_correct,
      answered_at
    `)
    .eq("user_id", userId)
    .order("answered_at", {
      ascending: false,
    });

  const totalAttempts =
    attempts?.length || 0;

  const questionsSolved =
    attempts?.reduce(
      (sum, a) =>
        sum + a.total_questions,
      0
    ) || 0;

  const totalCorrect =
    attempts?.reduce(
      (sum, a) =>
        sum + a.correct_answers,
      0
    ) || 0;

  const accuracy =
    questionsSolved === 0
      ? 0
      : (
        (totalCorrect /
          questionsSolved) *
        100
      ).toFixed(1);

  const latestByQuestion = {};

  answers?.forEach((a) => {
    if (
      !latestByQuestion[
      a.question_id
      ]
    ) {
      latestByQuestion[
        a.question_id
      ] = a;
    }
  });

  const wrongQuestions =
    Object.values(
      latestByQuestion
    ).filter(
      (a) => !a.is_correct
    ).length;

  return {
    totalAttempts,
    questionsSolved,
    accuracy,
    wrongQuestions,
  };
}