'use client';

import { AssessmentItem } from '@/types/types-index';
import { getCategoryColor } from '@/lib/utils';
import { CUSTOMER_SELECTION_OPTIONS } from '@/lib/constants';

interface AssessmentPreviewProps {
  companyName: string;
  items: AssessmentItem[];
  onClose: () => void;
}

export default function AssessmentPreview({
  companyName,
  items,
  onClose,
}: AssessmentPreviewProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold" style={{ color: '#174887' }}>
              {companyName}
            </h2>
            <p className="text-sm text-gray-500">Assessment Preview</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            aria-label="Close preview"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Preview notice */}
        <div className="px-6 py-3 bg-amber-50 border-b border-amber-100">
          <p className="text-sm text-amber-800 font-medium">
            This is a preview of what your client will see. Selection dropdowns are shown for illustration.
          </p>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {items.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No items to preview.</p>
          ) : (
            items.map((item, index) => (
              <div
                key={item.id}
                className="border border-gray-200 rounded-xl p-5 bg-gray-50"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-gray-400">#{index + 1}</span>
                      <span className="text-xs text-gray-500">{item.location}</span>
                    </div>
                    <h4 className="text-base font-bold text-gray-900">{item.issue}</h4>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-lg text-xs font-bold border-2 flex-shrink-0 ${getCategoryColor(item.category)}`}
                  >
                    {item.category}
                  </span>
                </div>

                {item.description && (
                  <p className="text-sm text-gray-700 mb-3 leading-relaxed">{item.description}</p>
                )}


                {/* Customer Selection (disabled in preview) */}
                <div className="mt-3">
                  <label className="text-xs font-semibold text-gray-600 block mb-1">
                    Your Selection
                  </label>
                  <select
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm text-gray-400 cursor-not-allowed"
                    defaultValue=""
                  >
                    <option value="" disabled>Choose an option...</option>
                    {CUSTOMER_SELECTION_OPTIONS.map((opt) => (
                      <option key={opt.orderindex} value={opt.orderindex}>
                        {opt.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg text-white font-semibold hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#174887' }}
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}
