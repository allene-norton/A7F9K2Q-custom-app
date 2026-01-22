'use server';

import { revalidatePath } from 'next/cache';
import { copilotApi } from 'copilot-node-sdk';
import { fi } from 'date-fns/locale';

const copilotApiKey = process.env.COPILOT_API_KEY;
const assemblyApiKey = process.env.ASSEMBLY_API_KEY;
// const isDev = process.env.NODE_ENV === 'development';
const isDev = false;

const ASSEMBLY_BASE_URI = 'https://api.assembly.com/v1';

// ---------- Unified types (single source of truth)
// clients
export interface Client {
  avatarImageUrl?: string;
  companyId?: string;
  companyIds?: string[];
  createdAt?: string;
  creationMethod?: string;
  customFields?: any;
  email?: string;
  fallbackColor?: string;
  familyName?: string;
  firstLoginDate?: string;
  givenName?: string;
  id?: string;
  inviteUrl?: string;
  invitedBy?: string;
  lastLoginDate?: string;
  object?: 'client';
  status?: string;
  updatedAt?: string;
}

export interface UpdateClientRequest {
  givenName?: string;
  familyName?: string;
  customFields?: string; 
}

export interface CustomFieldsData {
  streetAddress?: string;
  streetAddress2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  birthDate?: string;
}

export interface ClientsData {
  data?: Client[] | undefined;
  nextToken?: string;
}

export type ListClientsResponse = {
  success: boolean;
  data?: ClientsData;
  error?: string;
};

// forms
export interface FormField {
  formFieldId?: string;
  title?: string;
  description?: string;
  type?:
    | 'multiSelect'
    | 'singleSelect'
    | 'title'
    | 'shortAnswer'
    | 'longAnswer'
    | 'fileUpload';
  isRequired?: boolean;
  multipleChoiceOptions?: string[];
}

export interface Form {
  id?: string;
  createdAt?: string;
  object?: 'form';
  name?: string;
  description?: string;
  formFieldIds?: string[];
  formFields?: FormField[];
  allowMultipleSubmissions?: boolean;
  visibility?: 'allClients' | string;
  formResponseRequests?: number;
  formResponseSubmissions?: number;
  latestSubmissionDate?: string;
}

export interface FormsResponse {
  data?: Form[];
  nextToken?: string;
}

// form responses
export interface FormResponseField {
  title?: string;
  description?: string;
  type?:
    | 'multiSelect'
    | 'singleSelect'
    | 'title'
    | 'shortAnswer'
    | 'longAnswer'
    | 'fileUpload'; // ts error here from sdk, possibly incorrect
  multipleChoiceOptions?: string[];
  isRequired?: boolean;
  answer?: string | string[];
  attachmentUrls?: string[];
}

export interface FormResponse {
  allowMultipleSubmissions?: boolean;
  clientId?: string;
  companyId?: string;
  createdAt?: string;
  formDescription?: string;
  formFieldIds?: string[];
  formFields?: Record<string, FormResponseField>;
  formId?: string;
  formName?: string;
  id?: string;
  object?: 'formResponse';
  status?: 'completed' | 'pending';
  submissionDate?: string;
  visibility?: 'requestedClients' | 'allClients';
  fields?: {
    formName?: string;
    formDescription?: string;
    formFieldIds?: string[];
    formFields?: Record<string, FormResponseField>;
    status?: string;
    allowMultipleSubmissions?: boolean;
    visibility?: string;
    submissionDate?: string;
  };
}

export interface FormResponsesApiResponse {
  data?: FormResponse[];
}

export type FormResponseArray = FormResponse[];

// contracts

export interface ContractField {
  id?: string;
  inputType?: string;
  isOptional?: boolean;
  label?: string;
  page?: number;
  type?: string;
  value?: string;
}

