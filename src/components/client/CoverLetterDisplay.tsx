"use client"

import { Card, CardContent } from "../ui/card"
import { StatusBadge } from "../shared/StatusBadge"
import { Calendar, MapPin, User, Shield, FileText } from "lucide-react"
import { type BackgroundCheckFormData, FORM_TYPE_INFO } from "../../types"

interface CoverLetterDisplayProps {
  formData: BackgroundCheckFormData
}

export function CoverLetterDisplay({ formData }: CoverLetterDisplayProps) {
  const client = formData.client
  const formTypeInfo = FORM_TYPE_INFO[formData.formType]
  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <Card className="bg-white shadow-lg">
      <CardContent className="p-8">
        {/* Letterhead */}
        <div className="border-b border-gray-200 pb-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center">
                  <img 
                  src="/ct-logo.png" 
                  alt="CT Logo" 
                  className="w-12 h-12 rounded-lg object-contain"
                />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">ClearTech</h1>
                  <p className="text-gray-600">Background Checks and Security Consulting</p>
                </div>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <h2 className="text-1xl font-bold text-gray-900">A People-Focused Approach to Screening</h2>
                <p> Contact Us: admin@cleartechbackground.com</p>
              </div>
            </div>
            <div className="text-right">
              <StatusBadge status={formData.status} size="lg" />
            </div>
          </div>
        </div>

        {/* Letter Content */}
        <div className="space-y-6">
          {/* Date and Reference */}
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span>Date: {currentDate}</span>
            </div>
            <div>
              Reference #: BGC-{formData.client.split('-',1)}
            </div>
          </div>

          {/* Recipient Information */}
          {client && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2 flex items-center space-x-2">
                <User className="w-4 h-4" />
                <span>Applicant Information</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p>
                    <strong>Name:</strong> {formData.identification.firstName} {formData.identification.lastName}
                  </p>
                  <p>
                    <strong>Client:</strong> {formData.identification.firstName}
                  </p>
                  <p>
                    <strong>Form Type:</strong> {formTypeInfo.title}
                  </p>
                </div>
                <div>
                  <div className="flex items-start space-x-2">
                    <MapPin className="w-4 h-4 mt-0.5 text-gray-500" />
                    <div>
                      <p>{formData.identification.streetAddress}</p>
                      {formData.identification.streetAddress2 && <p>{formData.identification.streetAddress2}</p>}
                      <p>
                        {formData.identification.city}, {formData.identification.state}{" "}
                        {formData.identification.postalCode}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Letter Body */}
          <div className="prose prose-gray max-w-none">
            {/* <p className="text-gray-700 leading-relaxed">
              Dear {formData.identification.firstName} {formData.identification.lastName},
            </p> */}

            <p className="text-gray-700 leading-relaxed">
              We are pleased to provide you with the results of your background screening conducted by ClearTech
              Background Services. This comprehensive screening was performed in accordance with the requirements for{" "}
              the State of Illinois and includes the background checks listed below:
            </p>

            {/* Background Checks Performed */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 my-6">
              <h4 className="font-medium text-blue-900 mb-3 flex items-center space-x-2">
                <Shield className="w-4 h-4" />
                <span>Background Checks Performed</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {formData.backgroundChecks.map((check) => (
                  <div key={check} className="flex items-center space-x-2 text-sm">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    <span className="text-blue-800">{check}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Status-specific content */}
            {formData.status === "cleared" && (
              <p className="text-gray-700 leading-relaxed">
                <strong className="text-green-700">CLEARED:</strong> The results of this screening <strong>have been successfully completed and cleared</strong>. If you have any questions or would like additional information regarding these results, please contact our office.
              </p>
            )}

            {formData.status === "pending" && (
              <p className="text-gray-700 leading-relaxed">
                <strong className="text-yellow-700">PENDING:</strong> Your background screening is currently in
                progress. We are awaiting responses from one or more verification sources. We will notify you as soon as
                the screening is complete.
              </p>
            )}

            {formData.status === "denied" && (
              <p className="text-gray-700 leading-relaxed">
                <strong className="text-red-700">DENIED:</strong> Your background screening has revealed information
                that does not meet the required standards for this application. If you believe this information is
                incorrect, please contact us immediately to discuss the dispute process.
              </p>
            )}

            {/* Additional Notes */}
            {formData.memo && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 my-6">
                <h4 className="font-medium text-gray-900 mb-2 flex items-center space-x-2">
                  <FileText className="w-4 h-4" />
                  <span>Additional Notes</span>
                </h4>
                <p className="text-gray-700 text-sm leading-relaxed">{formData.memo}</p>
              </div>
            )}
            <br/>
            <p className="text-gray-700 leading-relaxed">
              This background screening was conducted in compliance with the Fair Credit Reporting Act (FCRA) and all
              applicable state and local laws.</p>
              <p className="text-gray-700 leading-relaxed"> If you have any questions about these results or need additional
              information, please contact our office at admin@cleartechbackground.com.
            </p><br/>

            <p className="text-gray-700 leading-relaxed">Thank you for choosing ClearTech Background Services.</p>

            <div className="mt-8 pt-4 border-t border-gray-200">
              <p className="text-gray-700">
                Sincerely,
                <br />
                <br />
                <strong>ClearTech Admin Team</strong>
                <h2 className="text-1xl font-bold text-gray-900">A People-Focused Approach to Screening</h2>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-xs text-gray-500">
          <p className="mb-2">
            <strong>Confidentiality Notice:</strong> This document contains confidential and privileged information. If
            you are not the intended recipient, please notify the sender immediately and destroy this document.
          </p>
          {/* <p>
            <strong>Dispute Process:</strong> If you believe any information in this report is inaccurate, you have the
            right to dispute it. Please contact us within 30 days of receiving this report.
          </p> */}
        </div>
      </CardContent>
    </Card>
  )
}
