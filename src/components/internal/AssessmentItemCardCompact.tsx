// src/components/internal/AssessmentItemCompact.tsx

import { AssessmentItem } from '@/types/types-index';
import { getCategoryColor, formatCostRange } from '@/lib/utils';

interface AssessmentItemCompactProps {
  item: AssessmentItem;
  index: number;
  onExpand?: (item: AssessmentItem) => void;
}

export default function AssessmentItemCompact({
  item,
  index,
  onExpand,
}: AssessmentItemCompactProps) {
  return (
    <div
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onExpand?.(item)}
    >
      <div className="flex items-center gap-4">
        {/* Thumbnail */}
        {item.images.length > 0 && (
          <div className="flex-shrink-0">
            <img
              src={item.images[0]}
              alt={item.issue}
              className="w-16 h-16 object-cover rounded-lg border border-gray-200"
            />
            {item.images.length > 1 && (
              <div className="text-xs text-gray-500 text-center mt-1">
                +{item.images.length - 1}
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-gray-500">
              #{index + 1}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getCategoryColor(item.category)}`}
            >
              {item.category}
            </span>
            <span className="text-xs text-gray-600">{item.location}</span>
          </div>

          <h4 className="font-semibold text-gray-900 truncate mb-1">
            {item.issue}
          </h4>
          {item.description && (
            <p className="text-sm text-gray-600 line-clamp-1 mb-1">
              {item.description}
            </p>
          )}
          <p className="text-sm text-gray-600 line-clamp-2">
            {item.recommendation}
          </p>

          {/* Tags - compact display */}
          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {item.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md font-medium"
                >
                  {tag}
                </span>
              ))}
              {item.tags.length > 3 && (
                <span className="px-1.5 py-0.5 text-gray-500 text-xs">
                  +{item.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Cost & Arrow */}
        <div className="flex-shrink-0 text-right">
          {/* <div className="text-sm font-semibold text-gray-900 mb-1">
            {formatCostRange(item.estimated_cost_min, item.estimated_cost_max)}
          </div> */}
          <div className="text-xs text-gray-500">{item.technician}</div>
          <div className="text-gray-400 mt-1">→</div>
        </div>
      </div>
    </div>
  );
}
