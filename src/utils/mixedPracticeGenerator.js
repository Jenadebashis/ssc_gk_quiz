const SET_SIZE = 50;

// The values below are the normal 50-question PYQ-weighted composition.
export const SUBJECT_CONFIG = [
  {
    key: "Computer Networks",
    weight: 7,
    topicNames: ["Computer Networks"],
  },
  {
    key: "Programming",
    weight: 7,
    topicNames: ["Programming Concepts"],
  },
  {
    key: "DBMS",
    weight: 6,
    topicNames: ["DBMS"],
  },
  {
    key: "Cyber Security",
    weight: 5,
    topicNames: ["Cyber Security"],
  },
  {
    key: "DSA",
    weight: 5,
    topicNames: ["DS & ALGO"],
  },
  {
    key: "OS",
    weight: 4,
    topicNames: ["Operating System"],
  },
  {
    key: "SE",
    weight: 3,
    topicNames: ["Software Engineering"],
  },
  {
    key: "Cloud",
    weight: 3,
    topicNames: ["Cloud Computing"],
  },
  {
    key: "COA",
    weight: 2,
    topicNames: [
      "Computer Organisation & Architecture",
    ],
  },
  {
    key: "Web",
    weight: 2,
    topicNames: ["Web Technology"],
  },
  {
    key: "UNIX",
    weight: 2,
    topicNames: [
      "UNIX & Shell Scripting",
    ],
  },
  {
    key: "Banking IT",
    weight: 2,
    topicNames: ["Banking IT"],
  },
  {
    key: "Misc",
    weight: 2,
    topicNames: [
      "Miscellenous topic",
    ],
  },
];

function normalizeName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function randomInt(max) {
  return Math.floor(Math.random() * max);
}

function randomChoice(array) {
  return array[randomInt(array.length)];
}

