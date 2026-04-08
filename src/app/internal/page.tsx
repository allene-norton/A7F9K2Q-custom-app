'use client';

// src/app/internal/page.tsx

import { useState, useEffect } from 'react';
import { Assessment, AssessmentParent } from '@/types/types-index';
import {
  getCommercialAssessmentLocations,
  buildCommercialAssessment,
  getHourlyFolders,
  getHourlyAssessmentForFolder,
  getCommercialFolders,
  ClickUpFolder,
} from '@/lib/clickup/clickup_actions';
import { COMMERCIAL_SPACE_ID, HOURLY_SPACE_ID } from '@/lib/constants';
import CustomerSelect from '@/components/internal/CustomerSelect';
import { listCompanies, listClients, Company, Client } from '@/lib/assembly/client';
import AssessmentBuilder from '@/app/internal/AssessmentBuilder';
import WorkOrdersView from '@/components/WorkOrdersView';

interface InternalPageProps {
  searchParams: { token?: string };
}

type ActiveTab = 'commercial' | 'hourly';
type InternalView = 'assessment' | 'workorders';

export default function InternalPage({ searchParams }: InternalPageProps) {
  const token =
    typeof searchParams.token === 'string' ? searchParams.token : null;

  const [activeTab, setActiveTab] = useState<ActiveTab>('commercial');

  // Commercial state
  const [companies, setCompanies] = useState<Company[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);

  // Hourly state
  const [hourlyFolders, setHourlyFolders] = useState<ClickUpFolder[]>([]);
  const [hourlyLoading, setHourlyLoading] = useState(false);
  const [hourlyLoaded, setHourlyLoaded] = useState(false);

  // Shared selection state
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedHourlyFolder, setSelectedHourlyFolder] =
    useState<ClickUpFolder | null>(null);

  // Location selector state (commercial multi-location)
  const [assessmentLocations, setAssessmentLocations] = useState<
    AssessmentParent[] | null
  >(null);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [locationFilter, setLocationFilter] = useState<string>('All');
  const [sentAssessments, setSentAssessments] = useState<
    Array<{ assessmentId: string; submittedAt?: string }>
  >([]);

  // Assessment state
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [assessmentLoading, setAssessmentLoading] = useState(false);
  const [assessmentError, setAssessmentError] = useState<string | null>(null);
  const [internalView, setInternalView] = useState<InternalView>('assessment');

  // Fetch Assembly companies filtered to only those with a matching ClickUp folder
  useEffect(() => {
    if (!token) {
      setCompaniesLoading(false);
      return;
    }
    const fetchCompanies = async () => {
      try {
        setCompaniesLoading(true);
        const [response, folders, clientsRes] = await Promise.all([
          listCompanies(token),
          getCommercialFolders(),
          listClients(token),
        ]);
        if (!response.data) throw new Error('No company data returned');

        // Build a lowercase folder name list for matching
        const folderNames = folders.map((f) => f.name.toLowerCase().trim());

        // Mirror the 3-tier fuzzy logic used by findMatchingFolder
        const hasFolder = (companyName: string) => {
          const name = companyName.toLowerCase().trim();
          if (!name) return false;
          // Tier 1: exact
          if (folderNames.some((f) => f === name)) return true;
          // Tier 2: starts-with either direction
          if (folderNames.some((f) => f.startsWith(name) || name.startsWith(f)))
            return true;
          // Tier 3: word overlap >= 50%
          const cWords = name.split(/\s+/).filter((w) => w.length > 2);
          return folderNames.some((f) => {
            const fWords = f.split(/\s+/).filter((w) => w.length > 2);
            const overlap = cWords.filter((w) => fWords.includes(w)).length;
            const total = new Set([...cWords, ...fWords]).size;
            return total > 0 && overlap / total >= 0.5;
          });
        };

        setAllClients(clientsRes.data?.data ?? []);
        const matched = response.data.filter((c) => hasFolder(c.name ?? ''));
        setCompanies(matched);
      } catch (error) {
        console.error('Failed to fetch companies:', error);
      } finally {
        setCompaniesLoading(false);
      }
    };
    fetchCompanies();
  }, [token]);

  // Lazily fetch hourly folders when the tab is first activated
  useEffect(() => {
    if (activeTab !== 'hourly' || hourlyLoaded) return;
    const fetchHourly = async () => {
      try {
        setHourlyLoading(true);
        const folders = await getHourlyFolders();
        setHourlyFolders(folders);
        setHourlyLoaded(true);
      } catch (error) {
        console.error('Failed to fetch hourly folders:', error);
      } finally {
        setHourlyLoading(false);
      }
    };
    fetchHourly();
  }, [activeTab, hourlyLoaded]);

  // Commercial company selected → fetch assessment locations
  const handleCommercialSelect = async (company: Company) => {
    setSelectedCompany(company);
    setAssessmentLocations(null);
    setAssessment(null);
    setAssessmentError(null);
    setLocationsLoading(true);
    setLocationFilter('All');
    setSentAssessments([]);
    setInternalView('assessment');

    try {
      const [locations, sentRes] = await Promise.all([
        getCommercialAssessmentLocations(company.name || ''),
        company.id
          ? fetch(`/api/assessments/${company.id}`)
              .then((r) => r.json())
              .catch(() => [])
          : Promise.resolve([]),
      ]);
      setSentAssessments(sentRes ?? []);

      if (locations.length === 0) {
        setAssessmentError('No assessments found in ClickUp for this company.');
        return;
      }
      if (locations.length === 1) {
        // Auto-select the only location
        await loadCommercialAssessment(locations[0], company);
      } else {
        setAssessmentLocations(locations);
      }
    } catch (error) {
      console.error('Failed to fetch assessment locations:', error);
      setAssessmentError(
        error instanceof Error ? error.message : 'Failed to load assessments',
      );
    } finally {
      setLocationsLoading(false);
    }
  };

  // Location selected from the selector
  const handleLocationSelect = async (location: AssessmentParent) => {
    if (!selectedCompany) return;
    await loadCommercialAssessment(location, selectedCompany);
  };

  const loadCommercialAssessment = async (
    location: AssessmentParent,
    company: Company,
  ) => {
    setAssessmentLoading(true);
    setAssessmentError(null);
    try {
      const resolvedParent: AssessmentParent = {
        ...location,
        location: location.location || company.name || '',
      };
      const result = await buildCommercialAssessment(
        resolvedParent,
        company.id || '',
        company.name || 'Unknown',
      );
      setAssessment(result);
    } catch (error) {
      console.error('Failed to build assessment:', error);
      setAssessmentError(
        error instanceof Error ? error.message : 'Failed to load assessment',
      );
    } finally {
      setAssessmentLoading(false);
    }
  };

  // Hourly folder selected
  const handleHourlySelect = async (folder: ClickUpFolder) => {
    setSelectedHourlyFolder(folder);
    setAssessment(null);
    setAssessmentError(null);
    setAssessmentLoading(true);
    setInternalView('assessment');
    try {
      const result = await getHourlyAssessmentForFolder(folder.id, folder.name);
      setAssessment(result);
    } catch (error) {
      console.error('Failed to fetch hourly assessment:', error);
      setAssessmentError(
        error instanceof Error ? error.message : 'Failed to load assessment',
      );
    } finally {
      setAssessmentLoading(false);
    }
  };

  const handleBackToAssessments = () => {
    setAssessment(null);
    setAssessmentError(null);
    setInternalView('assessment');
  };

  const handleBack = () => {
    setSelectedCompany(null);
    setSelectedHourlyFolder(null);
    setAssessment(null);
    setAssessmentLocations(null);
    setAssessmentError(null);
    setInternalView('assessment');
  };

  // --- Render: company selected (Assessment + Work Orders tabs) ---
  if (selectedCompany || selectedHourlyFolder) {
    // For hourly customers, match the ClickUp folder name against Assembly client
    // full names (givenName + familyName). Hourly clients have placeholder companies
    // so listCompanies (isPlaceholder: false) won't include them.
    const hourlyAssemblyId = (() => {
      if (selectedCompany || !selectedHourlyFolder) return undefined;
      const folderName = selectedHourlyFolder.name.toLowerCase().trim();
      const fWords = folderName.split(/\s+/).filter((w) => w.length > 2);
      const matchedClient = allClients.find((c) => {
        const fullName = `${c.givenName ?? ''} ${c.familyName ?? ''}`.toLowerCase().trim();
        if (!fullName) return false;
        if (fullName === folderName) return true;
        if (fullName.startsWith(folderName) || folderName.startsWith(fullName)) return true;
        const cWords = fullName.split(/\s+/).filter((w) => w.length > 2);
        const overlap = cWords.filter((w) => fWords.includes(w)).length;
        const total = new Set([...cWords, ...fWords]).size;
        return total > 0 && overlap / total >= 0.5;
      });
      return matchedClient?.companyId ?? undefined;
    })();

    const backLabel = selectedHourlyFolder ? 'Customers' : 'Companies';

    const company: Company = selectedCompany || {
      id: hourlyAssemblyId ?? selectedHourlyFolder?.id,
      name: selectedHourlyFolder?.name,
    };
    const companyId = company.id ?? '';
    const companyName = company.name ?? '';

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Secondary tab bar: Assessment | Work Orders */}
        <div className="border-b border-gray-200 bg-white">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex gap-0">
              {(['assessment', 'workorders'] as InternalView[]).map((view) => (
                <button
                  key={view}
                  onClick={() => setInternalView(view)}
                  className={`px-6 py-4 text-sm font-semibold border-b-2 transition-colors ${
                    internalView === view
                      ? 'border-[#174887] text-[#174887]'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {view === 'assessment'
                    ? selectedHourlyFolder
                      ? 'Items'
                      : 'Assessment'
                    : 'Work Orders'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {internalView === 'workorders' ? (
          <WorkOrdersView
            companyId={companyId}
            companyName={selectedCompany ? companyName : undefined}
            mode="internal"
            token={token ?? undefined}
            breadcrumbs={
              <nav className="flex items-center gap-2 text-sm mb-6">
                <button
                  onClick={handleBack}
                  className="text-[#174887] hover:underline font-medium"
                >
                  {backLabel}
                </button>
                <span className="text-gray-400">/</span>
                <span className="text-gray-700 font-medium">Work Orders</span>
              </nav>
            }
          />
        ) : (
          /* Assessment tab content */
          <>
            {/* Loading */}
            {(assessmentLoading || locationsLoading) && (
              <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#174887] mx-auto mb-4" />
                  <p className="text-gray-600">
                    Loading {selectedHourlyFolder ? 'items' : 'assessment'} for {companyName}...
                  </p>
                </div>
              </div>
            )}

            {/* Error */}
            {assessmentError && !assessmentLoading && !locationsLoading && (
              <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center max-w-md">
                  <div className="text-red-600 text-xl mb-4">
                    ⚠️ Error Loading Assessment
                  </div>
                  <p className="text-gray-600 mb-4">{assessmentError}</p>
                  <button
                    onClick={handleBack}
                    className="px-4 py-2 bg-[#174887] text-white rounded hover:bg-[#0f3661]"
                  >
                    Back
                  </button>
                </div>
              </div>
            )}

            {/* Location selector (commercial multi-location) */}
            {!assessmentLoading &&
              !locationsLoading &&
              !assessmentError &&
              assessmentLocations &&
              selectedCompany &&
              !assessment && (
                <div className="max-w-3xl mx-auto py-8 px-4">
                  <button
                    onClick={handleBack}
                    className="flex items-center gap-2 text-gray-600 hover:text-[#174887] mb-6 transition-colors font-medium"
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
                    Back to {backLabel.toLowerCase()}
                  </button>

                  <h2
                    className="text-2xl font-bold mb-2"
                    style={{ color: '#174887' }}
                  >
                    {selectedCompany.name}
                  </h2>
                  <p className="text-gray-600 mb-4">
                    Multiple assessments found. Select a location to view:
                  </p>

                  {/* Location filter */}
                  {(() => {
                    const uniqueLocations = Array.from(
                      new Set(
                        assessmentLocations
                          .map((l) => l.location)
                          .filter(Boolean),
                      ),
                    ).sort();
                    return uniqueLocations.length > 1 ? (
                      <div className="flex items-center gap-3 mb-5">
                        <label className="text-sm font-medium text-gray-700">
                          Filter by location:
                        </label>
                        <select
                          value={locationFilter}
                          onChange={(e) => setLocationFilter(e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm
                                     focus:outline-none focus:ring-2 focus:ring-[#174887] focus:border-[#174887]"
                        >
                          <option value="All">All</option>
                          {uniqueLocations.map((loc) => (
                            <option key={loc} value={loc}>
                              {loc}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null;
                  })()}

                  <div className="space-y-3">
                    {assessmentLocations
                      .filter(
                        (loc) =>
                          locationFilter === 'All' ||
                          loc.location === locationFilter,
                      )
                      .map((loc) => {
                        const sentAssessment = sentAssessments.find(
                          (a) =>
                            a.assessmentId ===
                            `assess_${selectedCompany.id}_${loc.taskId}`,
                        );
                        const isSent = Boolean(sentAssessment);
                        const isCustomerSubmitted = Boolean(
                          sentAssessment?.submittedAt,
                        );
                        return (
                          <div
                            key={loc.taskId}
                            className={`w-full bg-white border-2 rounded-xl overflow-hidden transition-all ${
                              isSent
                                ? 'border-gray-200'
                                : 'border-gray-200 hover:border-[#174887] hover:shadow-md cursor-pointer'
                            }`}
                            onClick={() =>
                              !isSent && handleLocationSelect(loc)
                            }
                          >
                            <div
                              className={`p-5 text-left ${isSent ? 'opacity-60' : ''}`}
                            >
                              <div className="flex items-center flex-wrap gap-2">
                                <span className="font-semibold text-gray-900 text-lg">
                                  {loc.taskName}
                                </span>
                                <span
                                  className="px-2 py-0.5 rounded-full text-xs font-semibold text-white capitalize"
                                  style={{ backgroundColor: loc.statusColor }}
                                >
                                  {loc.status}
                                </span>
                                {isSent && !isCustomerSubmitted && (
                                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                                    Sent to Customer
                                  </span>
                                )}
                                {isCustomerSubmitted && (
                                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                                    Submitted by Customer
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500 mt-1">
                                {loc.location ? `${loc.location} · ` : ''}
                                {loc.date}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

            {/* Assessment builder */}
            {!assessmentLoading && !locationsLoading && assessment && (
              <AssessmentBuilder
                company={company}
                assessment={assessment}
                onBack={handleBack}
                onBackToAssessments={
                  assessmentLocations && assessmentLocations.length > 1
                    ? handleBackToAssessments
                    : undefined
                }
                onSendSuccess={(assessmentId) =>
                  setSentAssessments((prev) => [
                    ...prev.filter((a) => a.assessmentId !== assessmentId),
                    { assessmentId },
                  ])
                }
                isHourly={Boolean(selectedHourlyFolder)}
                backLabel={backLabel}
                spaceId={
                  selectedCompany
                    ? COMMERCIAL_SPACE_ID
                    : selectedHourlyFolder
                      ? HOURLY_SPACE_ID
                      : undefined
                }
                token={token ?? undefined}
              />
            )}
          </>
        )}
      </div>
    );
  }

  // --- Render: customer/folder selection with tabs ---
  // Convert hourly folders to Company-shaped objects for CustomerSelect
  const hourlyAsCompanies: Company[] = hourlyFolders.map((f) => ({
    id: f.id,
    name: f.name,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Tab bar */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-0">
            {(['commercial', 'hourly'] as ActiveTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-4 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-[#174887] text-[#174887]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'commercial'
                  ? 'Commercial Customers'
                  : 'Hourly Customers'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Customer list */}
      {activeTab === 'commercial' ? (
        <CustomerSelect
          companies={companies}
          loading={companiesLoading}
          onSelect={handleCommercialSelect}
        />
      ) : (
        <CustomerSelect
          companies={hourlyAsCompanies}
          loading={hourlyLoading}
          entityLabel="customer"
          onSelect={(company) => {
            const folder = hourlyFolders.find((f) => f.id === company.id);
            if (folder) handleHourlySelect(folder);
          }}
        />
      )}
    </div>
  );
}
