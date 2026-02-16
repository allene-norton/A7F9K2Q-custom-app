"use client";

// src/app/internal/page.tsx
// This is your main internal team page

import { useState, useEffect } from "react";
import { Assessment } from "@/types/types-index";
import { getMockAssessmentForCompany } from "@/lib/mockData";
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
    <AssessmentBuilder
    company={selectedCompany}
    assessment={assessment}
    onBack={handleBack}
  />
  );
}
