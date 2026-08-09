import { useEffect, useState } from "react";
import { supabase } from "../api/supabase";
import { useNavigate } from "react-router-dom";

export default function WrongQuestions() {
  const [questions, setQuestions] = useState([]);
  const [frequency, setFrequency] = useState("all");
  const [setSize, setSetSize] = useState(null);
  const [practiceMode, setPracticeMode] = useState(false);

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

  const practiceSets = setSize
    ? Array.from(
      {
        length: Math.ceil(
          filteredQuestions.length /
          setSize
        ),
      },
      (_, index) => {
        const start = index * setSize;

        const end = Math.min(
          start + setSize,
          filteredQuestions.length
        );

        return {
          number: index + 1,
          start,
          end,
          questions:
            filteredQuestions.slice(
              start,
              end
            ),
        };
      }
    )
    : [];

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">
          Wrong Questions
        </h1>

        <button
          onClick={() => {
            setPracticeMode(true);
            setSetSize(null);
          }}
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
        <div className="flex items-center gap-3 flex-wrap">
          <label
            htmlFor="frequency"
            className="font-semibold"
          >
            Wrong Frequency:
          </label>

          <select
            id="frequency"
            value={frequency}
            onChange={(e) => {
              setFrequency(e.target.value);
              setPracticeMode(false);
              setSetSize(null);
            }}
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
              {
                length: maxFrequency,
              },
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

      {/* Practice Setup */}
      {practiceMode &&
        setSize === null &&
        filteredQuestions.length > 0 && (
          <div className="bg-white border rounded-xl p-5 mb-6">
            <h3 className="font-semibold text-lg mb-3">
              Select Questions Per Set
            </h3>

            <div className="flex gap-3 flex-wrap">
              {[10, 20, 30, 40].map(
                (size) => (
                  <button
                    key={size}
                    onClick={() =>
                      setSetSize(size)
                    }
                    className="
                      px-5
                      py-3
                      rounded-xl
                      border
                      bg-yellow-50
                      border-yellow-300
                      font-semibold
                      hover:bg-yellow-100
                    "
                  >
                    {size}
                  </button>
                )
              )}
            </div>

            <p className="text-sm text-gray-500 mt-3">
              {filteredQuestions.length}{" "}
              questions →{" "}
              {Math.ceil(
                filteredQuestions.length / 10
              )}{" "}
              to{" "}
              {Math.ceil(
                filteredQuestions.length / 40
              )}{" "}
              possible sets
            </p>
          </div>
        )}

      {/* Set Selector */}
      {practiceMode && setSize !== null && (
        <div className="bg-white border rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-lg">
                Select Set
              </h3>

              <p className="text-sm text-gray-500">
                {filteredQuestions.length}{" "}
                questions ·{" "}
                {practiceSets.length} sets ·{" "}
                {setSize} per set
              </p>
            </div>

            <button
              onClick={() => setSetSize(null)}
              className="text-sm text-gray-500 hover:text-black"
            >
              Change Size
            </button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {practiceSets.map(
              (practiceSet) => (
                <button
                  key={practiceSet.number}
                  onClick={() => {
                    navigate("/quiz", {
                      state: {
                        mode: "wrong-questions",
                        questionIds:
                          practiceSet.questions.map(
                            (item) =>
                              item.question_id
                          ),
                        questionCount:
                          practiceSet.questions
                            .length,
                      },
                    });
                  }}
                  className="
                    text-left
                    border
                    rounded-xl
                    p-4
                    hover:border-yellow-400
                    hover:bg-yellow-50
                    transition
                  "
                >
                  <div className="font-bold">
                    Set {practiceSet.number}
                  </div>

                  <div className="text-sm text-gray-500 mt-1">
                    Questions{" "}
                    {practiceSet.start + 1}–
                    {practiceSet.end}
                  </div>

                  <div className="text-sm font-medium mt-2">
                    {
                      practiceSet.questions
                        .length
                    }{" "}
                    Questions
                  </div>
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* Wrong Questions */}
      {filteredQuestions.length === 0 ? (
        <p className="text-gray-600">
          No questions found for this
          frequency.
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
            );
          })}
        </div>
      )}
    </div>
  );
}