import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function Results() {
  const { state } = useLocation();
  const navigate = useNavigate();

  const [showIncorrectOnly, setShowIncorrectOnly] =
    useState(false);

  if (!state) {
    return <div className="p-10">No Result Found</div>;
  }

  const { questions, answers, mistakeCounts = {} } = state;

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
  const totalMistakes = Object.values(mistakeCounts).reduce(
    (sum, count) => sum + count,
    0
  );

  const percentage =
    total === 0
      ? 0
      : ((correct / total) * 100).toFixed(2);

  const questionsWithMistakes = questions.filter(
    (q) => (mistakeCounts[q.id] || 0) > 0
  ).length;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="bg-white border rounded-xl p-6 mb-8">
        <h2 className="text-lg text-gray-600 mt-2">
          {state.quizInfo?.topicName ||
            state.quizInfo?.subtopicName ||
            "Mixed Practice"}
        </h2>

        <div className="mt-4 space-y-2">
          <p>
            Score: {correct} / {total}
          </p>
          <p>Mastered: {correct}</p>
          <p>Unresolved: {wrong}</p>
          <p>Retry mistakes: {totalMistakes}</p>
          <p>Percentage: {percentage}%</p>
        </div>

        <button
          onClick={() => navigate("/")}
          className="mt-6 bg-black text-white px-4 py-2 rounded"
        >
          Back To Home
        </button>
      </div>

      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setShowIncorrectOnly(false)}
          className={`px-4 py-2 rounded ${
            !showIncorrectOnly
              ? "bg-black text-white"
              : "border"
          }`}
        >
          All Questions
        </button>

        <button
          onClick={() => setShowIncorrectOnly(true)}
          className={`px-4 py-2 rounded ${
            showIncorrectOnly
              ? "bg-black text-white"
              : "border"
          }`}
        >
          Questions With Mistakes ({questionsWithMistakes})
        </button>
      </div>

      <div className="space-y-6">
        {questions
          .filter((q) => {
            if (!showIncorrectOnly) {
              return true;
            }

            return (mistakeCounts[q.id] || 0) > 0;
          })
          .map((q, index) => {
            const userAnswer = answers[q.id];
            const isCorrect =
              userAnswer === q.correct_answer;
            const mistakes = mistakeCounts[q.id] || 0;

            return (
              <div
                key={q.id}
                className="border rounded-xl p-5 bg-white"
              >
                <h3 className="font-semibold mb-4">
                  {index + 1}. {q.question}
                </h3>

                <p>
                  Final Answer: {" "}
                  {userAnswer !== undefined
                    ? q.options[userAnswer]
                    : "Not Answered"}
                </p>

                <p>
                  Correct Answer: {" "}
                  {q.options[q.correct_answer]}
                </p>

                <p>
                  Status: {" "}
                  {isCorrect
                    ? "✅ Mastered"
                    : "❌ Unresolved"}
                </p>

                {mistakes > 0 && (
                  <p>
                    Wrong Attempts: {mistakes}
                  </p>
                )}

                {q.explanation && (
                  <p className="mt-2 text-gray-600 whitespace-pre-line">
                    Explanation: {q.explanation}
                  </p>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
