import { useEffect, useState } from "react";
import { supabase } from "../api/supabase";

export default function History() {
  const [attempts, setAttempts] = useState([]);

  useEffect(() => {
    loadAttempts();
  }, []);

  async function loadAttempts() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from("attempts")
      .select("*")
      .eq("user_id", user.id)
      .order("completed_at", {
        ascending: false,
      });

    console.log(data);
    console.log(error);

    if (error) {
      console.error(error);
      return;
    }

    setAttempts(data || []);
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">
        Attempt History
      </h1>

      <div className="space-y-4">
        {attempts.map((attempt) => (
          <div
            key={attempt.id}
            className="bg-white border rounded-xl p-5"
          >
            <h3 className="font-bold">
              {attempt.subtopics?.name ||
                attempt.topics?.name ||
                "Mixed Practice"}
            </h3>

            <p>
              Score: {attempt.correct_answers}/
              {attempt.total_questions}
            </p>

            <p>
              {Number(
                attempt.score_percent
              ).toFixed(2)}
              %
            </p>

            <p className="text-sm text-gray-500">
              {new Date(
                attempt.completed_at
              ).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}