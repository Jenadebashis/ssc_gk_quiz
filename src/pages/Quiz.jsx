import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../api/supabase";
import { saveAttempt } from "../api/attempt";
import { selectQuestions } from "../utils/questionSelectior";

function getRetryDelay(totalQuestions) {
  return Math.min(
    3,
    Math.max(1, Math.floor(totalQuestions / 4))
  );
}

export default function Quiz() {
  const { state } = useLocation();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);
  const [queue, setQueue] = useState([]);
  const [answers, setAnswers] = useState({});
  const [mistakeCounts, setMistakeCounts] = useState({});

  const [showOptions, setShowOptions] =
    useState(false);

  const [feedback, setFeedback] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  useEffect(() => {
    loadQuestions();
  }, []);

  async function loadQuestions() {
    if (!state) {
      navigate("/");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      navigate("/login");
      return;
    }

    let query = supabase
      .from("questions")
      .select("*");

    if (state.mode === "set") {
      if (
        !Array.isArray(state.questionIds) ||
        !state.questionIds.length
      ) {
        setQuestions([]);
        setLoading(false);
        return;
      }

      const {
        data: fetchedQuestions,
        error,
      } = await query.in(
        "id",
        state.questionIds
      );

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      const questionMap =
        Object.fromEntries(
          (fetchedQuestions || []).map(
            (question) => [
              question.id,
              question,
            ]
          )
        );

      const orderedQuestions =
        state.questionIds
          .map((id) => questionMap[id])
          .filter(Boolean);

      setQuestions(orderedQuestions);

      setQueue(
        orderedQuestions.map(
          (q) => q.id
        )
      );

      setLoading(false);
      return;
    }

    if (state.mode === "wrong-questions") {
      const {
        data,
        error,
      } = await supabase
        .from("attempt_answers")
        .select(`
          *,
          questions(*)
        `)
        .eq("user_id", user.id)
        .order("answered_at", {
          ascending: false,
        });

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      const latestByQuestion = {};

      data?.forEach((row) => {
        if (
          !latestByQuestion[
          row.question_id
          ]
        ) {
          latestByQuestion[
            row.question_id
          ] = row;
        }
      });

      const wrongQuestions =
        Object.values(
          latestByQuestion
        )
          .filter(
            (row) =>
              !row.is_correct &&
              row.questions
          )
          .map(
            (row) => row.questions
          );

      setQuestions(wrongQuestions);

      setQueue(
        wrongQuestions.map(
          (q) => q.id
        )
      );

      setLoading(false);
      return;
    }

    if (state.mode === "topic") {
      query = query.eq(
        "topic_id",
        state.topicId
      );
    }

    if (state.mode === "subtopic") {
      query = query.eq(
        "subtopic_id",
        state.subtopicId
      );
    }

    const {
      data: candidateQuestions,
      error,
    } = await query;

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    const questionIds =
      candidateQuestions.map(
        (q) => q.id
      );

    let attemptData = [];

    if (questionIds.length) {
      const { data } =
        await supabase
          .from("attempt_answers")
          .select("question_id")
          .eq(
            "user_id",
            user.id
          )
          .in(
            "question_id",
            questionIds
          );

      attemptData = data || [];
    }

    const attemptCounts = {};

    attemptData.forEach((row) => {
      attemptCounts[
        row.question_id
      ] =
        (attemptCounts[
          row.question_id
        ] || 0) + 1;
    });

    const selectedQuestions =
      selectQuestions(
        candidateQuestions,
        attemptCounts,
        state.questionCount
      );

    setQuestions(selectedQuestions);

    setQueue(
      selectedQuestions.map(
        (q) => q.id
      )
    );

    setLoading(false);
  }

  const questionMap = useMemo(() => {
    return Object.fromEntries(
      questions.map(
        (question) => [
          question.id,
          question,
        ]
      )
    );
  }, [questions]);

  const currentQuestion =
    queue.length > 0
      ? questionMap[queue[0]]
      : null;

  const masteredCount =
    questions.length -
    queue.length;

  const retryDelay =
    getRetryDelay(
      questions.length
    );

  function showQuestionOptions() {
    setShowOptions(true);
    setFeedback(null);
  }

  function selectAnswer(index) {
    if (
      !currentQuestion ||
      feedback
    ) {
      return;
    }

    const isCorrect =
      index ===
      currentQuestion.correct_answer;

    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]:
        index,
    }));

    if (isCorrect) {
      setFeedback({
        type: "correct",
        selectedAnswer: index,
      });

      return;
    }

    setMistakeCounts((prev) => ({
      ...prev,
      [currentQuestion.id]:
        (prev[
          currentQuestion.id
        ] || 0) + 1,
    }));

    setFeedback({
      type: "wrong",
      selectedAnswer: index,
    });
  }

  async function continueAfterAnswer() {
    if (
      !currentQuestion ||
      !feedback
    ) {
      return;
    }

    const remaining =
      queue.slice(1);

    if (
      feedback.type ===
      "correct"
    ) {
      if (
        remaining.length === 0
      ) {
        await submitQuiz();
        return;
      }

      setQueue(remaining);
      setShowOptions(false);
      setFeedback(null);

      return;
    }

    const delay = Math.min(
      retryDelay,
      remaining.length
    );

    const nextQueue = [
      ...remaining.slice(
        0,
        delay
      ),
      currentQuestion.id,
      ...remaining.slice(delay),
    ];

    setQueue(nextQueue);
    setShowOptions(false);
    setFeedback(null);
  }

  async function submitQuiz() {
    if (submitting) {
      return;
    }

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

      const attempt =
        await saveAttempt({
          userId: user.id,
          quizInfo: state,
          questions,
          answers,
        });

      navigate("/results", {
        state: {
          questions,
          answers,
          mistakeCounts,
          quizInfo: state,
          attemptId:
            attempt.id,
        },
      });
    } catch (err) {
      console.error(err);
      alert("Failed to save attempt");
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-10">
        Loading Questions...
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="p-10">
        No Questions Found
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white border rounded-xl p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">
            Quiz Complete
          </h2>

          <p className="text-gray-600">
            All questions have been answered correctly.
          </p>
        </div>
      </div>
    );
  }

  const selectedAnswer =
    feedback?.selectedAnswer;

  const isWrong =
    feedback?.type ===
    "wrong";

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold">
          Mastered {masteredCount} /{" "}
          {questions.length}
        </h2>

        <span className="text-sm text-gray-500">
          {queue.length} question
          {queue.length !== 1
            ? "s"
            : ""}{" "}
          remaining
        </span>
      </div>

      <div className="text-sm text-gray-500 mb-4">
        {isWrong
          ? `This question will return after ${Math.min(
            retryDelay,
            Math.max(
              1,
              queue.length - 1
            )
          )} other question${Math.min(
            retryDelay,
            Math.max(
              1,
              queue.length - 1
            )
          ) !== 1
            ? "s"
            : ""}.`
          : "Active recall: answer from memory before revealing the options."}
      </div>

      <div className="bg-white border rounded-xl p-6">
        <h3 className="text-lg font-medium leading-7 mb-6">
          {currentQuestion.question}
        </h3>

        {!showOptions && (
          <button
            onClick={
              showQuestionOptions
            }
            className="w-full bg-black text-white px-5 py-3 rounded-xl font-medium hover:bg-gray-800 transition"
          >
            Show Options
          </button>
        )}

        {showOptions && (
          <div className="space-y-3">
            {currentQuestion.options.map(
              (
                option,
                index
              ) => {
                const isSelected =
                  selectedAnswer ===
                  index;

                const isCorrectOption =
                  index ===
                  currentQuestion.correct_answer;

                let optionClass =
                  "bg-white border-gray-300 hover:bg-gray-50";

                let badgeClass =
                  "bg-gray-100 text-gray-700";

                if (feedback) {
                  if (
                    isCorrectOption
                  ) {
                    optionClass =
                      "bg-green-50 border-green-500 text-green-800";

                    badgeClass =
                      "bg-green-500 text-white";
                  } else if (
                    isSelected &&
                    isWrong
                  ) {
                    optionClass =
                      "bg-red-50 border-red-500 text-red-800";

                    badgeClass =
                      "bg-red-500 text-white";
                  } else {
                    optionClass =
                      "bg-gray-50 border-gray-200 text-gray-500";
                  }
                }

                return (
                  <button
                    key={index}
                    onClick={() =>
                      selectAnswer(
                        index
                      )
                    }
                    disabled={Boolean(
                      feedback
                    )}
                    className={`w-full text-left rounded-xl p-4 border transition-all duration-200 flex items-center justify-between ${optionClass} ${feedback
                      ? "cursor-default"
                      : "cursor-pointer"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${badgeClass}`}
                      >
                        {String.fromCharCode(
                          65 + index
                        )}
                      </div>

                      <span>
                        {option}
                      </span>
                    </div>

                    {feedback &&
                      isCorrectOption && (
                        <span className="text-xl text-green-600">
                          ✓
                        </span>
                      )}

                    {feedback &&
                      isSelected &&
                      isWrong && (
                        <span className="text-xl text-red-600">
                          ✗
                        </span>
                      )}
                  </button>
                );
              }
            )}
          </div>
        )}

        {feedback && (
          <div
            className={`mt-6 rounded-xl border p-5 ${feedback.type ===
              "correct"
              ? "bg-green-50 border-green-200"
              : "bg-red-50 border-red-200"
              }`}
          >
            <div
              className={`font-bold text-lg ${feedback.type ===
                "correct"
                ? "text-green-700"
                : "text-red-700"
                }`}
            >
              {feedback.type ===
                "correct"
                ? "✓ Correct"
                : "✗ Wrong"}
            </div>

            {feedback.type ===
              "wrong" && (
                <>
                  <p className="mt-3 font-medium">
                    Correct Answer:{" "}
                    {
                      currentQuestion
                        .options[
                      currentQuestion
                        .correct_answer
                      ]
                    }
                  </p>

                  {currentQuestion.explanation && (
                    <div className="mt-3 text-gray-700 whitespace-pre-line">
                      <span className="font-semibold">
                        Explanation:
                      </span>{" "}
                      {
                        currentQuestion.explanation
                      }
                    </div>
                  )}

                  <p className="mt-4 text-sm text-red-700">
                    You will see this question again after a few other questions.
                  </p>
                </>
              )}
          </div>
        )}
      </div>

      {showOptions &&
        feedback && (
          <div className="flex justify-end mt-6">
            <button
              onClick={
                continueAfterAnswer
              }
              disabled={submitting}
              className="bg-black text-white px-5 py-3 rounded-xl disabled:opacity-50"
            >
              {submitting
                ? "Saving..."
                : feedback.type ===
                  "correct"
                  ? queue.length ===
                    1
                    ? "Finish Quiz"
                    : "Continue"
                  : "Continue"}
            </button>
          </div>
        )}
    </div>
  );
}