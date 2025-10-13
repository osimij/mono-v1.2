import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Construction, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { AnalyticsLayout } from "@/components/AnalyticsLayout";
import { PageHeader, PageSection, PageShell } from "@/components/layout/Page";

interface PlaceholderPageProps {
  title: string;
  description: string;
  icon: any;
  parentPath: string;
}

export function PlaceholderPage({ title, description, icon: Icon, parentPath }: PlaceholderPageProps) {
  const content = (
    <PageShell padding="lg" width="wide">
      <PageHeader
        title={title}
        description={description}
        eyebrow="Coming soon"
        className="items-start text-left"
        footer={
          <Link
            href={parentPath}
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>
              Back to{" "}
              {parentPath === "/data"
                ? "Data Factory"
                : parentPath === "/segmentation"
                  ? "Segmentation"
                  : parentPath === "/analysis"
                    ? "Analysis"
                    : parentPath === "/modeling"
                      ? "ML Modeling"
                      : parentPath === "/assistant"
                        ? "AI Assistant"
                        : "Dashboard"}
            </span>
          </Link>
        }
      />

      <PageSection surface="card" className="max-w-2xl self-center">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-muted text-primary">
            <Construction className="h-8 w-8" />
          </div>
          <CardTitle>Under construction</CardTitle>
          <CardDescription>
            This feature is currently in development and will be available soon.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-text-muted">
            We&apos;re working hard to deliver this experience. Check back later for updates or follow our release notes.
          </p>
          <div className="inline-flex items-center gap-2 rounded-full bg-surface-muted px-3 py-1 text-xs text-text-soft">
            <Icon className="h-4 w-4 text-primary" />
            {title}
          </div>
        </CardContent>
      </PageSection>
    </PageShell>
  );

  // Wrap in AnalyticsLayout if this is an analysis page
  if (parentPath === "/analysis") {
    return <AnalyticsLayout>{content}</AnalyticsLayout>;
  }

  return content;
}
