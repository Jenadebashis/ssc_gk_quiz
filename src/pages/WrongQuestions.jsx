import { useEffect, useState } from "react";
import { supabase } from "../api/supabase";
import { useNavigate } from "react-router-dom";

export default function WrongQuestions() {
  const [questions, setQuestions] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadWrongQuestions();
  }, []);

  async function loadWrongQuestions() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from("attempt_answers")
      .select(`
        *,
        questions (*)
      `)
      .eq("user_id", user.id)
      .order("answered_at", {
        ascending: false,
      });

    if (error) {
      console.error(error);
      return;
    }

    const latestByQuestion = {};

    data.forEach((row) => {
      if (
        !latestByQuestion[row.question_id]
      ) {
        latestByQuestion[row.question_id] =
          row;
      }
    });

    const wrongOnly = Object.values(
      latestByQuestion
    )
      .filter((row) => !row.is_correct)
      .map((row) => row.questions);

    setQuestions(wrongOnly);
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">
        Wrong Questions
      </h1>

      {questions.length === 0 ? (
        <p>
          No unresolved wrong questions 🎉
        </p>
      ) : (
        <div className="space-y-5">
          {questions.map((q) => (
            <div
              key={q.id}
              className="bg-white border rounded-xl p-5"
            >
              <h3 className="font-semibold">
                {q.question}
              </h3>

              <p className="mt-2">
                Correct Answer:
                {" "}
                {
                  q.options[
                  q.correct_answer
                  ]
                }
              </p>

              {q.explanation && (
                <p className="mt-2 text-gray-600">
                  {q.explanation}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() =>
          navigate("/quiz", {
            state: {
              mode: "wrong-questions",
              questionCount: questions.length,
            },
          })
        }
        className="bg-black text-white px-4 py-2 rounded mb-6"
      >
        Practice Wrong Questions
      </button>
    </div>
  );
}