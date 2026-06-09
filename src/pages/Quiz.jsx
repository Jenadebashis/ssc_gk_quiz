import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../api/supabase";
import { saveAttempt } from "../api/attempt";

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
    let query = supabase
      .from("questions")
      .select("*");

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

    const { data, error } =
      await query;

    if (error) {
      console.error(error);
      return;
    }

    const shuffled = [...data]
      .sort(() => Math.random() - 0.5)
      .slice(0, state.questionCount);

    setQuestions(shuffled);
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
                className={`block w-full text-left border rounded p-3

                ${answers[
                    question.id
                  ] === index
                    ? "border-black"
                    : ""
                  }`}
              >
                {option}
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