'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  FileText,
  ExternalLink,
  Eye,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { FileObject } from '@/lib/actions/client-actions';
import { useState } from 'react';

interface ReportDocumentCardProps {
  document: FileObject;
  variant?: 'admin' | 'client'; // or whatever variants you have
  onResponseClick?: () => void;
  onFileClick?: () => void;
}

export function ReportDocumentCard({
  document,
  onResponseClick,
  onFileClick,
}: ReportDocumentCardProps) {
  const [previewFile, setPreviewFile] = useState<{
    url: string;
    filename: string;
    type: string;
  } | null>(null);

  const handleResponseClick = () => {
    if (document.id) {
      // console.log(document.id);
      window.parent.postMessage(
        {
          id: document.id,
          type: 'history.push',
          route: `contracts`,
        },
        'https://dashboard.assembly.com',
      );
    }
    onResponseClick?.();
  };

  const handleFilePreview = (url: string, filename: string) => {
    const fileType = 'pdf';
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
            {document.name}
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
          {document.downloadUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                handleFilePreview(document.downloadUrl!, `${document.name}.pdf`)
              }
              className="w-full bg-transparent whitespace-nowrap"
            >
              {document.name}
            </Button>
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
