import React from 'react';

export default function QuestionCard({ question, selectedAnswer, onSelectAnswer }) {
  if (!question) return null;

  // Normalize options to an array of { index, key, text }
  const getNormalizedOptions = () => {
    if (Array.isArray(question.options)) {
      return question.options.map((opt, idx) => ({
        index: idx,
        key: String.fromCharCode(65 + idx),
        text: typeof opt === 'object' && opt !== null ? opt.text || opt.label || JSON.stringify(opt) : String(opt)
      }));
    }

    if (question.options && typeof question.options === 'object') {
      return Object.entries(question.options).map(([key, text], idx) => ({
        index: idx,
        key: String(key).toUpperCase(),
        text: String(text)
      }));
    }

    const flatOptions = [];
    ['a', 'b', 'c', 'd', 'e'].forEach((letter, idx) => {
      const col = question[`option_${letter}`] || question[`option${letter.toUpperCase()}`];
      if (col !== undefined && col !== null && String(col).trim() !== '') {
        flatOptions.push({
          index: idx,
          key: letter.toUpperCase(),
          text: String(col)
        });
      }
    });

    return flatOptions;
  };

  const options = getNormalizedOptions();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-lg md:text-xl font-semibold text-gray-900 leading-relaxed">
          {question.question || question.question_text || question.title}
        </p>
      </div>

      <div className="space-y-3">
        {options.map((option) => {
          // Compare both index numbers and letter keys
          const isSelected =
            selectedAnswer !== undefined &&
            selectedAnswer !== null &&
            (selectedAnswer === option.index ||
              String(selectedAnswer).trim().toLowerCase() === option.key.toLowerCase());

          return (
            <button
              key={option.key}
              type="button"
              onClick={() => onSelectAnswer(option.index)} // Pass integer index (0, 1, 2, ...)
              className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3.5 ${isSelected
                  ? 'border-blue-600 bg-blue-50/70 shadow-sm text-blue-950 font-medium ring-1 ring-blue-500'
                  : 'border-gray-200 bg-white hover:bg-gray-50/80 text-gray-700 hover:border-gray-300'
                }`}
            >
              <span
                className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 transition-colors ${isSelected
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 border border-gray-200'
                  }`}
              >
                {option.key}
              </span>
              <span className="text-sm md:text-base leading-snug pt-0.5">
                {option.text}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { QuestionCard };