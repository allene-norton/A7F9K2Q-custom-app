'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';
import { Assessment, AssessmentItem } from '@/types/types-index';
import { Company } from '@/lib/assembly/client';
import AssessmentItemCard from '@/components/internal/AssessmentItemCard';
import AssessmentItemDetail from '@/components/internal/AssessmentItemDetail';
import AssessmentPreview from '@/components/internal/AssessmentPreview';
import { getCategoryColor, hexToRgba } from '@/lib/utils';

interface SpaceTag {
  name: string;
  tag_fg: string;
  tag_bg: string;
}

interface AssessmentBuilderProps {
  company: Company;
  assessment: Assessment;
  onBack: () => void;
  onBackToAssessments?: () => void;
  onSendSuccess?: (assessmentId: string) => void;
  isHourly?: boolean;
  spaceId?: string;
}

type CategoryFilter = 'All' | AssessmentItem['category'];
type SortOption = 'default' | 'urgency-high' | 'urgency-low';

const CATEGORIES: AssessmentItem['category'][] = [
  'Urgent',
  'Recommended',
  'Cosmetic',
  'Included Maintenance',
  'No Issue',
];

const URGENCY_ORDER: Record<AssessmentItem['category'], number> = {
  Urgent: 0,
  Recommended: 1,
  Cosmetic: 2,
  'Included Maintenance': 3,
  'No Issue': 4,
};

