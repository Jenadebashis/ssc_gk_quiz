import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../api/supabase';
import { fetchSetQuestions, recordSetAttempt } from '../utils/questionSelectior';
import QuestionCard from '../components/QuestionCard';

const toOptionIndex = (val) => {
  if (val === undefined || val === null || val === '') return null;
  if (typeof val === 'number') return val;
  const str = String(val).trim().toUpperCase();
  if (['A', 'B', 'C', 'D', 'E'].includes(str)) {
    return str.charCodeAt(0) - 65;
  }
  const parsed = parseInt(str, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

export default function Quiz() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Route params: supports both custom setup mode and fixed 30-question set mode
  const topicId = searchParams.get('topicId');
  const subtopicId = searchParams.get('subtopicId');
  const setNumber = searchParams.get('set') ? parseInt(searchParams.get('set'), 10) : null;
  const timerLimitMinutes = searchParams.get('time') ? parseInt(searchParams.get('time'), 10) : 30;

  // Question & Session States
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { [questionId]: selectedOption }
  const [markedForReview, setMarkedForReview] = useState(new Set());
  const [timeLeft, setTimeLeft] = useState(timerLimitMinutes * 60);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const timerRef = useRef(null);
  const answersRef = useRef(answers);
  const questionsRef = useRef(questions);

  // Sync refs for event listeners and auto-submit
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    questionsRef.current = questions;
  }, [questions]);

  // Load questions: checks for setNumber first, falls back to subtopic/topic query
  useEffect(() => {
    async function initQuiz() {
      setLoading(true);
      try {
        let loadedQuestions = [];

        if (topicId && setNumber) {
          // 30-Question Fixed Set Flow
          loadedQuestions = await fetchSetQuestions(topicId, setNumber);
        } else if (subtopicId) {
          // Standard Subtopic Flow
          const { data, error } = await supabase
            .from('questions')
            .select('*')
            .eq('subtopic_id', subtopicId)
            .order('created_at', { ascending: true });
          if (error) throw error;
          loadedQuestions = data || [];
        } else if (topicId) {
          // Standard Topic Flow
          const { data, error } = await supabase
            .from('questions')
            .select('*')
            .eq('topic_id', topicId)
            .order('created_at', { ascending: true });
          if (error) throw error;
          loadedQuestions = data || [];
        }

        setQuestions(loadedQuestions);
      } catch (err) {
        console.error('Error loading quiz questions:', err);
      } finally {
        setLoading(false);
      }
    }

    initQuiz();
  }, [topicId, subtopicId, setNumber]);

  // Submit Handler
  const handleSubmitQuiz = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    clearInterval(timerRef.current);

    const activeQuestions = questionsRef.current;
    const currentAnswers = answersRef.current;

    // Calculate performance metrics
    let correctCount = 0;
    let wrongCount = 0;
    let unattemptedCount = 0;

    const reviewItems = activeQuestions.map((q) => {
      const selected = currentAnswers[q.id];
      const isAttempted = selected !== undefined && selected !== null;
      const isCorrect =
        isAttempted &&
        String(selected).trim().toLowerCase() === String(q.correct_answer).trim().toLowerCase();

      if (!isAttempted) {
        unattemptedCount += 1;
      } else if (isCorrect) {
        correctCount += 1;
      } else {
        wrongCount += 1;
      }

      return {
        question_id: q.id,
        question_text: q.question_text,
        selected_option: selected || null,
        correct_answer: q.correct_answer,
        is_correct: isCorrect,
        explanation: q.explanation || null,
      };
    });

    const scorePercent =
      activeQuestions.length > 0
        ? Number(((correctCount / activeQuestions.length) * 100).toFixed(2))
        : 0;

    const timeSpent = Math.max(0, timerLimitMinutes * 60 - timeLeft);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Record fixed 30-question set attempt counter (if setNumber mode)
      if (user && topicId && setNumber) {
        await recordSetAttempt({
          userId: user.id,
          topicId,
          setNumber,
          score: correctCount,
          totalQuestions: activeQuestions.length,
        });
      }

      // 2. Insert into main attempts table using your exact schema columns
      if (user) {
        const { data: attemptRecord, error: attemptErr } = await supabase
          .from('attempts')
          .insert([
            {
              user_id: user.id,
              topic_id: topicId || null,
              subtopic_id: subtopicId || null,
              mode: setNumber ? 'set_practice' : subtopicId ? 'subtopic' : 'topic',
              total_questions: activeQuestions.length,
              correct_answers: correctCount,
              score_percent: scorePercent,
              correct_count: correctCount,
              wrong_count: wrongCount,
              unattempted_count: unattemptedCount,
              time_spent_seconds: timeSpent,
              completed_at: new Date().toISOString(),
            },
          ])
          .select()
          .single();

        if (attemptErr) {
          console.error('Error inserting attempt:', attemptErr);
        } else if (attemptRecord) {
          const detailRows = reviewItems.map((item) => ({
            attempt_id: attemptRecord.id,
            user_id: user.id,
            question_id: item.question_id,
            selected_answer: toOptionIndex(item.selected_option),
            correct_answer: toOptionIndex(item.correct_answer),
            is_correct: item.is_correct,
            answered_at: new Date().toISOString()
          }));

          const { error: answersInsertErr } = await supabase
            .from('attempt_answers')
            .insert(detailRows);

          if (answersInsertErr) {
            console.error('Error inserting attempt_answers:', answersInsertErr);
          }
        }
      }

      navigate('/results', {
        state: {
          score: correctCount,
          total: activeQuestions.length,
          correctCount,
          wrongCount,
          unattemptedCount,
          topicId,
          setNumber,
          // Provide both formats so Results.jsx finds its array
          reviewItems,
          questions: activeQuestions,
          answers: currentAnswers,
          results: reviewItems
        }
      });
    } catch (err) {
      console.error('Failed to submit attempt:', err);
      navigate('/results', {
        state: {
          score: correctCount,
          total: activeQuestions.length,
          correctCount,
          wrongCount,
          unattemptedCount,
          topicId,
          setNumber,
          // Provide both formats so Results.jsx finds its array
          reviewItems,
          questions: activeQuestions,
          answers: currentAnswers,
          results: reviewItems
        }
      });
    }
  }, [submitting, topicId, subtopicId, setNumber, timerLimitMinutes, timeLeft, navigate]);

  // Timer loop with Auto-submit
  useEffect(() => {
    if (loading || questions.length === 0) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleSubmitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [loading, questions.length, handleSubmitQuiz]);

  // Tab close / reload prevention
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!submitting && Object.keys(answers).length > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [answers, submitting]);

  // Handlers
  const handleSelectOption = (optionKey) => {
    const currentQ = questions[currentIndex];
    setAnswers((prev) => ({
      ...prev,
      [currentQ.id]: optionKey
    }));
  };

  const handleClearAnswer = () => {
    const currentQ = questions[currentIndex];
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[currentQ.id];
      return next;
    });
  };

  const toggleMarkReview = () => {
    const currentQ = questions[currentIndex];
    setMarkedForReview((prev) => {
      const next = new Set(prev);
      if (next.has(currentQ.id)) {
        next.delete(currentQ.id);
      } else {
        next.add(currentQ.id);
      }
      return next;
    });
  };

  // Format MM:SS
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600 font-medium">Preparing your questions...</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center p-8 bg-white border rounded-xl shadow-sm mt-12">
        <h2 className="text-xl font-bold text-gray-800 mb-2">No Questions Available</h2>
        <p className="text-sm text-gray-500 mb-6">
          There are no questions found for this selection.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
        >
          Go Back
        </button>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const isAnswered = answers[currentQ.id] !== undefined;
  const isMarked = markedForReview.has(currentQ.id);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Top Bar: Progress, Set/Topic Indicator, and Countdown Timer */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white border rounded-xl shadow-sm mb-6">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-gray-400">
            {setNumber ? `Set ${setNumber < 10 ? `0${setNumber}` : setNumber}` : 'General Practice'}
          </span>
          <h2 className="text-lg font-bold text-gray-800">
            Question {currentIndex + 1} of {questions.length}
          </h2>
        </div>

        <div className="flex items-center gap-4">
          {/* Countdown Clock */}
          <div
            className={`px-4 py-1.5 rounded-lg font-mono font-bold text-sm flex items-center gap-2 border ${timeLeft < 300
              ? 'bg-red-50 text-red-600 border-red-200 animate-pulse'
              : 'bg-gray-50 text-gray-700 border-gray-200'
              }`}
          >
            <span>⏱️</span>
            <span>{formatTime(timeLeft)}</span>
          </div>

          {/* Question Palette Toggle (Mobile/Responsive) */}
          <button
            onClick={() => setPaletteOpen(!paletteOpen)}
            className="md:hidden px-3 py-1.5 text-sm bg-gray-100 border rounded-lg font-medium"
          >
            {paletteOpen ? 'Hide Grid' : 'Question Grid'}
          </button>

          <button
            onClick={handleSubmitQuiz}
            disabled={submitting}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-sm transition"
          >
            {submitting ? 'Submitting...' : 'Submit Test'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Main Quiz Area */}
        <div className="md:col-span-8 lg:col-span-9 space-y-4">
          <div className="bg-white border rounded-xl p-6 shadow-sm">
            <QuestionCard
              question={currentQ}
              selectedAnswer={answers[currentQ.id]}
              onSelectAnswer={handleSelectOption}
            />

            {/* In-Card Tool Actions: Clear selection & Mark for Review */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-6 mt-6 border-t border-gray-100">
              <div className="flex gap-2">
                <button
                  onClick={toggleMarkReview}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${isMarked
                    ? 'bg-amber-500 text-white border-amber-600'
                    : 'bg-white text-amber-600 border-amber-300 hover:bg-amber-50'
                    }`}
                >
                  {isMarked ? '★ Marked for Review' : '☆ Mark for Review'}
                </button>
                {isAnswered && (
                  <button
                    onClick={handleClearAnswer}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                  >
                    Clear Response
                  </button>
                )}
              </div>

              {/* Prev / Next Navigation Controls */}
              <div className="flex gap-2">
                <button
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((prev) => prev - 1)}
                  className="px-4 py-1.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-40"
                >
                  Previous
                </button>
                {currentIndex < questions.length - 1 ? (
                  <button
                    onClick={() => setCurrentIndex((prev) => prev + 1)}
                    className="px-5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    onClick={handleSubmitQuiz}
                    disabled={submitting}
                    className="px-5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium"
                  >
                    Submit
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Question Palette / Navigation Grid */}
        <div
          className={`${paletteOpen ? 'block' : 'hidden'
            } md:block md:col-span-4 lg:col-span-3 bg-white border rounded-xl p-5 shadow-sm sticky top-6`}
        >
          <h3 className="font-bold text-gray-800 text-sm mb-3">Question Palette</h3>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-2 text-xs mb-4 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
              <span className="text-gray-600">Answered</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-400"></span>
              <span className="text-gray-600">Review</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-gray-200"></span>
              <span className="text-gray-600">Unanswered</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full border-2 border-blue-600"></span>
              <span className="text-gray-600">Current</span>
            </div>
          </div>

          {/* Palette Grid */}
          <div className="grid grid-cols-5 gap-2 max-h-[380px] overflow-y-auto pr-1">
            {questions.map((q, idx) => {
              const qAnswered = answers[q.id] !== undefined;
              const qMarked = markedForReview.has(q.id);
              const isCurrent = idx === currentIndex;

              let btnStyle = 'bg-gray-100 text-gray-700 hover:bg-gray-200';
              if (qAnswered && qMarked) {
                btnStyle = 'bg-amber-500 text-white ring-2 ring-emerald-500';
              } else if (qMarked) {
                btnStyle = 'bg-amber-400 text-white';
              } else if (qAnswered) {
                btnStyle = 'bg-emerald-500 text-white';
              }

              return (
                <button
                  key={q.id}
                  onClick={() => {
                    setCurrentIndex(idx);
                    setPaletteOpen(false);
                  }}
                  className={`h-9 w-full rounded-lg text-xs font-bold transition flex items-center justify-center ${btnStyle} ${isCurrent ? 'ring-2 ring-offset-1 ring-blue-600 scale-105' : ''
                    }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div className="mt-5 pt-3 border-t border-gray-100 text-center">
            <span className="text-xs text-gray-400">
              {Object.keys(answers).length} of {questions.length} answered
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}