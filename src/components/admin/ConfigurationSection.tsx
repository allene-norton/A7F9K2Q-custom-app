'use client';

import { useState, useEffect, useCallback } from 'react';

// UI IMPORTS
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Badge } from '../ui/badge';
import { Input } from '@/components/ui/input';
import {
  Settings,
  User,
  FileText,
  Search,
  Check,
  ChevronsUpDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import ReactSelect from 'react-select';

// TYPE IMPORTS
import {
  type BackgroundCheckFormData,
  type Identification,
  FORM_TYPE_INFO,
} from '../../types';

import type {
  ListClientsResponse,
  ListFileChannelsResponse,
  Client,
} from '@/lib/actions/client-actions';

interface ConfigurationSectionProps {
  formData: BackgroundCheckFormData;
  updateFormData: (updates: Partial<BackgroundCheckFormData>) => void;
  updateIdentification: (updates: Partial<Identification>) => void;
  clientsResponse: ListClientsResponse;
  clientsLoading: boolean;
  clientsError: string | null;
  fileChannelsResponse: ListFileChannelsResponse;
  fileChannelsLoading: boolean;
  fileChannelsError: string | null;
  selectedClient: Client | null; // Changed from selectedClientId
  onClientSelect: (client: Client) => void; // Changed signature
}

export function ConfigurationSection({
  formData,
  updateFormData,
  updateIdentification,
  clientsResponse,
  clientsLoading,
  clientsError,
  fileChannelsResponse,
  fileChannelsLoading,
  fileChannelsError,
  selectedClient,
  onClientSelect,
}: ConfigurationSectionProps) {
  const clients = clientsResponse.data?.data; // Prod

  const fileChannels = fileChannelsResponse;

  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [open, setOpen] = useState(false);

  // const filteredClients = clients?.filter(
  //   (client) =>
  //     client.id &&
  //     `${client.givenName} ${client.familyName}`
  //       .toLowerCase()
  //       .includes(clientSearchTerm.toLowerCase()),
  // );

  const clientOptions =
    clients
      ?.filter((client) => client.id)
      .map((client) => ({
        value: client.id!,
        label: `${client.givenName} ${client.familyName}`,
        client: client,
      })) || [];

  const selectedOption =
    clientOptions.find((option) => option.value === selectedClient?.id) || null;

  const formTypeInfo = FORM_TYPE_INFO[formData.formType];

  const handleClientChange = useCallback(
  (option: any) => {
    if (option && option.client.id !== selectedClient?.id) {
      // Only update if we're actually changing clients
      onClientSelect(option.client);
      
      // Batch all updates into a single call
      const updates: Partial<BackgroundCheckFormData> = {
        client: option.client.id,
      };
      
      // Update identification if client data doesn't match current form data
      if (formData.identification.firstName !== option.client.givenName) {
        updates.identification = {
          firstName: option.client.givenName || '',
          lastName: option.client.familyName || '',
          streetAddress: option.client.customFields?.streetAddress || '',
          streetAddress2: option.client.customFields?.streetAddress2 || '',
          city: option.client.customFields?.city || '',
          state: option.client.customFields?.state || '',
          postalCode: option.client.customFields?.postalCode || '',
          birthdate: option.client.customFields?.birthDate || '',
        };
      }
      
      // Single update call instead of multiple
      updateFormData(updates);
      console.log(`updateFormData called from config section`);
    }
  },
  [
    selectedClient?.id,
    onClientSelect,
    updateFormData,
  ],
);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Settings className="w-5 h-5 text-blue-600" />
          <CardTitle>Configuration</CardTitle>
        </div>
        <CardDescription>
          Select the client and form type for this background check
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Client Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label
              htmlFor="client-select"
              className="flex items-center space-x-2"
            >
              <User className="w-4 h-4" />
              <span>Client</span>
            </Label>

            <ReactSelect
              id="client-select"
              value={selectedOption}
              onChange={handleClientChange}
              options={clientOptions}
              isSearchable
              placeholder="Select a client..."
              className="react-select-container"
              classNamePrefix="react-select"
              styles={{
                control: (base) => ({
                  ...base,
                  minHeight: '40px',
                  borderColor: '#e5e5e5',
                  fontSize: '14px',
                  '&:hover': {
                    borderColor: 'hsl(var(--border))',
                  },
                }),
                input: (base) => ({
                  ...base,
                  fontSize: '14px',
                }),
                placeholder: (base) => ({
                  ...base,
                  fontSize: '14px',
                }),
                singleValue: (base) => ({
                  ...base,
                  fontSize: '14px',
                }),
                option: (base, state) => ({
                  ...base,
                  fontSize: '14px',
                  backgroundColor: state.isSelected
                    ? 'hsl(var(--accent))'
                    : state.isFocused
                      ? 'hsl(var(--accent) / 0.5)'
                      : 'transparent',
                }),
              }}
            />

            {selectedClient && (
              <div className="text-sm text-gray-600 space-y-1">
                <p>
                  <strong>Email:</strong> {selectedClient.email}
                </p>
                {/* <p>
                  <strong>Phone:</strong> {selectedClient.phone}
                </p> */}
              </div>
            )}
          </div>

          {/* Form Type Selection */}
          <div className="space-y-2">
            <Label
              htmlFor="form-type-select"
              className="flex items-center space-x-2"
            >
              <FileText className="w-4 h-4" />
              <span>Form Type</span>
            </Label>
            <Select
              value={formData.formType}
              onValueChange={(value: 'tenant' | 'employment' | 'nonprofit') =>
                updateFormData({ formType: value, backgroundChecks: [] })
              }
            >
              <SelectTrigger id="form-type-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tenant">Tenant Screening</SelectItem>
                <SelectItem value="employment">
                  Employment Verification
                </SelectItem>
                <SelectItem value="nonprofit">Nonprofit Volunteer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Form Type Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-blue-900">
                {formTypeInfo.title}
              </h4>
              <p className="text-sm text-blue-700 mt-1">
                {formTypeInfo.description}
              </p>
              <div className="mt-3">
                <p className="text-sm font-medium text-blue-900 mb-2">
                  Required Checks:
                </p>
                <div className="flex flex-wrap gap-2">
                  {formTypeInfo.requiredChecks.map((check) => (
                    <Badge
                      key={check}
                      variant="outline"
                      className="text-xs bg-blue-100 text-blue-800 border-blue-300"
                    >
                      {check}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
