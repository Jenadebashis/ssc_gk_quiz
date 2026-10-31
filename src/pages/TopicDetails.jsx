import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../api/supabase";
import { getTopicSetsSummary } from "../utils/questionSelectior";

export default function TopicDetails() {
  const params = useParams();
  const navigate = useNavigate();

  // Safely extract parameter whether defined as :topicId or :id in AppRoutes
  const topicId = params.topicId || params.id;

  const [topic, setTopic] = useState(null);
  const [subtopics, setSubtopics] = useState([]);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [setsSummary, setSetsSummary] = useState({ sets: [] });
  const [activeTab, setActiveTab] = useState("sets"); // 'sets' or 'subtopics'
  const [loading, setLoading] = useState(true);

  async function loadData() {
    if (!topicId || topicId === "undefined") return;

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Fetch Topic Details
      const { data: topicData, error: topicError } = await supabase
        .from("topics")
        .select("*")
        .eq("id", topicId)
        .single();

      if (topicError) throw topicError;
      setTopic(topicData);

      // 2. Fetch Total Question Count for this Topic
      const { count: totalCount, error: totalError } = await supabase
        .from("questions")
        .select("id", { count: "exact", head: true })
        .eq("topic_id", topicId);

      if (totalError) console.error(totalError);
      setTotalQuestions(totalCount || 0);

      // 3. Fetch Fixed 30-Question Sets & User Completion Counters
      const summary = await getTopicSetsSummary(topicId, user?.id);
      setSetsSummary(summary);

      // 4. Fetch Subtopics
      const { data: subtopicData } = await supabase
        .from("subtopics")
        .select("*")
        .eq("topic_id", topicId)
        .order("name");

      const enrichedSubtopics = await Promise.all(
        (subtopicData || []).map(async (s) => {
          const { count, error } = await supabase
            .from("questions")
            .select("id", { count: "exact", head: true })
            .eq("topic_id", topicId)
            .eq("subtopic_id", s.id);

          if (error) console.error(error);

          return {
            ...s,
            questionCount: count || 0,
          };
        })
      );

      setSubtopics(enrichedSubtopics);
    } catch (err) {
      console.error("Failed to load topic details:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [topicId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-gray-500">
        Loading topic...
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <p className="text-red-500 font-semibold mb-4">Topic not found.</p>
        <button
          onClick={() => navigate("/")}
          className="px-4 py-2 bg-black text-white text-sm rounded-lg"
        >
          Back to Subjects
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto p-8">
        <button
          onClick={() => navigate("/")}
          className="text-sm text-gray-500 hover:text-gray-800 mb-4 inline-block font-medium"
        >
          ← Back to Subjects
        </button>

        <h1 className="text-4xl font-bold text-gray-900">{topic.name}</h1>
        <p className="text-gray-500 mt-2">{totalQuestions} Total Questions</p>

        {/* Action Header */}
        <div className="flex flex-wrap gap-3 mt-6">
          <button
            className="px-5 py-2.5 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition"
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
            Custom Practice / Full Test
          </button>
        </div>

        {/* View Switcher: 30-Question Sets vs Subtopics */}
        <div className="flex border-b border-gray-200 mt-10 mb-6 gap-6">
          <button
            onClick={() => setActiveTab("sets")}
            className={`pb-3 text-sm font-semibold border-b-2 transition ${activeTab === "sets"
                ? "border-black text-black"
                : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
          >
            Practice Sets (30 Qs Each) ({setsSummary.sets?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab("subtopics")}
            className={`pb-3 text-sm font-semibold border-b-2 transition ${activeTab === "subtopics"
                ? "border-black text-black"
                : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
          >
            Subtopics ({subtopics.length})
          </button>
        </div>

        {/* Tab 1: Fixed 30-Question Sets Grid */}
        {activeTab === "sets" && (
          <div>
            {setsSummary.sets?.length === 0 ? (
              <p className="text-gray-500 text-sm">No questions available to generate sets.</p>
            ) : (
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                {setsSummary.sets.map((set) => {
                  const isMastered =
                    set.bestScore !== null &&
                    set.bestScore / set.totalQuestions >= 0.9;

                  return (
                    <div
                      key={set.setNumber}
                      className={`p-5 rounded-xl border bg-white flex flex-col justify-between shadow-sm transition hover:shadow-md ${set.attemptCount > 0 ? "border-emerald-200" : "border-gray-200"
                        }`}
                    >
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-gray-900 text-base">
                            Set {set.setNumber < 10 ? `0${set.setNumber}` : set.setNumber}
                          </h3>

                          {/* Completion Count & Mastery Badge */}
                          {set.attemptCount > 0 ? (
                            <span
                              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isMastered
                                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                                  : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                }`}
                            >
                              {isMastered
                                ? `⭐ Mastered (${set.attemptCount}x)`
                                : `✓ Done (${set.attemptCount}x)`}
                            </span>
                          ) : (
                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                              Unattempted
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-gray-500">
                          Questions {set.startIdx} – {set.endIdx} ({set.totalQuestions} Qs)
                        </p>

                        {set.attemptCount > 0 && (
                          <p className="text-xs text-gray-600 mt-3">
                            Best Score:{" "}
                            <span className="text-emerald-600 font-bold">
                              {set.bestScore}
                            </span>{" "}
                            / {set.totalQuestions}
                          </p>
                        )}
                      </div>

                      <div className="mt-5">
                        <button
                          onClick={() =>
                            navigate(`/quiz?topicId=${topicId}&set=${set.setNumber}`)
                          }
                          className={`w-full py-2 px-3 text-xs font-bold rounded-lg transition ${set.attemptCount > 0
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                              : "bg-black hover:bg-gray-800 text-white"
                            }`}
                        >
                          {set.attemptCount > 0 ? "Re-practice Set" : "Start Set"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Subtopics Grid */}
        {activeTab === "subtopics" && (
          <div className="grid md:grid-cols-2 gap-4">
            {subtopics.map((subtopic) => (
              <div
                key={subtopic.id}
                className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 cursor-pointer hover:border-gray-400 transition"
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
                <h3 className="font-bold text-gray-800">{subtopic.name}</h3>
                <p className="text-gray-500 text-sm mt-1">
                  {subtopic.questionCount} Questions
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}