import { useLocation, useNavigate } from "react-router-dom";

export default function Results() {
  const { state } = useLocation();
  const navigate = useNavigate();

  if (!state) {
    return <div className="p-10">No Result Found</div>;
  }

  const { questions, answers } = state;

  let correct = 0;

  questions.forEach((q) => {
    if (
      answers[q.id] === q.correct_answer
    ) {
      correct++;
    }
  });

  const total = questions.length;

  const wrong = total - correct;

  const percentage =
    total === 0
      ? 0
      : ((correct / total) * 100).toFixed(2);

  return (
    <div className="max-w-5xl mx-auto p-6">

      <div className="bg-white border rounded-xl p-6 mb-8">

        <h1 className="text-3xl font-bold">
          Quiz Result
        </h1>

        <div className="mt-4 space-y-2">

          <p>
            Score: {correct} / {total}
          </p>

          <p>
            Correct: {correct}
          </p>

          <p>
            Wrong: {wrong}
          </p>

          <p>
            Percentage: {percentage}%
          </p>

        </div>

        <button
          onClick={() => navigate("/")}
          className="mt-6 bg-black text-white px-4 py-2 rounded"
        >
          Back To Home
        </button>

      </div>

      <div className="space-y-6">

        {questions.map((q, index) => {
          const userAnswer =
            answers[q.id];

          const isCorrect =
            userAnswer ===
            q.correct_answer;

          return (
            <div
              key={q.id}
              className="border rounded-xl p-5 bg-white"
            >
              <h3 className="font-semibold mb-4">
                {index + 1}. {q.question}
              </h3>

              <p>
                Your Answer:
                {" "}
                {userAnswer !== undefined
                  ? q.options[userAnswer]
                  : "Not Answered"}
              </p>

              <p>
                Correct Answer:
                {" "}
                {
                  q.options[
                  q.correct_answer
                  ]
                }
              </p>

              <p>
                Status:
                {" "}
                {isCorrect
                  ? "✅ Correct"
                  : "❌ Wrong"}
              </p>

              {q.explanation && (
                <p className="mt-2 text-gray-600">
                  Explanation:
                  {" "}
                  {q.explanation}
                </p>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}