'use client';

import { Label } from '@/components/ui/label';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Badge } from '../ui/badge';
import { Shield, AlertTriangle } from 'lucide-react';
import {
  type FormType,
  BACKGROUND_CHECK_OPTIONS,
  FORM_TYPE_INFO,
  BackgroundCheckFiles,
  BackgroundCheckFile,
  BackgroundCheckFormData,
} from '../../types';

interface BackgroundChecksSectionProps {
  formType: FormType;
  selectedChecks: string[];
  selectedClientId: string;
  backgroundCheckFiles: BackgroundCheckFiles;
  updateFormData: (updates: { backgroundChecks: string[], backgroundCheckFiles: BackgroundCheckFiles }) => void;
  onFileCreated?: (updateBackgroundCheckFile: BackgroundCheckFile) => void;
  updateCheckFileStatus: (updatedFileInfo: BackgroundCheckFile) => void;
}

export function BackgroundChecksSection({
  formType,
  selectedChecks,
  selectedClientId,
  backgroundCheckFiles,
  updateFormData,
  updateCheckFileStatus,
}: BackgroundChecksSectionProps) {
  const availableChecks = BACKGROUND_CHECK_OPTIONS[formType];

  const requiredChecks: readonly string[] =
    FORM_TYPE_INFO[formType].requiredChecks;
  
  const missingRequired = requiredChecks.filter(
    (check) => !selectedChecks.includes(check),
  );

  const handleCheckChange = (checkName: string, checked: boolean) => {
  const newChecks = checked
    ? [...selectedChecks, checkName]
    : selectedChecks.filter((check) => check !== checkName);
  
  // Create or remove corresponding backgroundCheckFile entries
  let newBackgroundCheckFiles = [...(backgroundCheckFiles || [])];
  
  if (checked) {
    // Add new file entry if it doesn't exist
    const existingFile = newBackgroundCheckFiles.find(f => f.checkName === checkName);
    if (!existingFile) {
      const newFile: BackgroundCheckFile = {
        checkName,
        fileName: '',
        fileUploaded: false,
        fileId: '',
      };
      newBackgroundCheckFiles.push(newFile);
    }
  } else {
    // Remove file entry when unchecking
    newBackgroundCheckFiles = newBackgroundCheckFiles.filter(f => f.checkName !== checkName);
  }
  
  updateFormData({ 
    backgroundChecks: newChecks,
    backgroundCheckFiles: newBackgroundCheckFiles
  });
  console.log(`updateFormData called from BackgroundChecks`);
};

const isRequired = (checkName: string) => requiredChecks.includes(checkName);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <CardTitle>Background Checks</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            {selectedChecks.length} of {availableChecks.length} selected
          </Badge>
        </div>
        <CardDescription>
          Select the background checks to perform for this{' '}
          {FORM_TYPE_INFO[formType].title.toLowerCase()}
        </CardDescription>
        {missingRequired.length > 0 && (
          <div className="flex items-start space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-yellow-800">
                Missing Required Checks
              </p>
              <p className="text-yellow-700">
                The following checks are required: {missingRequired.join(', ')}
              </p>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableChecks.map((checkName) => {
            const isChecked = selectedChecks.includes(checkName);
            const required = isRequired(checkName);
            const fileInfo = backgroundCheckFiles.find(
              (f) => f.checkName === checkName,
            );

            return (
              <div
                key={checkName}
                className={`flex items-start space-x-3 p-4 border rounded-lg transition-colors hover:bg-gray-50 ${
                  isChecked ? 'bg-blue-50 border-blue-200' : 'border-gray-200'
                } ${required ? 'ring-2 ring-yellow-200' : ''}`}
              >
                <Checkbox
                  id={`check-${checkName}`}
                  checked={isChecked}
                  onCheckedChange={(checked) =>
                    handleCheckChange(checkName, checked as boolean)
                  }
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <Label
                    htmlFor={`check-${checkName}`}
                    className={`text-sm font-medium cursor-pointer ${isChecked ? 'text-blue-900' : 'text-gray-900'}`}
                  >
                    {checkName}
                    {required && (
                      <Badge
                        variant="outline"
                        className="ml-2 text-xs bg-yellow-100 text-yellow-800 border-yellow-300"
                      >
                        Required
                      </Badge>
                    )}
                    {fileInfo?.fileUploaded && (
                      <Badge
                        variant="outline"
                        className="ml-2 text-xs bg-green-100 text-green-800 border-green-300"
                      >
                        File Uploaded
                      </Badge>
                    )}
                  </Label>
                  {fileInfo?.fileName && (
                    <p className="text-xs text-gray-500 mt-1">
                      {fileInfo.fileName}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
