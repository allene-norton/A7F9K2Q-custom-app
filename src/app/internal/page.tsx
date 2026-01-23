"use client";

// src/app/internal/page.tsx
// This is your main internal team page

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Assessment } from "@/types/types-index";
import { getMockAssessmentForCompany } from "@/lib/mockData";
import CustomerSelect from "@/components/internal/CustomerSelect";
import AssessmentItemCard from "@/components/internal/AssessmentItemCard";
import { listCompanies, Company } from "@/lib/assembly/client";

interface InternalPageProps {
  searchParams: { token?: string };
}

export default function InternalPage({ searchParams }: InternalPageProps) {
  // console.log("running")
  // console.log(searchParams)
    const token = typeof searchParams.token === 'string' ? searchParams.token : null;
    // console.log(token)



  const [companies, setCompanies] = useState<Company[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [assessment, setAssessment] = useState<Assessment | null>(null);

  useEffect(() => {
    // Don't fetch until we have a token
    if (!token) {
      setCompaniesLoading(false);
      return;
    }
    const fetchCompanies = async () => {
      try {
        setCompaniesLoading(true);
        const response = await listCompanies(token);

        if (!response.data) {
          throw new Error('No company data returned from server');
        }

        setCompanies(response.data);
      } catch (error) {
        console.error('Failed to fetch companies:', error);
      } finally {
        setCompaniesLoading(false);
      }
    };

    fetchCompanies();
  }, [token]);

  // When company is selected, load mock assessment
  const handleCompanySelect = (company: Company) => {
    setSelectedCompany(company);
    const companyAssessment = getMockAssessmentForCompany(company.id || '', company.name || 'Unknown');
    setAssessment(companyAssessment);
  };

  // Back to company selection
  const handleBack = () => {
    setSelectedCompany(null);
    setAssessment(null);
  };

  // If no company selected, show company selection
  if (!selectedCompany || !assessment) {
    return (
      <CustomerSelect
        companies={companies}
        loading={companiesLoading}
        onSelect={handleCompanySelect}
      />
    );
  }

  // Show assessment builder
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-8 px-4">
        {/* Back Button */}
        <button
          onClick={handleBack}
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
                {selectedCompany.name}
              </h2>
              <p className="text-gray-600">
                Assessment Date: {assessment.assessment_date}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Mock data • {assessment.items.length} items found
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
                onClick={() => alert(`Send to ${selectedCompany.name}? [Click OK - nothing will be shared with clients at this time]`)}
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

        {/* Assessment Items */}
        <div className="mb-4">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            Assessment Items ({assessment.items.length})
          </h3>
        </div>

        {assessment.items.length === 0 ? (
          <div className="bg-white border-2 border-gray-200 rounded-xl p-12 text-center">
            <p className="text-gray-500 text-lg">No assessment items found for this customer.</p>
            <p className="text-sm text-gray-400 mt-2">
              In production, this would pull from ClickUp API.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {assessment.items.map((item, index) => (
              <AssessmentItemCard key={item.id} item={item} index={index} />
            ))}
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-8 flex justify-end gap-3">
          <button
            onClick={handleBack}
            className="px-5 py-3 border-2 border-gray-300 rounded-lg text-gray-700
                       hover:bg-gray-50 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => alert(`Send assessment to ${selectedCompany.name}?`)}
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
