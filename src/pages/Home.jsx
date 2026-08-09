import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../api/supabase";
import { getUserStats } from "../api/stats";
import {
  getDailyTarget,
  saveDailyTarget,
  getTodayProgress,
} from "../api/dailyTarget";

export default function Home() {
  const [topics, setTopics] = useState([]);
  const [stats, setStats] = useState(null);
  const [dailyTarget, setDailyTarget] = useState(50);

  const [todaySolved, setTodaySolved] = useState(0);

  const navigate = useNavigate();

  async function loadTopics() {
    const { data: topicsData, error: topicsError } =
      await supabase
        .from("topics")
        .select("*")
        .order("name");

    if (topicsError) {
      console.error(topicsError);
      return;
    }

    const finalTopics = await Promise.all(
      (topicsData || []).map(async (topic) => {
        const { count, error } = await supabase
          .from("questions")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq("topic_id", topic.id);

        if (error) {
          console.error(
            `Failed to count questions for ${topic.name}:`,
            error
          );

          return {
            ...topic,
            questionCount: 0,
          };
        }

        return {
          ...topic,
          questionCount: count || 0,
        };
      })
    );

    setTopics(finalTopics);
  }

  async function loadStats() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const result =
      await getUserStats(user.id);

    setStats(result);

    const targetData =
      await getDailyTarget(user.id);

    if (targetData) {
      setDailyTarget(
        targetData.target_questions
      );
    }

    const solved =
      await getTodayProgress(user.id);

    setTodaySolved(solved);
  }

  async function updateTarget() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await saveDailyTarget(
      user.id,
      Number(dailyTarget)
    );
  }

  useEffect(() => {
    loadTopics();
    loadStats();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto p-8">

        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-10 text-white mb-10">

          <h1 className="text-5xl font-bold">
            SSC GK Practice
          </h1>

          <p className="mt-3 text-lg opacity-90">
            Practice topic-wise, revise mistakes,
            and improve your score every day.
          </p>

        </div>

        <div className="bg-white rounded-3xl border p-6 mb-8 shadow-sm">

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

            <div>

              <h2 className="text-2xl font-bold">
                🎯 Daily Target
              </h2>

              <p className="text-gray-500 mt-1">
                {todaySolved} / {dailyTarget}{" "}
                Questions Completed Today
              </p>

              {todaySolved >= dailyTarget && (
                <p className="text-green-600 font-semibold mt-2">
                  ✅ Target Achieved
                </p>
              )}

            </div>

            <div className="flex gap-2">

              <input
                type="number"
                min={1}
                value={dailyTarget}
                onChange={(e) =>
                  setDailyTarget(
                    e.target.value
                  )
                }
                className="
                  border
                  rounded-xl
                  px-4
                  py-2
                  w-24
                "
              />

              <button
                onClick={updateTarget}
                className="
                  bg-indigo-600
                  text-white
                  px-5
                  rounded-xl
                  hover:bg-indigo-700
                "
              >
                Save
              </button>

            </div>

          </div>

          <div className="mt-5 w-full bg-gray-200 rounded-full h-4">

            <div
              className="bg-indigo-600 h-4 rounded-full transition-all"
              style={{
                width: `${Math.min(
                  (todaySolved /
                    dailyTarget) *
                  100,
                  100
                )
                  }% `,
              }}
            />

          </div>

        </div>

        {stats && (
          <div className="grid md:grid-cols-4 gap-4 mb-10">

            <div className="bg-white p-5 rounded-2xl border shadow-sm">
              <p className="text-gray-500 text-sm">
                Questions Solved
              </p>

              <h3 className="text-3xl font-bold mt-2">
                {stats.questionsSolved}
              </h3>
            </div>

            <div className="bg-white p-5 rounded-2xl border shadow-sm">
              <p className="text-gray-500 text-sm">
                Attempts
              </p>

              <h3 className="text-3xl font-bold mt-2">
                {stats.totalAttempts}
              </h3>
            </div>

            <div className="bg-white p-5 rounded-2xl border shadow-sm">
              <p className="text-gray-500 text-sm">
                Accuracy
              </p>

              <h3 className="text-3xl font-bold mt-2 text-green-600">
                {stats.accuracy}%
              </h3>
            </div>

            <div className="bg-white p-5 rounded-2xl border shadow-sm">
              <p className="text-gray-500 text-sm">
                Wrong Questions
              </p>

              <h3 className="text-3xl font-bold mt-2 text-red-600">
                {stats.wrongQuestions}
              </h3>
            </div>

          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4 mb-10">

          <div className="bg-white p-5 rounded-2xl border">
            <p className="text-gray-500">
              Total Topics
            </p>

            <h3 className="text-3xl font-bold">
              {topics.length}
            </h3>
          </div>

          <div className="bg-white p-5 rounded-2xl border">
            <p className="text-gray-500">
              Total Questions
            </p>

            <h3 className="text-3xl font-bold">
              {topics.reduce(
                (sum, topic) =>
                  sum + topic.questionCount,
                0
              )}
            </h3>
          </div>

        </div>

        <h2 className="text-3xl font-bold mb-6">
          Subjects
        </h2>

        <div className="grid md:grid-cols-3 gap-6">

          {topics.map((topic) => (
            <div
              key={topic.id}
              onClick={() =>
                navigate(`/topic/${topic.id}`)
              }
              className="
                bg-white
                p-6
                rounded-2xl
                border
                cursor-pointer
                hover:shadow-xl
                hover:border-indigo-500
                transition
              "
            >
              <h2
                className="text-xl font-bold mb-2"
                style={{ color: "#f97316" }}
              >
                📚 {topic.name}
              </h2>
              <p className="text-gray-500">
                {topic.questionCount} Questions
              </p>

            </div>
          ))}

        </div>

        <div className="bg-white rounded-3xl border p-8 mt-14">

          <h2 className="text-2xl font-bold mb-6">
            My Progress
          </h2>

          <div className="grid md:grid-cols-3 gap-4">

            <button
              onClick={() =>
                navigate("/history")
              }
              className="
                bg-slate-50
                hover:bg-white
                hover:shadow-lg
                transition
                p-6
                rounded-2xl
                border
                text-left
              "
            >
              <div className="text-3xl mb-2">
                📜
              </div>

              <h3 className="font-semibold">
                Attempt History
              </h3>

              <p className="text-sm text-gray-500">
                View previous attempts
              </p>
            </button>

            <button
              onClick={() =>
                navigate("/wrong-questions")
              }
              className="
                bg-slate-50
                hover:bg-white
                hover:shadow-lg
                transition
                p-6
                rounded-2xl
                border
                text-left
              "
            >
              <div className="text-3xl mb-2">
                ❌
              </div>

              <h3 className="font-semibold">
                Wrong Questions
              </h3>

              <p className="text-sm text-gray-500">
                Revise mistakes
              </p>
            </button>

            <button
              onClick={() =>
                navigate("/mixed-practice-sets")
              }
              className="
                bg-slate-50
                hover:bg-white
                hover:shadow-lg
                transition
                p-6
                rounded-2xl
                border
                text-left
              "
            >
              <div className="text-3xl mb-2">
                🎲
              </div>

              <h3 className="font-semibold">
                Mixed Practice
              </h3>

              <p className="text-sm text-gray-500">
                50-question balanced sets across all subjects
              </p>
            </button>

          </div>

        </div>

      </div>
    </div>
  );
}