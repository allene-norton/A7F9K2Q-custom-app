'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '../ui/badge';
import { Plus, X } from 'lucide-react';
import { type FormType, BACKGROUND_CHECK_OPTIONS, BackgroundCheckFiles, BackgroundCheckFormData, BackgroundCheckFile } from '../../types';

interface CustomChecksSectionProps {
  formType: FormType;
  selectedChecks: string[];
  selectedClientId: string;
  backgroundCheckFiles: BackgroundCheckFiles;
  updateFormData: (updates: { backgroundChecks: string[], backgroundCheckFiles: BackgroundCheckFiles }) => void;
  onFileCreated?: (updateBackgroundCheckFile: BackgroundCheckFile) => void
  updateCheckFileStatus: (updatedFileInfo: BackgroundCheckFile,) => void
}

export function CustomChecksSection({
  formType,
  selectedChecks,
  selectedClientId,
  backgroundCheckFiles,
  updateCheckFileStatus,
  updateFormData,
}: CustomChecksSectionProps) {
  const [customCheckName, setCustomCheckName] = useState('');

  const predefinedChecks = BACKGROUND_CHECK_OPTIONS[formType];
  const customChecks = selectedChecks.filter(
    (checkName) => !(predefinedChecks as readonly string[]).includes(checkName),
  );

  const handleAddCustomCheck = () => {
  if (!customCheckName.trim()) return;
  const trimmedName = customCheckName.trim();
  
  // Check if check already exists
  if (selectedChecks.includes(trimmedName)) {
    return; // Could show error message here
  }
  
  // Add the custom check to selected checks AND create the corresponding file object
  const newChecks = [...selectedChecks, trimmedName];
  const newBackgroundCheckFile: BackgroundCheckFile = {
    checkName: trimmedName,
    fileUploaded: false,
    fileName: '',
    fileId: '',
  };
  
  updateFormData({ 
    backgroundChecks: newChecks,
    backgroundCheckFiles: [...backgroundCheckFiles, newBackgroundCheckFile]
  });
  
  console.log(`updateFormData called from CustomChecks setChecks`);
  setCustomCheckName('');
};

const handleRemoveCustomCheck = (checkToRemove: string) => {
  const newChecks = selectedChecks.filter((check) => check !== checkToRemove);
  const newBackgroundCheckFiles = backgroundCheckFiles.filter(
    (file) => file.checkName !== checkToRemove
  );
  
  updateFormData({ 
    backgroundChecks: newChecks,
    backgroundCheckFiles: newBackgroundCheckFiles
  });
  
  console.log(`updateFormData called from CustomChecks removechecks`);
};

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddCustomCheck();
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Plus className="w-5 h-5 text-green-600" />
            <CardTitle>Custom Background Checks</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            {customChecks.length} custom checks
          </Badge>
        </div>
        <CardDescription>
          Add additional background checks not listed in the standard options
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Add Custom Check Input */}
        <div className="space-y-4">
          <div className="flex space-x-2">
            <Input
              placeholder="Enter custom background check name"
              value={customCheckName}
              onChange={(e) => setCustomCheckName(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button
              onClick={handleAddCustomCheck}
              disabled={
                !customCheckName.trim() ||
                selectedChecks.includes(customCheckName.trim())
              }
              size="sm"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Check
            </Button>
          </div>

          {/* Display Custom Checks */}
          {customChecks.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-900">
                Added Custom Checks:
              </h4>
              <div className="flex flex-wrap gap-2">
                {customChecks.map((checkName) => { 
                  const fileInfo = backgroundCheckFiles.find(
                  (f) => f.checkName === checkName,
                );
                  return(
                  <Badge
                    key={checkName}
                    variant="secondary"
                    className="flex items-center space-x-1 py-1 px-2 bg-green-50 text-green-800 border-green-200"
                  >
                    <span className="text-sm">{checkName}</span>
                    {fileInfo?.fileUploaded && (
                            <Badge
                              variant="outline"
                              className="ml-2 text-xs bg-green-100 text-green-800 border-green-300"
                            >
                              File Uploaded
                            </Badge>)}
                    <button
                      onClick={() => handleRemoveCustomCheck(checkName)}
                      className="ml-1 hover:bg-green-200 rounded-full p-0.5 transition-colors"
                      aria-label={`Remove ${checkName}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )})}
              </div>
            </div>
          )}

          {customChecks.length === 0 && (
            <p className="text-sm text-gray-500 italic">
              No custom checks added yet. Use the input above to add additional
              background checks.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
