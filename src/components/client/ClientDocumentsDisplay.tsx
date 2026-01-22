"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { ReportDocumentCard } from "@/components/shared/ReportDocumentCard"
import { FolderOpen, RefreshCw } from "lucide-react"
import { fetchClientDocuments, type SDKDocument } from "../../utils/sdk-integration"
import { ListFilesResponse, FileObject, FilesArray } from "@/lib/actions/client-actions"


interface ClientDocumentsDisplayProps {
  clientId: string
  reportFiles: ListFilesResponse
}

export function ClientDocumentsDisplay({ clientId, reportFiles }: ClientDocumentsDisplayProps) {
  const [filesResponse, setFilesResponse] = useState<ListFilesResponse>()
  const [documents, setDocuments] = useState<FilesArray>([])
  const [isLoading, setIsLoading] = useState(false)

  const loadDocuments = async () => {
    if (!clientId) {
      setFilesResponse(undefined)
      setDocuments([])
      return
    }

    setIsLoading(true)

    try {
      if (reportFiles.data && reportFiles.data.length > 0) {
      setFilesResponse(reportFiles)}
      setDocuments(reportFiles.data!)
    } catch (error) {
      console.error("Error loading documents:", error)
      setFilesResponse(undefined)
      setDocuments([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadDocuments()
  }, [clientId, reportFiles])


  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <FolderOpen className="w-5 h-5 text-blue-600" />
          <CardTitle>Clear Tech Report Documents</CardTitle>
        </div>
        <CardDescription>View and download your background check documents and related files</CardDescription>
      </CardHeader>
      <CardContent>
        {!clientId ? (
          <div className="text-center py-8">
            <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No client selected</p>
          </div>
        ) : isLoading ? (
          <div className="text-center py-8">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading your documents...</p>
          </div>
        ) : documents?.length === 0 ? (
          <div className="text-center py-8">
            <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No documents available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents?.map((document) => (
              <ReportDocumentCard
                key={document.id}
                document={document}
                variant="client"
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
