import { supabase } from '../api/supabase';

const SET_SIZE = 30;

/**
 * Deterministic pseudo-random number generator (Mulberry32)
 */
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministically shuffles an array in-place based on a numeric seed.
 * Identical seed + identical input = 100% identical shuffled output.
 */
function seededShuffle(array, seed) {
  const rng = mulberry32(seed);
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Standard question selector for topic/subtopic practice
 */
export function selectQuestions(candidateQuestions = [], attemptCounts = {}, targetCount = 30) {
  if (!candidateQuestions.length) return [];
  const count = Math.min(targetCount || 30, candidateQuestions.length);

  const sorted = [...candidateQuestions].sort((a, b) => {
    const attemptsA = attemptCounts[a.id] || 0;
    const attemptsB = attemptCounts[b.id] || 0;
    return attemptsA - attemptsB;
  });

  return sorted.slice(0, count);
}

/**
 * Returns available sets for a topic and user attempt stats
 */
export async function getTopicSetsSummary(topicId, userId) {
  const { count, error: countError } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .eq('topic_id', topicId);

  if (countError) throw countError;

  const totalQuestions = count || 0;
  const fullSetsCount = Math.floor(totalQuestions / SET_SIZE);
  const remainder = totalQuestions % SET_SIZE;

  let attempts = [];
  if (userId) {
    const { data: attemptData } = await supabase
      .from('set_attempts')
      .select('set_number, score, total_questions, completed_at')
      .eq('topic_id', topicId)
      .eq('user_id', userId);

    if (attemptData) {
      attempts = attemptData;
    }
  }

  const sets = [];
  for (let i = 1; i <= fullSetsCount; i++) {
    const setAttempts = attempts.filter((a) => a.set_number === i);
    const attemptCount = setAttempts.length;
    const bestScore =
      attemptCount > 0 ? Math.max(...setAttempts.map((a) => a.score)) : null;

    sets.push({
      setNumber: i,
      startIdx: (i - 1) * SET_SIZE + 1,
      endIdx: i * SET_SIZE,
      totalQuestions: SET_SIZE,
      isPartial: false,
      attemptCount,
      bestScore,
    });
  }

  // Leftover questions form the next set without affecting completed sets
  if (remainder > 0) {
    const partialSetNumber = fullSetsCount + 1;
    const setAttempts = attempts.filter((a) => a.set_number === partialSetNumber);
    const attemptCount = setAttempts.length;
    const bestScore =
      attemptCount > 0 ? Math.max(...setAttempts.map((a) => a.score)) : null;

    sets.push({
      setNumber: partialSetNumber,
      startIdx: fullSetsCount * SET_SIZE + 1,
      endIdx: totalQuestions,
      totalQuestions: remainder,
      isPartial: true,
      attemptCount,
      bestScore,
    });
  }

  return { totalQuestions, fullSetsCount, sets };
}

/**
 * Deterministically fetches a non-overlapping slice of 30 questions
 * and shuffles them randomly using the setNumber as a permanent seed.
 */
export async function fetchSetQuestions(topicId, setNumber) {
  const from = (setNumber - 1) * SET_SIZE;
  const to = from + SET_SIZE - 1;

  // 1. Fetch the exact slice based on insertion timeline (never changes for past sets)
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('topic_id', topicId)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
    .range(from, to);

  if (error) throw error;
  if (!data || data.length === 0) return [];

  // 2. Deterministically shuffle questions within this set using a fixed seed (e.g., setNumber * 9973)
  // Ensures variety inside the set while keeping membership and order 100% immutable
  const setSeed = Number(setNumber) * 9973;
  return seededShuffle(data, setSeed);
}

/**
 * Saves a completed set attempt
 */
export async function recordSetAttempt({ userId, topicId, setNumber, score, totalQuestions }) {
  if (!userId) return null;

  const { data, error } = await supabase
    .from('set_attempts')
    .insert([
      {
        user_id: userId,
        topic_id: topicId,
        set_number: setNumber,
        score,
        total_questions: totalQuestions,
      },
    ])
    .select();

  if (error) console.error('Failed to record set attempt:', error);
  return data;
}