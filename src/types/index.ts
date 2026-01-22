import { z } from 'zod';

// Form Types
export type FormType = 'tenant' | 'employment' | 'nonprofit';
export type Status = 'cleared' | 'pending' | 'denied';

// Background Check Options by Form Type
export const BACKGROUND_CHECK_OPTIONS = {
  tenant: [
    'Acknowledgement of Background Check',
    'Acknowledgement of Employment',
    'Criminal History Clearance',
    'Reference Check Clearance',
    'Identity Verification',
    'Rental Application Completion',
    'Home Visit Check Completion',
    'Personal Wellness Assessment',
    'Credit Check Assessment'
  ],
  employment: [
    'Acknowledgement of Background Check',
    'Acknowledgement of Employment',
    'Criminal History Clearance',
    'Reference Check Clearance',
    'Identity Verification',
    'Employment Application Completion',
    'Personal Wellness Assessment'
  ],
  nonprofit: [
    'Acknowledgement of Background Check',
    'Acknowledgement of Employment',
    'Criminal History Clearance',
    'Reference Check Clearance',
    'Identity Verification',
    'Sex Offender Clearance',
    'Youth Protection Policy',
    'Illinois State Murderer and Violent Offender Against Youth',
    'Illinois State Police Clearance',
    'FBI Clearance'
  ],
} as const;

// Zod Schemas

export const BackgroundCheckFilesSchema = z.array(
    z.object({
      checkName: z.string(),
      fileUploaded: z.boolean(),
      fileName: z.string().optional(),
      fileId: z.string().optional(),
    }),
  )

export const IdentificationSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  streetAddress: z.string().optional(),        // example.min(1, 'Street address is required'),
  streetAddress2: z.string().optional(),
  city: z.string().optional(),
  state: z
    .string()
    .optional(),
  postalCode: z.string().optional(),
  birthdate: z.string().optional(),
});

export const FormDataSchema = z.object({
  client: z.string().min(1, 'Client selection is required'),
  formType: z.enum(['tenant', 'employment', 'nonprofit']),
  identification: IdentificationSchema,
  backgroundChecks: z
    .array(z.string())
    .min(1, 'At least one background check must be selected'),
  backgroundCheckFiles: BackgroundCheckFilesSchema,
  status: z.enum(['cleared', 'pending', 'denied']),
  memo: z.string().optional(),
  fileChannelId: z.string().optional(),
  folderCreated: z.boolean()
});

export type BackgroundCheckFormData = z.infer<typeof FormDataSchema>;
export type Identification = z.infer<typeof IdentificationSchema>;
export type BackgroundCheckFiles = z.infer<typeof BackgroundCheckFilesSchema>;
export type BackgroundCheckFile = z.infer<typeof BackgroundCheckFilesSchema>[number]

// Default Form Data
export const DEFAULT_FORM_DATA: BackgroundCheckFormData = {
  client: '',
  formType: 'tenant',
  identification: {
    firstName: '',
    lastName: '',
    streetAddress: '',
    streetAddress2: '',
    city: '',
    state: '',
    postalCode: '',
    birthdate: '',
  },
  backgroundChecks: [],
  backgroundCheckFiles: [],
  status: 'pending',
  memo: '',
  fileChannelId: '',
  folderCreated: false,
};


// Form Type Descriptions
export const FORM_TYPE_INFO = {
  tenant: {
    title: 'Tenant Screening',
    description: 'Comprehensive background screening for rental applications',
    requiredChecks: [
      'Acknowledgement of Background Check',
      'Acknowledgement of Employment',
      'Criminal History Clearance',
      'Reference Check Clearance',
      'Identity Verification',
      'Rental Application Completion',
    ],
  },
  employment: {
    title: 'Employment Verification',
    description: 'Professional background verification for employment purposes',
    requiredChecks: [
      'Acknowledgement of Background Check',
      'Acknowledgement of Employment',
      'Criminal History Clearance',
      'Reference Check Clearance',
      'Identity Verification',
      'Employment Application Completion',
    ],
  },
  nonprofit: {
    title: 'Nonprofit Volunteer',
    description: 'Volunteer screening for nonprofit organizations',
    requiredChecks: [
      'Acknowledgement of Background Check',
      'Acknowledgement of Employment',
      'Criminal History Clearance',
      'Reference Check Clearance',
      'Identity Verification',
      'Sex Offender Clearance',
      'Youth Protection Policy',
      'Illinois State Murderer and Violent Offender Against Youth',
      'Illinois State Police Clearance',
    ],
  },
} as const;
