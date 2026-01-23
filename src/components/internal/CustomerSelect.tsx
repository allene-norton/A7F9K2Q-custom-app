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
    if (!searchTerm.trim()) return companies;
    const lowerQuery = searchTerm.toLowerCase();
    return companies.filter(
      company => company.name?.toLowerCase().includes(lowerQuery)
    );
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
              placeholder="Search customers by name or address..."
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

        {/* Customer Cards */}
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white rounded-xl p-12 text-center border-2 border-gray-200">
              <p className="text-gray-500 text-lg">Loading companies...</p>
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border-2 border-gray-200">
              <p className="text-gray-500 text-lg">
                {searchTerm ? `No companies found matching "${searchTerm}"` : "No companies found"}
              </p>
            </div>
          ) : (
            filteredCompanies.map((company) => (
              <button
                key={company.id}
                onClick={() => onSelect(company)}
                className="w-full bg-white p-6 rounded-xl border-2 border-gray-200
                           hover:border-[#174887] hover:shadow-lg
                           transition-all duration-200 text-left group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    {/* Icon or Company Image */}
                    <div
                      className="p-4 rounded-lg group-hover:bg-[#174887] transition-colors"
                      style={{ backgroundColor: '#EFF6FF' }}
                    >
                      {company.iconImageUrl && !company.iconImageUrl.includes("clearbit") ? (
                        <img
                          src={company.iconImageUrl}
                          alt={company.name || ''}
                          className="w-8 h-8 rounded object-cover"
                        />
                      ) : (
                        <svg
                          className="w-8 h-8 text-[#174887] group-hover:text-white transition-colors"
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
                    <div>
                      <h3 className="text-xl font-bold mb-1 text-gray-900 group-hover:text-[#174887] transition-colors">
                        {company.name}
                      </h3>
                      <p className="text-gray-500 text-sm">
                        Added {company.createdAt ? new Date(company.createdAt).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Arrow */}
                  <svg
                    className="w-6 h-6 text-gray-400 group-hover:text-[#174887] group-hover:translate-x-1 transition-all"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          Showing {filteredCompanies.length} of {companies.length} companies
        </div>
      </div>
    </div>
  );
}