export interface Contract {
  clientId?: string;
  companyId?: string;
  contractTemplateId?: string;
  createdAt?: string;
  creationMode?: 'template';
  fields?: ContractField[];
  fileUrl?: string;
  id?: string;
  name?: string;
  object?: 'contract';
  recipientId?: string;
  shareDate?: string;
  signedFileUrl?: string;
  status?: 'signed' | 'pending' | 'draft';
  submissionDate?: string;
  updatedAt?: string;
}

export interface ContractsResponse {
  data?: Contract[];
}

export type ContractArray = Contract[];

// file channels

export interface FileChannel {
  id?: string;
  object?: string;
  identityId?: string;
  createdAt?: string;
  updatedAt?: string;
  membershipType: 'individual' | 'company';
  clientId?: string; // Optional, present when membershipType is "individual"
  companyId?: string;
  membershipEntityId?: string;
  memberIds?: string[];
}

export interface ListFileChannelsResponse {
  data?: FileChannel[];
  nextToken?: string;
}

// files

export interface FileObject {
  channelId?: string;
  createdAt?: string;
  creatorId?: string;
  downloadUrl?: string;
  id?: string;
  lastModifiedBy?: {
    id?: string;
    object?: string;
  };
  linkUrl?: string;
  name?: string;
  object?: string;
  path?: string;
  size?: number;
  status?: string;
}

export interface ListFilesResponse {
  data?: FileObject[];
  nextToken?: string;
}

export type FilesArray = FileObject[];

//--------- api/sdk calls--------------

// Helper function to create SDK instance
function createSDK(token: string) {
  if (!copilotApiKey) {
    throw new Error('COPILOT_API_KEY is not configured');
  }
  if (!token) {
    throw new Error('Token is required');
  }
  // process.env.COPILOT_DEBUG = 'true'

  return copilotApi({
    apiKey: copilotApiKey,
    token: token,
  });
}

