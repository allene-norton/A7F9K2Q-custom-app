"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Label } from "../ui/label"
import { Textarea } from "../ui/textarea"
import { RadioGroup, RadioGroupItem } from "../ui/radio-group"
import { Badge } from "../ui/badge"
import { CheckCircle, Clock, XCircle, FileText } from "lucide-react"
import type { Status } from "../../types"

interface StatusSectionProps {
  status: Status
  memo: string | undefined
  updateFormData: (updates: { status?: Status; memo?: string }) => void
}

export function StatusSection({ status, memo, updateFormData }: StatusSectionProps) {
  const statusOptions = [
    {
      value: "cleared" as const,
      label: "Cleared",
      description: "Background check passed all requirements",
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
    },
    {
      value: "pending" as const,
      label: "Pending",
      description: "Background check is in progress",
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200",
    },
    {
      value: "denied" as const,
      label: "Denied",
      description: "Background check failed requirements",
      icon: XCircle,
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
    },
  ]

  const selectedOption = statusOptions.find((option) => option.value === status)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {selectedOption && <selectedOption.icon className={`w-5 h-5 ${selectedOption.color}`} />}
            <CardTitle>Status & Notes</CardTitle>
          </div>
          <Badge
            variant={status === "cleared" ? "default" : status === "pending" ? "secondary" : "destructive"}
            className={
              status === "cleared"
                ? "bg-green-100 text-green-800"
                : status === "pending"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-red-100 text-red-800"
            }
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        </div>
        <CardDescription>Set the current status of the background check and add any additional notes</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Selection */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Background Check Status</Label>
          <RadioGroup
            value={status}
            onValueChange={(value: Status) => updateFormData({ status: value })}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            {statusOptions.map((option) => {
              const Icon = option.icon
              return (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.value} id={option.value} className="sr-only" />
                  <Label
                    htmlFor={option.value}
                    className={`flex-1 flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                      status === option.value
                        ? `${option.bgColor} ${option.borderColor} shadow-sm`
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <Icon className={`w-5 h-5 mt-0.5 ${status === option.value ? option.color : "text-gray-400"}`} />
                    <div className="flex-1">
                      <div className={`font-medium ${status === option.value ? option.color : "text-gray-900"}`}>
                        {option.label}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">{option.description}</div>
                    </div>
                  </Label>
                </div>
              )
            })}
          </RadioGroup>
        </div>

        {/* Memo Section */}
        <div className="space-y-2">
          <Label htmlFor="memo" className="flex items-center space-x-2">
            <FileText className="w-4 h-4" />
            <span>Additional Notes</span>
          </Label>
          <Textarea
            id="memo"
            value={memo}
            onChange={(e) => updateFormData({ memo: e.target.value })}
            placeholder="Add any additional notes, observations, or special circumstances..."
            rows={4}
            className="resize-none"
          />
          <p className="text-sm text-gray-500">These notes will be included in the final background check report.</p>
        </div>
      </CardContent>
    </Card>
  )
}
