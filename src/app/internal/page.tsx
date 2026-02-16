"use client";

// src/app/internal/page.tsx
// This is your main internal team page

import { useState, useEffect } from "react";
import { Assessment } from "@/types/types-index";
import { getAssessmentForCompany } from "@/lib/clickup/clickup_actions";
import CustomerSelect from "@/components/internal/CustomerSelect";
import { listCompanies, Company } from "@/lib/assembly/client";
import AssessmentBuilder from "@/app/internal/AssessmentBuilder";

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
  const [assessmentLoading, setAssessmentLoading] = useState(false);
  const [assessmentError, setAssessmentError] = useState<string | null>(null);

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

  // When company is selected, fetch real ClickUp assessment
  const handleCompanySelect = async (company: Company) => {
    setSelectedCompany(company);
    setAssessmentLoading(true);
    setAssessmentError(null);

    try {
      const companyAssessment = await getAssessmentForCompany(
        company.id || '',
        company.name || 'Unknown'
      );
      setAssessment(companyAssessment);
    } catch (error) {
      console.error('Failed to fetch assessment:', error);
      setAssessmentError(error instanceof Error ? error.message : 'Failed to load assessment');
    } finally {
      setAssessmentLoading(false);
    }
  };

  // Back to company selection
  const handleBack = () => {
    setSelectedCompany(null);
    setAssessment(null);
    setAssessmentError(null);
  };

  // If no company selected, show company selection
  if (!selectedCompany) {
    return (
      <CustomerSelect
        companies={companies}
        loading={companiesLoading}
        onSelect={handleCompanySelect}
      />
    );
  }

  // If company selected but loading assessment
  if (assessmentLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#174887] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading assessment for {selectedCompany.name}...</p>
        </div>
      </div>
    );
  }

  // If error loading assessment
  if (assessmentError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="text-red-600 text-xl mb-4">⚠️ Error Loading Assessment</div>
          <p className="text-gray-600 mb-4">{assessmentError}</p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-[#174887] text-white rounded hover:bg-[#0f3661]"
          >
            Back to Companies
          </button>
        </div>
      </div>
    );
  }

  // If no assessment loaded yet
  if (!assessment) {
    return null;
  }

  // Show assessment builder
  return (
    <AssessmentBuilder
      company={selectedCompany}
      assessment={assessment}
      onBack={handleBack}
    />
  );
}