// listClients action
export async function listClients(
  token?: string,
): Promise<ListClientsResponse> {
    console.log(`-----------APP KEY`, process.env.COPILOT_API_KEY)

  try {
    if (isDev) {
      // Dev mode: use Assembly API directly
      if (!assemblyApiKey) {
        throw new Error('ASSEMBLY_API_KEY is required for dev mode');
      }

      const response = await fetch(`${ASSEMBLY_BASE_URI}/clients`, {
        method: 'GET',
        headers: {
          'X-API-KEY': assemblyApiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      revalidatePath('/internal');
      return { success: true, data };
    } else {
      // Prod mode: use Copilot SDK with token
      if (!token) {
        throw new Error('Token is required in production');
      }

      const sdk = createSDK(token);
      const clients = await sdk.listClients({ limit: 2000 });
      revalidatePath('/internal');
      return { success: true, data: clients as ClientsData };
    }
  } catch (error) {
    console.error('Error fetching clients:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch clients',
    };
  }
}

// updateClient action
export async function updateClient(clientId: string, body: UpdateClientRequest, token?: string) {
  try {
    if (isDev) {
      // Dev mode: use Assembly API directly
      if (!assemblyApiKey) {
        throw new Error('ASSEMBLY_API_KEY is required for dev mode');
      }

      const response = await fetch(`${ASSEMBLY_BASE_URI}/clients/${clientId}`, {
        method: 'PATCH',
        headers: {
          'X-API-KEY': assemblyApiKey,
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      revalidatePath('/internal');
      return { success: true, data };
    } else {
      // Prod mode: use Copilot SDK with token
      if (!token) {
        throw new Error('Token is required in production');
      }

      const sdk = createSDK(token);
      const updatedClient = await sdk.updateClient({id: clientId, requestBody: body})
      revalidatePath('/internal');
      return { success: true, data: updatedClient as Client };
    }
  } catch (error) {
    console.error('Error fetching clients:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update client',
    };
  }
}

// listForms action
export async function listForms(token?: string) {
  try {
    if (isDev) {
      // Dev mode: use Assembly API directly
      if (!assemblyApiKey) {
        throw new Error('ASSEMBLY_API_KEY is required for dev mode');
      }

      const response = await fetch(`${ASSEMBLY_BASE_URI}/forms`, {
        method: 'GET',
        headers: {
          'X-API-KEY': assemblyApiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      revalidatePath('/internal');
      return data;
    } else {
      // Prod mode: use Copilot SDK with token
      if (!token) {
        throw new Error('Token is required in production');
      }

      const sdk = createSDK(token);
      const data = await sdk.listForms({ limit: 2000 });
      revalidatePath('/internal');
      return data;
    }
  } catch (error) {
    console.error('Error fetching forms:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to fetch forms',
    };
  }
}

// listFormResponses action
export async function listFormResponses(formId: string, token?: string) {
  try {
    if (isDev) {
      // Dev mode: use Assembly API directly
      if (!assemblyApiKey) {
        throw new Error('ASSEMBLY_API_KEY is required for dev mode');
      }

      const response = await fetch(
        `${ASSEMBLY_BASE_URI}/forms/${formId}/form-responses`,
        {
          method: 'GET',
          headers: {
            'X-API-KEY': assemblyApiKey,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      revalidatePath('/internal');
      return data;
    } else {
      // Prod mode: use SDK with token
      if (!token) {
        throw new Error('Token is required in production');
      }

      const sdk = createSDK(token);
      const data = await sdk.listFormResponses({ id: formId });
      revalidatePath('/internal');
      return data;
    }
  } catch (error) {
    console.error('Error fetching forms:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to fetch forms',
    };
  }
}

// listContracts action
export async function listContracts(clientId: string, token?: string) {
  try {
    if (isDev) {
      // Dev mode: use Assembly API directly
      if (!assemblyApiKey) {
        throw new Error('ASSEMBLY_API_KEY is required for dev mode');
      }

      const response = await fetch(
        `${ASSEMBLY_BASE_URI}/contracts?clientId=${clientId}`,
        {
          method: 'GET',
          headers: {
            'X-API-KEY': assemblyApiKey,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      revalidatePath('/internal');
      return data;
    } else {
      // Prod mode: use Copilot SDK with token
      if (!token) {
        throw new Error('Token is required in production');
      }

      const sdk = createSDK(token);
      const data = await sdk.listContracts({ clientId: clientId });
      revalidatePath('/internal');
      return data;
    }
  } catch (error) {
    console.error('Error fetching forms:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to fetch forms',
    };
  }
}

// listFileChannels action
export async function listFileChannels(token?: string) {
  try {
    if (isDev) {
      // Dev mode: use Assembly API directly
      console.log(`using dev mode with key:`, process.env.ASSEMBLY_API_KEY)
      if (!assemblyApiKey) {
        throw new Error('ASSEMBLY_API_KEY is required for dev mode');
      }

      const response = await fetch(`${ASSEMBLY_BASE_URI}/channels/files`, {
        method: 'GET',
        headers: {
          'X-API-KEY': assemblyApiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      revalidatePath('/internal');
      return data;
    } else {
      // Prod mode: use Copilot SDK with token
      if (!token) {
        throw new Error('Token is required in production');
      }

      const sdk = createSDK(token);
      const data = await sdk.listFileChannels({ limit: 2000 });
      revalidatePath('/internal');
      return data;
    }
  } catch (error) {
    console.error('Error fetching forms:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to fetch forms',
    };
  }
}

// createFolder action
export async function createFolder(
  channelId: string,
  formTypeName: string,
  token?: string,
) {
  try {
    if (isDev) {
      // Dev mode: use Assembly API directly
      if (!assemblyApiKey) {
        throw new Error('ASSEMBLY_API_KEY is required for dev mode');
      }

      const requestBody = {
        channelId: channelId,
        path: `ClearTech Reports - ${formTypeName}`,
      };

      const response = await fetch(`${ASSEMBLY_BASE_URI}/files/folder`, {
        method: 'POST',
        headers: {
          'X-API-KEY': assemblyApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channelId: channelId,
          path: `ClearTech Reports - ${formTypeName}`,
        }),
      });

      console.log('Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);

        let errorMessage;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorJson.error || errorText;
        } catch {
          errorMessage = errorText;
        }
        throw new Error(
          `API create folder request failed: ${response.statusText}`,
        );
      }

      const data = await response.json();
      revalidatePath('/internal');
      return data;
    } else {
      // Prod mode: use Copilot SDK with token
      if (!token) {
        throw new Error('Token is required in production');
      }

      const sdk = createSDK(token);
      const data = await sdk.createFile({
        fileType: `folder`,
        requestBody: {
          path: `ClearTech Reports - ${formTypeName}`,
          channelId: channelId,
        },
      });
      revalidatePath('/internal');
      return data;
    }
  } catch (error) {
    console.error('Error creating folder:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to create folder',
    };
  }
}

// createFile action
export async function createFile(
  channelId: string,
  folderName: string,
  fileName: string,
  fileContent: string | Blob,
  token?: string,
) {
  if (fileContent instanceof Blob) {
    console.log(`FILE CONTENT!!!:`, {
      type: fileContent.type,
      size: fileContent.size,
      constructor: fileContent.constructor.name,
    });
  } else {
    // It's a string (base64)
    console.log(
      `FILE CONTENT!!!:`,
      typeof fileContent,
      fileContent.length,
      'characters',
    );
  }

  try {
    let createFileResponse;

    let uploadContent: Blob;

    if (typeof fileContent === 'string') {
      // Convert base64 string to Blob
      const binaryString = atob(fileContent);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      uploadContent = new Blob([bytes]);
      console.log('Converted base64 to Blob:', uploadContent.size, 'bytes');
    } else {
      uploadContent = fileContent;
    }

    if (isDev) {
      // Dev mode: use Assembly API directly
      if (!assemblyApiKey) {
        throw new Error('ASSEMBLY_API_KEY is required for dev mode');
      }

      const requestBody = {
        channelId: channelId,
        path: `${folderName}/${fileName}`,
      };

      console.log(`API request body:`, requestBody);

      const response = await fetch(`${ASSEMBLY_BASE_URI}/files/file`, {
        method: 'POST',
        headers: {
          'X-API-KEY': assemblyApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);

        let errorMessage;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorJson.error || errorText;
        } catch {
          errorMessage = errorText;
        }
        throw new Error(
          `API create file request failed: ${response.statusText}`,
        );
      }

      createFileResponse = await response.json();
      console.log(`API Response data:`, createFileResponse);
    } else {
      // Prod mode: use Copilot SDK with token
      if (!token) {
        throw new Error('Token is required in production');
      }

      const sdk = createSDK(token);
      createFileResponse = await sdk.createFile({
        fileType: `file`,
        requestBody: {
          path: `${folderName}/${fileName}`,
          channelId: channelId,
        },
      });
      console.log(`SDK DATA`, createFileResponse);
    }

    // Upload the file content to the uploadUrl
    if (createFileResponse.uploadUrl) {
      console.log('Uploading file content to:', createFileResponse.uploadUrl);

      const uploadResponse = await fetch(createFileResponse.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Length': uploadContent.size?.toString() || '0',
          // Optional: helps with caching and display
          'Cache-Control': 'public, max-age=31536000',
        },
        body: uploadContent,
        // No authentication required for upload URL
      });

      if (!uploadResponse.ok) {
        console.error(
          'Upload failed:',
          uploadResponse.status,
          uploadResponse.statusText,
        );
        throw new Error(`File upload failed: ${uploadResponse.statusText}`);
      }

      console.log('File uploaded successfully');
    } else {
      console.warn('No uploadUrl received in response');
    }

    revalidatePath('/internal');
    return createFileResponse;
  } catch (error) {
    console.error('Error creating file:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to create file',
    };
  }
}

// listFiles action
export async function retrieveFile(fileId: string, token?: string) {
  try {
    if (isDev) {
      // Dev mode: use Assembly API directly
      if (!assemblyApiKey) {
        throw new Error('ASSEMBLY_API_KEY is required for dev mode');
      }

      const response = await fetch(`${ASSEMBLY_BASE_URI}/files/${fileId}`, {
        method: 'GET',
        headers: {
          'X-API-KEY': assemblyApiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      revalidatePath('/internal');
      return data;
    } else {
      // Prod mode: use Copilot SDK with token
      if (!token) {
        throw new Error('Token is required in production');
      }

      const sdk = createSDK(token);
      const data = await sdk.retrieveFile({ id: fileId });
      revalidatePath('/internal');
      return data;
    }
  } catch (error) {
    console.error('Error retrieving file:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to retrieve file',
    };
  }
}

// listFiles action
export async function listFiles(
  channelId: string,
  formTypeName: string,
  token?: string,
) {
  const formattedPath = encodeURI(`ClearTech Reports - ${formTypeName}`);
  const sdkFormattedPath = `ClearTech Reports - ${formTypeName}`;
  try {
    if (isDev) {
      // Dev mode: use Assembly API directly
      if (!assemblyApiKey) {
        throw new Error('ASSEMBLY_API_KEY is required for dev mode');
      }

      console.log(`FORMATTED PATH`, formattedPath);

      const response = await fetch(
        `${ASSEMBLY_BASE_URI}/files?channelId=${channelId}&path=${formattedPath}`,
        {
          method: 'GET',
          headers: {
            'X-API-KEY': assemblyApiKey,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      revalidatePath('/reports');
      return data;
    } else {
      // Prod mode: use Copilot SDK with token
      if (!token) {
        throw new Error('Token is required in production');
      }

      const sdk = createSDK(token);
      console.log(
        `SDK created, about to fetch files for path `,
        sdkFormattedPath,
      );
      const data = await sdk.listFiles({
        channelId: channelId,
        path: sdkFormattedPath,
      });
      revalidatePath('/reports');
      return data;
    }
  } catch (error) {
    console.error('Error fetching files:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to fetch files',
    };
  }
}

// loggedInClient action
export async function getLoggedInUser(clientId?: string, token?: string) {
  try {
    if (isDev) {
      console.log(`IS DEV`, isDev);
      // Dev mode: use Assembly API directly
      if (!assemblyApiKey) {
        throw new Error('ASSEMBLY_API_KEY is required for dev mode');
      }

      // const clientId = 'tempClientId'

      const response = await fetch(`${ASSEMBLY_BASE_URI}/clients/${clientId}`, {
        method: 'GET',
        headers: {
          'X-API-KEY': assemblyApiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      revalidatePath('/internal');
      return data;
    } else {
      // Prod mode: use Copilot SDK with token
      console.log(`server action token`, token);
      if (!token) {
        throw new Error('Token is required in production');
      }

      const sdk = createSDK(token);

      const data: {
        workspace: Awaited<ReturnType<typeof sdk.retrieveWorkspace>>;
        client?: Awaited<ReturnType<typeof sdk.retrieveClient>>;
        company?: Awaited<ReturnType<typeof sdk.retrieveCompany>>;
        internalUser?: Awaited<ReturnType<typeof sdk.retrieveInternalUser>>;
      } = {
        workspace: await sdk.retrieveWorkspace(),
      };
      const tokenPayload = await sdk.getTokenPayload?.();

      if (tokenPayload?.clientId) {
        data.client = await sdk.retrieveClient({
          id: tokenPayload.clientId,
        });
      }
      if (tokenPayload?.companyId) {
        data.company = await sdk.retrieveCompany({
          id: tokenPayload.companyId,
        });
      }
      if (tokenPayload?.internalUserId) {
        data.internalUser = await sdk.retrieveInternalUser({
          id: tokenPayload.internalUserId,
        });
      }

      revalidatePath('/internal');
      return data;
    }
  } catch (error) {
    console.error('Error retrieving logged in user:', error);
    return {
      error:
        error instanceof Error
          ? error.message
          : 'Failed to retrieve logged in user',
    };
  }
}

// comment for deploy
