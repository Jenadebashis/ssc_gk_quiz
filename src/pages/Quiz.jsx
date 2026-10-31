import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../api/supabase";
import { saveAttempt } from "../api/attempt";
import {
  incrementWrongCount,
  getWrongCount,
  decrementWrongCount,
} from "../api/questionProgress";
import {
  selectQuestions,
  fetchSetQuestions,
  recordSetAttempt,
} from "../utils/questionSelectior";

function getRetryDelay(totalQuestions) {
  return Math.min(
    3,
    Math.max(1, Math.floor(totalQuestions / 4))
  );
}

// Normalizes arbitrary correct_answer representations into a standard integer index (0, 1, 2, 3)
function normalizeCorrectAnswer(rawAnswer, optionsArray = []) {
  if (typeof rawAnswer === "number") return rawAnswer;
  const str = String(rawAnswer ?? "").trim();
  if (!str) return 0;

  // Check 'A', 'B', 'C', 'D'
  const upper = str.toUpperCase();
  if (["A", "B", "C", "D", "E"].includes(upper)) {
    return upper.charCodeAt(0) - 65;
  }

  // Check numeric string "0", "1", etc.
  const parsed = parseInt(str, 10);
  if (!Number.isNaN(parsed)) return parsed;

  // Check matching option text string
  if (Array.isArray(optionsArray)) {
    const matchedIdx = optionsArray.findIndex(
      (opt) => String(opt).trim().toLowerCase() === str.toLowerCase()
    );
    if (matchedIdx !== -1) return matchedIdx;
  }

  return 0;
}

// Normalizes options into a clean string array [opt1, opt2, ...]
function normalizeOptions(q) {
  if (Array.isArray(q.options)) {
    return q.options.map((opt) =>
      typeof opt === "object" && opt !== null
        ? opt.text || opt.label || JSON.stringify(opt)
        : String(opt)
    );
  }

  if (q.options && typeof q.options === "object") {
    return Object.values(q.options).map(String);
  }

  const flatOptions = [];
  ["a", "b", "c", "d", "e"].forEach((l) => {
    const val = q[`option_${l}`] || q[`option${l.toUpperCase()}`];
    if (val !== undefined && val !== null && String(val).trim() !== "") {
      flatOptions.push(String(val));
    }
  });

  return flatOptions;
}

