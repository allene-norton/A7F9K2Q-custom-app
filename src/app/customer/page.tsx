'use client';

import { Suspense, useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { getLoggedInUser } from '@/lib/assembly/client';
import { StoredAssessment } from '@/lib/store';
import { AssessmentItem } from '@/types/types-index';
import { getCategoryColor, hexToRgba } from '@/lib/utils';
import { CUSTOMER_SELECTION_OPTIONS } from '@/lib/constants';
import WorkOrdersView from '@/components/WorkOrdersView';

type SortOption = 'default' | 'urgency-high' | 'urgency-low' | 'date-old';
type ActiveView = 'assessment' | 'workorders';

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

// ─── Item Detail Modal ────────────────────────────────────────────────────────

interface ItemModalProps {
  item: AssessmentItem;
  selection: string | undefined;
  comment: string;
  onSelectionChange: (val: string) => void;
  onCommentChange: (val: string) => void;
  onClose: () => void;
}

function ItemModal({
  item,
  selection,
  comment,
  onSelectionChange,
  onCommentChange,
  onClose,
}: ItemModalProps) {
  const [activeImage, setActiveImage] = useState(0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex-1 pr-4">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">
              {item.location}
            </p>
            <h2 className="text-lg font-bold text-gray-900 leading-snug">
              {item.issue}
            </h2>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span
              className={`px-2.5 py-1 rounded-lg text-xs font-bold border-2 ${getCategoryColor(item.category)}`}
            >
              {item.category}
            </span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400"
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

        <div className="p-5 space-y-5">
          {/* Image gallery */}
          {item.images.length > 0 && (
            <div>
              <img
                src={item.images[activeImage]}
                alt={item.issue}
                className="w-full h-64 object-cover rounded-xl border border-gray-200"
              />
              {item.images.length > 1 && (
                <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                  {item.images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImage(i)}
                      className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-colors ${
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
                  style={{ backgroundColor: tag.bg, color: '#1a1c1f' }}
                  className="px-2 py-1 text-xs rounded-md font-medium"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-gray-200" />

          {/* Selection */}
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1.5">
              Your Selection <span className="text-red-500">*</span>
            </label>
            <select
              value={selection ?? ''}
              onChange={(e) => onSelectionChange(e.target.value)}
              className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg bg-white text-sm
                         focus:outline-none focus:ring-2 focus:ring-[#174887] focus:border-[#174887]"
              style={
                selection
                  ? {
                      borderColor:
                        CUSTOMER_SELECTION_OPTIONS.find(
                          (o) => String(o.orderindex) === selection,
                        )?.color ?? undefined,
                    }
                  : undefined
              }
            >
              <option value="" disabled>
                Choose an option…
              </option>
              {CUSTOMER_SELECTION_OPTIONS.map((opt) => (
                <option key={opt.orderindex} value={String(opt.orderindex)}>
                  {opt.name}
                </option>
              ))}
            </select>

            {selection !== undefined && (
              <textarea
                value={comment}
                onChange={(e) => onCommentChange(e.target.value)}
                placeholder="Add a note for our team (optional)"
                rows={3}
                className="mt-2 w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-[#174887] focus:border-[#174887]
                           resize-none placeholder-gray-400"
              />
            )}
          </div>

          {/* Done button */}
          <button
            onClick={onClose}
            className="w-full py-3 rounded-lg font-bold text-sm transition-opacity"
            style={{ backgroundColor: '#174887', color: '#fff' }}
          >
            {selection ? 'Save & Close' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function CustomerPageInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? undefined;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assessments, setAssessments] = useState<StoredAssessment[]>([]);
  const [selectedAssessment, setSelectedAssessment] =
    useState<StoredAssessment | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeItem, setActiveItem] = useState<AssessmentItem | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>('assessment');
  const [unreadTaskIds, setUnreadTaskIds] = useState<Set<string>>(new Set());

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<
    'All' | AssessmentItem['category']
  >('All');
  const [sortOption, setSortOption] = useState<SortOption>('default');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const tagDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const userData = await getLoggedInUser(undefined, token);
        if (!userData || 'error' in userData) {
          setError('Unable to verify your session. Please reload the page.');
          return;
        }

        const id = userData.company?.id;
        if (!id) {
          setError('No company found for your account.');
          return;
        }

        setCompanyId(id);
        setClientId(userData.client?.id ?? null);
        const res = await fetch(`/api/assessments/${id}`);
        const list: StoredAssessment[] = await res.json();
        setAssessments(list ?? []);
        if (list?.length === 1) setSelectedAssessment(list[0]);
      } catch (e) {
        setError('Failed to load. Please try again.');
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [token]);

  // Fetch unread notification IDs when company is known
  useEffect(() => {
    if (!companyId) return;
    fetch(`/api/workorders/${companyId}/unread`)
      .then((r) => r.json())
      .then((data) => setUnreadTaskIds(new Set(data.taskIds ?? [])))
      .catch(() => {});
  }, [companyId]);

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

  const handleSelectAssessment = (a: StoredAssessment) => {
    setSelectedAssessment(a);
    setSelections({});
    setComments({});
    setSubmitted(false);
    setCategoryFilter('All');
    setSortOption('default');
    setSearchQuery('');
    setSelectedTags([]);
  };

  const handleSubmit = async () => {
    if (!selectedAssessment || !companyId) return;
    setIsSubmitting(true);
    try {
      const payload = selectedAssessment.items.map((item: AssessmentItem) => ({
        clickup_task_id: item.clickup_task_id,
        orderindex: Number(selections[item.id]),
        comment: comments[item.id] ?? '',
      }));
      const res = await fetch(`/api/assessments/${companyId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessmentId: selectedAssessment.assessmentId,
          items: payload,
          senderId: clientId ?? undefined,
          token,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
        const submittedAt = new Date().toISOString();
        setAssessments((prev) =>
          prev.map((a) =>
            a.assessmentId === selectedAssessment.assessmentId
              ? { ...a, submittedAt }
              : a,
          ),
        );
      } else {
        alert('Some items failed to update. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // True if submitted this session OR if already marked submitted in Redis
  const isSubmitted = submitted || Boolean(selectedAssessment?.submittedAt);

  const allSelected =
    selectedAssessment !== null &&
    selectedAssessment.items.length > 0 &&
    selectedAssessment.items.every(
      (item: AssessmentItem) => selections[item.id] !== undefined,
    );

  // Derive unique tags from assessment items
  const itemTags = useMemo(() => {
    if (!selectedAssessment) return [];
    const seen = new Set<string>();
    const tags: AssessmentItem['tags'] = [];
    for (const item of selectedAssessment.items) {
      for (const tag of item.tags) {
        if (!seen.has(tag.name)) {
          seen.add(tag.name);
          tags.push(tag);
        }
      }
    }
    return tags;
  }, [selectedAssessment]);

  const filteredAndSortedItems = useMemo(() => {
    if (!selectedAssessment) return [];
    let items = [...selectedAssessment.items];

    if (categoryFilter !== 'All') {
      items = items.filter((item) => item.category === categoryFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.issue?.toLowerCase().includes(q) ||
          item.location?.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q) ||
          item.tags.some((tag) => tag.name.toLowerCase().includes(q)),
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
    } else if (sortOption === 'date-old') {
      items.sort((a, b) => (a.created_date ?? '').localeCompare(b.created_date ?? ''));
    } else {
      // default: most recent first
      items.sort((a, b) => (b.created_date ?? '').localeCompare(a.created_date ?? ''));
    }

    return items;
  }, [
    selectedAssessment,
    categoryFilter,
    searchQuery,
    selectedTags,
    sortOption,
  ]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg
            className="w-10 h-10 animate-spin text-[#174887] mx-auto mb-4"
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
          <p className="text-gray-600">Loading…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-xl border-2 border-red-200 p-8 max-w-md text-center">
          <p className="text-red-700 font-semibold">{error}</p>
        </div>
      </div>
    );
  }

  const safeCompanyId = companyId ?? '';
  const companyName = assessments[0]?.companyName ?? '';
  const isHourly = assessments.some((a) => a.isHourly);
  const nounPlural = isHourly ? 'items' : 'assessments';
  const selectedCount = selectedAssessment
    ? selectedAssessment.items.filter(
        (item: AssessmentItem) => selections[item.id] !== undefined,
      ).length
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div
        className="py-5 px-6 shadow-sm"
        style={{ backgroundColor: '#174887' }}
      >
        <h1 className="text-xl font-bold text-white">Maintenance Matters</h1>
      </div>

      {/* Tab bar */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-0">
              {(['assessment', 'workorders'] as ActiveView[]).map((view) => (
                <button
                  key={view}
                  onClick={() => setActiveView(view)}
                  className={`px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors ${
                    activeView === view
                      ? 'border-[#174887] text-[#174887]'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {view === 'assessment' ? (isHourly ? 'Items' : 'Assessment') : 'Work Orders'}
                </button>
              ))}
            </div>
            {unreadTaskIds.size > 0 && (
              <button
                onClick={async () => {
                  try {
                    await fetch(`/api/workorders/${safeCompanyId}/mark-all-read`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ token }),
                    });
                    setUnreadTaskIds(new Set());
                  } catch {
                    // silent fail
                  }
                }}
                className="text-xs font-medium text-[#174887] hover:underline py-1"
              >
                Clear notifications
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Work Orders tab */}
      {activeView === 'workorders' ? (
        <WorkOrdersView
          companyId={safeCompanyId}
          companyName={companyName}
          mode="customer"
          authorName={companyName}
          senderId={clientId ?? undefined}
          token={token}
          externalUnreadTaskIds={unreadTaskIds}
          onMarkTaskRead={(taskId) =>
            setUnreadTaskIds((prev) => {
              const next = new Set(prev);
              next.delete(taskId);
              return next;
            })
          }
        />
      ) : (
        <>
          {/* Assessment tab — empty state */}
          {assessments.length === 0 ? (
            <div className="max-w-2xl mx-auto py-16 px-4 text-center">
              <svg
                className="w-16 h-16 text-gray-300 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Nothing available for review yet
              </h2>
              <p className="text-gray-500">
                Your team will notify you when items are ready for your review.
              </p>
            </div>
          ) : assessments.length > 1 && !selectedAssessment ? (
            /* Assessment tab — selector */
            <div className="max-w-2xl mx-auto py-8 px-4">
              <h2
                className="text-2xl font-bold mb-1"
                style={{ color: '#174887' }}
              >
                {companyName}
              </h2>
              <p className="text-gray-500 text-sm mb-6">
                You have {assessments.length} {nounPlural} ready for review.
                Select one to get started.
              </p>
              <div className="space-y-3">
                {assessments.map((a) => {
                  const alreadySubmitted = Boolean(a.submittedAt);
                  return (
                    <button
                      key={a.assessmentId}
                      onClick={() => !alreadySubmitted && handleSelectAssessment(a)}
                      disabled={alreadySubmitted}
                      className={`w-full text-left bg-white border-2 rounded-xl p-5 transition-all ${
                        alreadySubmitted
                          ? 'border-gray-200 opacity-60 cursor-not-allowed'
                          : 'border-gray-200 hover:border-[#174887] hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-semibold text-gray-900 text-base leading-snug">
                              {a.assessmentName}
                            </p>
                            {alreadySubmitted && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 flex-shrink-0">
                                Submitted
                              </span>
                            )}
                          </div>
                          {a.items[0]?.location && (
                            <p className="text-xs font-medium text-[#174887] mt-0.5">
                              {a.items[0].location}
                            </p>
                          )}
                          <p className="text-sm text-gray-500 mt-1">
                            Sent{' '}
                            {new Date(a.sentAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                            {' · '}
                            {a.items.length} item{a.items.length !== 1 ? 's' : ''}
                          </p>
                          {alreadySubmitted && (
                            <p className="text-xs text-gray-500 mt-1.5">
                              Go to <strong>Work Orders</strong> to view this submission.
                            </p>
                          )}
                        </div>
                        {!alreadySubmitted && (
                          <svg
                            className="w-5 h-5 text-gray-400 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Assessment tab — selected assessment view */
            <div className="max-w-2xl mx-auto py-8 px-4">
              {/* Back to assessments (multi-assessment only) */}
              {assessments.length > 1 && (
                <button
                  onClick={() => setSelectedAssessment(null)}
                  className="flex items-center gap-2 text-gray-600 hover:text-[#174887] mb-5 transition-colors font-medium text-sm"
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
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  All {nounPlural}
                </button>
              )}

              {/* Header card */}
              <div className="bg-white rounded-xl border-2 border-gray-200 p-6 mb-6 shadow-sm">
                <h2
                  className="text-2xl font-bold mb-0.5"
                  style={{ color: '#174887' }}
                >
                  {selectedAssessment!.companyName}
                </h2>
                <p className="text-base font-semibold text-gray-700 mb-1">
                  {selectedAssessment!.assessmentName}
                </p>
                <p className="text-gray-500 text-sm">
                  Sent{' '}
                  {new Date(selectedAssessment!.sentAt).toLocaleDateString(
                    'en-US',
                    {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    },
                  )}
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  Tap each item to review details and make your selection. When
                  you&rsquo;re done, click <strong>Submit Selections</strong> at
                  the bottom.
                </p>
                {selectedAssessment!.items.length > 0 && (
                  <p className="text-xs text-gray-400 mt-3">
                    {selectedCount} of {selectedAssessment!.items.length} item
                    {selectedAssessment!.items.length !== 1 ? 's' : ''} reviewed
                  </p>
                )}
              </div>

              {/* Filter Bar */}
              <div className="bg-white rounded-xl border-2 border-gray-200 p-4 mb-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Search */}
                  <div className="flex-1 min-w-[160px]">
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
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm
                                   focus:outline-none focus:ring-2 focus:ring-[#174887] focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Urgency */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">
                      Urgency:
                    </label>
                    <select
                      value={categoryFilter}
                      onChange={(e) =>
                        setCategoryFilter(
                          e.target.value as 'All' | AssessmentItem['category'],
                        )
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm
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

                  {/* Sort */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">
                      Sort:
                    </label>
                    <select
                      value={sortOption}
                      onChange={(e) =>
                        setSortOption(e.target.value as SortOption)
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm
                                 focus:outline-none focus:ring-2 focus:ring-[#174887] focus:border-gray"
                    >
                      <option value="default">Most Recent</option>
                      <option value="date-old">Oldest First</option>
                      <option value="urgency-high">Urgency: High to Low</option>
                      <option value="urgency-low">Urgency: Low to High</option>
                    </select>
                  </div>

                  {/* Tags multi-select */}
                  {itemTags.length > 0 && (
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
                            {itemTags.map((tag) => (
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
                                    backgroundColor: tag.bg,
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

                  {/* Clear filters */}
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="px-3 py-2 text-sm text-gray-600 hover:text-[#174887] hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              </div>

              {hasActiveFilters && (
                <p className="text-xs text-gray-500 mb-3 px-1">
                  Showing {filteredAndSortedItems.length} of{' '}
                  {selectedAssessment!.items.length} item
                  {selectedAssessment!.items.length !== 1 ? 's' : ''}
                </p>
              )}

              {/* Item cards */}
              <div className="space-y-5 mb-8">
                {filteredAndSortedItems.map(
                  (item: AssessmentItem, index: number) => {
                    const sel = selections[item.id];
                    const chosenOption =
                      sel !== undefined
                        ? CUSTOMER_SELECTION_OPTIONS.find(
                            (o) => String(o.orderindex) === sel,
                          )
                        : undefined;

                    return (
                      <div
                        key={item.id}
                        className={`bg-white rounded-xl border shadow-sm transition-all ${
                          isSubmitted ? 'opacity-60' : 'hover:shadow-lg'
                        } ${chosenOption ? 'ring-2' : 'border-gray-200'}`}
                        style={{
                          borderColor: chosenOption?.color ?? '#e5e7eb',
                        }}
                      >
                        {/* Card Header */}
                        <div className="p-5 pb-0">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="inline-flex items-center justify-center w-6 h-6 bg-gray-100 text-gray-600 text-xs font-bold rounded-full">
                                  {index + 1}
                                </span>
                                <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                                  {item.location}
                                </span>
                              </div>
                              <h3 className="text-base font-bold text-gray-900 leading-tight pr-4">
                                {item.issue}
                              </h3>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 ${getCategoryColor(item.category)}`}
                              >
                                {item.category}
                              </span>
                              {chosenOption && (
                                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                                  <svg
                                    className="w-4 h-4 text-green-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2.5}
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Tags */}
                          {item.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-4">
                              {item.tags.map((tag) => (
                                <span
                                  key={tag.name}
                                  className="px-2.5 py-1 text-xs font-medium rounded-full border"
                                  style={{
                                    backgroundColor: tag.bg,
                                    borderColor: tag.bg,
                                    color: '#374151',
                                  }}
                                >
                                  {tag.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Description & Recommendations */}
                        {item.description && (
                          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                              Description &amp; Recommendations
                            </p>
                            <p className="text-sm text-gray-700 leading-relaxed line-clamp-3">
                              {item.description}
                            </p>
                          </div>
                        )}

                        {/* Image */}
                        {item.images.length > 0 && (
                          <div className="px-5 pt-4">
                            <div className="relative">
                              <img
                                src={item.images[0]}
                                alt={item.issue}
                                className="w-full h-40 object-cover rounded-lg border border-gray-200"
                              />
                              {item.images.length > 1 && (
                                <div className="absolute top-2 right-2 bg-black/70 text-white text-xs font-medium px-2 py-1 rounded-full">
                                  +{item.images.length - 1} more
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Selection Status or CTA Button */}
                        <div className="p-5 pt-4">
                          {chosenOption ? (
                            <div className="text-center py-2">
                              <button
                                onClick={() => !isSubmitted && setActiveItem(item)}
                                disabled={isSubmitted}
                                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-opacity ${!isSubmitted ? 'hover:opacity-75' : 'cursor-default'}`}
                                style={{
                                  borderColor: chosenOption.color,
                                  backgroundColor: hexToRgba(
                                    chosenOption.color,
                                    0.05,
                                  ),
                                }}
                              >
                                <svg
                                  className="w-4 h-4 text-green-600"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2.5}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                                <span
                                  className="text-sm font-semibold"
                                  style={{ color: chosenOption.color }}
                                >
                                  {chosenOption.name}
                                </span>
                                {!isSubmitted && (
                                  <svg
                                    className="w-3.5 h-3.5 text-gray-400 ml-0.5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                    />
                                  </svg>
                                )}
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => !isSubmitted && setActiveItem(item)}
                              disabled={isSubmitted}
                              className="w-full py-3.5 px-4 bg-gradient-to-r from-[#174887] to-[#1e5a9b] hover:from-[#0f3d73] hover:to-[#174887] text-white font-semibold rounded-lg transition-all duration-200 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                            >
                              <span>Tap to Review</span>
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
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  },
                )}

                {filteredAndSortedItems.length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    <p className="text-sm">No items match your filters.</p>
                    {hasActiveFilters && (
                      <button
                        onClick={clearFilters}
                        className="mt-2 text-[#174887] hover:underline text-sm font-medium"
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Submit area */}
              {isSubmitted ? (
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 text-center">
                  <svg
                    className="w-10 h-10 text-green-500 mx-auto mb-2"
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
                  <h3 className="text-lg font-bold text-green-800">
                    Selections Submitted!
                  </h3>
                  <p className="text-sm text-green-700 mt-1">
                    Thank you. You can view your selections in the Work Orders tab..
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border-2 border-gray-200 p-6 shadow-sm text-center">
                  {!allSelected && (
                    <p className="text-sm text-amber-700 mb-3">
                      Please review and select all items before submitting.
                    </p>
                  )}
                  <button
                    onClick={handleSubmit}
                    disabled={!allSelected || isSubmitting}
                    className="px-8 py-3 rounded-lg text-white font-bold text-base hover:opacity-90
                               transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ backgroundColor: '#174887' }}
                  >
                    {isSubmitting ? 'Submitting…' : 'Submit Selections'}
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Item detail modal */}
      {activeItem && (
        <ItemModal
          item={activeItem}
          selection={selections[activeItem.id]}
          comment={comments[activeItem.id] ?? ''}
          onSelectionChange={(val) =>
            setSelections((prev) => ({ ...prev, [activeItem.id]: val }))
          }
          onCommentChange={(val) =>
            setComments((prev) => ({ ...prev, [activeItem.id]: val }))
          }
          onClose={() => setActiveItem(null)}
        />
      )}
    </div>
  );
}

export default function CustomerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <svg
            className="w-10 h-10 animate-spin text-[#174887]"
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
        </div>
      }
    >
      <CustomerPageInner />
    </Suspense>
  );
}
