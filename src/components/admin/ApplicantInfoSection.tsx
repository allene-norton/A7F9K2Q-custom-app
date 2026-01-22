"use client"
import { useState } from "react"


// UI IMPORTS
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { User, MapPin, Calendar } from "lucide-react"

// TYPE IMPORTS
import type { Identification } from "../../types"

// VALIDATION IMPORTS
import { validateRequired, validateState, validatePostalCode } from "../../utils/validation"

// SERVER ACTION IMPORTS
// import { updateClient, UpdateClientRequest, CustomFieldsData } from "@/lib/actions/client-actions"


interface ApplicantInfoSectionProps {
  identification: Identification
  updateIdentification: (updates: Partial<Identification>) => void
  // onSave?: (success: boolean, error?: string) => void 
  // clientId?: string 
}

export function ApplicantInfoSection({ identification, updateIdentification }: ApplicantInfoSectionProps) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)

  const handleInputChange = (field: keyof Identification, value: string) => {
    updateIdentification({ [field]: value })

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  const handleBlur = (field: keyof Identification, value: string) => {
    let error = ""

    switch (field) {
      case "firstName":
      case "lastName":
      case "streetAddress":
      case "city":
      case "birthdate":
        error = validateRequired(value, field.replace(/([A-Z])/g, " $1").toLowerCase()) || ""
        break
      case "state":
        error = validateState(value) || ""
        break
      case "postalCode":
        error = validatePostalCode(value) || ""
        break
    }

    setErrors((prev) => ({ ...prev, [field]: error }))
  }

//   const handleSave = async () => {
//   if (!clientId || !onSave) return
  
//   setIsSaving(true)
  
//   try {
//     // Format the custom fields data according to CustomFieldsData interface
//     const customFieldsData: CustomFieldsData = {
//       streetAddress: identification.streetAddress,
//       streetAddress2: identification.streetAddress2 || "",
//       city: identification.city,
//       state: identification.state,
//       postalCode: identification.postalCode,
//       birthDate: identification.birthdate
//     }

//     // Structure the request according to UpdateClientRequest interface
//     const updateRequest: UpdateClientRequest = {
//       givenName: identification.firstName,
//       familyName: identification.lastName,
//       customFields: JSON.stringify(customFieldsData)
//     }

//     await updateClient(clientId, updateRequest)

//     onSave(true)
//   } catch (error) {
//     console.error('Failed to update client:', error)
//     onSave(false, error instanceof Error ? error.message : 'Failed to update client')
//   } finally {
//     setIsSaving(false)
//   }
// }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <User className="w-5 h-5 text-blue-600" />
          <CardTitle>Applicant Information</CardTitle>
        </div>
        <CardDescription>Enter the personal information for the background check applicant</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Name Fields */}
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name *</Label>
            <Input
              id="firstName"
              value={identification.firstName}
              onChange={(e) => handleInputChange("firstName", e.target.value)}
              onBlur={(e) => handleBlur("firstName", e.target.value)}
              placeholder="Enter first name"
              className={errors.firstName ? "border-red-500" : ""}
            />
            {errors.firstName && <p className="text-sm text-red-600">{errors.firstName}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name *</Label>
            <Input
              id="lastName"
              value={identification.lastName}
              onChange={(e) => handleInputChange("lastName", e.target.value)}
              onBlur={(e) => handleBlur("lastName", e.target.value)}
              placeholder="Enter last name"
              className={errors.lastName ? "border-red-500" : ""}
            />
            {errors.lastName && <p className="text-sm text-red-600">{errors.lastName}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="birthdate" className="flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span>Birthdate *</span>
            </Label>
            <Input
              id="birthdate"
              type="string"
              value={identification.birthdate}
              onChange={(e) => handleInputChange("birthdate", e.target.value)}
              onBlur={(e) => handleBlur("birthdate", e.target.value)}
              className={errors.birthdate ? "border-red-500" : ""}
            />
            {errors.birthdate && <p className="text-sm text-red-600">{errors.birthdate}</p>}
          </div>

          {/* Address Fields */}
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="streetAddress" className="flex items-center space-x-2">
              <MapPin className="w-4 h-4" />
              <span>Street Address *</span>
            </Label>
            <Input
              id="streetAddress"
              value={identification.streetAddress}
              onChange={(e) => handleInputChange("streetAddress", e.target.value)}
              onBlur={(e) => handleBlur("streetAddress", e.target.value)}
              placeholder="Enter street address"
              className={errors.streetAddress ? "border-red-500" : ""}
            />
            {errors.streetAddress && <p className="text-sm text-red-600">{errors.streetAddress}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="streetAddress2">Street Address Line 2</Label>
            <Input
              id="streetAddress2"
              value={identification.streetAddress2 || ""}
              onChange={(e) => handleInputChange("streetAddress2", e.target.value)}
              placeholder="Apt, suite, etc. (optional)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">City *</Label>
            <Input
              id="city"
              value={identification.city}
              onChange={(e) => handleInputChange("city", e.target.value)}
              onBlur={(e) => handleBlur("city", e.target.value)}
              placeholder="Enter city"
              className={errors.city ? "border-red-500" : ""}
            />
            {errors.city && <p className="text-sm text-red-600">{errors.city}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="state">State *</Label>
            <Input
              id="state"
              value={identification.state}
              onChange={(e) => handleInputChange("state", e.target.value.toUpperCase())}
              onBlur={(e) => handleBlur("state", e.target.value)}
              placeholder="IL"
              maxLength={2}
              className={errors.state ? "border-red-500" : ""}
            />
            {errors.state && <p className="text-sm text-red-600">{errors.state}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="postalCode">Postal Code *</Label>
            <Input
              id="postalCode"
              value={identification.postalCode}
              onChange={(e) => handleInputChange("postalCode", e.target.value)}
              onBlur={(e) => handleBlur("postalCode", e.target.value)}
              placeholder="12345 or 12345-6789"
              className={errors.postalCode ? "border-red-500" : ""}
            />
            {errors.postalCode && <p className="text-sm text-red-600">{errors.postalCode}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