export default function Quiz() {
  const { state } = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Support both query parameters and state for Set Mode
  const paramTopicId = searchParams.get("topicId") || state?.topicId;
  const paramSetNumber = searchParams.get("set")
    ? parseInt(searchParams.get("set"), 10)
    : state?.setNumber || null;

  const [questions, setQuestions] = useState([]);
  const [queue, setQueue] = useState([]);
  const [answers, setAnswers] = useState({});
  const [mistakeCounts, setMistakeCounts] = useState({});

  const [showOptions, setShowOptions] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [reducePrompt, setReducePrompt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadQuestions();
  }, []);

  async function loadQuestions() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      navigate("/login");
      return;
    }

    // 1. Fixed 30-Question Set Flow
    if (paramTopicId && paramSetNumber) {
      try {
        const rawSetQuestions = await fetchSetQuestions(paramTopicId, paramSetNumber);

        const normalized = (rawSetQuestions || []).map((q) => {
          const opts = normalizeOptions(q);
          return {
            ...q,
            question: q.question || q.question_text || "",
            options: opts,
            correct_answer: normalizeCorrectAnswer(q.correct_answer, opts),
          };
        });

        setQuestions(normalized);
        setQueue(normalized.map((q) => q.id));
      } catch (err) {
        console.error("Failed to load set questions:", err);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!state) {
      navigate("/");
      return;
    }

    let query = supabase.from("questions").select("*");

    // 2. Custom Set Mode by Question IDs
    if (state.mode === "set") {
      if (!Array.isArray(state.questionIds) || !state.questionIds.length) {
        setQuestions([]);
        setLoading(false);
        return;
      }

      const { data: setQuestionRows, error } = await query.in("id", state.questionIds);

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      const questionMap = Object.fromEntries(
        (setQuestionRows || []).map((question) => {
          const opts = normalizeOptions(question);
          return [
            question.id,
            {
              ...question,
              question: question.question || question.question_text || "",
              options: opts,
              correct_answer: normalizeCorrectAnswer(question.correct_answer, opts),
            },
          ];
        })
      );

      const orderedQuestions = state.questionIds
        .map((id) => questionMap[id])
        .filter(Boolean);

      setQuestions(orderedQuestions);
      setQueue(orderedQuestions.map((q) => q.id));
      setLoading(false);
      return;
    }

    // 3. Wrong Questions Practice Mode
    if (state.mode === "wrong-questions") {
      if (Array.isArray(state.questionIds) && state.questionIds.length > 0) {
        const { data, error } = await query.in("id", state.questionIds);

        if (error) {
          console.error(error);
          setLoading(false);
          return;
        }

        const questionMap = Object.fromEntries(
          (data || []).map((question) => {
            const opts = normalizeOptions(question);
            return [
              question.id,
              {
                ...question,
                question: question.question || question.question_text || "",
                options: opts,
                correct_answer: normalizeCorrectAnswer(question.correct_answer, opts),
              },
            ];
          })
        );

        const selectedQuestions = state.questionIds
          .map((id) => questionMap[id])
          .filter(Boolean);

        setQuestions(selectedQuestions);
        setQueue(selectedQuestions.map((q) => q.id));
        setLoading(false);
        return;
      }

      // Fallback: practice all wrong questions
      const { data, error } = await supabase
        .from("question_progress")
        .select(`
          question_id,
          wrong_count,
          questions (*)
        `)
        .eq("user_id", user.id)
        .gt("wrong_count", 0)
        .order("wrong_count", { ascending: false });

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      const wrongQuestions = (data || [])
        .map((item) => {
          if (!item.questions) return null;
          const opts = normalizeOptions(item.questions);
          return {
            ...item.questions,
            question: item.questions.question || item.questions.question_text || "",
            options: opts,
            correct_answer: normalizeCorrectAnswer(item.questions.correct_answer, opts),
          };
        })
        .filter(Boolean);

      setQuestions(wrongQuestions);
      setQueue(wrongQuestions.map((q) => q.id));
      setLoading(false);
      return;
    }

    // 4. Standard Topic / Subtopic Practice
    if (state.mode === "topic") {
      query = query.eq("topic_id", state.topicId);
    }

    if (state.mode === "subtopic") {
      query = query.eq("subtopic_id", state.subtopicId);
    }

    const { data: candidateQuestions, error } = await query;

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    const questionIds = (candidateQuestions || []).map((q) => q.id);

    let attemptData = [];
    if (questionIds.length) {
      const { data } = await supabase
        .from("attempt_answers")
        .select("question_id")
        .eq("user_id", user.id)
        .in("question_id", questionIds);

      attemptData = data || [];
    }

    const attemptCounts = {};
    attemptData.forEach((row) => {
      attemptCounts[row.question_id] = (attemptCounts[row.question_id] || 0) + 1;
    });

    const selectedQuestions = selectQuestions(
      candidateQuestions,
      attemptCounts,
      state.questionCount
    ).map((q) => {
      const opts = normalizeOptions(q);
      return {
        ...q,
        question: q.question || q.question_text || "",
        options: opts,
        correct_answer: normalizeCorrectAnswer(q.correct_answer, opts),
      };
    });

    setQuestions(selectedQuestions);
    setQueue(selectedQuestions.map((q) => q.id));
    setLoading(false);
  }

  const questionMap = useMemo(() => {
    return Object.fromEntries(
      questions.map((question) => [question.id, question])
    );
  }, [questions]);

  const currentQuestion = queue.length > 0 ? questionMap[queue[0]] : null;
  const masteredCount = questions.length - queue.length;
  const retryDelay = getRetryDelay(questions.length);

  function showQuestionOptions() {
    setShowOptions(true);
    setFeedback(null);
  }

  async function selectAnswer(index) {
    if (!currentQuestion || feedback) return;

    const isCorrect = index === currentQuestion.correct_answer;

    // Preserve the first selected choice for final result tallying
    setAnswers((prev) => {
      if (prev[currentQuestion.id] !== undefined) return prev;
      return { ...prev, [currentQuestion.id]: index };
    });

    if (isCorrect) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let wrongCount = 0;
      if (user) {
        try {
          wrongCount = await getWrongCount({
            userId: user.id,
            questionId: currentQuestion.id,
          });
        } catch (error) {
          console.error("Failed to get wrong count:", error);
        }
      }

      setFeedback({
        type: "correct",
        selectedAnswer: index,
      });

      if (wrongCount > 0) {
        setReducePrompt({
          questionId: currentQuestion.id,
          wrongCount,
        });
      }
      return;
    }

    // Wrong Answer Handling
    setMistakeCounts((prev) => ({
      ...prev,
      [currentQuestion.id]: (prev[currentQuestion.id] || 0) + 1,
    }));

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      try {
        await incrementWrongCount({
          userId: user.id,
          questionId: currentQuestion.id,
        });
      } catch (error) {
        console.error("Failed to update wrong count:", error);
      }
    }

    setFeedback({
      type: "wrong",
      selectedAnswer: index,
    });
  }

  async function continueAfterAnswer() {
    if (!currentQuestion || !feedback) return;

    const remaining = queue.slice(1);

    if (feedback.type === "correct") {
      if (remaining.length === 0) {
        await submitQuiz();
        return;
      }

      setReducePrompt(null);
      setQueue(remaining);
      setShowOptions(false);
      setFeedback(null);
      return;
    }

    const delay = Math.min(retryDelay, remaining.length);
    const nextQueue = [
      ...remaining.slice(0, delay),
      currentQuestion.id,
      ...remaining.slice(delay),
    ];

    setReducePrompt(null);
    setQueue(nextQueue);
    setShowOptions(false);
    setFeedback(null);
  }

  async function submitQuiz() {
    if (submitting) return;

    try {
      setSubmitting(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("Please login");
        setSubmitting(false);
        return;
      }

      // Record set completion count if practicing in 30-question set mode
      if (paramTopicId && paramSetNumber) {
        const correctTally = questions.filter(
          (q) => answers[q.id] === q.correct_answer
        ).length;

        await recordSetAttempt({
          userId: user.id,
          topicId: paramTopicId,
          setNumber: paramSetNumber,
          score: correctTally,
          totalQuestions: questions.length,
        });
      }

      const quizInfo = state || {
        mode: "set",
        topicId: paramTopicId,
        setNumber: paramSetNumber,
        topicName: `Set ${paramSetNumber < 10 ? `0${paramSetNumber}` : paramSetNumber
          }`,
      };

      const attempt = await saveAttempt({
        userId: user.id,
        quizInfo,
        questions,
        answers,
        mixedPracticeRunId: state?.mixedPracticeRunId || null,
        mixedPracticeSetNumber: paramSetNumber || null,
      });

      navigate("/results", {
        state: {
          questions,
          answers,
          mistakeCounts,
          quizInfo,
          attemptId: attempt?.id,
        },
      });
    } catch (err) {
      console.error(err);
      alert("Failed to save attempt");
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="p-10">Loading Questions...</div>;
  }

  if (!questions.length) {
    return <div className="p-10">No Questions Found</div>;
  }

  if (!currentQuestion) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white border rounded-xl p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Quiz Complete</h2>
          <p className="text-gray-600">
            All questions have been answered correctly.
          </p>
        </div>
      </div>
    );
  }

  const selectedAnswer = feedback?.selectedAnswer;
  const isWrong = feedback?.type === "wrong";

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold">
          Mastered {masteredCount} / {questions.length}
        </h2>
        <span className="text-sm text-gray-500">
          {queue.length} question{queue.length !== 1 ? "s" : ""} remaining
        </span>
      </div>

      <div className="text-sm text-gray-500 mb-4">
        {isWrong
          ? `This question will return after ${Math.min(
            retryDelay,
            Math.max(1, queue.length - 1)
          )} other question${Math.min(retryDelay, Math.max(1, queue.length - 1)) !== 1
            ? "s"
            : ""
          }.`
          : "Active recall: answer from memory before revealing the options."}
      </div>

      <div className="bg-white border rounded-xl p-6">
        <h3 className="text-lg font-medium leading-7 mb-6">
          {currentQuestion.question}
        </h3>

        {!showOptions && (
          <button
            onClick={showQuestionOptions}
            className="w-full bg-black text-white px-5 py-3 rounded-xl font-medium hover:bg-gray-800 transition"
          >
            Show Options
          </button>
        )}

        {showOptions && (
          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const isCorrectOption =
                index === currentQuestion.correct_answer;

              let optionClass = "bg-white border-gray-300 hover:bg-gray-50";
              let badgeClass = "bg-gray-100 text-gray-700";

              if (feedback) {
                if (isCorrectOption) {
                  optionClass =
                    "bg-green-50 border-green-500 text-green-800";
                  badgeClass = "bg-green-500 text-white";
                } else if (isSelected && isWrong) {
                  optionClass = "bg-red-50 border-red-500 text-red-800";
                  badgeClass = "bg-red-500 text-white";
                } else {
                  optionClass = "bg-gray-50 border-gray-200 text-gray-500";
                }
              }

              return (
                <button
                  key={index}
                  onClick={() => selectAnswer(index)}
                  disabled={Boolean(feedback)}
                  className={`w-full text-left rounded-xl p-4 border transition-all duration-200 flex items-center justify-between ${optionClass} ${feedback ? "cursor-default" : "cursor-pointer"
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${badgeClass}`}
                    >
                      {String.fromCharCode(65 + index)}
                    </div>
                    <span>{option}</span>
                  </div>

                  {feedback && isCorrectOption && (
                    <span className="text-xl text-green-600">✓</span>
                  )}
                  {feedback && isSelected && isWrong && (
                    <span className="text-xl text-red-600">✗</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {feedback && (
          <div
            className={`mt-6 rounded-xl border p-5 ${feedback.type === "correct"
                ? "bg-green-50 border-green-200"
                : "bg-red-50 border-red-200"
              }`}
          >
            <div
              className={`font-bold text-lg ${feedback.type === "correct"
                  ? "text-green-700"
                  : "text-red-700"
                }`}
            >
              {feedback.type === "correct" ? "✓ Correct" : "✗ Wrong"}
            </div>

            {feedback.type === "wrong" && (
              <>
                <p className="mt-3 font-medium">
                  Correct Answer:{" "}
                  {currentQuestion.options[currentQuestion.correct_answer]}
                </p>

                {currentQuestion.explanation && (
                  <div className="mt-3 text-gray-700 whitespace-pre-line">
                    <span className="font-semibold">Explanation:</span>{" "}
                    {currentQuestion.explanation}
                  </div>
                )}

                <p className="mt-4 text-sm text-red-700">
                  You will see this question again after a few other questions.
                </p>
              </>
            )}
          </div>
        )}

        {reducePrompt && (
          <div className="mt-4 rounded-xl border border-yellow-300 bg-yellow-50 p-5">
            <p className="font-semibold text-yellow-900">
              You got this question right.
            </p>
            <p className="mt-1 text-yellow-800">
              Reduce wrong count from{" "}
              <strong>{reducePrompt.wrongCount}</strong> to{" "}
              <strong>{reducePrompt.wrongCount - 1}</strong>?
            </p>

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setReducePrompt(null)}
                className="px-4 py-2 rounded-lg border bg-white hover:bg-gray-50"
              >
                Keep {reducePrompt.wrongCount}
              </button>

              <button
                onClick={async () => {
                  const {
                    data: { user },
                  } = await supabase.auth.getUser();

                  if (!user) return;

                  try {
                    await decrementWrongCount({
                      userId: user.id,
                      questionId: reducePrompt.questionId,
                    });
                    setReducePrompt(null);
                  } catch (error) {
                    console.error("Failed to reduce wrong count:", error);
                  }
                }}
                className="px-4 py-2 rounded-lg bg-yellow-500 text-white hover:bg-yellow-600"
              >
                Reduce to {reducePrompt.wrongCount - 1}
              </button>
            </div>
          </div>
        )}
      </div>

      {showOptions && feedback && (
        <div className="flex justify-end mt-6">
          <button
            onClick={continueAfterAnswer}
            disabled={submitting}
            className="bg-black text-white px-5 py-3 rounded-xl disabled:opacity-50"
          >
            {submitting
              ? "Saving..."
              : feedback.type === "correct"
                ? queue.length === 1
                  ? "Finish Quiz"
                  : "Continue"
                : "Continue"}
          </button>
        </div>
      )}
    </div>
  );
}