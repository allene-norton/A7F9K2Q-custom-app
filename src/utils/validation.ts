import { FormDataSchema, IdentificationSchema } from "../types"
import type { BackgroundCheckFormData, Identification } from "../types"

export interface ValidationError {
  field: string
  message: string
}

export function validateFormData(data: BackgroundCheckFormData): ValidationError[] {
  const result = FormDataSchema.safeParse(data)

  if (result.success) {
    return []
  }

  return result.error.errors.map((error) => ({
    field: error.path.join("."),
    message: error.message,
  }))
}

export function validateIdentification(data: Identification): ValidationError[] {
  const result = IdentificationSchema.safeParse(data)

  if (result.success) {
    return []
  }

  return result.error.errors.map((error) => ({
    field: error.path.join("."),
    message: error.message,
  }))
}

export function validateRequired(value: string, fieldName: string): string | null {
  if (!value || value.trim() === "") {
    return `${fieldName} is required`
  }
  return null
}

export function validateEmail(email: string): string | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return "Please enter a valid email address"
  }
  return null
}

export function validatePostalCode(postalCode: string): string | null {
  const zipRegex = /^\d{5}(-\d{4})?$/
  if (!zipRegex.test(postalCode)) {
    return "Please enter a valid postal code (12345 or 12345-6789)"
  }
  return null
}

export function validateState(state: string): string | null {
  if (state.length !== 2) {
    return "State must be 2 characters (e.g., IL, CA, NY)"
  }
  return null
}
