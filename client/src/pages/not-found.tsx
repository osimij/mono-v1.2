import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-surface">
      <Card className="w-full max-w-md border border-border/60 shadow-sm">
        <CardContent className="space-y-4 p-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-danger/10 text-danger">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-semibold text-text-primary">404 — Page not found</h1>
          <p className="text-sm text-text-muted">
            We couldn&apos;t locate that route. Double-check the URL or return to the dashboard.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
