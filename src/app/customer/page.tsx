'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { getLoggedInUser } from '@/lib/assembly/client';
import { StoredAssessment } from '@/lib/store';
import { AssessmentItem } from '@/types/types-index';
import { getCategoryColor } from '@/lib/utils';
import { CUSTOMER_SELECTION_OPTIONS } from '@/lib/constants';

const CATEGORY_OPTIONS = ['All', 'Urgent', 'Recommended', 'Cosmetic', 'Included Maintenance', 'No Issue'];

function CustomerPageInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? undefined;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assessment, setAssessment] = useState<StoredAssessment | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

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
        const res = await fetch(`/api/assessments/${id}`);
        const data = await res.json();
        setAssessment(data);
      } catch (e) {
        setError('Failed to load assessment. Please try again.');
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [token]);

  const handleSubmit = async () => {
    if (!assessment || !companyId) return;
    setIsSubmitting(true);
    try {
      const payload = assessment.items.map((item: AssessmentItem) => ({
        clickup_task_id: item.clickup_task_id,
        orderindex: Number(selections[item.id]),
        comment: comments[item.id] ?? '',
      }));
      const res = await fetch(`/api/assessments/${companyId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: payload }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
      } else {
        alert('Some items failed to update. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const allSelected =
    assessment !== null &&
    assessment.items.length > 0 &&
    assessment.items.every((item: AssessmentItem) => selections[item.id] !== undefined);

  const filteredItems = assessment?.items.filter((item: AssessmentItem) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      item.issue?.toLowerCase().includes(q) ||
      item.location?.toLowerCase().includes(q) ||
      item.description?.toLowerCase().includes(q) ||
      item.recommendation?.toLowerCase().includes(q);
    const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  }) ?? [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="w-10 h-10 animate-spin text-[#174887] mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <p className="text-gray-600">Loading your assessment…</p>
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

  if (!assessment) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="py-5 px-6 shadow-sm" style={{ backgroundColor: '#174887' }}>
          <h1 className="text-xl font-bold text-white">Maintenance Matters</h1>
        </div>
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
            No assessments currently available for review
          </h2>
          <p className="text-gray-500">
            Your team will notify you when an assessment is ready.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-5 px-6 shadow-sm" style={{ backgroundColor: '#174887' }}>
        <h1 className="text-xl font-bold text-white">Maintenance Matters</h1>
      </div>

      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="bg-white rounded-xl border-2 border-gray-200 p-6 mb-6 shadow-sm">
          <h2 className="text-2xl font-bold mb-1" style={{ color: '#174887' }}>
            {assessment.companyName}
          </h2>
          <p className="text-gray-500 text-sm">
            Assessment sent {new Date(assessment.sentAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
          <p className="text-sm text-gray-600 mt-2">
            Please review each item below and make your selection. When you&rsquo;re
            done, click <strong>Submit Selections</strong> at the bottom.
          </p>
        </div>

        {/* Search + Filter */}
        <div className="bg-white rounded-xl border-2 border-gray-200 p-4 mb-4 shadow-sm flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search items…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#174887] focus:border-[#174887]"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border-2 border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#174887] focus:border-[#174887]"
          >
            {CATEGORY_OPTIONS.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {(searchQuery || categoryFilter !== 'All') && (
          <p className="text-xs text-gray-500 mb-3 px-1">
            Showing {filteredItems.length} of {assessment.items.length} item{assessment.items.length !== 1 ? 's' : ''}
          </p>
        )}

        <div className="space-y-4 mb-8">
          {filteredItems.map((item: AssessmentItem, index: number) => (
            <div
              key={item.id}
              className="bg-white rounded-xl border-2 border-gray-200 p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-gray-400">#{index + 1}</span>
                    <span className="text-xs text-gray-500">{item.location}</span>
                  </div>
                  <h3 className="text-base font-bold text-gray-900">{item.issue}</h3>
                </div>
                <span
                  className={`px-3 py-1 rounded-lg text-xs font-bold border-2 flex-shrink-0 ${getCategoryColor(item.category)}`}
                >
                  {item.category}
                </span>
              </div>

              {item.images.length > 0 && (
                <div className="mb-3">
                  <img
                    src={item.images[0]}
                    alt={item.issue}
                    className="w-full max-h-56 object-cover rounded-lg border border-gray-200"
                  />
                  {item.images.length > 1 && (
                    <p className="text-xs text-gray-400 mt-1">
                      +{item.images.length - 1} more photo{item.images.length > 2 ? 's' : ''}
                    </p>
                  )}
                </div>
              )}

              {item.description && (
                <p className="text-sm text-gray-700 mb-3 leading-relaxed">{item.description}</p>
              )}

              {item.recommendation && (
                <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-xs font-semibold text-gray-600 mb-1">Recommendation</p>
                  <p className="text-sm text-gray-800">{item.recommendation}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1.5">
                  Your Selection <span className="text-red-500">*</span>
                </label>
                <select
                  value={selections[item.id] ?? ''}
                  onChange={(e) =>
                    setSelections((prev) => ({ ...prev, [item.id]: e.target.value }))
                  }
                  className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg bg-white text-sm
                             focus:outline-none focus:ring-2 focus:ring-[#174887] focus:border-[#174887]"
                  style={
                    selections[item.id]
                      ? {
                          borderColor:
                            CUSTOMER_SELECTION_OPTIONS.find(
                              (o) => String(o.orderindex) === selections[item.id],
                            )?.color ?? undefined,
                        }
                      : undefined
                  }
                >
                  <option value="" disabled>Choose an option…</option>
                  {CUSTOMER_SELECTION_OPTIONS.map((opt) => (
                    <option key={opt.orderindex} value={String(opt.orderindex)}>
                      {opt.name}
                    </option>
                  ))}
                </select>

                {selections[item.id] !== undefined && (
                  <textarea
                    value={comments[item.id] ?? ''}
                    onChange={(e) =>
                      setComments((prev) => ({ ...prev, [item.id]: e.target.value }))
                    }
                    placeholder="Add a note for our team (optional)"
                    rows={2}
                    className="mt-2 w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm
                               focus:outline-none focus:ring-2 focus:ring-[#174887] focus:border-[#174887]
                               resize-none placeholder-gray-400"
                  />
                )}
              </div>
            </div>
          ))}

          {filteredItems.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-sm">No items match your search.</p>
            </div>
          )}
        </div>

        {submitted ? (
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 text-center">
            <svg
              className="w-10 h-10 text-green-500 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <h3 className="text-lg font-bold text-green-800">Selections Submitted!</h3>
            <p className="text-sm text-green-700 mt-1">
              Thank you. Your team will be in touch shortly.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border-2 border-gray-200 p-6 shadow-sm text-center">
            {!allSelected && (
              <p className="text-sm text-amber-700 mb-3">
                Please make a selection for all items before submitting.
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
    </div>
  );
}

export default function CustomerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <svg className="w-10 h-10 animate-spin text-[#174887]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>
      }
    >
      <CustomerPageInner />
    </Suspense>
  );
}
