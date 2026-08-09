import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../api/supabase";
import { generateMixedSets } from "../utils/mixedPracticeGenerator";

const PAGE_SIZE = 1000;

async function fetchQuestionsForTopics(topicIds) {
  const result = [];

  for (const topicId of topicIds) {
    const { data: subtopics, error: subtopicError } = await supabase
      .from("subtopics")
      .select("id, name, created_at")
      .eq("topic_id", topicId)
      .order("name", { ascending: true });

    if (subtopicError) throw subtopicError;

    const orderedSubtopics = [...(subtopics || [])].sort((a, b) => {
      const byName = String(a.name || "").localeCompare(
        String(b.name || ""),
        undefined,
        { numeric: true, sensitivity: "base" }
      );

      if (byName !== 0) return byName;

      return (
        new Date(a.created_at || 0).getTime() -
        new Date(b.created_at || 0).getTime()
      );
    });

    const subtopicIds = orderedSubtopics.map(
      (subtopic) => subtopic.id
    );

    for (const subtopicId of subtopicIds) {
      for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await supabase
          .from("questions")
          .select("id, topic_id, subtopic_id, created_at")
          .eq("topic_id", topicId)
          .eq("subtopic_id", subtopicId)
          .order("created_at", { ascending: true })
          .range(from, from + PAGE_SIZE - 1);

        if (error) throw error;

        result.push(...(data || []));

        if (!data || data.length < PAGE_SIZE) break;
      }
    }

    // Include questions that do not have a subtopic.
    for (let from = 0; ; from += PAGE_SIZE) {
      const query = supabase
        .from("questions")
        .select("id, topic_id, subtopic_id, created_at")
        .eq("topic_id", topicId)
        .is("subtopic_id", null)
        .order("created_at", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      const { data, error } = await query;

      if (error) throw error;

      result.push(...(data || []));

      if (!data || data.length < PAGE_SIZE) break;
    }
  }

  return result;
}

async function fetchRunQuestions(runId) {
  const result = [];
  const PAGE_SIZE = 1000;

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("mixed_practice_run_questions")
      .select("question_id, set_number, position, strategy")
      .eq("run_id", runId)
      .order("set_number", { ascending: true })
      .order("position", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    result.push(...(data || []));

    if (!data || data.length < PAGE_SIZE) {
      break;
    }
  }

  return result;
}

function groupRunRows(rows) {
  const grouped = {};

  for (const row of rows) {
    if (!grouped[row.set_number]) {
      grouped[row.set_number] = {
        number: row.set_number,
        strategy: row.strategy,
        questionIds: [],
      };
    }

    grouped[row.set_number].questionIds.push(row.question_id);
  }

  return Object.values(grouped).sort(
    (a, b) => a.number - b.number
  );
}

