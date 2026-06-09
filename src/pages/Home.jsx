import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../api/supabase";

export default function Home() {
  const [topics, setTopics] = useState([]);

  const navigate = useNavigate();

  async function loadTopics() {
    const { data: topicsData } = await supabase
      .from("topics")
      .select("*")
      .order("name");

    const { data: questionsData } = await supabase
      .from("questions")
      .select("topic_id");

    const counts = {};

    questionsData?.forEach((q) => {
      counts[q.topic_id] =
        (counts[q.topic_id] || 0) + 1;
    });

    const finalTopics =
      topicsData?.map((topic) => ({
        ...topic,
        questionCount:
          counts[topic.id] || 0,
      })) || [];

    setTopics(finalTopics);
  }

  useEffect(() => {
    loadTopics();
  }, []);

  return (
    <div className="min-h-screen bg-slate-0">
      <div className="max-w-6xl mx-auto p-8">

        <h1 className="text-4xl font-bold mb-8">
          SSC GK Practice
        </h1>

        <div className="grid md:grid-cols-3 gap-6">
          {topics.map((topic) => (
            <div
              key={topic.id}
              onClick={() =>
                navigate(`/topic/${topic.id}`)
              }
              className="bg-white p-6 rounded-xl shadow cursor-pointer hover:shadow-lg"
            >
              <h2 className="text-xl font-bold">
                {topic.name}
              </h2>

              <p className="text-gray-500 mt-2">
                {topic.questionCount} Questions
              </p>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-12">

        <h2 className="text-2xl font-bold mb-4">
          My Progress
        </h2>

        <div className="grid md:grid-cols-2 gap-4">

          <button
            onClick={() => navigate("/history")}
            className="bg-white p-5 rounded-xl border text-left"
          >
            📜 Attempt History
          </button>

          <button
            onClick={() =>
              navigate("/wrong-questions")
            }
            className="bg-white p-5 rounded-xl border text-left"
          >
            ❌ Wrong Questions
          </button>

        </div>

      </div>
    </div>
  );
}