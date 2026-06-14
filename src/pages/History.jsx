import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../api/supabase";

export default function History() {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] =
    useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    loadAttempts();
  }, []);

  async function loadAttempts() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } =
      await supabase
        .from("attempts")
        .select("*")
        .eq("user_id", user.id)
        .order("completed_at", {
          ascending: false,
        });

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    setAttempts(data || []);
    setLoading(false);
  }

  async function deleteAttempt(
    e,
    attemptId
  ) {
    e.stopPropagation();

    const confirmed =
      window.confirm(
        "Delete this attempt?"
      );

    if (!confirmed) return;

    const { error } =
      await supabase
        .from("attempts")
        .delete()
        .eq("id", attemptId);

    if (error) {
      alert(error.message);
      return;
    }

    setAttempts((prev) =>
      prev.filter(
        (attempt) =>
          attempt.id !== attemptId
      )
    );
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        Loading attempts...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">

      <h1 className="text-3xl font-bold mb-6">
        Attempt History
      </h1>

      {attempts.length === 0 ? (
        <div className="bg-white border rounded-xl p-8 text-center">
          No attempts found.
        </div>
      ) : (
        <div className="grid gap-4">

          {attempts.map((attempt) => {
            const percentage =
              Number(
                attempt.score_percent
              ).toFixed(2);

            return (
              <div
                key={attempt.id}
                onClick={() =>
                  navigate(
                    `/attempt/${attempt.id}`
                  )
                }
                className="
                  bg-white
                  border
                  rounded-xl
                  p-5
                  cursor-pointer
                  hover:shadow-lg
                  transition
                "
              >

                <div className="flex justify-between items-start">

                  <div>

                    <h3 className="text-lg font-bold">
                      {attempt.mode ===
                        "mixed"
                        ? "Mixed Practice"
                        : attempt.mode ===
                          "wrong-questions"
                          ? "Wrong Questions"
                          : attempt.mode ===
                            "subtopic"
                            ? "Subtopic Practice"
                            : "Topic Practice"}
                    </h3>

                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(
                        attempt.completed_at
                      ).toLocaleString()}
                    </p>

                  </div>

                  <div className="flex items-start gap-4">

                    <div className="text-right">

                      <p className="text-xl font-bold">
                        {
                          attempt.correct_answers
                        }
                        /
                        {
                          attempt.total_questions
                        }
                      </p>

                      <p className="text-sm text-gray-500">
                        {percentage}%
                      </p>

                    </div>

                    <button
                      onClick={(e) =>
                        deleteAttempt(
                          e,
                          attempt.id
                        )
                      }
                      className="
                        text-red-500
                        hover:text-red-700
                        text-xl
                      "
                      title="Delete Attempt"
                    >
                      🗑️
                    </button>

                  </div>

                </div>

                <div className="mt-4">

                  <div className="w-full bg-gray-200 rounded-full h-2">

                    <div
                      className="bg-black h-2 rounded-full"
                      style={{
                        width: `${percentage}%`,
                      }}
                    />

                  </div>

                </div>

              </div>
            );
          })}

        </div>
      )}

    </div>
  );
}