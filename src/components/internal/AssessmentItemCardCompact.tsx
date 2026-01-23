// src/components/internal/AssessmentItemCompact.tsx

import { AssessmentItem } from "@/types/types-index";
import { getCategoryColor, formatCostRange } from "@/lib/utils";

interface AssessmentItemCompactProps {
  item: AssessmentItem;
  index: number;
  onExpand?: (item: AssessmentItem) => void;
}

export default function AssessmentItemCompact({ item, index, onExpand }: AssessmentItemCompactProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
         onClick={() => onExpand?.(item)}>
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
            <span className="text-xs font-semibold text-gray-500">#{index + 1}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getCategoryColor(item.category)}`}
            >
              {item.category}
            </span>
            <span className="text-xs text-gray-600">{item.location}</span>
          </div>
          
          <h4 className="font-semibold text-gray-900 truncate mb-1">{item.issue}</h4>
          <p className="text-sm text-gray-600 line-clamp-2">{item.recommendation}</p>
        </div>

        {/* Cost & Arrow */}
        <div className="flex-shrink-0 text-right">
          <div className="text-sm font-semibold text-gray-900 mb-1">
            {formatCostRange(item.estimated_cost_min, item.estimated_cost_max)}
          </div>
          <div className="text-xs text-gray-500">{item.technician}</div>
          <div className="text-gray-400 mt-1">→</div>
        </div>
      </div>
    </div>
  );
}