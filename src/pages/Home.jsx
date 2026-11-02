import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../api/supabase';
import TopicCard from '../components/TopicCard';

export default function Home() {
  const [topics, setTopics] = useState([]);
  const [visibleTopicIds, setVisibleTopicIds] = useState(() => {
    try {
      const saved = localStorage.getItem('user_pinned_topics');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Active Recall preference: defaults to true if not explicitly set
  const [activeRecall, setActiveRecall] = useState(() => {
    try {
      const saved = localStorage.getItem('quiz_active_recall');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const [isConfiguring, setIsConfiguring] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTopics();
  }, []);

  const fetchTopics = async () => {
    setLoading(true);
    const { data } = await supabase.from('topics').select('*').order('name');
    if (data) setTopics(data);
    setLoading(false);
  };

  const handleToggleActiveRecall = () => {
    const nextVal = !activeRecall;
    setActiveRecall(nextVal);
    localStorage.setItem('quiz_active_recall', JSON.stringify(nextVal));
  };

  const toggleTopicVisibility = (id) => {
    setVisibleTopicIds((prev) => {
      let updated;
      if (prev.length === 0) {
        // If nothing was filtered yet, unchecking one hides it
        updated = topics.map((t) => t.id).filter((item) => item !== id);
      } else if (prev.includes(id)) {
        updated = prev.filter((item) => item !== id);
      } else {
        updated = [...prev, id];
      }
      localStorage.setItem('user_pinned_topics', JSON.stringify(updated));
      return updated;
    });
  };

  const resetAllVisible = () => {
    localStorage.removeItem('user_pinned_topics');
    setVisibleTopicIds([]);
  };

  const displayedTopics =
    visibleTopicIds.length === 0
      ? topics
      : topics.filter((t) => visibleTopicIds.includes(t.id));

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header, Active Recall Toggle & Customize Action */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Available Subjects</h1>
          <p className="text-sm text-gray-500">
            Showing {displayedTopics.length} of {topics.length} subjects
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Active Recall Switch Control */}
          <div className="flex items-center gap-3 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="text-left">
              <span className="text-xs font-bold text-gray-700 block leading-tight">
                Active Recall
              </span>
              <span className="text-[11px] text-gray-400 block leading-tight">
                {activeRecall ? 'Options Hidden' : 'Options Direct'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleToggleActiveRecall}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${activeRecall ? 'bg-black' : 'bg-gray-300'
                }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${activeRecall ? 'translate-x-4' : 'translate-x-0'
                  }`}
              />
            </button>
          </div>

          <button
            onClick={() => setIsConfiguring((prev) => !prev)}
            className="px-4 py-2 text-sm font-medium border rounded-lg bg-white hover:bg-gray-50 shadow-sm transition"
          >
            {isConfiguring ? 'Done' : '⚙️ Customize Subjects'}
          </button>
        </div>
      </div>

      {/* Visibility Toggle Box */}
      {isConfiguring && (
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-semibold text-gray-700">
              Check subjects you want to show on your dashboard:
            </span>
            <button
              onClick={resetAllVisible}
              className="text-xs text-blue-600 hover:underline"
            >
              Show All
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {topics.map((t) => {
              const isChecked =
                visibleTopicIds.length === 0 || visibleTopicIds.includes(t.id);
              return (
                <label
                  key={t.id}
                  className="flex items-center gap-2 p-2 bg-white rounded border border-gray-100 cursor-pointer text-sm hover:bg-gray-50 transition"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleTopicVisibility(t.id)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="truncate">{t.name}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Topics Grid */}
      {loading ? (
        <p className="text-gray-500">Loading subjects...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedTopics.map((topic) => (
            <TopicCard
              key={topic.id}
              topic={topic}
              onClick={() => navigate(`/topic/${topic.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}