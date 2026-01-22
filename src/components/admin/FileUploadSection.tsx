'use client';

import type React from 'react';
import { useState, useCallback, useEffect, useRef} from 'react';

import { useSearchParams } from 'next/navigation';

// UI IMPORTS
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import {
  Upload,
  File,
  X,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Eye,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// TYPE AND CONSTANTS IMPORTS
import type { BackgroundCheckFile, BackgroundCheckFormData } from '../../types';
import { FORM_TYPE_INFO } from '../../types';

// API/SDK ACTIONS IMPORTS
import { createFile, retrieveFile } from '@/lib/actions/client-actions';
import { FileItem } from '@/components/admin/AdminInterface';

interface FileUploadSectionProps {
  backgroundCheckFile: BackgroundCheckFile;
  formData: BackgroundCheckFormData;
  onFileCreated: (updateBackgroundCheckFile: BackgroundCheckFile) => void;
  updateCheckFileStatus: (updatedFileInfo: BackgroundCheckFile) => void;
  onFileClick?: () => void;
  token?: string;
  setFileItem?: (fileObj: FileItem) => void
}

export function FileUploadSection({
  formData,
  backgroundCheckFile,
  onFileCreated,
  updateCheckFileStatus,
  onFileClick,
  setFileItem,
  token
}: FileUploadSectionProps) {
  // const searchParams = useSearchParams();
  // const token = searchParams.get('token') ?? undefined;
  

  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [previewFile, setPreviewFile] = useState<{
    url: string;
    filename: string;
    type: string;
  } | null>(null);

  const fileItemSetRef = useRef(new Set<string>());


  const formTypeName = FORM_TYPE_INFO[formData.formType].title;
  const folderName = `ClearTech Reports - ${formTypeName}`;



  useEffect(() => {
    const setUploadedFileItem = async () => {
      // Only proceed if we have the required data and haven't already set this file item
      if (
        backgroundCheckFile.fileUploaded && 
        backgroundCheckFile.fileId && 
        setFileItem &&
        !fileItemSetRef.current.has(backgroundCheckFile.fileId)
      ) {
        try {
          const getFileForPreview = await retrieveFile(backgroundCheckFile.fileId, token);
          const fileItem: FileItem = {
            id: backgroundCheckFile.fileId,
            name: backgroundCheckFile.fileName || `ClearTech Uploaded File ${backgroundCheckFile.checkName}`,
            type: 'uploaded',
            url: getFileForPreview.downloadUrl,
            data: null
          };
          
          setFileItem(fileItem);
          // Mark this file ID as already processed
          fileItemSetRef.current.add(backgroundCheckFile.fileId);
        } catch (error) {
          console.error('Error setting uploaded file item:', error);
        }
      }
    };

    setUploadedFileItem();
  }, [
    backgroundCheckFile.fileUploaded, 
    backgroundCheckFile.fileId, 
    backgroundCheckFile.fileName, 
    backgroundCheckFile.checkName, 
    token
    // Remove setFileItem from dependencies to break the loop
  ]);

  // Clear the tracking when the component unmounts or file changes
  useEffect(() => {
    return () => {
      fileItemSetRef.current.clear();
    };
  }, [backgroundCheckFile.fileId]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    // Get checkName directly from prop to avoid stale closure
    const currentCheckName = backgroundCheckFile.checkName;
    
    
    // console.log(`FILE!:`, file);
    // Validate file type
    if (file.type !== 'application/pdf') {
      setUploadError('Only PDF files are allowed for background reports');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size must be less than 10MB');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(0);

    try {
      // Simulate upload progress **remove???***
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // console.log('=== DEBUG: Starting file upload ===');
      // console.log('formData.fileChannelId:', formData.fileChannelId);
      // console.log('folderName:', folderName);
      // console.log('file.name:', file.name);
      // console.log('file type:', file.type);
      // console.log('file size:', file.size);

      // Check if required values exist
      if (!formData.fileChannelId) {
        throw new Error('fileChannelId is missing');
      }
      if (!folderName) {
        throw new Error('folderName is missing');
      }

      console.log('Converting file to base64...');
      const arrayBuffer = await file.arrayBuffer();

      const uint8Array = new Uint8Array(arrayBuffer);
      let binaryString = '';
      const chunkSize = 8192; // Process in chunks to avoid stack overflow

      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.slice(i, i + chunkSize);
        binaryString += String.fromCharCode(...chunk);
      }

      const base64String = btoa(binaryString);

      // console.log('About to call createFile with base64:', {
      //   channelId: formData.fileChannelId,
      //   folderName,
      //   fileName: file.name,
      //   base64Length: base64String.length,
      //   token: token
      // });

      const uploadFile = await createFile(
        formData.fileChannelId!,
        folderName,
        file.name,
        base64String,
        token
      );
      // console.log('createFile completed', uploadFile);

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Create file info object - use currentCheckName from the start of this function
      const fileInfo: BackgroundCheckFile = {
        checkName: currentCheckName,
        fileUploaded: true,
        fileName: file.name,
        fileId: uploadFile.id,
      };

      // console.log('FileUploadSection - Creating file info for check:', currentCheckName);
      // console.log('FileUploadSection - Full fileInfo:', fileInfo);
      // console.log('FileUploadSection - About to call updateCheckFileStatus with checkName:', currentCheckName);

      // Update the check file status directly
      updateCheckFileStatus(fileInfo);
      
      // console.log('FileUploadSection - After calling updateCheckFileStatus');
      
      // Also call onFileCreated for any additional parent logic
      onFileCreated(fileInfo);
      
      // console.log('FileUploadSection - After calling onFileCreated');

      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 500);
    } catch (error) {
      console.error('=== Error caught in handleFileUpload ===', error);
      setUploadError('Failed to upload file. Please try again.');
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (
      Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    );
  };

  const handleFilePreview = async (fileId: string) => {
    try {
      const fileType = 'pdf';
      const getFileForPreview = await retrieveFile(fileId, token);
      setPreviewFile({
        url: getFileForPreview.downloadUrl,
        filename: backgroundCheckFile.fileName!,
        type: fileType,
      });

      if (setFileItem) {
        const fileItem: FileItem = {
          id: fileId,
          name: backgroundCheckFile.fileName || `ClearTech Uploaded File ${backgroundCheckFile.checkName}`,
          type: 'uploaded',
          url: getFileForPreview.downloadUrl,
          data: null
        };
        setFileItem(fileItem);
      }

      // onFileClick?.();
    } catch (error) {
      console.error('Error previewing file:', error);
      // Handle error appropriately
    }
  };

  const renderPreviewContent = () => {
    if (!previewFile) return null;
    // console.log(previewFile.url)

    switch (previewFile.type) {
      case 'pdf':
        return (
          <iframe
            src={previewFile.url}
            className="w-full h-full border-0"
            title={backgroundCheckFile.fileName!}
          />
        );
      default:
        return (
          <div className="text-center py-8">
            <p className="mb-4">Preview not available for this file type.</p>
            <Button
              onClick={() => window.open(previewFile.url, '_blank')}
              variant="outline"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open File
            </Button>
          </div>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Upload className="w-5 h-5 text-blue-600" />
          <CardTitle>{backgroundCheckFile.checkName} Report Upload</CardTitle>
        </div>
        <CardDescription>
          Upload the completed report for {backgroundCheckFile.checkName} (PDF
          only)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!backgroundCheckFile.fileUploaded ? (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload
              className={`w-12 h-12 mx-auto mb-4 ${isDragOver ? 'text-blue-500' : 'text-gray-400'}`}
            />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {isDragOver
                ? 'Drop your file here'
                : `Upload ${backgroundCheckFile.checkName} Report`}
            </h3>
            <p className="text-gray-600 mb-4">
              Drag and drop your PDF file here, or click to browse
            </p>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
              id={`file-upload-${backgroundCheckFile.checkName}`}
            />
            <Button asChild variant="outline">
              <label htmlFor={`file-upload-${backgroundCheckFile.checkName}`} className="cursor-pointer">
                Choose File
              </label>
            </Button>
            <p className="text-sm text-gray-500 mt-2">
              PDF files only, maximum 10MB
            </p>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <File className="w-8 h-8 text-red-600 mt-1" />
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 truncate">
                  {backgroundCheckFile.fileName}
                </h4>
                {/* <p className="text-sm text-gray-600">
                  {formatFileSize(uploadedFile.size)} • Uploaded {uploadedFile.uploadedAt.toLocaleDateString()}
                </p> */}
                <div className="flex items-center space-x-2 mt-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-600">
                    Upload complete
                  </span>
                </div>
                {backgroundCheckFile.fileId ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleFilePreview(backgroundCheckFile.fileId!)
                    }
                    className="w-full bg-transparent whitespace-nowrap"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview File
                  </Button>
                ) : (
                  <></>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Preview Modal */}
        <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
          <DialogContent
            className="flex flex-col p-0"
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              width: '85vw',
              height: '85vh',
              maxWidth: '85vw',
              maxHeight: '85vh',
              margin: 0,
              borderRadius: '0.5rem',
              transform: 'translate(-50%, -50%)',
            }}
          >
            <DialogHeader className="flex-shrink-0 px-6 py-4 border-b">
              <DialogTitle className="text-lg font-semibold truncate">
                {previewFile?.filename}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-hidden p-6">
              {renderPreviewContent()}
            </div>
          </DialogContent>
        </Dialog>

        {/* Upload Progress */}
        {isUploading && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Uploading...</span>
              <span className="text-gray-600">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}

        {/* Upload Error */}
        {uploadError && (
          <div className="mt-4 flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
            <p className="text-sm text-red-700">{uploadError}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}