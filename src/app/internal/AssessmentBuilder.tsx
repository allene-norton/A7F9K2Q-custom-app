"use client";

import { useState, useMemo } from "react";
import { Assessment, AssessmentItem } from "@/types/types-index";
import { Company } from "@/lib/assembly/client";
import AssessmentItemCard from "@/components/internal/AssessmentItemCard";

interface AssessmentBuilderProps {
  company: Company;
  assessment: Assessment;
  onBack: () => void;
}

type CategoryFilter = "All" | AssessmentItem["category"];
type SortOption = "default" | "urgency-high" | "urgency-low";

const CATEGORIES: AssessmentItem["category"][] = ["Urgent", "Recommended", "Cosmetic", "Included Maintenance", "No Issue"];

const URGENCY_ORDER: Record<AssessmentItem["category"], number> = {
  "Urgent": 0,
  "Recommended": 1,
  "Cosmetic": 2,
  "Included Maintenance": 3,
  "No Issue": 4,
};

export default function AssessmentBuilder({ company, assessment, onBack }: AssessmentBuilderProps) {
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("All");
  const [sortOption, setSortOption] = useState<SortOption>("default");
  const [searchQuery, setSearchQuery] = useState("");


  const filteredAndSortedItems = useMemo(() => {
    let items = [...assessment.items];

    // Filter by category
    if (categoryFilter !== "All") {
      items = items.filter((item) => item.category === categoryFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter((item) =>
        item.location.toLowerCase().includes(query) ||
        item.issue.toLowerCase().includes(query) ||
        item.recommendation.toLowerCase().includes(query) ||
        item.tags.some((tag) => tag.toLowerCase().includes(query)) ||
        item.comments.toLowerCase().includes(query)
      );
    }

    // Sort by urgency
    if (sortOption === "urgency-high") {
      items.sort((a, b) => URGENCY_ORDER[a.category] - URGENCY_ORDER[b.category]);
    } else if (sortOption === "urgency-low") {
      items.sort((a, b) => URGENCY_ORDER[b.category] - URGENCY_ORDER[a.category]);
    }

    return items;
  }, [assessment.items, categoryFilter, sortOption, searchQuery]);

  const clearFilters = () => {
    setCategoryFilter("All");
    setSortOption("default");
    setSearchQuery("");
  };

  const hasActiveFilters = categoryFilter !== "All" || sortOption !== "default" || searchQuery.trim() !== "";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-8 px-4">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-[#174887] mb-6
                     transition-colors font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to companies
        </button>

        {/* Header Card */}
        <div className="bg-white rounded-xl border-2 border-gray-200 p-6 mb-8 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-2" style={{ color: '#174887' }}>
                {company.name}
              </h2>
              <h3 className="text-xl font-bold text-gray-600">
                {assessment.assessment_name}
              </h3>
              <p className="text-gray-600">
                Date: {assessment.assessment_date}
              </p>
              
              <p className="text-sm text-gray-500 mt-1">
                {assessment.items.length} assessment items found
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => alert('Preview modal would open here')}
                className="px-5 py-3 border-2 text-[#174887] border-[#174887] rounded-lg
                           hover:bg-blue-50 font-semibold transition-colors"
              >
                Preview
              </button>
              <button
                onClick={() => alert(`Send to ${company.name}? [Click OK - nothing will be shared with clients at this time]`)}
                className="px-5 py-3 rounded-lg text-white font-semibold
                           flex items-center gap-2 hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#174887' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
                Send to Company
              </button>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-xl border-2 border-gray-200 p-4 mb-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
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
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg
                             focus:outline-none focus:ring-2 focus:ring-[#174887] focus:border-transparent"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Category:</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
                className="px-3 py-2 border border-gray-300 rounded-lg bg-white
                           focus:outline-none focus:ring-2 focus:ring-[#174887] focus:border-transparent"
              >
                <option value="All">All Categories</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Urgency Sort */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Sort:</label>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                className="px-3 py-2 border border-gray-300 rounded-lg bg-white
                           focus:outline-none focus:ring-2 focus:ring-[#174887] focus:border-transparent"
              >
                <option value="default">Default Order</option>
                <option value="urgency-high">Urgency: High to Low</option>
                <option value="urgency-low">Urgency: Low to High</option>
              </select>
            </div>

            {/* Clear Filters */}
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
            Assessment Items ({filteredAndSortedItems.length}
            {filteredAndSortedItems.length !== assessment.items.length &&
              ` of ${assessment.items.length}`})
          </h3>
        </div>

        {filteredAndSortedItems.length === 0 ? (
          <div className="bg-white border-2 border-gray-200 rounded-xl p-12 text-center">
            {assessment.items.length === 0 ? (
              <>
                <p className="text-gray-500 text-lg">No assessment items found for this customer.</p>
                <p className="text-sm text-gray-400 mt-2">
                  In production, this would pull from ClickUp API.
                </p>
              </>
            ) : (
              <>
                <p className="text-gray-500 text-lg">No items match your filters.</p>
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
              <AssessmentItemCard key={item.id} item={item} index={index} />
            ))}
          </div>
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
          <button
            onClick={() => alert(`Send assessment to ${company.name}?`)}
            className="px-5 py-3 rounded-lg text-white font-semibold
                       hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#174887' }}
          >
            Send Assessment
          </button>
        </div>
      </div>
    </div>
  );
}
