'use client';

// src/app/internal/page.tsx

import { useState, useEffect } from 'react';
import { Assessment, AssessmentParent } from '@/types/types-index';
import {
  getCommercialAssessmentLocations,
  buildCommercialAssessment,
  buildCommercialAssessmentAll,
  getHourlyFolders,
  getHourlyAssessmentForFolder,
  getResidentialFolders,
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

type ActiveTab = 'commercial' | 'hourly' | 'residential';
type InternalView = 'assessment' | 'workorders';

export default function InternalPage({ searchParams }: InternalPageProps) {
  const token =
    typeof searchParams.token === 'string' ? searchParams.token : null;

  const [activeTab, setActiveTab] = useState<ActiveTab>('commercial');

  // Commercial state
  const [companies, setCompanies] = useState<Company[]>([]);
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);

  // Hourly state
  const [hourlyFolders, setHourlyFolders] = useState<ClickUpFolder[]>([]);
  const [hourlyLoading, setHourlyLoading] = useState(false);
  const [hourlyLoaded, setHourlyLoaded] = useState(false);
  const [hourlyError, setHourlyError] = useState<string | null>(null);

  // Residential state
  const [residentialFolders, setResidentialFolders] = useState<ClickUpFolder[]>([]);
  const [residentialLoading, setResidentialLoading] = useState(false);
  const [residentialLoaded, setResidentialLoaded] = useState(false);
  const [residentialError, setResidentialError] = useState<string | null>(null);

  // Shared selection state
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedHourlyFolder, setSelectedHourlyFolder] = useState<ClickUpFolder | null>(null);
  const [selectedResidentialFolder, setSelectedResidentialFolder] = useState<ClickUpFolder | null>(null);

  // Location selector state (commercial multi-location)
  const [assessmentLocations, setAssessmentLocations] = useState<
    AssessmentParent[] | null
  >(null);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [locationFilter, setLocationFilter] = useState<string>('All');
  const [folderLocationFilter, setFolderLocationFilter] = useState<string>('All');
  const [assessmentListSort, setAssessmentListSort] = useState<'updated-new' | 'updated-old' | 'created-new' | 'created-old' | 'name-asc' | 'name-desc'>('updated-new');
  const [sentAssessments, setSentAssessments] = useState<
    Array<{ assessmentId: string; submittedAt?: string }>
  >([]);

  // Folder overrides (assemblyId → FolderMapping[])
  const [folderOverrides, setFolderOverrides] = useState<Record<string, { clickupFolderName: string }[]>>({});

  // Assessment state
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [assessmentLoading, setAssessmentLoading] = useState(false);
  const [assessmentError, setAssessmentError] = useState<string | null>(null);
  const [internalView, setInternalView] = useState<InternalView>('assessment');
  const [unsendingId, setUnsendingId] = useState<string | null>(null);

  // Fetch Assembly companies filtered to only those with a matching ClickUp folder
  useEffect(() => {
    if (!token) {
      setCompaniesLoading(false);
      return;
    }
    const fetchCompanies = async () => {
      try {
        setCompaniesLoading(true);
        const [response, folders, clientsRes, overridesRes] = await Promise.all([
          listCompanies(token),
          getCommercialFolders(),
          listClients(token),
          fetch('/api/folder-mappings').then((r) => r.json()).catch(() => ({})),
        ]);
        if (!response.data) throw new Error('No company data returned');

        const overriddenIds = new Set<string>(Object.keys(overridesRes ?? {}));

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
        setAllCompanies(response.data ?? []);
        setFolderOverrides(overridesRes ?? {});
        const matched = response.data.filter(
          (c) => hasFolder(c.name ?? '') || (c.id && overriddenIds.has(c.id)),
        );
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
        setHourlyError(null);
        const folders = await getHourlyFolders();
        setHourlyFolders(folders);
        setHourlyLoaded(true);
      } catch (error) {
        console.error('Failed to fetch hourly folders:', error);
        setHourlyError(error instanceof Error ? error.message : String(error));
        setHourlyLoaded(true); // prevent infinite retry
      } finally {
        setHourlyLoading(false);
      }
    };
    fetchHourly();
  }, [activeTab, hourlyLoaded]);

  // Lazily fetch residential folders when the tab is first activated
  useEffect(() => {
    if (activeTab !== 'residential' || residentialLoaded) return;
    const fetchResidential = async () => {
      try {
        setResidentialLoading(true);
        setResidentialError(null);
        const folders = await getResidentialFolders();
        setResidentialFolders(folders);
        setResidentialLoaded(true);
      } catch (error) {
        console.error('Failed to fetch residential folders:', error);
        setResidentialError(error instanceof Error ? error.message : String(error));
        setResidentialLoaded(true); // prevent infinite retry
      } finally {
        setResidentialLoading(false);
      }
    };
    fetchResidential();
  }, [activeTab, residentialLoaded]);

  // Commercial company selected → fetch assessment locations
  const handleCommercialSelect = async (company: Company) => {
    setSelectedCompany(company);
    setAssessmentLocations(null);
    setAssessment(null);
    setAssessmentError(null);
    setLocationsLoading(true);
    setLocationFilter('All');
    setFolderLocationFilter('All');
    setAssessmentListSort('updated-new');
    setSentAssessments([]);
    setInternalView('assessment');

    try {
      const [locations, sentRes] = await Promise.all([
        getCommercialAssessmentLocations(company.name || '', company.id),
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

  // "View All Items" — flat cross-location aggregate for the selected company
  const handleViewAllItems = async () => {
    if (!selectedCompany) return;
    setAssessment(null);
    setAssessmentLoading(true);
    setAssessmentError(null);
    try {
      const result = await buildCommercialAssessmentAll(
        selectedCompany.name || '',
        selectedCompany.id || '',
        selectedCompany.id,
      );
      setAssessment(result);
    } catch (error) {
      console.error('Failed to build all-items assessment:', error);
      setAssessmentError(error instanceof Error ? error.message : 'Failed to load items');
    } finally {
      setAssessmentLoading(false);
    }
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
    setSentAssessments([]);
    setInternalView('assessment');

    // Resolve Assembly company ID for this hourly folder (same fuzzy logic as render)
    const folderName = folder.name.toLowerCase().trim();
    const fWords = folderName.split(/\s+/).filter((w) => w.length > 2);
    const matchedClient = allClients.find((c) => {
      const fullName = `${c.givenName ?? ''} ${c.familyName ?? ''}`.toLowerCase().trim();
      if (!fullName) return false;
      if (fullName === folderName || fullName.startsWith(folderName) || folderName.startsWith(fullName)) return true;
      const cWords = fullName.split(/\s+/).filter((w) => w.length > 2);
      const overlap = cWords.filter((w) => fWords.includes(w)).length;
      const total = new Set([...cWords, ...fWords]).size;
      return total > 0 && overlap / total >= 0.5;
    });
    const hourlyCompanyId = matchedClient?.companyId;

    try {
      const [result, sentRes] = await Promise.all([
        getHourlyAssessmentForFolder(folder.id, folder.name),
        hourlyCompanyId
          ? fetch(`/api/assessments/${hourlyCompanyId}`).then((r) => r.json()).catch(() => [])
          : Promise.resolve([]),
      ]);
      setAssessment(result);
      setSentAssessments(sentRes ?? []);
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

  const handleUnsendAssessment = async (loc: AssessmentParent, isSubmitted: boolean) => {
    if (!selectedCompany) return;
    if (isSubmitted) {
      const confirmed = window.confirm(
        'This assessment was submitted by the customer. Unsending will move the ClickUp work order tasks back as subtasks and reset them to open status. Continue?',
      );
      if (!confirmed) return;
    }
    const assessmentId = `assess_${selectedCompany.id}_${loc.taskId}`;
    setUnsendingId(assessmentId);
    try {
      await fetch(`/api/assessments/${selectedCompany.id}/${encodeURIComponent(assessmentId)}`, { method: 'DELETE' });
      setSentAssessments((prev) => prev.filter((a) => a.assessmentId !== assessmentId));
    } finally {
      setUnsendingId(null);
    }
  };

  const handleModifyAndResend = async (loc: AssessmentParent) => {
    if (!selectedCompany) return;
    const assessmentId = `assess_${selectedCompany.id}_${loc.taskId}`;
    setUnsendingId(assessmentId);
    try {
      await fetch(`/api/assessments/${selectedCompany.id}/${encodeURIComponent(assessmentId)}`, { method: 'DELETE' });
      setSentAssessments((prev) => prev.filter((a) => a.assessmentId !== assessmentId));
    } finally {
      setUnsendingId(null);
    }
    await handleLocationSelect(loc);
  };

  // Residential folder selected — identical flow to hourly
  const handleResidentialSelect = async (folder: ClickUpFolder) => {
    setSelectedResidentialFolder(folder);
    setAssessment(null);
    setAssessmentError(null);
    setAssessmentLoading(true);
    setSentAssessments([]);
    setInternalView('assessment');

    const folderName = folder.name.toLowerCase().trim();
    const fWords = folderName.split(/\s+/).filter((w) => w.length > 2);
    const matchedClient = allClients.find((c) => {
      const fullName = `${c.givenName ?? ''} ${c.familyName ?? ''}`.toLowerCase().trim();
      if (!fullName) return false;
      if (fullName === folderName || fullName.startsWith(folderName) || folderName.startsWith(fullName)) return true;
      const cWords = fullName.split(/\s+/).filter((w) => w.length > 2);
      const overlap = cWords.filter((w) => fWords.includes(w)).length;
      const total = new Set([...cWords, ...fWords]).size;
      return total > 0 && overlap / total >= 0.5;
    });
    const companyId = matchedClient?.companyId;

    try {
      const [result, sentRes] = await Promise.all([
        getHourlyAssessmentForFolder(folder.id, folder.name),
        companyId
          ? fetch(`/api/assessments/${companyId}`).then((r) => r.json()).catch(() => [])
          : Promise.resolve([]),
      ]);
      setAssessment(result);
      setSentAssessments(sentRes ?? []);
    } catch (error) {
      console.error('Failed to fetch residential assessment:', error);
      setAssessmentError(error instanceof Error ? error.message : 'Failed to load assessment');
    } finally {
      setAssessmentLoading(false);
    }
  };

  const handleBack = () => {
    setSelectedCompany(null);
    setSelectedHourlyFolder(null);
    setSelectedResidentialFolder(null);
    setAssessment(null);
    setAssessmentLocations(null);
    setAssessmentError(null);
    setInternalView('assessment');
  };

  // --- Render: company selected (Assessment + Work Orders tabs) ---
  const selectedFolder = selectedHourlyFolder ?? selectedResidentialFolder;
  if (selectedCompany || selectedFolder) {
    // For hourly/residential, match folder name to Assembly client to get the Assembly company ID
    const folderAssemblyId = (() => {
      if (selectedCompany || !selectedFolder) return undefined;
      const folderName = selectedFolder.name.toLowerCase().trim();
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

    const backLabel = selectedFolder ? 'Customers' : 'Companies';

    const company: Company = selectedCompany || {
      id: folderAssemblyId ?? selectedFolder?.id,
      name: selectedFolder?.name,
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
            companyName={companyName}
            mode="internal"
            token={token ?? undefined}
            linkedFolderNames={
              company.id && folderOverrides[company.id]
                ? folderOverrides[company.id].map((m) => m.clickupFolderName)
                : undefined
            }
            breadcrumbs={
              <nav className="flex items-center gap-2 text-sm mb-6">
                <button
                  onClick={handleBack}
                  className="text-[#174887] hover:underline font-medium"
                >
                  {backLabel}
                </button>
                <span className="text-gray-400">/</span>
                <span className="text-gray-700 font-medium">{companyName}</span>
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

                  <div className="flex items-start justify-between mb-2">
                    <h2
                      className="text-2xl font-bold"
                      style={{ color: '#174887' }}
                    >
                      {selectedCompany.name}
                    </h2>
                    <button
                      onClick={handleViewAllItems}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
                      style={{ backgroundColor: '#174887' }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                      </svg>
                      View All Items
                    </button>
                  </div>
                  <p className="text-gray-600 mb-4">
                    Multiple assessments found. Select a location to view:
                  </p>

                  {/* Filter bar */}
                  <div className="flex flex-wrap items-center gap-4 mb-5">
                    {/* Primary: filter by folder name (the top-level ClickUp folder = location) */}
                    {(() => {
                      const uniqueFolderNames = Array.from(
                        new Set(assessmentLocations.map((l) => l.folderName).filter(Boolean))
                      ).sort((a, b) => (a as string).localeCompare(b as string, undefined, { numeric: true, sensitivity: 'base' })) as string[];
                      return uniqueFolderNames.length > 1 ? (
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-medium text-gray-700">
                            Location:
                          </label>
                          <select
                            value={folderLocationFilter}
                            onChange={(e) => setFolderLocationFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm
                                       focus:outline-none focus:ring-2 focus:ring-[#174887] focus:border-[#174887]"
                          >
                            <option value="All">All</option>
                            {uniqueFolderNames.map((name) => (
                              <option key={name} value={name}>{name}</option>
                            ))}
                          </select>
                        </div>
                      ) : null;
                    })()}

                    {/* Secondary: sub-location filter — scoped to selected folder, unit numbers only */}
                    {(() => {
                      const isYearValue = (s: string) => {
                        const nums = s.match(/\d+/g) ?? [];
                        return nums.some(n => n.length === 4 && parseInt(n, 10) >= 1900 && parseInt(n, 10) <= 2099);
                      };
                      const hasUnitNumber = (s: string) => {
                        const nums = s.match(/\d+/g) ?? [];
                        return nums.some(n => !(n.length === 4 && parseInt(n, 10) >= 1900 && parseInt(n, 10) <= 2099));
                      };
                      const scoped = (folderLocationFilter === 'All'
                        ? assessmentLocations
                        : assessmentLocations.filter(l => l.folderName === folderLocationFilter)
                      ).map(l => l.location).filter(Boolean);
                      const unitLocations = Array.from(new Set(scoped))
                        .filter(loc => hasUnitNumber(loc) && !isYearValue(loc))
                        .sort();
                      return unitLocations.length > 1 ? (
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-medium text-gray-700">
                            Sub-location:
                          </label>
                          <select
                            value={locationFilter}
                            onChange={(e) => setLocationFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm
                                       focus:outline-none focus:ring-2 focus:ring-[#174887] focus:border-[#174887]"
                          >
                            <option value="All">All</option>
                            {unitLocations.map((loc) => (
                              <option key={loc} value={loc}>
                                {loc}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : null;
                    })()}
                  </div>

                  {/* Sort */}
                  <div className="flex items-center gap-3 mb-5">
                    <label className="text-sm font-medium text-gray-700">Sort:</label>
                    <select
                      value={assessmentListSort}
                      onChange={(e) => setAssessmentListSort(e.target.value as typeof assessmentListSort)}
                      className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm
                                 focus:outline-none focus:ring-2 focus:ring-[#174887] focus:border-[#174887]"
                    >
                      <option value="updated-new">Updated: Newest First</option>
                      <option value="updated-old">Updated: Oldest First</option>
                      <option value="created-new">Created: Newest First</option>
                      <option value="created-old">Created: Oldest First</option>
                      <option value="name-asc">Name: A → Z</option>
                      <option value="name-desc">Name: Z → A</option>
                    </select>
                  </div>

                  <div className="space-y-3">
                    {[...assessmentLocations]
                      .sort((a, b) => {
                        if (assessmentListSort === 'updated-old') return (a.updated_date ?? '').localeCompare(b.updated_date ?? '');
                        if (assessmentListSort === 'created-new') return (b.created_date ?? '').localeCompare(a.created_date ?? '');
                        if (assessmentListSort === 'created-old') return (a.created_date ?? '').localeCompare(b.created_date ?? '');
                        if (assessmentListSort === 'name-asc') return a.taskName.localeCompare(b.taskName, undefined, { numeric: true, sensitivity: 'base' });
                        if (assessmentListSort === 'name-desc') return b.taskName.localeCompare(a.taskName, undefined, { numeric: true, sensitivity: 'base' });
                        return (b.updated_date ?? '').localeCompare(a.updated_date ?? ''); // updated-new (default)
                      })
                      .filter(
                        (loc) =>
                          (locationFilter === 'All' || loc.location === locationFilter) &&
                          (folderLocationFilter === 'All' || loc.folderName === folderLocationFilter),
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
                        const cardAssessmentId = `assess_${selectedCompany.id}_${loc.taskId}`;
                        const isThisUnsending = unsendingId === cardAssessmentId;
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
                            <div className={`p-5 text-left ${isSent && !isCustomerSubmitted ? 'opacity-70' : isSent ? 'opacity-60' : ''}`}>
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
                              <div className="text-sm text-gray-500 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                                {loc.location && <span>{loc.location}</span>}
                                {loc.created_date && <span>Created {loc.created_date}</span>}
                                {loc.updated_date && loc.updated_date !== loc.created_date && (
                                  <span>Updated {loc.updated_date}</span>
                                )}
                              </div>
                            </div>
                            {isSent && (
                              <div
                                className="flex gap-2 px-5 pb-4"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {!isCustomerSubmitted && (
                                  <button
                                    disabled={isThisUnsending}
                                    onClick={() => handleModifyAndResend(loc)}
                                    className="px-4 py-1.5 text-sm font-semibold border-2 border-amber-500 text-amber-700 rounded-lg hover:bg-amber-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {isThisUnsending ? 'Working…' : 'Modify & Resend'}
                                  </button>
                                )}
                                <button
                                  disabled={isThisUnsending}
                                  onClick={() => handleUnsendAssessment(loc, isCustomerSubmitted)}
                                  className="px-4 py-1.5 text-sm font-semibold border-2 border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {isThisUnsending ? 'Working…' : 'Unsend'}
                                </button>
                              </div>
                            )}
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
                onUnsend={(assessmentId) =>
                  setSentAssessments((prev) => prev.filter((a) => a.assessmentId !== assessmentId))
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
                isSent={sentAssessments.some((a) => a.assessmentId === assessment.id)}
                isSubmitted={sentAssessments.some((a) => a.assessmentId === assessment.id && Boolean(a.submittedAt))}
              />
            )}
          </>
        )}
      </div>
    );
  }

  // --- Render: customer/folder selection with tabs ---
  // Helper: match a folder to an Assembly client or company and return a Company-shaped object
  const folderToCompany = (f: ClickUpFolder): Company => {
    // Strip punctuation and normalize to a sorted word bag for robust matching
    const normalize = (s: string) =>
      s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const wordBag = (s: string) => normalize(s).split(' ').filter((w) => w.length > 1).sort().join(' ');

    const folderNorm = normalize(f.name);
    const folderBag = wordBag(f.name);

    const fuzzy = (name: string) => {
      if (!name.trim()) return false;
      const n = normalize(name);
      if (!n) return false;
      // Exact normalized match
      if (n === folderNorm) return true;
      // Prefix match either direction
      if (n.startsWith(folderNorm) || folderNorm.startsWith(n)) return true;
      // Word-bag overlap — handles "Last, First" vs "First Last"
      const nb = wordBag(name);
      if (nb === folderBag) return true;
      const nWords = nb.split(' ');
      const fWords = folderBag.split(' ');
      const overlap = nWords.filter((w) => fWords.includes(w)).length;
      const total = new Set([...nWords, ...fWords]).size;
      return total > 0 && overlap / total >= 0.5;
    };

    const matchedClient = allClients.find((c) => {
      const fullName = `${c.givenName ?? ''} ${c.familyName ?? ''}`.trim();
      const reversedName = `${c.familyName ?? ''} ${c.givenName ?? ''}`.trim();
      return fuzzy(fullName) || fuzzy(reversedName);
    });
    const matchedCompany = allCompanies.find((c) => fuzzy(c.name ?? ''));
    return {
      id: f.id,
      name: f.name,
      createdAt: matchedClient?.createdAt ?? matchedCompany?.createdAt ?? (() => {
        if (!f.date_created) return undefined;
        const ms = parseInt(f.date_created, 10);
        if (isNaN(ms)) return undefined;
        try { return new Date(ms).toISOString(); } catch { return undefined; }
      })(),
    };
  };

  const TAB_LABELS: Record<ActiveTab, string> = {
    commercial: 'Commercial Customers',
    hourly: 'Hourly Customers',
    residential: 'Residential Customers',
  };

  const settingsHref = token ? `/internal/settings?token=${token}` : '/internal/settings';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Tab bar */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-0">
              {(['commercial', 'hourly', 'residential'] as ActiveTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-4 text-sm font-semibold border-b-2 transition-colors ${
                    activeTab === tab
                      ? 'border-[#174887] text-[#174887]'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {TAB_LABELS[tab]}
                </button>
              ))}
            </div>
            <a
              href={settingsHref}
              className="px-4 py-2 text-sm text-gray-500 hover:text-[#174887] font-medium transition-colors"
            >
              Settings
            </a>
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
      ) : activeTab === 'hourly' ? (
        hourlyError ? (
          <div className="max-w-4xl mx-auto py-12 px-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 text-sm font-mono whitespace-pre-wrap">
              Error loading hourly customers: {hourlyError}
            </div>
          </div>
        ) : (
          <CustomerSelect
            companies={hourlyFolders.map(folderToCompany)}
            loading={hourlyLoading}
            entityLabel="customer"
            onSelect={(company) => {
              const folder = hourlyFolders.find((f) => f.id === company.id);
              if (folder) handleHourlySelect(folder);
            }}
          />
        )
      ) : (
        residentialError ? (
          <div className="max-w-4xl mx-auto py-12 px-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 text-sm font-mono whitespace-pre-wrap">
              Error loading residential customers: {residentialError}
            </div>
          </div>
        ) : (
          <CustomerSelect
            companies={residentialFolders.map(folderToCompany)}
            loading={residentialLoading}
            entityLabel="customer"
            onSelect={(company) => {
              const folder = residentialFolders.find((f) => f.id === company.id);
              if (folder) handleResidentialSelect(folder);
            }}
          />
        )
      )}
    </div>
  );
}
