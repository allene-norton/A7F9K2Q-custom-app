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
import { Contract } from '@/lib/actions/client-actions';
import { useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import react-pdf components with loading fallback
const PDFViewer = dynamic(() => import('./PDFViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center p-8">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
        <p>Loading PDF viewer...</p>
      </div>
    </div>
  ),
});

interface ContractCardProps {
  contract: Contract;
  variant?: 'admin' | 'client'; 
  onResponseClick?: () => void;
  onFileClick?: () => void;
}

export function ContractCard({
  contract,
  variant,
  onResponseClick,
  onFileClick,
}: ContractCardProps) {
  const [previewFile, setPreviewFile] = useState<{
    url: string;
    filename: string;
    type: string;
  } | null>(null);

  const handleResponseClick = () => {
    // remove this, not necessary for contracts, add separate button?
    if (contract.id) {
      // console.log(contract.id);
      window.parent.postMessage(
        {
          id: contract.id,
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

    switch (previewFile.type) {
      case 'pdf':
        return (
          <PDFViewer url={previewFile.url} filename={previewFile.filename} />
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
            {contract.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* {variant === 'client' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResponseClick}
              className="w-full bg-transparent whitespace-nowrap"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Go to Contracts App
            </Button>
          ) : (
            <></>
          )} */}
          {contract.signedFileUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                handleFilePreview(
                  contract.signedFileUrl!,
                  `${contract.name}.pdf`,
                )
              }
              className="w-full bg-transparent whitespace-nowrap"
            >
              {contract.name}
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
    </>
  );
}
