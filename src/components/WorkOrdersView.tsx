'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { AssessmentItem, StoredComment } from '@/types/types-index';
import { getCategoryColor } from '@/lib/utils';

type StatusBucket = 'Pending & In Progress' | 'On Hold' | 'Closed';

const BUCKET_STATUSES: Record<StatusBucket, string[]> = {
  'Pending & In Progress': ['yes - please complete', 'in progress'],
  'On Hold': ['maybe - more info', 'not now - keep open', 'needs quote'],
  'Closed': ['declined by owner', 'completed by others', 'complete'],
};

const BUCKET_ORDER: StatusBucket[] = ['Pending & In Progress', 'On Hold', 'Closed'];

const URGENCY_ORDER: Record<string, number> = {
  Urgent: 0,
  Recommended: 1,
  Cosmetic: 2,
  'Included Maintenance': 3,
  'No Issue': 4,
};

type SortOption = 'default' | 'urgency-high' | 'urgency-low' | 'date-old';

const CATEGORIES = [
  'Urgent',
  'Recommended',
  'Cosmetic',
  'Included Maintenance',
  'No Issue',
] as const;
type CategoryFilter = 'All' | (typeof CATEGORIES)[number];

export interface WorkOrderItem extends AssessmentItem {
  status: string;
  statusColor: string;
  thread: StoredComment[];
}

interface WorkOrdersViewProps {
  companyId: string;
  companyName?: string;
  mode: 'customer' | 'internal';
  authorName?: string; // customer's display name (customer mode)
  breadcrumbs?: React.ReactNode; // optional breadcrumb nav (internal mode)
  senderId?: string; // Assembly client ID of the current user (customer mode only)
  token?: string; // session token for Assembly SDK notifications
  externalUnreadTaskIds?: Set<string>; // customer mode: unread state owned by parent
  onMarkTaskRead?: (taskId: string) => void; // customer mode: called after marking a task read
}

// ─── Comment Box ──────────────────────────────────────────────────────────────

interface CommentBoxProps {
  taskId: string;
  companyId: string;
  companyName?: string;
  isInternal: boolean;
  authorName: string;
  senderId?: string;
  token?: string;
  onPosted: (comment: StoredComment) => void;
  onCancel?: () => void;
}

