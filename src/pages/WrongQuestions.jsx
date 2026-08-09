import { useEffect, useState } from "react";
import { supabase } from "../api/supabase";
import { useNavigate } from "react-router-dom";

export default function WrongQuestions() {
  const [questions, setQuestions] = useState([]);
  const [frequency, setFrequency] = useState("all");

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
      .from("question_progress")
      .select(`
        id,
        question_id,
        wrong_count,
        questions (*)
      `)
      .eq("user_id", user.id)
      .gt("wrong_count", 0)
      .order("wrong_count", {
        ascending: false,
      });

    if (error) {
      console.error(error);
      return;
    }

    setQuestions(data || []);
  }

  const maxFrequency = Math.max(
    0,
    ...questions.map(
      (item) => item.wrong_count
    )
  );

  const filteredQuestions =
    frequency === "all"
      ? questions
      : questions.filter(
        (item) =>
          item.wrong_count ===
          Number(frequency)
      );

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">
          Wrong Questions
        </h1>

        <button
          onClick={() =>
            navigate("/quiz", {
              state: {
                mode: "wrong-questions",
                questionCount:
                  filteredQuestions.length,
              },
            })
          }
          disabled={
            filteredQuestions.length === 0
          }
          className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
        >
          Practice Wrong Questions
        </button>
      </div>

      {/* Frequency Filter */}
      <div className="bg-white border rounded-xl p-4 mb-6">
        <div className="flex items-center gap-3">
          <label
            htmlFor="frequency"
            className="font-semibold"
          >
            Wrong Frequency:
          </label>

          <select
            id="frequency"
            value={frequency}
            onChange={(e) =>
              setFrequency(e.target.value)
            }
            className="
              border
              rounded-lg
              px-3
              py-2
              bg-yellow-50
              border-yellow-300
              font-semibold
              text-yellow-800
            "
          >
            <option value="all">
              All
            </option>

            {Array.from(
              { length: maxFrequency },
              (_, index) => index + 1
            ).map((count) => (
              <option
                key={count}
                value={count}
              >
                Frequency: {count}
              </option>
            ))}
          </select>

          <span className="text-sm text-gray-500">
            {filteredQuestions.length}{" "}
            question
            {filteredQuestions.length !== 1
              ? "s"
              : ""}
          </span>
        </div>
      </div>

      {/* Questions */}
      {filteredQuestions.length === 0 ? (
        <p className="text-gray-600">
          No questions found for this frequency.
        </p>
      ) : (
        <div className="space-y-5">
          {filteredQuestions.map((item) => {
            const q = item.questions;

            return (
              <div
                key={q.id}
                className="bg-white border rounded-xl p-5"
              >
                <h3 className="font-semibold">
                  {q.question}
                </h3>

                <p className="mt-2">
                  <span className="font-medium">
                    Correct Answer:
                  </span>{" "}
                  {q.options[q.correct_answer]}
                </p>

                {q.explanation && (
                  <p className="mt-2 text-gray-600">
                    {q.explanation}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}