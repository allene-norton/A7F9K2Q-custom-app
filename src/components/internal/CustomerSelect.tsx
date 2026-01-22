"use client";

// src/components/internal/CustomerSelect.tsx

import { useState, useMemo } from "react";
import { Customer } from "@/types/types-index";
import { getAllCustomers, searchCustomers } from "@/lib/mockData";

interface CustomerSelectProps {
  onSelect: (customer: Customer) => void;
}

export default function CustomerSelect({ onSelect }: CustomerSelectProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const allCustomers = getAllCustomers();

  const filteredCustomers = useMemo(() => {
    if (!searchTerm.trim()) return allCustomers;
    return searchCustomers(searchTerm);
  }, [searchTerm, allCustomers]);

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
          {filteredCustomers.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border-2 border-gray-200">
              <p className="text-gray-500 text-lg">No customers found matching "{searchTerm}"</p>
            </div>
          ) : (
            filteredCustomers.map((customer) => (
              <button
                key={customer.id}
                onClick={() => onSelect(customer)}
                className="w-full bg-white p-6 rounded-xl border-2 border-gray-200 
                           hover:border-[#174887] hover:shadow-lg
                           transition-all duration-200 text-left group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    {/* Icon */}
                    <div className="p-4 rounded-lg group-hover:bg-[#174887] bg-blue-50 transition-colors">
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
                    </div>

                    {/* Customer Info */}
                    <div>
                      <h3 className="text-xl font-bold mb-1 text-gray-900 group-hover:text-[#174887] transition-colors">
                        {customer.name}
                      </h3>
                      <p className="text-gray-600 mb-2">{customer.address}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                          </svg>
                          {customer.units} units
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          {customer.contact_name}
                        </span>
                      </div>
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
          Showing {filteredCustomers.length} of {allCustomers.length} customers
        </div>
      </div>
    </div>
  );
}
