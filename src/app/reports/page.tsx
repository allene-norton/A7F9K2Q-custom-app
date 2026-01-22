'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

// COMPONENTS IMPORTS
import { ClientPortal } from '../../components/client/ClientPortal';
import { ReportUnavailable } from '@/components/client/ReportUnavailable';

// HOOKS IMPORTS
import { useFormData } from '../../hooks/useFormData';

// TYPE AND CONSTANTS IMPORTS
import { FORM_TYPE_INFO } from '@/types';

// SERVER ACTIONS
import { getLoggedInUser, listFiles } from '@/lib/actions/client-actions';

// UI IMPORTS
import { Badge } from '../../components/ui/badge';

function ReportsContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? undefined;
  const tempClientId = searchParams.get('clientId')
  console.log(`params client id`, tempClientId)

  


  const [loggedInUser, setLoggedInUser] = useState<any>(null);
  const [userLoading, setUserLoading] = useState<any>(true);
  const [reportFiles, setReportFiles] = useState<any>([]);
  const [filesLoading, setFilesLoading] = useState<any>(false);
  const [shouldFetchFiles, setShouldFetchFiles] = useState<boolean>(false);

  const { formData, isLoading: formLoading } = useFormData({
    clientId: loggedInUser?.id || undefined,
  });

  // console.log(`client formData`, formData)

  const formTypeName = FORM_TYPE_INFO[formData.formType].title;

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        setUserLoading(true);
        // console.log(`retrieveing client from token`, token)
        // @ts-ignore
        const userInfo = await getLoggedInUser(tempClientId, token);
        // console.log(userInfo.client);
        setLoggedInUser(userInfo.client);
      } catch (error) {
        console.error('Error fetching user info:', error);
        setLoggedInUser(null);
      } finally {
        setUserLoading(false);
      }
    };

    fetchUserInfo();
  }, [token]);

  useEffect(() => {
    if (formData?.fileChannelId && loggedInUser?.id && token && !shouldFetchFiles) {
      console.log('All dependencies ready, triggering file fetch');
      setShouldFetchFiles(true);
    }
  }, [formData?.fileChannelId, loggedInUser?.id, token, shouldFetchFiles]);

  useEffect(() => {
    const fetchReportFiles = async () => {
      if (!shouldFetchFiles) return;

      // console.log(`client side channel:`, formData?.fileChannelId);
      console.log('Fetching files...');

      try {
        setFilesLoading(true);
        const files = await listFiles(
          formData.fileChannelId!,
          formTypeName,
          token,
        );

        // console.log('Files fetched:', files);

        setReportFiles(files);
      } catch (error) {
        console.error('Error fetching report files:', error);
      } finally {
        setFilesLoading(false);
      }
    };

    fetchReportFiles();
  }, [shouldFetchFiles, formData?.fileChannelId, formTypeName, token]);

  if (userLoading || formLoading || filesLoading || !formData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            Loading your background check report...
          </p>
        </div>
      </div>
    );
  }

    if (
    !loggedInUser ||
    loggedInUser === null ||
    loggedInUser === undefined ||
    Object.keys(loggedInUser).length === 0 ||
    formData.client === undefined ||
    formData.client === null ||
    formData.client === '' ||
    formData.folderCreated === false
  ) {
    return <ReportUnavailable />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Title */}
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center">
                  <img
                    src="/ct-logo.png"
                    alt="CT Logo"
                    className="w-12 h-12 rounded-lg object-contain"
                  />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Background Check Report
                </h1>
                <p className="text-sm text-gray-500">Clear Tech</p>
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex items-center space-x-4">
              <Badge
                variant={
                  formData?.status === 'cleared'
                    ? 'default'
                    : formData?.status === 'pending'
                      ? 'secondary'
                      : 'destructive'
                }
                className={
                  formData.status === 'cleared'
                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                    : formData.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                      : 'bg-red-100 text-red-800 hover:bg-red-200'
                }
              >
                {formData.status.charAt(0).toUpperCase() +
                  formData.status.slice(1)}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ClientPortal formData={formData} reportFiles={reportFiles} />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-500">
            © 2025 ClearTech Background Services. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading your background check report...</p>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ReportsContent />
    </Suspense>
  );
}
