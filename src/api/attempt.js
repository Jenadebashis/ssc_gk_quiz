import { supabase } from "./supabase";

export async function saveAttempt({
  userId,
  quizInfo,
  questions,
  answers,
  mixedPracticeRunId = null,
  mixedPracticeSetNumber = null,
}) {
  let correct = 0;

  questions.forEach((q) => {
    if (answers[q.id] === q.correct_answer) {
      correct++;
    }
  });

  const total = questions.length;

  const scorePercent =
    total === 0
      ? 0
      : (correct * 100) / total;

  // Create attempt
  const { data: attempt, error: attemptError } =
    await supabase
      .from("attempts")
      .insert({
        user_id: userId,

        mode: quizInfo.mode,

        topic_id:
          quizInfo.topicId || null,

        subtopic_id:
          quizInfo.subtopicId || null,

        mixed_practice_run_id:
          mixedPracticeRunId,

        mixed_practice_set_number:
          mixedPracticeSetNumber,

        total_questions: total,

        correct_answers: correct,

        score_percent: scorePercent,

        started_at: new Date(),

        completed_at: new Date(),
      })
      .select()
      .single();

  if (attemptError) {
    throw attemptError;
  }

  // Save answers
  const answerRows = questions.map((q) => ({
    attempt_id: attempt.id,

    user_id: userId,

    question_id: q.id,

    selected_answer:
      answers[q.id] ?? null,

    correct_answer:
      q.correct_answer,

    is_correct:
      answers[q.id] === q.correct_answer,
  }));

  const { error: answersError } =
    await supabase
      .from("attempt_answers")
      .insert(answerRows);

  if (answersError) {
    throw answersError;
  }

  return attempt;
}