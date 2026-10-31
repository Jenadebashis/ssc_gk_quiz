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
      {/* Header & Customize Action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Available Subjects</h1>
          <p className="text-sm text-gray-500">
            Showing {displayedTopics.length} of {topics.length} subjects
          </p>
        </div>
        <button
          onClick={() => setIsConfiguring((prev) => !prev)}
          className="px-4 py-2 text-sm font-medium border rounded-lg bg-white hover:bg-gray-50 shadow-sm"
        >
          {isConfiguring ? 'Done' : '⚙️ Customize Subjects'}
        </button>
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
                  className="flex items-center gap-2 p-2 bg-white rounded border border-gray-100 cursor-pointer text-sm"
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