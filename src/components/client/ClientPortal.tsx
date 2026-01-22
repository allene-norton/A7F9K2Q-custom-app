"use client"

import type { BackgroundCheckFormData } from "../../types"
import { CoverLetterDisplay } from "./CoverLetterDisplay"
import { ClientDocumentsDisplay } from "./ClientDocumentsDisplay"
import { ListFilesResponse } from "@/lib/actions/client-actions"
import { SubmittedFormsSection } from "@/components/admin/SubmittedFormsSection"

interface ClientPortalProps {
  formData: BackgroundCheckFormData
  reportFiles: ListFilesResponse
}

export function ClientPortal({ formData, reportFiles }: ClientPortalProps) {
  return (
    <div className="space-y-8">
      {/* Cover Letter */}
      <CoverLetterDisplay formData={formData} />

      {/* Report Documents */}
      <ClientDocumentsDisplay clientId={formData.client} reportFiles={reportFiles} />

      {/* Client Documents */}
      <SubmittedFormsSection clientId={formData.client} variant={'client'} />
    </div>
  )
}
