'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink, Download, FileText } from 'lucide-react';

interface PDFViewerProps {
  url: string;
  filename: string;
}

export default function PDFViewer({ url, filename }: PDFViewerProps) {
  const [showFallback, setShowFallback] = useState(false);
  const [loading, setLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Use proxy URL to bypass S3 Content-Disposition headers
  const proxyUrl = `/api/pdf-proxy?url=${encodeURIComponent(url)}`;

  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        setShowFallback(true);
        setLoading(false);
      }
    }, 5000); // Give it 5 seconds

    return () => clearTimeout(timer);
  }, [loading]);

  const handleIframeLoad = () => {
    setLoading(false);
  };

  if (showFallback) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="mb-6">
          <FileText className="h-16 w-16 text-blue-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Contract Document</h3>
          <p className="text-sm text-gray-600">
            Preview unavailable - download to view the signed contract
          </p>
        </div>
        <div className="space-y-3 w-full max-w-xs">
          <Button 
            onClick={() => window.open(url, '_blank')}
            className="w-full"
            size="lg"
          >
            <Download className="h-4 w-4 mr-2" />
            Download {filename}
          </Button>
          <Button 
            onClick={() => {
              setShowFallback(false);
              setLoading(true);
            }}
            variant="outline"
            size="sm"
            className="w-full"
          >
            Try Preview Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p>Loading PDF preview...</p>
          </div>
        </div>
      )}
      
      <iframe
        ref={iframeRef}
        src={proxyUrl}
        className="w-full h-full border-0"
        title={filename}
        onLoad={handleIframeLoad}
        onError={() => {
          setLoading(false);
          setShowFallback(true);
        }}
      />
      
      {!loading && !showFallback && (
        <div className="absolute top-4 right-4 z-20">
          <Button 
            onClick={() => window.open(url, '_blank')}
            variant="outline"
            size="sm"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Download Original
          </Button>
        </div>
      )}
    </div>
  );
}