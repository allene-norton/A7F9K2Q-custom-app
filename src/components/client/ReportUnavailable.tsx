import { AlertCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export function ReportUnavailable() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="rounded-full bg-amber-100 p-3">
              <AlertCircle className="h-8 w-8 text-amber-600" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-slate-900">Report Unavailable</h2>
              <p className="text-slate-600 leading-relaxed">
                Your background report is currently being prepared by the ClearTech team. You will be notified once your
                report is ready to view.
              </p>
            </div>

            <div className="w-full pt-4 border-t border-slate-200">
              <p className="text-sm text-slate-500">If you have questions, please contact your administrator.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
