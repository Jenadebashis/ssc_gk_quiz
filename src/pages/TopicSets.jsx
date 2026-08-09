import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../api/supabase";

const PAGE_SIZE = 1000;
const SET_SIZE = 30;

function shuffle(array) {
  const result = [...array];

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

async function fetchAllQuestionIds(topicId) {
  const ids = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("questions")
      .select("id")
      .eq("topic_id", topicId)
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    ids.push(...(data || []).map((q) => q.id));

    if (!data || data.length < PAGE_SIZE) break;
  }

  return ids;
}

function storageKey(topicId) {
  return `practice-sets:${topicId}`;
}

export default function TopicSets() {
  const { topicId } = useParams();
  const navigate = useNavigate();

  const [topic, setTopic] = useState(null);
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadSets();
  }, [topicId]);

  async function loadSets() {
    try {
      setLoading(true);
      setError("");

      const { data: topicData, error: topicError } = await supabase
        .from("topics")
        .select("id, name")
        .eq("id", topicId)
        .single();

      if (topicError) throw topicError;

      const questionIds = await fetchAllQuestionIds(topicId);
      const signature = [...questionIds].sort().join(",");
      const key = storageKey(topicId);

      let saved = null;
      try {
        saved = JSON.parse(localStorage.getItem(key) || "null");
      } catch {
        saved = null;
      }

      let orderedIds;

      if (
        saved &&
        saved.signature === signature &&
        Array.isArray(saved.questionIds) &&
        saved.questionIds.length === questionIds.length
      ) {
        orderedIds = saved.questionIds;
      } else {
        orderedIds = shuffle(questionIds);

        localStorage.setItem(
          key,
          JSON.stringify({
            signature,
            questionIds: orderedIds,
            createdAt: new Date().toISOString(),
          })
        );
      }

      const generatedSets = [];

      for (let i = 0; i < orderedIds.length; i += SET_SIZE) {
        generatedSets.push({
          number: generatedSets.length + 1,
          questionIds: orderedIds.slice(i, i + SET_SIZE),
        });
      }

      setTopic(topicData);
      setSets(generatedSets);
    } catch (err) {
      console.error(err);
      setError("Failed to load practice sets.");
    } finally {
      setLoading(false);
    }
  }

  function startSet(practiceSet) {
    navigate("/quiz", {
      state: {
        mode: "set",
        topicId,
        topicName: topic.name,
        setNumber: practiceSet.number,
        questionIds: practiceSet.questionIds,
        questionCount: practiceSet.questionIds.length,
      },
    });
  }

  if (loading) return <div className="p-10">Loading Practice Sets...</div>;
  if (error) return <div className="p-10 text-red-600">{error}</div>;
  if (!topic) return <div className="p-10">Topic not found.</div>;

  const totalQuestions = sets.reduce(
    (total, set) => total + set.questionIds.length,
    0
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto p-8">
        <button
          onClick={() => navigate(`/topic/${topicId}`)}
          className="text-sm text-gray-500 hover:text-black mb-6"
        >
          ← Back to Topic
        </button>

        <h1 className="text-4xl font-bold">{topic.name}</h1>
        <p className="text-gray-500 mt-2">
          {totalQuestions} Questions · {sets.length} Practice Sets
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Questions are randomized once and the set assignment stays fixed until the topic's question bank changes.
        </p>

        <div className="grid md:grid-cols-2 gap-4 mt-8">
          {sets.map((practiceSet) => (
            <div
              key={practiceSet.number}
              className="bg-white border rounded-xl p-5 flex items-center justify-between"
            >
              <div>
                <h2 className="font-bold text-lg">
                  Set {practiceSet.number}
                </h2>
                <p className="text-gray-500">
                  {practiceSet.questionIds.length} Questions
                </p>
              </div>

              <button
                onClick={() => startSet(practiceSet)}
                className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800"
              >
                Start
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
