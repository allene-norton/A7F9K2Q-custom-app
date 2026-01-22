'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, ExternalLink, Eye } from 'lucide-react';
import { FormResponse } from '@/lib/actions/client-actions';
import { useMemo, useState } from 'react';


interface FormCardProps {
  formResponse: FormResponse;
  variant?: 'admin' | 'client'; // or whatever variants you have
  onResponseClick?: () => void;
  onFileClick?: () => void;
}

export function FormCard({
  formResponse,
  onResponseClick,
  onFileClick,
}: FormCardProps) {
  const [previewFile, setPreviewFile] = useState<{ url: string; filename: string; type: string } | null>(null);



  const handleResponseClick = () => {
    if (formResponse.formId) {
      // console.log(formResponse.formId)
      window.parent.postMessage(
        {
          id: formResponse.formId,
          type: 'history.push',
          route: `forms`,
        },
        'https://dashboard.assembly.com',
      );
    }
    onResponseClick?.();
  };


  const attachmentUrls = useMemo(() => {
    const allAttachmentUrls: string[] = [];
    
    if (formResponse.formFields) {
      Object.values(formResponse.formFields).forEach((field) => {
        if (field.type === 'fileUpload' && field.attachmentUrls) {
          allAttachmentUrls.push(...field.attachmentUrls);
        }
      });
    }
    
    return allAttachmentUrls;
  }, [formResponse.formFields]);


  const getFileType = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')) {
      return 'image';
    }
    if (extension === 'pdf') {
      return 'pdf';
    }
    return 'other';
  };

  const handleFilePreview = (url: string, filename: string) => {
    const fileType = getFileType(filename);
    setPreviewFile({ url, filename, type: fileType });
    onFileClick?.();
  };

  const renderPreviewContent = () => {
    if (!previewFile) return null;
    // console.log(previewFile.url)

    switch (previewFile.type) {
      case 'image':
        return (
          <img 
            src={previewFile.url} 
            alt={previewFile.filename}
            className="w-full h-full object-contain"
          />
        );
      case 'pdf':
        return (
          <iframe
            src={previewFile.url}
            className="w-full h-full border-0"
            title={previewFile.filename}
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
    <>
   <Card className="hover:shadow-md transition-shadow w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          {formResponse.formName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* <Button
          variant="outline"
          size="sm"
          onClick={handleResponseClick}
          className="w-full bg-transparent whitespace-nowrap"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Form Response
        </Button> */}
        {attachmentUrls.length > 0 && (
          <div className="flex flex-col gap-2">
            {attachmentUrls.map((url, index) => {
              const filename = decodeURIComponent(url.split('/').pop()?.split('?')[0] || `File ${index + 1}`);
              
              return (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleFilePreview(url, filename)}
                  className="w-full bg-transparent whitespace-nowrap"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Attachment {index + 1}
                </Button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>

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
          transform: 'translate(-50%, -50%)'
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
    </>
    
  );
}