export default function AssessmentBuilder({
  company,
  assessment,
  onBack,
  onBackToAssessments,
  onSendSuccess,
  isHourly,
  spaceId,
}: AssessmentBuilderProps) {
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('All');
  const [sortOption, setSortOption] = useState<SortOption>('default');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<AssessmentItem | null>(null);
  const [spaceTags, setSpaceTags] = useState<SpaceTag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const tagDropdownRef = useRef<HTMLDivElement>(null);

  // Manage mode state
  const [displayItems, setDisplayItems] = useState<AssessmentItem[]>(
    assessment.items,
  );
  const [removedItems, setRemovedItems] = useState<AssessmentItem[]>([]);
  const [isManaging, setIsManaging] = useState(false);

  // Preview / send state
  const [showPreview, setShowPreview] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  // Keep displayItems in sync when assessment changes (keyed on ID)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setDisplayItems(assessment.items);
    setRemovedItems([]);
    setSendSuccess(false);
  }, [assessment.id]);

  // Fetch space tags
  useEffect(() => {
    if (!spaceId) return;
    fetch(`/api/clickup/tags?spaceId=${spaceId}`)
      .then((r) => r.json())
      .then((data) => setSpaceTags(data.tags ?? []))
      .catch(() => {});
  }, [spaceId]);

  // Close tag dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        tagDropdownRef.current &&
        !tagDropdownRef.current.contains(e.target as Node)
      ) {
        setTagDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredAndSortedItems = useMemo(() => {
    let items = [...displayItems];

    if (categoryFilter !== 'All') {
      items = items.filter((item) => item.category === categoryFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.location.toLowerCase().includes(query) ||
          item.issue.toLowerCase().includes(query) ||
          (item.description ?? '').toLowerCase().includes(query) ||
          item.tags.some((tag) => tag.name.toLowerCase().includes(query)) ||
          item.comments.toLowerCase().includes(query),
      );
    }

    if (selectedTags.length > 0) {
      items = items.filter((item) =>
        selectedTags.some((tagName) =>
          item.tags.some((t) => t.name === tagName),
        ),
      );
    }

    if (sortOption === 'urgency-high') {
      items.sort(
        (a, b) => URGENCY_ORDER[a.category] - URGENCY_ORDER[b.category],
      );
    } else if (sortOption === 'urgency-low') {
      items.sort(
        (a, b) => URGENCY_ORDER[b.category] - URGENCY_ORDER[a.category],
      );
    }

    return items;
  }, [displayItems, categoryFilter, sortOption, searchQuery, selectedTags]);

  const clearFilters = () => {
    setCategoryFilter('All');
    setSortOption('default');
    setSearchQuery('');
    setSelectedTags([]);
  };

  const hasActiveFilters =
    categoryFilter !== 'All' ||
    sortOption !== 'default' ||
    searchQuery.trim() !== '' ||
    selectedTags.length > 0;

  const toggleTag = (name: string) => {
    setSelectedTags((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name],
    );
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const next = Array.from(displayItems);
    const [moved] = next.splice(result.source.index, 1);
    next.splice(result.destination.index, 0, moved);
    setDisplayItems(next);
  };

  const handleRemoveItem = (item: AssessmentItem) => {
    setDisplayItems((prev) => prev.filter((i) => i.id !== item.id));
    setRemovedItems((prev) => [...prev, item]);
  };

  const handleRestoreItem = (item: AssessmentItem) => {
    setRemovedItems((prev) => prev.filter((i) => i.id !== item.id));
    setDisplayItems((prev) => [...prev, item]);
  };

  const handleSend = async () => {
    if (!company.id) return;
    setIsSending(true);
    try {
      await fetch(`/api/assessments/${company.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessmentId: assessment.id,
          assessmentName: assessment.assessment_name,
          companyName: company.name,
          items: displayItems,
          isHourly: isHourly ?? false,
        }),
      });
      setSendSuccess(true);
      onSendSuccess?.(assessment.id);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-8 px-4">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm mb-6">
          <button
            onClick={onBack}
            className="text-[#174887] hover:underline font-medium"
          >
            Companies
          </button>
          {onBackToAssessments && (
            <>
              <span className="text-gray-400">/</span>
              <button
                onClick={onBackToAssessments}
                className="text-[#174887] hover:underline font-medium"
              >
                {company.name}
              </button>
            </>
          )}
          <span className="text-gray-400">/</span>
          <span className="text-gray-700 font-medium">
            {assessment.assessment_name}
          </span>
        </nav>

        {/* Header Card */}
        <div className="bg-white rounded-xl border-2 border-gray-200 p-6 mb-8 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2
                className="text-3xl font-bold mb-2"
                style={{ color: '#174887' }}
              >
                {company.name}
              </h2>
              <h3 className="text-xl font-bold text-gray-600">
                {assessment.assessment_name}
              </h3>
              <p className="text-gray-600">
                Date: {assessment.assessment_date}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {displayItems.length} {isHourly ? '' : 'assessment '}item
                {displayItems.length !== 1 ? 's' : ''}
                {removedItems.length > 0 && (
                  <span className="text-amber-600 ml-2">
                    ({removedItems.length} removed)
                  </span>
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 justify-end">
              <button
                onClick={() => setIsManaging((v) => !v)}
                className={`px-5 py-3 border-2 rounded-lg font-semibold transition-colors ${
                  isManaging
                    ? 'bg-[#174887] text-white border-[#174887]'
                    : 'text-[#174887] border-[#174887] hover:bg-blue-50'
                }`}
              >
                {isManaging ? 'Done Managing' : 'Manage Items'}
              </button>
              <button
                onClick={() => setShowPreview(true)}
                className="px-5 py-3 border-2 text-[#174887] border-[#174887] rounded-lg
                           hover:bg-blue-50 font-semibold transition-colors"
              >
                Preview
              </button>
              {sendSuccess ? (
                <div className="px-5 py-3 rounded-lg bg-green-100 text-green-800 font-semibold flex items-center gap-2">
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
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Sent!
                </div>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={isSending || displayItems.length === 0}
                  className="px-5 py-3 rounded-lg text-white font-semibold flex items-center gap-2
                             hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: '#174887' }}
                >
                  {isSending ? (
                    <>
                      <svg
                        className="w-4 h-4 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8H4z"
                        />
                      </svg>
                      Sending…
                    </>
                  ) : (
                    <>
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
                          d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                        />
                      </svg>
                      Send to Company
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Manage Mode */}
        {isManaging ? (
          <div className="mb-6">
            <div className="bg-white rounded-xl border-2 border-[#174887]/20 p-4 mb-4">
              <p className="text-sm text-gray-600">
                Drag items to reorder, or remove items you don&rsquo;t want to
                send. Removed items can be restored below the list.
              </p>
            </div>

            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="manage-items">
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="space-y-2"
                  >
                    {displayItems.map((item, index) => (
                      <Draggable
                        key={item.id}
                        draggableId={item.id}
                        index={index}
                      >
                        {(drag, snapshot) => (
                          <div
                            ref={drag.innerRef}
                            {...drag.draggableProps}
                            className={`bg-white border-2 rounded-xl flex items-center gap-3 px-4 py-3 transition-shadow ${
                              snapshot.isDragging
                                ? 'border-[#174887] shadow-lg'
                                : 'border-gray-200'
                            }`}
                          >
                            <div
                              {...drag.dragHandleProps}
                              className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing flex-shrink-0"
                              aria-label="Drag to reorder"
                            >
                              <svg
                                className="w-5 h-5"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M8 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm8 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM8 13.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm8 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM8 21a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm8 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
                              </svg>
                            </div>

                            <span className="text-xs font-semibold text-gray-400 w-6 flex-shrink-0">
                              {index + 1}
                            </span>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-2 py-0.5 rounded text-xs font-bold border ${getCategoryColor(item.category)}`}
                                >
                                  {item.category}
                                </span>
                                <span className="text-xs text-gray-500 truncate">
                                  {item.location}
                                </span>
                              </div>
                              <p className="text-sm font-semibold text-gray-900 truncate mt-0.5">
                                {item.issue}
                              </p>
                            </div>

                            <button
                              onClick={() => handleRemoveItem(item)}
                              className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              aria-label="Remove item"
                            >
                              <svg
                                className="w-4 h-4"
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
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>

            {displayItems.length === 0 && (
              <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-8 text-center text-gray-400">
                All items removed. Restore items below to add them back.
              </div>
            )}

            {removedItems.length > 0 && (
              <div className="mt-6 bg-white rounded-xl border-2 border-amber-200 p-4">
                <h4 className="text-sm font-semibold text-amber-800 mb-3">
                  Removed Items ({removedItems.length}) — click Restore to add
                  back
                </h4>
                <div className="space-y-2">
                  {removedItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 px-3 py-2 bg-amber-50 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-xs text-gray-500 mr-2">
                          {item.location}
                        </span>
                        <span className="text-sm font-semibold text-gray-700 truncate">
                          {item.issue}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRestoreItem(item)}
                        className="flex-shrink-0 px-3 py-1 text-xs font-semibold text-[#174887] border border-[#174887] rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        Restore
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Filter Bar */}
            <div className="bg-white rounded-xl border-2 border-gray-200 p-4 mb-6 shadow-sm">
              {/* Row 1: search, urgency, sort, clear */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative flex items-center">
                    <svg
                      className="absolute left-3 w-4 h-4 text-gray-400 pointer-events-none"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search items by title, tag, description, etc..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg
                                 focus:outline-none focus:ring-2 focus:ring-[#174887] focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">
                    Urgency:
                  </label>
                  <select
                    value={categoryFilter}
                    onChange={(e) =>
                      setCategoryFilter(e.target.value as CategoryFilter)
                    }
                    className="px-3 py-2 border border-gray-300 rounded-lg bg-white
                               focus:outline-none focus:ring-2 focus:ring-[#174887] focus:border-gray"
                  >
                    <option value="All">All</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">
                    Sort:
                  </label>
                  <select
                    value={sortOption}
                    onChange={(e) =>
                      setSortOption(e.target.value as SortOption)
                    }
                    className="px-3 py-2 border border-gray-300 rounded-lg bg-white
                               focus:outline-none focus:ring-2 focus:ring-[#174887] focus:border-gray"
                  >
                    <option value="default">Default Order</option>
                    <option value="urgency-high">Urgency: High to Low</option>
                    <option value="urgency-low">Urgency: Low to High</option>
                  </select>
                </div>

                {/* Tags multi-select dropdown */}
                {spaceTags.length > 0 && (
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">
                      Tags:
                    </label>
                    <div className="relative" ref={tagDropdownRef}>
                      <button
                        onClick={() => setTagDropdownOpen((v) => !v)}
                        className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm
                                   focus:outline-none focus:ring-2 focus:ring-[#174887] hover:border-gray-400 transition-colors"
                      >
                        <span
                          className={
                            selectedTags.length > 0
                              ? 'text-[#174887] font-semibold'
                              : 'text-gray-700'
                          }
                        >
                          {selectedTags.length === 0
                            ? 'Any'
                            : `${selectedTags.length} selected`}
                        </span>
                        <svg
                          className={`w-4 h-4 text-gray-400 transition-transform ${tagDropdownOpen ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>

                      {tagDropdownOpen && (
                        <div className="absolute top-full left-0 mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg min-w-[200px] py-1 max-h-80 overflow-y-auto">
                          <label className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedTags.length === 0}
                              onChange={() => setSelectedTags([])}
                              className="rounded accent-[#174887]"
                            />
                            <span className="text-sm text-gray-700 font-medium">
                              Any (no filter)
                            </span>
                          </label>
                          <div className="border-t border-gray-100 my-1" />
                          {spaceTags.map((tag) => (
                            <label
                              key={tag.name}
                              className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selectedTags.includes(tag.name)}
                                onChange={() => toggleTag(tag.name)}
                                className="rounded accent-[#174887]"
                              />
                              <span
                                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                style={{
                                  backgroundColor: hexToRgba(tag.tag_bg, 0.18),
                                  color: '#1a1c1f',
                                }}
                              >
                                {tag.name}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="px-3 py-2 text-sm text-gray-600 hover:text-[#174887]
                               hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>

            {/* Assessment Items */}
            <div className="mb-4">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {isHourly ? 'Items' : 'Assessment Items'} ({filteredAndSortedItems.length}
                {filteredAndSortedItems.length !== displayItems.length &&
                  ` of ${displayItems.length}`}
                )
              </h3>
            </div>

            {filteredAndSortedItems.length === 0 ? (
              <div className="bg-white border-2 border-gray-200 rounded-xl p-12 text-center">
                {displayItems.length === 0 ? (
                  <>
                    <p className="text-gray-500 text-lg">
                      No items marked for approval found.
                    </p>
                    <p className="text-sm text-gray-400 mt-2">
                      Only tasks with &ldquo;Approval Needed&rdquo; checked in
                      ClickUp will appear here.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-gray-500 text-lg">
                      No items match your filters.
                    </p>
                    <button
                      onClick={clearFilters}
                      className="mt-3 text-[#174887] hover:underline font-medium"
                    >
                      Clear filters
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {filteredAndSortedItems.map((item, index) => (
                  <AssessmentItemCard
                    key={item.id}
                    item={item}
                    index={index}
                    onExpand={setSelectedItem}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Item Detail Modal */}
        {selectedItem && (
          <AssessmentItemDetail
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
          />
        )}

        {/* Preview Modal */}
        {showPreview && (
          <AssessmentPreview
            companyName={company.name ?? ''}
            items={displayItems}
            onClose={() => setShowPreview(false)}
          />
        )}

        {/* Footer Actions */}
        <div className="mt-8 flex justify-end gap-3">
          <button
            onClick={onBack}
            className="px-5 py-3 border-2 border-gray-300 rounded-lg text-gray-700
                       hover:bg-gray-50 font-medium transition-colors"
          >
            Cancel
          </button>
          {sendSuccess ? (
            <div className="px-5 py-3 rounded-lg bg-green-100 text-green-800 font-semibold flex items-center gap-2">
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
                  d="M5 13l4 4L19 7"
                />
              </svg>
              {isHourly ? 'Sent!' : 'Assessment Sent'}
            </div>
          ) : (
            <button
              onClick={handleSend}
              disabled={isSending || displayItems.length === 0}
              className="px-5 py-3 rounded-lg text-white font-semibold hover:opacity-90
                         transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#174887' }}
            >
              {isSending ? 'Sending…' : isHourly ? 'Send Items' : 'Send Assessment'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