export default function MixedPracticeSets() {
  const navigate = useNavigate();
  const loadingRunRef = useRef(false);

  const [sets, setSets] = useState([]);
  const [runId, setRunId] = useState(null);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [attemptCounts, setAttemptCounts] = useState({});

  useEffect(() => {
    loadCurrentRun();
  }, []);

  async function loadAttemptCounts(userId, runId) {
    const { data, error } = await supabase
      .from("attempts")
      .select("mixed_practice_set_number")
      .eq("user_id", userId)
      .eq("mixed_practice_run_id", runId)
      .not("mixed_practice_set_number", "is", null);

    if (error) {
      throw error;
    }

    const counts = {};

    (data || []).forEach((attempt) => {
      const setNumber =
        attempt.mixed_practice_set_number;

      counts[setNumber] =
        (counts[setNumber] || 0) + 1;
    });

    setAttemptCounts(counts);
  }

  async function loadCurrentRun() {
    if (loadingRunRef.current) return;

    loadingRunRef.current = true;

    try {
      setLoading(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/login");
        return;
      }

      const { data: run, error: runError } =
        await supabase
          .from("mixed_practice_runs")
          .select("id, total_questions")
          .eq("user_id", user.id)
          .eq("status", "active")
          .order("created_at", {
            ascending: false,
          })
          .limit(1)
          .maybeSingle();

      if (runError) throw runError;

      if (!run) {
        await generateNewRun(user.id);
        return;
      }

      const rows = await fetchRunQuestions(run.id);

      setRunId(run.id);
      setTotalQuestions(run.total_questions);
      setSets(groupRunRows(rows || []));

      await loadAttemptCounts(user.id, run.id);
    } catch (err) {
      console.error(err);
      setError(
        err.message ||
        "Failed to load mixed practice sets."
      );
    } finally {
      loadingRunRef.current = false;
      setLoading(false);
    }
  }

  async function generateNewRun(
    userIdOverride = null
  ) {
    try {
      setGenerating(true);
      setError("");

      let userId = userIdOverride;

      if (!userId) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          navigate("/login");
          return;
        }

        userId = user.id;
      }

      const {
        data: topics,
        error: topicsError,
      } = await supabase
        .from("topics")
        .select("id, name")
        .order("name", { ascending: true });

      if (topicsError) throw topicsError;

      const generated = await generateMixedSets({
        topics: topics || [],
        fetchQuestionsForTopics,
      });

      const { data: run, error: runError } =
        await supabase
          .from("mixed_practice_runs")
          .insert({
            user_id: userId,
            total_questions:
              generated.totalQuestions,
            set_size: 50,
            status: "active",
          })
          .select("id")
          .single();

      if (runError) throw runError;

      const rows = generated.sets.flatMap(
        (practiceSet) =>
          practiceSet.questions.map(
            (question, position) => ({
              run_id: run.id,
              question_id: question.id,
              subject: question.subject,
              set_number: practiceSet.number,
              position,
              strategy: practiceSet.strategy,
            })
          )
      );

      // Insert in batches so large question banks
      // do not create one oversized request.
      const INSERT_BATCH_SIZE = 500;

      for (
        let from = 0;
        from < rows.length;
        from += INSERT_BATCH_SIZE
      ) {
        const batch = rows.slice(
          from,
          from + INSERT_BATCH_SIZE
        );

        const { error: rowsError } =
          await supabase
            .from(
              "mixed_practice_run_questions"
            )
            .insert(batch);

        if (rowsError) {
          await supabase
            .from("mixed_practice_runs")
            .delete()
            .eq("id", run.id);

          throw rowsError;
        }
      }

      // There should be only one active sequence
      // for the user. Retire older ones after the
      // new sequence has been successfully persisted.
      await supabase
        .from("mixed_practice_runs")
        .update({ status: "completed" })
        .eq("user_id", userId)
        .eq("status", "active")
        .neq("id", run.id);

      setRunId(run.id);
      setTotalQuestions(
        generated.totalQuestions
      );

      setSets(
        generated.sets.map((practiceSet) => ({
          number: practiceSet.number,
          strategy: practiceSet.strategy,
          questionIds:
            practiceSet.questions.map(
              (question) => question.id
            ),
        }))
      );
    } catch (err) {
      console.error(err);
      setError(
        err.message ||
        "Failed to generate mixed practice sets."
      );
    } finally {
      setGenerating(false);
      setLoading(false);
    }
  }

  function startSet(practiceSet) {
    navigate("/quiz", {
      state: {
        mode: "set",
        topicName: "Mixed Practice",
        setNumber: practiceSet.number,
        questionIds: practiceSet.questionIds,
        questionCount:
          practiceSet.questionIds.length,
        mixedPracticeRunId: runId,
      },
    });
  }

  if (loading) {
    return (
      <div className="p-10">
        Loading Mixed Practice Sets...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto p-8">
        <button
          onClick={() => navigate("/")}
          className="text-sm text-gray-500 hover:text-black mb-6"
        >
          ← Back to Home
        </button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1
              className="text-4xl font-bold"
              style={{ color: "#f97316" }}
            >
              Mixed Practice Sets
            </h1>

            <p className="text-gray-500 mt-2">
              {totalQuestions} total questions ·{" "}
              {sets.length} sets
            </p>

            <p className="text-sm text-gray-500 mt-2">
              First use: PYQ-weighted ratio. As
              subjects become depleted, allocation
              automatically follows the remaining
              inventory.
            </p>
          </div>

          <button
            onClick={() => generateNewRun()}
            disabled={generating}
            className="bg-white border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
          >
            {generating
              ? "Generating..."
              : "New Random Sequence"}
          </button>
        </div>

        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4 mt-8">
          {sets.map((practiceSet) => (
            <div
              key={practiceSet.number}
              className="relative bg-white border rounded-xl p-5 flex items-end justify-between"
            >
              {attemptCounts[
                practiceSet.number
              ] > 0 && (
                  <div className="absolute top-4 right-4 w-9 h-9 rounded-full bg-yellow-400 text-black font-bold flex items-center justify-center shadow-sm">
                    {
                      attemptCounts[
                      practiceSet.number
                      ]
                    }
                  </div>
                )}

              <div>
                <h2
                  className="font-bold text-lg"
                  style={{ color: "#f97316" }}
                >
                  Set {practiceSet.number}
                </h2>

                <p className="text-gray-500">
                  {practiceSet.questionIds.length}{" "}
                  Questions
                </p>

                <p className="text-xs text-gray-400 mt-1">
                  {practiceSet.strategy ===
                    "pyq-weighted"
                    ? "PYQ weighted"
                    : "Remaining inventory balanced"}
                </p>
              </div>

              <button
                onClick={() =>
                  startSet(practiceSet)
                }
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