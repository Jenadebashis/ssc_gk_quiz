import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../api/supabase";
import { saveAttempt } from "../api/attempt";
import { selectQuestions } from "../utils/questionSelectior";

export default function Quiz() {
  const { state } = useLocation();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);

  const [answers, setAnswers] = useState({});

  const [loading, setLoading] = useState(true);

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

    let query = supabase
      .from("questions")
      .select("*");

    if (state.mode === "wrong-questions") {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data } = await supabase
        .from("attempt_answers")
        .select(`
      *,
      questions(*)
    `)
        .eq("user_id", user.id)
        .order("answered_at", {
          ascending: false,
        });

      const latestByQuestion = {};

      data.forEach((row) => {
        if (!latestByQuestion[row.question_id]) {
          latestByQuestion[row.question_id] = row;
        }
      });

      const wrongQuestions = Object.values(
        latestByQuestion
      )
        .filter((row) => !row.is_correct)
        .map((row) => row.questions);

      setQuestions(wrongQuestions);
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
      return;
    }

    const questionIds =
      candidateQuestions.map((q) => q.id);

    const {
      data: attemptData,
    } = await supabase
      .from("attempt_answers")
      .select("question_id")
      .eq("user_id", user.id)
      .in("question_id", questionIds);

    const attemptCounts = {};

    attemptData?.forEach((row) => {
      attemptCounts[row.question_id] =
        (attemptCounts[row.question_id] || 0) + 1;
    });

    const selectedQuestions =
      selectQuestions(
        candidateQuestions,
        attemptCounts,
        state.questionCount
      );

    setQuestions(selectedQuestions);

    setLoading(false);
  }

  function selectAnswer(index) {
    setAnswers((prev) => ({
      ...prev,
      [questions[current].id]: index,
    }));
  }

  function nextQuestion() {
    if (current < questions.length - 1) {
      setCurrent((prev) => prev + 1);
    }
  }

  function prevQuestion() {
    if (current > 0) {
      setCurrent((prev) => prev - 1);
    }
  }

  async function submitQuiz() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("Please login");
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
          quizInfo: state,
          attemptId: attempt.id,
        },
      });
    } catch (err) {
      console.error(err);
      alert("Failed to save attempt");
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

  const question =
    questions[current];

  return (
    <div className="max-w-4xl mx-auto p-6">

      <h2 className="text-xl font-bold mb-2">
        Question {current + 1} / {questions.length}
      </h2>

      <div className="bg-white border rounded-xl p-6">

        <h3 className="text-lg font-medium mb-6">
          {question.question}
        </h3>

        <div className="space-y-3">
          {question.options.map(
            (option, index) => (
              <button
                key={index}
                onClick={() =>
                  selectAnswer(index)
                }
                className={`w-full text-left rounded-xl p-4 border transition-all duration-200 flex items-center justify-between

        ${answers[question.id] === index
                    ? "bg-green-500 text-white border-green-600 shadow-lg"
                    : "bg-white border-gray-300 hover:bg-green-50 hover:border-green-400"
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold

            ${answers[question.id] ===
                        index
                        ? "bg-white text-green-600"
                        : "bg-gray-100"
                      }`}
                  >
                    {String.fromCharCode(
                      65 + index
                    )}
                  </div>

                  <span>{option}</span>
                </div>

                {answers[question.id] ===
                  index && (
                    <span className="text-xl">
                      ✓
                    </span>
                  )}
              </button>
            )
          )}
        </div>

      </div>

      <div className="flex justify-between mt-6">

        <button
          onClick={prevQuestion}
          disabled={current === 0}
          className="border px-4 py-2 rounded"
        >
          Previous
        </button>

        {current ===
          questions.length - 1 ? (
          <button
            onClick={submitQuiz}
            className="bg-black text-white px-4 py-2 rounded"
          >
            Submit Quiz
          </button>
        ) : (
          <button
            onClick={nextQuestion}
            className="bg-black text-white px-4 py-2 rounded"
          >
            Next
          </button>
        )}

      </div>

    </div>
  );
}