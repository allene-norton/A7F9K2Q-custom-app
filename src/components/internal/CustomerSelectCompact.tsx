"use client";

// src/components/internal/CustomerSelect.tsx

import { useState, useMemo } from "react";
import { Company } from "@/lib/assembly/client";

interface CustomerSelectProps {
  companies: Company[];
  loading?: boolean;
  onSelect: (company: Company) => void;
}

export default function CustomerSelect({ companies, loading, onSelect }: CustomerSelectProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCompanies = useMemo(() => {
    const filtered = !searchTerm.trim() 
      ? companies 
      : companies.filter(
          company => company.name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    
    // Sort by createdAt in descending order (most recent first)
    return filtered.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA; // Descending order
    });
  }, [searchTerm, companies]);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-3" style={{ color: '#174887' }}>
            Create Assessment Report
          </h1>
          <p className="text-gray-600 text-lg">
            Select a customer to begin building their assessment
          </p>
        </div>

        {/* Search Input */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Search customers by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-4 pl-12 text-lg border-2 border-gray-300 rounded-xl 
                         focus:outline-none focus:ring-2 focus:ring-[#174887] focus:border-transparent
                         transition-all"
            />
            <svg
              className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
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
          </div>
        </div>

        {/* Compact Customer List */}
        <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <p className="text-gray-500 text-lg">Loading companies...</p>
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500 text-lg">
                {searchTerm ? `No companies found matching "${searchTerm}"` : "No companies found"}
              </p>
            </div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto">
              {filteredCompanies.map((company, index) => (
                <button
                  key={company.id}
                  onClick={() => onSelect(company)}
                  className={`w-full p-4 border-b border-gray-100 hover:bg-gray-50 
                             transition-all duration-200 text-left group ${
                             index === filteredCompanies.length - 1 ? 'border-b-0' : ''
                           }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Icon or Company Image */}
                      <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] flex items-center justify-center group-hover:bg-[#174887] transition-colors">
                        {company.iconImageUrl && !company.iconImageUrl.includes("clearbit") ? (
                          <img
                            src={company.iconImageUrl}
                            alt={company.name || ''}
                            className="w-6 h-6 rounded object-cover"
                          />
                        ) : (
                          <svg
                            className="w-5 h-5 text-[#174887] group-hover:text-white transition-colors"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                            />
                          </svg>
                        )}
                      </div>

                      {/* Company Info */}
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-[#174887] transition-colors truncate">
                          {company.name}
                        </h3>
                        <p className="text-gray-500 text-sm">
                          Added {company.createdAt ? new Date(company.createdAt).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* Arrow */}
                    <svg
                      className="w-5 h-5 text-gray-400 group-hover:text-[#174887] group-hover:translate-x-1 transition-all flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-500">
          Showing {filteredCompanies.length} of {companies.length} companies
        </div>
      </div>
    </div>
  );
}