"use client"

import { Badge } from "../ui/badge"
import { CheckCircle, Clock, XCircle } from "lucide-react"
import type { Status } from "../../types"

interface StatusBadgeProps {
  status: Status
  size?: "sm" | "md" | "lg"
  showIcon?: boolean
  className?: string
}

export function StatusBadge({ status, size = "md", showIcon = true, className = "" }: StatusBadgeProps) {
  const statusConfig = {
    cleared: {
      label: "Cleared",
      icon: CheckCircle,
      variant: "default" as const,
      className: "bg-green-100 text-green-800 border-green-300 hover:bg-green-200",
    },
    pending: {
      label: "Pending",
      icon: Clock,
      variant: "secondary" as const,
      className: "bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200",
    },
    denied: {
      label: "Denied",
      icon: XCircle,
      variant: "destructive" as const,
      className: "bg-red-100 text-red-800 border-red-300 hover:bg-red-200",
    },
  }

  const config = statusConfig[status]
  const Icon = config.icon

  const sizeClasses = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-2.5 py-1.5",
    lg: "text-base px-3 py-2",
  }

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  }

  return (
    <Badge
      variant={config.variant}
      className={`${config.className} ${sizeClasses[size]} ${className} inline-flex items-center space-x-1.5 font-medium border`}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      <span>{config.label}</span>
    </Badge>
  )
}
