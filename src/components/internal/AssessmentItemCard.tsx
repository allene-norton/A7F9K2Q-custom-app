// src/components/internal/AssessmentItemCard.tsx

import { AssessmentItem } from '@/types/types-index';
import {
  getCategoryColor,
  formatCostRange,
  // getPriorityColor,
} from '@/lib/utils';

interface AssessmentItemCardProps {
  item: AssessmentItem;
  index: number;
  onExpand?: (item: AssessmentItem) => void;
}

export default function AssessmentItemCard({
  item,
  index,
  onExpand,
}: AssessmentItemCardProps) {
  return (
    <div
      className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => onExpand?.(item)}
    >
      <div className="flex gap-6">
        {/* Image */}
        {item.images.length > 0 && (
          <div className="flex-shrink-0">
            <img
              src={item.images[0]}
              alt={item.issue}
              className="w-40 h-40 object-cover rounded-lg border-2 border-gray-100"
            />
            {item.images.length > 1 && (
              <div className="text-xs text-gray-500 text-center mt-2">
                +{item.images.length - 1} more
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 relative">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm font-semibold text-gray-500">
                  #{index + 1}
                </span>
                <span className="text-sm text-gray-600 font-medium">
                  {item.location}
                </span>
              </div>

              <h4 className="text-lg font-bold text-gray-900 mb-2">
                {item.issue}
              </h4>

              {/* Description & Recommendations */}
              {item.description && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Description &amp; Recommendations
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              )}

              {/* Priority Badge under item name --- REMOVE - UNUSED*/}
              {/* {item.priority && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                    Priority:
                  </span>
                  <span
                    className={`px-3 py-1 text-sm font-semibold ${getPriorityColor(
                      item.priority,
                    )}`}
                  >
                    {item.priority?.toLocaleUpperCase()}
                  </span>
                </div>
              )} */}
            </div>

            {/* Category Badge - Top Right */}
            <div className="flex items-center gap-2 ml-4">
              <span
                className={`px-4 py-2 rounded-lg text-sm font-bold border-2 ${getCategoryColor(
                  item.category,
                )}`}
              >
                {item.category}
              </span>
            </div>
          </div>

          {/* Cost and Meta */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-200">
            {/* <div>
              <span className="text-sm font-semibold text-gray-900">
                Estimated Cost: {formatCostRange(item.estimated_cost_min, item.estimated_cost_max)}
              </span>
            </div> */}
            <div className="flex items-center gap-3">
              <div className="text-xs text-gray-500">
                {item.technician! == ' ' ? (
                  <span> Technician • {item.technician}</span>
                ) : null}
              </div>

              {/* Status Badge - Lower Right */}
              {item.status && (
                <div className="flex items-center gap-1">
                  <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                    Status:
                  </span>
                  <span
                    className={`px-2 py-1 rounded-md text-xs font-semibold tracking-wide uppercase`} // removed getPriorityColor for now
                  >
                    {item.status}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {item.tags.map((tag) => (
                <span
                  key={tag.name}
                  style={{ backgroundColor: tag.bg, color: tag.fg }}
                  className="px-2 py-1 text-xs rounded-md font-medium"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}

          {/* Comments */}
          {item.comments && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <p className="text-xs font-semibold text-blue-900 mb-1">
                Technician Notes:
              </p>
              <p className="text-sm text-blue-800">{item.comments}</p>
            </div>
          )}

          {item.created_date && (
            <p className="text-xs text-gray-400 mt-3">Created {item.created_date}</p>
          )}
        </div>
      </div>
    </div>
  );
}
