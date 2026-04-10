'use client';

import { useState } from 'react';
import { AssessmentItem } from '@/types/types-index';
import { getCategoryColor } from '@/lib/utils';

interface AssessmentItemDetailProps {
  item: AssessmentItem;
  onClose: () => void;
  companyId?: string;
  token?: string;
}

export default function AssessmentItemDetail({
  item,
  onClose,
  companyId,
  token,
}: AssessmentItemDetailProps) {
  const [activeImage, setActiveImage] = useState(0);
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);

  const handlePostNote = async () => {
    if (!noteText.trim() || !companyId) return;
    setSaving(true);
    try {
      await fetch(`/api/workorders/${companyId}/${item.clickup_task_id}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: noteText.trim(),
          authorName: 'MM Team',
          isInternal: false,
          noNotify: true,
          token,
        }),
      });
      setNoteText('');
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-200">
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                {item.location}
              </span>
            </div>
            <h2 className="text-xl font-bold text-gray-900">{item.issue}</h2>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span
              className={`px-3 py-1.5 rounded-lg text-sm font-bold border-2 ${getCategoryColor(item.category)}`}
            >
              {item.category}
            </span>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Image Gallery */}
          {item.images.length > 0 && (
            <div>
              <img
                src={item.images[activeImage]}
                alt={item.issue}
                className="w-full h-72 object-cover rounded-xl border border-gray-200"
              />
              {item.images.length > 1 && (
                <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                  {item.images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImage(i)}
                      className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                        i === activeImage
                          ? 'border-[#174887]'
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      <img
                        src={img}
                        alt={`Image ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Description & Recommendations */}
          {item.description && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Description &amp; Recommendations
              </p>
              <p className="text-sm text-gray-700 leading-relaxed">
                {item.description}
              </p>
            </div>
          )}


          {/* Tags */}
          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
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

          {/* Meta row */}
          <div className="flex flex-wrap gap-4 text-sm text-gray-600 pt-2 border-t border-gray-100">
            {item.status && (
              <span>
                <span className="font-medium text-gray-500">Status: </span>
                {item.status}
              </span>
            )}
            {item.technician && (
              <span>
                <span className="font-medium text-gray-500">Technician: </span>
                {item.technician}
              </span>
            )}
            {item.created_date && (
              <span>
                <span className="font-medium text-gray-500">Date: </span>
                {item.created_date}
              </span>
            )}
          </div>

          {/* Comments */}
          {item.comments && (
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
              <p className="text-xs font-semibold text-blue-900 mb-1">
                Technician Notes
              </p>
              <p className="text-sm text-blue-800">{item.comments}</p>
            </div>
          )}

          {/* Internal Note (pre-submission) */}
          {companyId && (
            <div className="border-t border-gray-200 pt-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Internal Note
              </p>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add an internal note (not sent to customer)…"
                rows={3}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm resize-none
                           focus:outline-none focus:ring-2 focus:ring-[#174887] focus:border-[#174887]
                           placeholder-gray-400"
              />
              <div className="flex items-center justify-between mt-2">
                {noteSaved && (
                  <span className="text-xs text-green-600 font-medium">Note saved to ClickUp.</span>
                )}
                <button
                  onClick={handlePostNote}
                  disabled={!noteText.trim() || saving}
                  className="ml-auto px-4 py-1.5 text-sm font-semibold text-white rounded-lg
                             hover:opacity-90 transition-opacity disabled:opacity-40"
                  style={{ backgroundColor: '#174887' }}
                >
                  {saving ? 'Saving…' : 'Post Note'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
