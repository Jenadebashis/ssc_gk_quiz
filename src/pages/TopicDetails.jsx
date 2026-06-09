import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../api/supabase";

export default function TopicDetails() {
  const { topicId } = useParams();
  const navigate = useNavigate();

  const [topic, setTopic] = useState(null);
  const [subtopics, setSubtopics] = useState([]);
  const [totalQuestions, setTotalQuestions] = useState(0);

  async function loadData() {
    const { data: topicData } = await supabase
      .from("topics")
      .select("*")
      .eq("id", topicId)
      .single();

    setTopic(topicData);

    const { data: subtopicData } = await supabase
      .from("subtopics")
      .select("*")
      .eq("topic_id", topicId)
      .order("name");

    const { data: questionData } = await supabase
      .from("questions")
      .select("id,subtopic_id")
      .eq("topic_id", topicId);

    const countMap = {};

    questionData?.forEach((q) => {
      countMap[q.subtopic_id] =
        (countMap[q.subtopic_id] || 0) + 1;
    });

    const enrichedSubtopics =
      subtopicData?.map((s) => ({
        ...s,
        questionCount:
          countMap[s.id] || 0,
      })) || [];

    setSubtopics(enrichedSubtopics);
    setTotalQuestions(questionData?.length || 0);
  }

  useEffect(() => {
    loadData();
  }, [topicId]);

  if (!topic) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto p-8">

        <h1 className="text-4xl font-bold">
          {topic.name}
        </h1>

        <p className="text-gray-500 mt-2">
          {totalQuestions} Questions
        </p>

        <button
          className="mt-6 px-5 py-3 bg-black text-white rounded-lg"
          onClick={() =>
            navigate("/quiz-setup", {
              state: {
                mode: "topic",
                topicId,
                topicName: topic.name,
              },
            })
          }
        >
          Practice Entire Topic
        </button>

        <h2 className="text-2xl font-semibold mt-10 mb-4">
          Subtopics
        </h2>

        <div className="grid md:grid-cols-2 gap-4">
          {subtopics.map((subtopic) => (
            <div
              key={subtopic.id}
              className="bg-white rounded-xl p-5 shadow cursor-pointer"
              onClick={() =>
                navigate("/quiz-setup", {
                  state: {
                    mode: "subtopic",
                    topicId,
                    subtopicId: subtopic.id,
                    topicName: topic.name,
                    subtopicName: subtopic.name,
                  },
                })
              }
            >
              <h3 className="font-bold">
                {subtopic.name}
              </h3>

              <p className="text-gray-500">
                {subtopic.questionCount} Questions
              </p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}