function CommentBox({ taskId, companyId, companyName, isInternal, authorName, senderId, token, onPosted, onCancel }: CommentBoxProps) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setSaving(true);
    setError(false);
    try {
      const res = await fetch(`/api/workorders/${companyId}/${taskId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim(), authorName, isInternal, senderId, token, companyName }),
      });
      const data = await res.json();
      if (res.ok && data.comment) {
        setText('');
        onPosted(data.comment);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a comment…"
        rows={3}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none
                   focus:outline-none focus:ring-2 focus:ring-[#174887] focus:border-transparent
                   placeholder-gray-400"
      />
      {error && <p className="text-xs text-red-600 mt-1">Failed to post comment. Try again.</p>}
      <div className="flex gap-2 mt-2 justify-end">
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={!text.trim() || saving}
          className="px-4 py-1.5 text-sm font-semibold text-white rounded-lg
                     hover:opacity-90 transition-opacity disabled:opacity-40"
          style={{ backgroundColor: '#174887' }}
        >
          {saving ? 'Posting…' : 'Post Comment'}
        </button>
      </div>
    </div>
  );
}

// ─── Item Card (internal — expandable inline comment) ─────────────────────────

interface InternalCardProps {
  item: WorkOrderItem;
  index: number;
  companyId: string;
  token?: string;
  isUnread?: boolean;
  onMarkRead?: () => void;
}

function InternalCard({ item, index, companyId, token, isUnread, onMarkRead }: InternalCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [comments, setComments] = useState<StoredComment[]>(item.thread ?? []);

  const handleClick = () => {
    setExpanded((v) => !v);
    if (isUnread && onMarkRead) {
      onMarkRead();
    }
  };

  return (
    <div
      className={`bg-white border-2 rounded-xl overflow-hidden transition-shadow hover:shadow-lg cursor-pointer ${
        isUnread ? 'border-[#174887]' : 'border-gray-200'
      }`}
      onClick={handleClick}
    >
      <div className="p-6">
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
                  <span className="text-sm font-semibold text-gray-500">#{index + 1}</span>
                  <span className="text-sm text-gray-600 font-medium">{item.location}</span>
                  {isUnread && (
                    <span className="px-2 py-0.5 text-xs font-bold rounded-full text-white" style={{ backgroundColor: '#174887' }}>
                      New
                    </span>
                  )}
                </div>
                <h4 className="text-lg font-bold text-gray-900 mb-2">{item.issue}</h4>
                {item.description && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      Description &amp; Recommendations
                    </p>
                    <p className="text-sm text-gray-700 leading-relaxed">{item.description}</p>
                  </div>
                )}
              </div>

              {/* Category Badge - Top Right */}
              <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                <span
                  className={`px-4 py-2 rounded-lg text-sm font-bold border-2 ${getCategoryColor(item.category)}`}
                >
                  {item.category}
                </span>
              </div>
            </div>

            {/* Bottom meta: tags + status */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-200">
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map((tag) => (
                  <span
                    key={tag.name}
                    className="px-2 py-1 text-xs rounded-md font-medium"
                    style={{ backgroundColor: tag.bg, color: tag.fg }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-3 ml-3 flex-shrink-0">
                {item.created_date && (
                  <span className="text-xs text-gray-400">{item.created_date}</span>
                )}
                <span
                  className="px-2.5 py-1 rounded-full text-xs font-semibold text-white capitalize"
                  style={{ backgroundColor: item.statusColor }}
                >
                  {item.status}
                </span>
              </div>
            </div>
          </div>

          {/* Expand chevron */}
          <div className="flex-shrink-0 self-center ml-2">
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Expandable comment section */}
      {expanded && (
        <div className="px-6 pb-6 pt-4 border-t border-gray-100 bg-gray-50/50" onClick={(e) => e.stopPropagation()}>
          {comments.length > 0 && (
            <div className="space-y-2 mb-4">
              {comments.map((c) => (
                <div key={c.id} className="bg-white border border-gray-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-gray-500 mb-1">
                    {c.isInternal ? 'MM Team' : c.authorName}
                  </p>
                  <p className="text-sm text-gray-800">{c.text}</p>
                </div>
              ))}
            </div>
          )}
          <CommentBox
            taskId={item.id}
            companyId={companyId}
            isInternal={true}
            authorName="MM Team"
            token={token}
            onPosted={(c) => setComments((prev) => [...prev, c])}
          />
        </div>
      )}
    </div>
  );
}

// ─── Item Modal (customer — detail + comment) ─────────────────────────────────

interface CustomerModalProps {
  item: WorkOrderItem;
  companyId: string;
  companyName?: string;
  authorName: string;
  senderId?: string;
  token?: string;
  onCommentPosted: (itemId: string, comment: StoredComment) => void;
  onClose: () => void;
}

function CustomerModal({ item, companyId, companyName, authorName, senderId, token, onCommentPosted, onClose }: CustomerModalProps) {
  const [activeImage, setActiveImage] = useState(0);
  const [comments, setComments] = useState<StoredComment[]>(item.thread ?? []);
  const [showComment, setShowComment] = useState(false);

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
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">{item.location}</p>
            <h2 className="text-lg font-bold text-gray-900 leading-snug">{item.issue}</h2>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span
              className="px-2.5 py-1 rounded-full text-xs font-semibold text-white capitalize"
              style={{ backgroundColor: item.statusColor }}
            >
              {item.status}
            </span>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Images */}
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
                        i === activeImage ? 'border-[#174887]' : 'border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      <img src={img} alt={`Image ${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Description & Recommendations */}
          {item.description && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Description &amp; Recommendations</p>
              <p className="text-sm text-gray-800">{item.description}</p>
            </div>
          )}

          {/* Tags */}
          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {item.tags.map((tag) => (
                <span
                  key={tag.name}
                  className="px-2 py-1 text-xs font-medium rounded-md"
                  style={{ backgroundColor: tag.bg, color: tag.fg }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}

          <div className="border-t border-gray-200" />

          {/* Comment thread */}
          {comments.length > 0 && (
            <div className="space-y-2">
              {comments.map((c) => (
                <div key={c.id} className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                  <p className="text-xs font-semibold text-gray-500 mb-1">
                    {c.isInternal ? 'MM Team' : c.authorName}
                  </p>
                  <p className="text-sm text-gray-800">{c.text}</p>
                </div>
              ))}
            </div>
          )}

          {/* Comment input */}
          {showComment ? (
            <CommentBox
              taskId={item.id}
              companyId={companyId}
              companyName={companyName}
              isInternal={false}
              authorName={authorName}
              senderId={senderId}
              token={token}
              onPosted={(c) => {
                setComments((prev) => [...prev, c]);
                setShowComment(false);
                onCommentPosted(item.id, c);
              }}
              onCancel={() => setShowComment(false)}
            />
          ) : (
            <button
              onClick={() => setShowComment(true)}
              className="w-full py-2.5 rounded-lg border-2 border-gray-200 text-sm font-medium text-gray-600
                         hover:border-[#174887] hover:text-[#174887] transition-colors"
            >
              Add a comment
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full py-3 rounded-lg font-bold text-sm"
            style={{ backgroundColor: '#174887', color: '#fff' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main WorkOrdersView ──────────────────────────────────────────────────────

export default function WorkOrdersView({ companyId, companyName, mode, authorName = 'Customer', breadcrumbs, senderId, token, externalUnreadTaskIds, onMarkTaskRead }: WorkOrdersViewProps) {
  const [items, setItems] = useState<WorkOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadTaskIds, setUnreadTaskIds] = useState<Set<string>>(new Set());
  const [unreadInternalTaskIds, setUnreadInternalTaskIds] = useState<Set<string>>(new Set());
  const [activeBucket, setActiveBucket] = useState<StatusBucket>('Pending & In Progress');
  const [activeItem, setActiveItem] = useState<WorkOrderItem | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('default');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('All');
  const [locationFilter, setLocationFilter] = useState('All');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const tagDropdownRef = useRef<HTMLDivElement>(null);

  const fetchUrl =
    mode === 'internal' && companyName
      ? `/api/workorders/${companyId}?companyName=${encodeURIComponent(companyName)}`
      : `/api/workorders/${companyId}`;

  useEffect(() => {
    fetch(fetchUrl)
      .then((r) => r.json())
      .then((data) => {
        setItems(data.items ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [fetchUrl]);

  // Fetch unread task IDs (customer mode only, when not externally managed)
  useEffect(() => {
    if (mode !== 'customer' || externalUnreadTaskIds !== undefined) return;
    fetch(`/api/workorders/${companyId}/unread`)
      .then((r) => r.json())
      .then((data) => setUnreadTaskIds(new Set(data.taskIds ?? [])))
      .catch(() => {});
  }, [companyId, mode, externalUnreadTaskIds]);

  // Fetch unread internal task IDs (internal mode only)
  useEffect(() => {
    if (mode !== 'internal') return;
    fetch(`/api/workorders/${companyId}/unread-internal`)
      .then((r) => r.json())
      .then((data) => setUnreadInternalTaskIds(new Set(data.taskIds ?? [])))
      .catch(() => {});
  }, [companyId, mode]);

  // Outside click for tag dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(e.target as Node)) {
        setTagDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Use externally-managed unread state when provided (customer mode with parent ownership)
  const effectiveUnreadTaskIds = externalUnreadTaskIds ?? unreadTaskIds;

  // Derive unique tags
  const itemTags = useMemo(() => {
    const seen = new Set<string>();
    const tags: WorkOrderItem['tags'] = [];
    for (const item of items) {
      for (const tag of item.tags) {
        if (!seen.has(tag.name)) { seen.add(tag.name); tags.push(tag); }
      }
    }
    return tags;
  }, [items]);

  // Derive unique locations
  const locations = useMemo(
    () =>
      Array.from(new Set(items.map((i) => i.location).filter(Boolean))).sort(),
    [items],
  );

  const filteredAndSortedItems = useMemo(() => {
    let result = [...items];

    const bucketStatuses = BUCKET_STATUSES[activeBucket];
    result = result.filter((i) => bucketStatuses.includes(i.status.toLowerCase()));

    if (categoryFilter !== 'All') {
      result = result.filter((i) => i.category === categoryFilter);
    }

    if (locationFilter !== 'All') {
      result = result.filter((i) => i.location === locationFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (i) =>
          i.issue?.toLowerCase().includes(q) ||
          i.location?.toLowerCase().includes(q) ||
          i.description?.toLowerCase().includes(q) ||
          i.tags.some((t) => t.name.toLowerCase().includes(q)),
      );
    }

    if (selectedTags.length > 0) {
      result = result.filter((i) =>
        selectedTags.some((name) => i.tags.some((t) => t.name === name)),
      );
    }

    if (sortOption === 'urgency-high') {
      result.sort((a, b) => (URGENCY_ORDER[a.category] ?? 99) - (URGENCY_ORDER[b.category] ?? 99));
    } else if (sortOption === 'urgency-low') {
      result.sort((a, b) => (URGENCY_ORDER[b.category] ?? 99) - (URGENCY_ORDER[a.category] ?? 99));
    } else if (sortOption === 'date-old') {
      result.sort((a, b) => (a.created_date ?? '').localeCompare(b.created_date ?? ''));
    } else {
      // default: most recently created first; status-changed items float to top via unread logic below
      result.sort((a, b) => (b.created_date ?? '').localeCompare(a.created_date ?? ''));
    }

    // Unread items float to the top
    if (mode === 'customer' && effectiveUnreadTaskIds.size > 0) {
      result.sort((a, b) => {
        const aUnread = effectiveUnreadTaskIds.has(a.id) ? 0 : 1;
        const bUnread = effectiveUnreadTaskIds.has(b.id) ? 0 : 1;
        return aUnread - bUnread;
      });
    } else if (mode === 'internal' && unreadInternalTaskIds.size > 0) {
      result.sort((a, b) => {
        const aUnread = unreadInternalTaskIds.has(a.id) ? 0 : 1;
        const bUnread = unreadInternalTaskIds.has(b.id) ? 0 : 1;
        return aUnread - bUnread;
      });
    }

    return result;
  }, [items, activeBucket, categoryFilter, locationFilter, searchQuery, selectedTags, sortOption, effectiveUnreadTaskIds, unreadInternalTaskIds, mode]);

  const clearFilters = () => {
    setSearchQuery('');
    setSortOption('default');
    setCategoryFilter('All');
    setLocationFilter('All');
    setSelectedTags([]);
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    sortOption !== 'default' ||
    categoryFilter !== 'All' ||
    locationFilter !== 'All' ||
    selectedTags.length > 0;

  const toggleTag = (name: string) => {
    setSelectedTags((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name],
    );
  };

  const containerClass =
    mode === 'internal'
      ? 'max-w-6xl mx-auto py-8 px-4'
      : 'max-w-2xl mx-auto py-8 px-4';

  if (loading) {
    return (
      <div className={containerClass}>
        {breadcrumbs}
        <div className="flex items-center justify-center py-20">
          <svg className="w-8 h-8 animate-spin text-[#174887]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={containerClass}>
        {breadcrumbs}
        <div className="text-center py-20 text-gray-400">
          <p className="text-base font-medium">No work orders yet.</p>
          <p className="text-sm mt-1">Items will appear here once an assessment is submitted.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClass}>
      {breadcrumbs}
      {/* Status bucket tabs */}
      <div className="border-b border-gray-200 bg-white mb-5 -mx-4 px-4 overflow-x-auto">
        <div className="flex gap-0 min-w-max">
          {BUCKET_ORDER.map((bucket) => {
            const count = items.filter((i) =>
              BUCKET_STATUSES[bucket].includes(i.status.toLowerCase()),
            ).length;
            return (
              <button
                key={bucket}
                onClick={() => setActiveBucket(bucket)}
                className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  activeBucket === bucket
                    ? 'border-[#174887] text-[#174887]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {bucket} <span className="ml-1 text-xs opacity-60">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-4 mb-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="flex-1 min-w-[160px]">
            <div className="relative flex items-center">
              <svg className="absolute left-3 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search work orders…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-[#174887] focus:border-transparent"
              />
            </div>
          </div>

          {/* Urgency */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Urgency:</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm
                         focus:outline-none focus:ring-2 focus:ring-[#174887]"
            >
              <option value="All">All</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Location */}
          {locations.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Location:</label>
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm
                           focus:outline-none focus:ring-2 focus:ring-[#174887]"
              >
                <option value="All">All</option>
                {locations.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
          )}

          {/* Sort */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Sort:</label>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm
                         focus:outline-none focus:ring-2 focus:ring-[#174887]"
            >
              <option value="default">Most Recent</option>
              <option value="date-old">Oldest First</option>
              <option value="urgency-high">Urgency: High to Low</option>
              <option value="urgency-low">Urgency: Low to High</option>
            </select>
          </div>

          {/* Tags */}
          {itemTags.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Tags:</label>
              <div className="relative" ref={tagDropdownRef}>
                <button
                  onClick={() => setTagDropdownOpen((v) => !v)}
                  className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm
                             focus:outline-none focus:ring-2 focus:ring-[#174887] hover:border-gray-400 transition-colors"
                >
                  <span className={selectedTags.length > 0 ? 'text-[#174887] font-semibold' : 'text-gray-700'}>
                    {selectedTags.length === 0 ? 'Any' : `${selectedTags.length} selected`}
                  </span>
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${tagDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {tagDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg min-w-[200px] py-1 max-h-80 overflow-y-auto">
                    <label className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer">
                      <input type="checkbox" checked={selectedTags.length === 0} onChange={() => setSelectedTags([])} className="rounded accent-[#174887]" />
                      <span className="text-sm text-gray-700 font-medium">Any (no filter)</span>
                    </label>
                    <div className="border-t border-gray-100 my-1" />
                    {itemTags.map((tag) => (
                      <label key={tag.name} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer">
                        <input type="checkbox" checked={selectedTags.includes(tag.name)} onChange={() => toggleTag(tag.name)} className="rounded accent-[#174887]" />
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: tag.bg, color: tag.fg }}>
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
            <button onClick={clearFilters} className="px-3 py-2 text-sm text-gray-600 hover:text-[#174887] hover:bg-gray-100 rounded-lg transition-colors">
              Clear filters
            </button>
          )}
        </div>
      </div>

      {hasActiveFilters && (
        <p className="text-xs text-gray-500 mb-3 px-1">
          Showing {filteredAndSortedItems.length} of{' '}
          {items.filter((i) => BUCKET_STATUSES[activeBucket].includes(i.status.toLowerCase())).length}{' '}
          item{filteredAndSortedItems.length !== 1 ? 's' : ''} in this bucket
        </p>
      )}

      {/* Item list */}
      <div className="space-y-3">
        {filteredAndSortedItems.map((item, index) =>
          mode === 'internal' ? (
            <InternalCard
              key={item.id}
              item={item}
              index={index}
              companyId={companyId}
              token={token}
              isUnread={unreadInternalTaskIds.has(item.id)}
              onMarkRead={() => {
                fetch(`/api/workorders/${companyId}/${item.id}/mark-internal-read`, { method: 'POST' }).catch(() => {});
                setUnreadInternalTaskIds((prev) => { const next = new Set(prev); next.delete(item.id); return next; });
              }}
            />
          ) : (
            <button
              key={item.id}
              onClick={() => {
                setActiveItem(item);
                if (effectiveUnreadTaskIds.has(item.id) && token) {
                  fetch(`/api/workorders/${companyId}/${item.id}/mark-read`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token }),
                  }).then(() => {
                    if (onMarkTaskRead) {
                      onMarkTaskRead(item.id);
                    } else {
                      setUnreadTaskIds((prev) => { const next = new Set(prev); next.delete(item.id); return next; });
                    }
                  }).catch(() => {});
                }
              }}
              className={`w-full text-left bg-white rounded-xl p-6 transition-shadow hover:shadow-lg border-2 ${
                effectiveUnreadTaskIds.has(item.id) ? 'border-[#174887]' : 'border-gray-200'
              }`}
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
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-semibold text-gray-500">#{index + 1}</span>
                        <span className="text-sm text-gray-600 font-medium">{item.location}</span>
                        {effectiveUnreadTaskIds.has(item.id) && (
                          <span className="px-2 py-0.5 text-xs font-bold text-white rounded-full" style={{ backgroundColor: '#174887' }}>
                            New
                          </span>
                        )}
                      </div>
                      <h4 className="text-lg font-bold text-gray-900 mb-2">{item.issue}</h4>
                      {item.description && (
                        <div className="mb-3">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                            Description &amp; Recommendations
                          </p>
                          <p className="text-sm text-gray-700 leading-relaxed">{item.description}</p>
                        </div>
                      )}
                    </div>
                    <span
                      className="px-2.5 py-1 rounded-full text-xs font-semibold text-white capitalize flex-shrink-0 ml-4"
                      style={{ backgroundColor: item.statusColor }}
                    >
                      {item.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                    <div className="flex flex-wrap gap-1.5">
                      {item.tags.map((tag) => (
                        <span
                          key={tag.name}
                          className="px-2 py-1 text-xs rounded-md font-medium"
                          style={{ backgroundColor: tag.bg, color: tag.fg }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                    {item.created_date && (
                      <span className="text-xs text-gray-400 flex-shrink-0 ml-3">{item.created_date}</span>
                    )}
                  </div>
                </div>

                <svg className="w-4 h-4 text-gray-300 flex-shrink-0 self-center" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ),
        )}

        {filteredAndSortedItems.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-sm">No items match your filters.</p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="mt-2 text-[#174887] hover:underline text-sm font-medium">
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Customer detail modal */}
      {mode === 'customer' && activeItem && (
        <CustomerModal
          item={activeItem}
          companyId={companyId}
          companyName={companyName}
          authorName={authorName}
          senderId={senderId}
          token={token}
          onCommentPosted={(itemId, comment) => {
            setItems((prev) =>
              prev.map((i) =>
                i.id === itemId
                  ? { ...i, thread: [...(i.thread ?? []), comment] }
                  : i,
              ),
            );
            setActiveItem((prev) =>
              prev?.id === itemId
                ? { ...prev, thread: [...(prev.thread ?? []), comment] }
                : prev,
            );
          }}
          onClose={() => setActiveItem(null)}
        />
      )}
    </div>
  );
}
