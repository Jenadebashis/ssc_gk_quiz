import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../api/supabase";

export default function AttemptReview() {
  const { attemptId } = useParams();

  const [loading, setLoading] =
    useState(true);

  const [attempt, setAttempt] =
    useState(null);

  const [answers, setAnswers] =
    useState([]);

  const [showIncorrectOnly,
    setShowIncorrectOnly] =
    useState(false);

  useEffect(() => {
    loadAttempt();
  }, []);

  async function loadAttempt() {
    const { data: attemptData } =
      await supabase
        .from("attempts")
        .select("*")
        .eq("id", attemptId)
        .single();

    const {
      data: answerData,
      error,
    } = await supabase
      .from("attempt_answers")
      .select(`
        *,
        questions(*)
      `)
      .eq("attempt_id", attemptId);

    if (error) {
      console.error(error);
      return;
    }

    setAttempt(attemptData);
    setAnswers(answerData || []);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="p-10">
        Loading...
      </div>
    );
  }

  const incorrectCount =
    answers.filter(
      (a) => !a.is_correct
    ).length;

  return (
    <div className="max-w-5xl mx-auto p-6">

      <div className="bg-white border rounded-xl p-6 mb-8">

        <h1 className="text-3xl font-bold">
          Attempt Review
        </h1>

        <div className="mt-4 space-y-2">

          <p>
            Score:
            {" "}
            {attempt.correct_answers}
            {" / "}
            {attempt.total_questions}
          </p>

          <p>
            Percentage:
            {" "}
            {Number(
              attempt.score_percent
            ).toFixed(2)}
            %
          </p>

          <p>
            Completed:
            {" "}
            {new Date(
              attempt.completed_at
            ).toLocaleString()}
          </p>

        </div>

      </div>

      <div className="flex gap-3 mb-6">

        <button
          onClick={() =>
            setShowIncorrectOnly(false)
          }
          className={`px-4 py-2 rounded ${!showIncorrectOnly
              ? "bg-black text-white"
              : "border"
            }`}
        >
          All Questions
        </button>

        <button
          onClick={() =>
            setShowIncorrectOnly(true)
          }
          className={`px-4 py-2 rounded ${showIncorrectOnly
              ? "bg-black text-white"
              : "border"
            }`}
        >
          Incorrect Only ({incorrectCount})
        </button>

      </div>

      <div className="space-y-6">

        {answers
          .filter((a) =>
            showIncorrectOnly
              ? !a.is_correct
              : true
          )
          .map((a, index) => (
            <div
              key={a.id}
              className="border rounded-xl p-5 bg-white"
            >
              <h3 className="font-semibold mb-4">
                {index + 1}.{" "}
                {a.questions.question}
              </h3>

              <p>
                Your Answer:
                {" "}
                {a.selected_answer !==
                  null
                  ? a.questions.options[
                  a.selected_answer
                  ]
                  : "Not Answered"}
              </p>

              <p>
                Correct Answer:
                {" "}
                {
                  a.questions.options[
                  a.correct_answer
                  ]
                }
              </p>

              <p>
                Status:
                {" "}
                {a.is_correct
                  ? "✅ Correct"
                  : "❌ Wrong"}
              </p>

              {a.questions
                .explanation && (
                  <p className="mt-2 text-gray-600">
                    Explanation:
                    {" "}
                    {
                      a.questions
                        .explanation
                    }
                  </p>
                )}
            </div>
          ))}

      </div>

    </div>
  );
}