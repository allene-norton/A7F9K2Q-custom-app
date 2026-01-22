'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FolderPlus } from 'lucide-react';

import { useSearchParams } from 'next/navigation';


import { BackgroundCheckFormData, FORM_TYPE_INFO } from '@/types';

import { createFolder } from '@/lib/actions/client-actions';

interface CreateFolderSectionProps {
  updateFormData: (updates: Partial<BackgroundCheckFormData>) => void; // Changed this line
  formData: BackgroundCheckFormData;
  onFolderCreated?: (updateCreateFolder: {folderCreated: boolean}) => void
}

export function CreateFolderSection({
  updateFormData,
  formData,
  onFolderCreated
}: CreateFolderSectionProps) {

  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? undefined;



  const formTypeName = FORM_TYPE_INFO[formData.formType].title;

  const handleCreateFolder = async () => {
    if (!formData.fileChannelId) {
      throw new Error(
        `File Channel not found. Check that a file channel exists for the client in your Assembly dashboard`,
      );
    }

    try {
      console.log('Creating folder with params:', {
      fileChannelId: formData.fileChannelId,
      formTypeName,
      token: token ? 'present' : 'missing'
    });
      const result = await createFolder(
        formData.fileChannelId,
        formTypeName,
        token,
      );

      
      console.log(result)

      if (result.error) {
        console.error('Failed to create folder:', result.error);
        return;
      }

      const updateCreateFolder = {folderCreated: true}
      updateFormData(updateCreateFolder);
      console.log(`updateFormData called from CreateFolder`)
      onFolderCreated?.(updateCreateFolder)
    } catch (error) {
      console.error('Error creating folder:', error);
    }
  };

  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <div className="mb-4 rounded-full bg-muted p-4">
          <FolderPlus className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="mb-2 text-lg font-semibold">No Folder Created</h3>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          Create a folder to start organizing and uploading your files
        </p>
        <Button onClick={() => handleCreateFolder()} size="lg">
          Create a folder to start uploading files
        </Button>
      </CardContent>
    </Card>
  );
}
