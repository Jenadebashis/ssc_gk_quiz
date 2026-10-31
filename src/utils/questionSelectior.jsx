import { supabase } from '../api/supabase';

const SET_SIZE = 30;

/**
 * Returns available sets for a topic and user attempt stats
 */
export async function getTopicSetsSummary(topicId, userId) {
  // 1. Get total question count for this topic
  const { count, error: countError } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .eq('topic_id', topicId);

  if (countError) throw countError;

  const totalQuestions = count || 0;
  const fullSetsCount = Math.floor(totalQuestions / SET_SIZE);
  const remainder = totalQuestions % SET_SIZE;

  // 2. Fetch past attempts by this user for this topic
  let attempts = [];
  if (userId) {
    const { data: attemptData, error: attemptError } = await supabase
      .from('set_attempts')
      .select('set_number, score, total_questions, completed_at')
      .eq('topic_id', topicId)
      .eq('user_id', userId);

    if (!attemptError && attemptData) {
      attempts = attemptData;
    }
  }

  // 3. Map into deterministic sets
  const sets = [];
  for (let i = 1; i <= fullSetsCount; i++) {
    const setAttempts = attempts.filter((a) => a.set_number === i);
    const attemptCount = setAttempts.length;
    const bestScore = attemptCount > 0 ? Math.max(...setAttempts.map((a) => a.score)) : null;

    sets.push({
      setNumber: i,
      startIdx: (i - 1) * SET_SIZE + 1,
      endIdx: i * SET_SIZE,
      totalQuestions: SET_SIZE,
      isPartial: false,
      attemptCount,
      bestScore
    });
  }

  // Partial leftover set (if any)
  if (remainder > 0) {
    const partialSetNumber = fullSetsCount + 1;
    const setAttempts = attempts.filter((a) => a.set_number === partialSetNumber);
    const attemptCount = setAttempts.length;
    const bestScore = attemptCount > 0 ? Math.max(...setAttempts.map((a) => a.score)) : null;

    sets.push({
      setNumber: partialSetNumber,
      startIdx: fullSetsCount * SET_SIZE + 1,
      endIdx: totalQuestions,
      totalQuestions: remainder,
      isPartial: true,
      attemptCount,
      bestScore
    });
  }

  return { totalQuestions, fullSetsCount, sets };
}

/**
 * Deterministically fetches questions for a specific set (ordered strictly by id)
 */
export async function fetchSetQuestions(topicId, setNumber) {
  const from = (setNumber - 1) * SET_SIZE;
  const to = from + SET_SIZE - 1;

  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('topic_id', topicId)
    .order('id', { ascending: true }) // Deterministic order guarantees stability
    .range(from, to);

  if (error) throw error;
  return data;
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
        total_questions: totalQuestions
      }
    ])
    .select();

  if (error) console.error('Failed to record set attempt:', error);
  return data;
}