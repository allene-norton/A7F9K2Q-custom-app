// src/components/internal/AssessmentItemCard.tsx

import { AssessmentItem } from "@/types/types-index";
import { getCategoryColor, formatCostRange, getPriorityColor } from "@/lib/utils";

interface AssessmentItemCardProps {
  item: AssessmentItem;
  index: number;
}


export default function AssessmentItemCard({ item, index }: AssessmentItemCardProps) {
  console.log(item)

  return (
    <div className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
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
        <div className="flex-1">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm font-semibold text-gray-500">
                  #{index + 1}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold border ${getCategoryColor(
                    item.category
                  )}`}
                >
                  {item.category}
                </span>
                {item.priority? 
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(
                    item.priority
                  )}`}
                >
                  {item.priority?.toUpperCase()}
                </span> : null }
                {item.status? 
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(
                    item.status
                  )}`}
                >
                  {item.status?.toUpperCase()}
                </span> : null }
                <span className="text-sm text-gray-600 font-medium">{item.location}</span>
                
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-2">{item.issue}</h4>
            </div>
          </div>

          {/* Recommendation */}
          <div className="mb-4">
            <p className="text-sm font-semibold text-gray-700 mb-1">Recommendation:</p>
            <p className="text-gray-700 leading-relaxed">{item.recommendation}</p>
          </div>

          {/* Cost and Meta */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-200">
            <div>
              <span className="text-sm font-semibold text-gray-900">
                Estimated Cost: {formatCostRange(item.estimated_cost_min, item.estimated_cost_max)}
              </span>
            </div>
            <div className="text-xs text-gray-500">
              <span>From ClickUp • {item.technician}</span>
            </div>
          </div>

          {/* Tags */}
          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Comments */}
          {item.comments && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <p className="text-xs font-semibold text-blue-900 mb-1">Technician Notes:</p>
              <p className="text-sm text-blue-800">{item.comments}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
