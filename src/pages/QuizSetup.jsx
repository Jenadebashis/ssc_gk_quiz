import { useLocation, useNavigate } from "react-router-dom";

export default function QuizSetup() {
  const navigate = useNavigate();
  const { state } = useLocation();

  if (!state) {
    return (
      <div className="p-10">
        Invalid Quiz Setup
      </div>
    );
  }

  const counts = [10, 20, 30, 50, 100];

  function startQuiz(questionCount) {
    navigate("/quiz", {
      state: {
        ...state,
        questionCount,
      },
    });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-xl mx-auto p-8">

        <h1 className="text-3xl font-bold mb-3">

          {
            state.topicName ||
            state.subtopicName ||
            "Mixed Practice"
          }

        </h1>

        <p className="text-gray-500 mb-8">
          Choose number of questions
        </p>

        <div className="grid grid-cols-2 gap-4">

          {counts.map((count) => (
            <button
              key={count}
              onClick={() => startQuiz(count)}
              className="bg-white border rounded-xl p-6 text-xl font-semibold hover:shadow"
            >
              {count}
            </button>
          ))}

        </div>

      </div>
    </div>
  );
}