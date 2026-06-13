export function selectQuestions(
  questions,
  attemptCounts,
  limit
) {
  const grouped = {};

  questions.forEach((q) => {
    const count =
      attemptCounts[q.id] || 0;

    if (!grouped[count]) {
      grouped[count] = [];
    }

    grouped[count].push(q);
  });

  Object.values(grouped).forEach(
    (arr) =>
      arr.sort(
        () => Math.random() - 0.5
      )
  );

  const ordered = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => a - b)
    .flatMap(
      (count) => grouped[count]
    );

  return ordered.slice(0, limit);
}