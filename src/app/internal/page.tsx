'use client';

import { useState, useEffect } from 'react';

// HOOKS IMPORTS
import { useFormData } from '@/hooks/useFormData';

// API/SDK/TYPE IMPORTS
import {
  listClients,
  type ListClientsResponse,
  listFileChannels,
  type ListFileChannelsResponse,
  type Client,
  updateClient,
  type UpdateClientRequest,
  type CustomFieldsData,
} from '@/lib/actions/client-actions';
import { BackgroundCheckFile } from '@/types';

// COMPONENT IMPORTS
import { AdminInterface } from '@/components/admin/AdminInterface';

// UI IMPORTS
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Save, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { se } from 'date-fns/locale';

interface InternalPageProps {
  searchParams: { token?: string };
}

export default function InternalPage({ searchParams }: InternalPageProps) {
  // console.log(`SEARCHPARAMS`, searchParams)
  // console.log(`token`, searchParams.token);
  const token = searchParams.token;
  // ----------- STATES-------------------------------------------
  // CLIENTS STATES
  const [clientsResponse, setClientsResponse] = useState<ListClientsResponse>({
    success: false,
    data: {
      data: undefined,
      nextToken: '',
    },
  });
  const [clientsLoading, setClientsLoading] = useState(true);
  const [clientsError, setClientsError] = useState<string | null>(null);

  // FILE CHANNELS STATES
  const [fileChannelsResponse, setFileChannelsResponse] =
    useState<ListFileChannelsResponse>({ data: undefined, nextToken: '' });
  const [fileChannelsLoading, setFileChannelsLoading] = useState(true);
  const [fileChannelsError, setFileChannelsError] = useState<string | null>(
    null,
  );

  // SELECTED CLIENT STATE
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // ERROR STATE
  const [saveError, setSaveError] = useState<string | null>(null);

  // ---------------- end states-------------------------------------------

  // FORM DATA
  const {
    formData,
    isLoading,
    isSaving,
    lastSaved,
    hasUnsavedChanges,
    validationErrors,
    updateFormData,
    updateIdentification,
    updateCheckFileStatus,
    resetFormData,
    saveFormData,
  } = useFormData({ clientId: selectedClient?.id || '' });

  // FETCH CLIENTS AND FILE CHANNELS ON MOUNT
  useEffect(() => {
    // get all workspace clients
    const fetchClients = async () => {
      try {
        setClientsLoading(true);
        setClientsError(null);

        const response = await listClients(searchParams.token);

        if (!response.data) {
          throw new Error('No client data returned from server');
        }

        setClientsResponse(response);
      } catch (error) {
        console.error('Failed to fetch clients:', error);
        setClientsError(
          error instanceof Error ? error.message : 'Failed to fetch clients',
        );
      } finally {
        setClientsLoading(false);
      }
    };

    // get all workspace file channels

    const fetchFileChannels = async () => {
      try {
        setFileChannelsLoading(true);
        setFileChannelsError(null);

        const response = await listFileChannels(searchParams.token);

        if (!response.data) {
          throw new Error('No file channel data returned from server');
        }

        console.log(`list channels response`, response)

        setFileChannelsResponse(response);
      } catch (error) {
        console.error('Failed to fetch file channels:', error);
        setClientsError(
          error instanceof Error
            ? error.message
            : 'Failed to fetch file channels',
        );
      } finally {
        setClientsLoading(false);
      }
    };

    fetchClients();
    fetchFileChannels();
  }, [searchParams.token]);

  // Auto-save indicator
  const formatLastSaved = (date: Date | null) => {
    if (!date) return 'Never saved';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Saved just now';
    if (minutes === 1) return 'Saved 1 minute ago';
    return `Saved ${minutes} minutes ago`;
  };

  // LOADING INDICATOR
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading background check system...</p>
        </div>
      </div>
    );
  }

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
  };

  const handleFolderCreated = async (updateCreateFolder: {
    folderCreated: boolean;
  }) => {
    try {
      console.log(updateCreateFolder);
      await saveFormData(updateCreateFolder);
    } catch (error) {
      // Handle error
    }
  };

  const handleFileCreated = async (
    updateBackgroundCheckFile: BackgroundCheckFile,
  ) => {
    try {
      updateCheckFileStatus(updateBackgroundCheckFile);
      const updatedFiles = formData.backgroundCheckFiles.map((file) =>
        file.checkName === updateBackgroundCheckFile.checkName
          ? {
              ...file,
              fileUploaded: updateBackgroundCheckFile.fileUploaded,
              fileName: updateBackgroundCheckFile.fileName,
              fileId: updateBackgroundCheckFile.fileId,
            }
          : file,
      );

      // Pass the updated data directly to saveFormData
      await saveFormData({ backgroundCheckFiles: updatedFiles });
    } catch {
      console.log('something went wrong saving to db/updating form data');
    }
  };

  const handleSaveApplicantInfo = async (clientId: string) => {
    if (!formData.identification) return;

    try {
      const customFieldsData = {
      streetAddress: formData.identification.streetAddress,
      streetAddress2: formData.identification.streetAddress2 || "",
      city: formData.identification.city,
      state: formData.identification.state,
      postalCode: formData.identification.postalCode,
      birthDate: formData.identification.birthdate
    }

    // Create the request with customFields as object, using double type assertion
    const updateRequest = {
      givenName: formData.identification.firstName,
      familyName: formData.identification.lastName,
      customFields: customFieldsData // Send as object, not JSON string
    } as unknown as UpdateClientRequest // Double assertion: first to unknown, then to target type

      await updateClient(clientId, updateRequest, token);
      console.log('Client information updated successfully');
    } catch (error) {
      console.error('Failed to update client information:', error);
      throw error;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Title */}
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">CT</span>
                </div>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  ClearTech Background Services
                </h1>
                <p className="text-sm text-gray-500">Admin Interface</p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center space-x-6">
              {/* Save Status */}
              <div className="flex items-center space-x-2 text-sm">
                {hasUnsavedChanges ? (
                  <>
                    <Clock className="w-4 h-4 text-yellow-500" />
                    <span className="text-yellow-600">Unsaved changes</span>
                  </>
                ) : saveError ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <span className="text-red-600">Save failed</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-gray-600">
                      {formatLastSaved(lastSaved)}
                    </span>
                  </>
                )}
              </div>

              {/* Manual Save Button - only show if client is selected */}
              {selectedClient && (
                <Button
                  onClick={async () => {
                    console.log(
                      'Save button clicked for client:',
                      selectedClient.id,
                    );
                    setSaveError(null); // Clear previous errors

                    if (!selectedClient.id) {
                      setSaveError('No client ID available');
                      return;
                    }

                    try {
                      // Save both form data AND update client information
                      await Promise.all([
                        saveFormData(),
                        handleSaveApplicantInfo(selectedClient.id),
                      ]);
                      console.log('All saves completed successfully');
                    } catch (error) {
                      console.error('Save failed:', error);
                      setSaveError(
                        error instanceof Error
                          ? error.message
                          : 'Failed to save',
                      );
                    }
                  }}
                  variant={hasUnsavedChanges ? 'default' : 'outline'}
                  size="sm"
                  className="flex items-center space-x-2"
                  disabled={isSaving}
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Saving...' : 'Save'}</span>
                </Button>
              )}

              {/* Status Badge */}
              <Badge
                variant={
                  formData.status === 'cleared'
                    ? 'default'
                    : formData.status === 'pending'
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

          {/* NEW: Validation Error Banner */}
          {Object.keys(validationErrors).length > 0 && (
            <div className="pb-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-medium text-red-900 mb-2">
                      Validation Errors
                    </h3>
                    <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                      {Object.entries(validationErrors).map(
                        ([field, error]) => (
                          <li key={field}>
                            <strong>{field}:</strong> {error}
                          </li>
                        ),
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdminInterface
          formData={formData}
          updateFormData={updateFormData}
          updateIdentification={updateIdentification}
          updateCheckFileStatus={updateCheckFileStatus}
          resetFormData={resetFormData}
          clientsResponse={clientsResponse}
          clientsLoading={clientsLoading}
          clientsError={clientsError}
          fileChannelsResponse={fileChannelsResponse}
          fileChannelsLoading={fileChannelsLoading}
          fileChannelsError={fileChannelsError}
          selectedClient={selectedClient}
          onClientSelect={handleClientSelect}
          onFolderCreated={handleFolderCreated}
          onFileCreated={handleFileCreated}
          validationErrors={validationErrors}
          token={token}
        />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              © 2025 ClearTech Background Services. All rights reserved.
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span>Version 1.0.0</span>
              <span>•</span>
              <button
                onClick={resetFormData}
                className="text-red-600 hover:text-red-700 font-medium"
              >
                Reset All Data
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