function shuffle(array) {
  const result = [...array];

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function naturalCompare(a, b) {
  return String(a).localeCompare(String(b), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function matchesAnyTopic(topicName, aliases) {
  const normalizedTopic = normalizeName(topicName);
  return aliases.some(
    (alias) => normalizeName(alias) === normalizedTopic
  );
}

function createSubjectBuckets(topics) {
  return SUBJECT_CONFIG.map((config) => {
    const matchedTopics = topics.filter((topic) =>
      matchesAnyTopic(topic.name, config.topicNames)
    );

    return {
      ...config,
      topicIds: matchedTopics.map((topic) => topic.id),
      topicNamesResolved: matchedTopics.map((topic) => topic.name),
    };
  });
}

function spreadSelect(items, count) {
  if (count <= 0 || items.length === 0) return [];
  if (count >= items.length) return [...items];

  // Keep the source order intact, split it into `count` sections,
  // then randomly take one question from each section.
  const selected = [];

  for (let i = 0; i < count; i += 1) {
    const start = Math.floor((i * items.length) / count);
    const end = Math.floor(((i + 1) * items.length) / count);
    const section = items.slice(start, Math.max(start + 1, end));

    selected.push(randomChoice(section));
  }

  return selected;
}

function removeSelected(items, selectedIds) {
  const selected = new Set(selectedIds);
  return items.filter((item) => !selected.has(item.id));
}

function normalAllocation(remainingBySubject, setSize) {
  const allocation = {};

  for (const subject of SUBJECT_CONFIG) {
    const remaining = remainingBySubject[subject.key]?.length || 0;
    allocation[subject.key] = Math.min(subject.weight, remaining);
  }

  return allocation;
}

function canUseNormalAllocation(remainingBySubject, setSize) {
  if (setSize < SET_SIZE) return false;

  return SUBJECT_CONFIG.every((subject) => {
    const remaining = remainingBySubject[subject.key]?.length || 0;
    return remaining > subject.weight;
  });
}

function rebalanceAllocation(remainingBySubject, setSize) {
  const active = SUBJECT_CONFIG.filter(
    (subject) => (remainingBySubject[subject.key]?.length || 0) > 0
  );

  if (!active.length || setSize <= 0) return {};

  const totalRemaining = active.reduce(
    (sum, subject) =>
      sum + (remainingBySubject[subject.key]?.length || 0),
    0
  );

  const raw = {};
  const allocation = {};
  const minimum = {};
  const maximum = {};

  const activeMinimum = setSize >= active.length ? 1 : 0;

  // Prevent one subject from taking over the set. The cap is 30% of a
  // normal 50-question set, but it can never exceed that subject's inventory.
  const baseMax = Math.max(1, Math.ceil(setSize * 0.3));

  for (const subject of active) {
    const remaining = remainingBySubject[subject.key].length;
    const share = remaining / totalRemaining;

    raw[subject.key] = share * setSize;
    minimum[subject.key] = Math.min(activeMinimum, remaining);
    const proportionalCap = Math.ceil(
      (setSize / active.length) * 1.5
    );

    maximum[subject.key] = Math.min(
      remaining,
      Math.max(
        baseMax,
        proportionalCap,
        Math.ceil(raw[subject.key])
      )
    );

    allocation[subject.key] = Math.min(
      maximum[subject.key],
      Math.max(minimum[subject.key], Math.floor(raw[subject.key]))
    );
  }

  let allocated = Object.values(allocation).reduce(
    (sum, value) => sum + value,
    0
  );

  // Add the rounding leftovers. Larger proportional deficits get priority;
  // equal deficits are randomized so the same subjects do not always win ties.
  while (allocated < setSize) {
    const candidates = active.filter(
      (subject) =>
        allocation[subject.key] < maximum[subject.key]
    );

    if (!candidates.length) break;

    const shuffled = shuffle(candidates);
    shuffled.sort(
      (a, b) =>
        raw[b.key] - allocation[b.key] -
        (raw[a.key] - allocation[a.key])
    );

    const selected = shuffled[0];
    allocation[selected.key] += 1;
    allocated += 1;
  }

  // If minimums forced us above the target, remove the least-needed slots.
  while (allocated > setSize) {
    const candidates = active.filter(
      (subject) =>
        allocation[subject.key] > minimum[subject.key]
    );

    if (!candidates.length) break;

    const shuffled = shuffle(candidates);
    shuffled.sort(
      (a, b) =>
        (raw[a.key] - allocation[a.key]) -
        (raw[b.key] - allocation[b.key])
    );

    const selected = shuffled[0];
    allocation[selected.key] -= 1;
    allocated -= 1;
  }

  return allocation;
}

export async function resolveSubjects(topics) {
  const buckets = createSubjectBuckets(topics);

  return buckets;
}

export async function generateMixedSets({
  topics,
  fetchQuestionsForTopics,
}) {
  const subjects = createSubjectBuckets(topics);

  const missingSubjects = subjects.filter(
    (subject) => subject.topicIds.length === 0
  );

  if (missingSubjects.length) {
    throw new Error(
      `Missing topic mapping for: ${missingSubjects
        .map((subject) => subject.key)
        .join(", ")}`
    );
  }

  const inventory = {};

  for (const subject of subjects) {
    // fetchQuestionsForTopics must return questions in their original
    // topic -> subtopic -> question order. We preserve that order here.
    const ordered = await fetchQuestionsForTopics(
      subject.topicIds
    );

    inventory[subject.key] = ordered.map((question) => ({
      id: question.id,
      topic_id: question.topic_id,
      subtopic_id: question.subtopic_id,
      subject: subject.key,
    }));
  }

  const totalInventory = Object.values(inventory).reduce(
    (sum, questions) => sum + questions.length,
    0
  );

  if (totalInventory === 0) {
    throw new Error("No questions available for mixed practice.");
  }

  const sets = [];
  let setNumber = 1;

  while (Object.values(inventory).some((items) => items.length > 0)) {
    const totalRemaining = Object.values(inventory).reduce(
      (sum, questions) => sum + questions.length,
      0
    );

    const setSize = Math.min(SET_SIZE, totalRemaining);
    const useNormal = canUseNormalAllocation(inventory, setSize);

    const allocation = useNormal
      ? normalAllocation(inventory, setSize)
      : rebalanceAllocation(inventory, setSize);

    // Shuffle subject order so rounding leftovers never create a fixed subject order.
    const subjectOrder = shuffle(
      subjects.filter((subject) => (allocation[subject.key] || 0) > 0)
    );

    const selected = [];

    for (const subject of subjectOrder) {
      const count = allocation[subject.key] || 0;
      if (count <= 0) continue;

      const selectedFromSubject = spreadSelect(
        inventory[subject.key],
        Math.min(count, inventory[subject.key].length)
      );

      selected.push(...selectedFromSubject);
      inventory[subject.key] = removeSelected(
        inventory[subject.key],
        selectedFromSubject.map((question) => question.id)
      );
    }

    // This should only be needed if a defensive allocation edge case occurs.
    // Fill the shortfall from the remaining inventory without duplication.
    if (selected.length < setSize) {
      const shortfall = setSize - selected.length;
      const remainingPool = shuffle(
        Object.values(inventory).flat()
      );
      const fill = remainingPool.slice(0, shortfall);

      selected.push(...fill);

      const fillIds = new Set(fill.map((question) => question.id));
      for (const subject of subjects) {
        inventory[subject.key] = inventory[subject.key].filter(
          (question) => !fillIds.has(question.id)
        );
      }
    }

    sets.push({
      number: setNumber,
      size: selected.length,
      strategy: useNormal ? "pyq-weighted" : "remaining-inventory",
      questions: shuffle(selected),
    });

    setNumber += 1;
  }

  return {
    totalQuestions: totalInventory,
    sets,
  };
}
