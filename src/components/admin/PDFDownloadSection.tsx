'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, GripVertical, FileText, Image, X } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { BackgroundCheckFormData, BackgroundCheckFile } from '@/types';
import {
  generateCoverLetterPDF,
  mergePDFs,
  processFileForPDF,
} from '@/lib/pdf-utils';
import { FileItem } from '@/components/admin/AdminInterface'; // Import from AdminInterface

// interface FileItem {
//   id: string;
//   name: string;
//   type: 'cover' | 'submitted' | 'uploaded';
//   url?: string;
//   file?: File;
//   data?: any; // For cover letter data
// }

interface PDFDownloadSectionProps {
  formData: BackgroundCheckFormData;
  submittedFiles: Array<{ id: string; name: string; url: string }>;
  uploadedFiles: BackgroundCheckFile[];
  allFileItems: FileItem[];
}

export function PDFDownloadSection({
  formData,
  submittedFiles,
  uploadedFiles,
  allFileItems,
}: PDFDownloadSectionProps) {
  const [fileItems, setFileItems] = useState<FileItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    setFileItems(allFileItems);
  }, [allFileItems]);

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(fileItems);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setFileItems(items);
  };

  const handleRemoveFile = (fileId: string) => {
    setFileItems(prev => prev.filter(item => item.id !== fileId));
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'cover':
        return <FileText className="w-4 h-4 text-blue-600" />;
      case 'submitted':
        return <FileText className="w-4 h-4 text-green-600" />;
      case 'uploaded':
        return <Image className="w-4 h-4 text-purple-600" />;
      default:
        return <FileText className="w-4 h-4 text-gray-600" />;
    }
  };

  const handleDownloadPDF = async () => {
  setIsGenerating(true);
  try {
    const pdfFiles: Blob[] = [];
    
    for (const item of fileItems) {
      if (item.type === 'cover') {
        try {
          const coverPDF = await generateCoverLetterPDF(item.data);
          if (coverPDF && coverPDF.type === 'application/pdf') {
            pdfFiles.push(coverPDF);
          } else {
            console.warn('Cover letter PDF generation returned invalid data');
          }
        } catch (coverError) {
          console.error('Error generating cover letter PDF:', coverError);
        }
      } else if (item.url) {
        try {
          const response = await fetch(item.url);
          if (!response.ok) {
            throw new Error(`Failed to fetch file: ${response.statusText}`);
          }
          const blob = await response.blob();
          const processedPDF = await processFileForPDF(blob, item.name);
          if (processedPDF) {
            pdfFiles.push(processedPDF);
            console.log(`Processed file ${item.name} successfully`);
          }
        } catch (fileError) {
          console.error(`Error processing file ${item.name}:`, fileError);
        }
      }
    }
    
    if (pdfFiles.length === 0) {
      throw new Error('No valid files could be processed');
    }
    
    console.log(`Processing ${pdfFiles.length} files for PDF generation`);
    
    let finalPDF: Blob;
    if (pdfFiles.length === 1) {
      finalPDF = pdfFiles[0];
    } else {
      finalPDF = await mergePDFs(pdfFiles);
    }
    
    const filename = `${formData.identification.firstName}_${formData.identification.lastName}_Background_Check.pdf`;
    
    // Simple and clean - just open the PDF in a new window
    const url = URL.createObjectURL(finalPDF);
    window.open(url, '_blank', 'noopener,noreferrer');
    
    console.log('PDF opened in new window');
    
    // Cleanup after delay
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('Error generating PDF. Please check that all files are valid and try again.');
  } finally {
    setIsGenerating(false);
  }
};



  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Download Complete Report</span>
          <Button
            onClick={handleDownloadPDF}
            disabled={isGenerating || fileItems.length === 0}
            className="flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>{isGenerating ? 'Generating...' : 'View PDF'}</span>
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-4">
          Drag and drop to reorder files. Click the X to remove files from the PDF. The cover letter will be included at the beginning of the PDF.
        </p>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="file-list">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-2"
              >
                {fileItems.map((item, index) => (
                  <Draggable key={item.id} draggableId={item.id!} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`flex items-center space-x-3 p-3 bg-white border rounded-lg ${
                          snapshot.isDragging ? 'shadow-lg' : 'shadow-sm'
                        } ${item.type === 'cover' ? 'border-blue-200 bg-blue-50' : ''}`}
                      >
                        <div
                          {...provided.dragHandleProps}
                          className="cursor-grab active:cursor-grabbing"
                        >
                          <GripVertical className="w-4 h-4 text-gray-400" />
                        </div>

                        {getFileIcon(item.type)}

                        <div className="flex-1">
                          <p className="text-sm font-medium">{item.name}</p>
                          <p className="text-xs text-gray-500 capitalize">
                            {item.type === 'cover'
                              ? 'Generated Cover Letter'
                              : `${item.type} File`}
                          </p>
                        </div>

                        <div className="text-xs text-gray-400">
                          #{index + 1}
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveFile(item.id)}
                          className="h-6 w-6 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {fileItems.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No files available for download</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
