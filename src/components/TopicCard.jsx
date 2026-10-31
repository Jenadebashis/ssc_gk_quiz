import React from 'react';

export default function TopicCard({ topic, onClick }) {
  if (!topic) return null;

  return (
    <div
      onClick={onClick}
      className="group relative bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md hover:border-blue-400 transition-all cursor-pointer flex flex-col justify-between"
    >
      <div>
        <div className="flex items-center justify-between gap-3 mb-2">
          <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
            {topic.name}
          </h3>
          {topic.icon && <span className="text-2xl">{topic.icon}</span>}
        </div>

        {topic.description && (
          <p className="text-sm text-gray-500 line-clamp-2 mb-4">
            {topic.description}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-100 text-xs font-semibold text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          Available
        </span>
        <span className="text-blue-600 group-hover:translate-x-1 transition-transform inline-flex items-center">
          Practice &rarr;
        </span>
      </div>
    </div>
  );
}

// Named export fallback to prevent export mismatch errors
export { TopicCard };