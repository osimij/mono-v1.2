import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageHeader, PageSection, PageShell } from "@/components/layout/Page";
import {
  Trash2,
  Download,
  Save,
  AlertTriangle,
  Settings as SettingsIcon,
  Database,
  Bell,
  Link as LinkIcon,
  Key
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function SettingsPage() {
  const { toast } = useToast();

  const [autoSaveModels, setAutoSaveModels] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [notifications, setNotifications] = useState({
    modelCompleted: true,
    weeklyInsights: false,
    securityAlerts: true
  });

  const handleClearData = () => {
    if (
      window.confirm("Are you sure you want to clear all data? This action cannot be undone.")
    ) {
      toast({
        title: "Data cleared",
        description: "All datasets and models have been removed.",
        variant: "destructive"
      });
    }
  };

  const handleExportLogs = () => {
    toast({
      title: "Logs exported",
      description: "Activity logs have been downloaded successfully."
    });
  };

  const handleSaveWebhook = () => {
    toast({
      title: "Webhook saved",
      description: "Webhook URL has been updated successfully."
    });
  };

  const handleConnectGoogleSheets = () => {
    toast({
      title: "Google Sheets integration",
      description: "OAuth flow would be initiated here in a real application."
    });
  };

  const sections = [
    {
      title: "Appearance",
      icon: SettingsIcon,
      description: "Mono automatically follows your system appearance.",
      content: (
        <div className="rounded-lg border border-border/60 bg-surface-muted/60 p-4 text-sm text-text-muted">
          Mono mirrors your device’s light or dark mode automatically. Change your system preference to switch themes.
        </div>
      )
    },
    {
      title: "Data management",
      icon: Database,
      description: "Control retention and export of your datasets and models.",
      content: (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-border/60 pb-4">
            <div className="space-y-1">
              <Label className="text-base font-medium text-text-primary">Auto-save models</Label>
              <p className="text-sm text-text-muted">
                Automatically add trained models to your profile for reuse.
              </p>
            </div>
            <Switch checked={autoSaveModels} onCheckedChange={setAutoSaveModels} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4">
            <div className="space-y-1">
              <Label className="text-base font-medium text-text-primary">Clear all data</Label>
              <p className="text-sm text-text-muted">
                Permanently remove uploaded datasets and trained models.
              </p>
            </div>
            <Button variant="destructive" onClick={handleClearData} className="gap-2">
              <Trash2 className="h-4 w-4" />
              Clear data
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <Label className="text-base font-medium text-text-primary">Export logs</Label>
              <p className="text-sm text-text-muted">
                Download recent activity logs for troubleshooting.
              </p>
            </div>
            <Button variant="outline" onClick={handleExportLogs} className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
      )
    },
    {
      title: "Integrations",
      icon: LinkIcon,
      description: "Connect external tooling for faster workflows.",
      content: (
        <div className="space-y-6">
          <div>
            <Label className="text-base font-medium text-text-primary">
              Google Sheets integration
            </Label>
            <p className="mb-3 text-sm text-text-muted">
              Connect Google Sheets to sync data sources automatically.
            </p>
            <Button onClick={handleConnectGoogleSheets} className="gap-2">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Connect Google Sheets
            </Button>
          </div>

          <div>
            <Label htmlFor="webhook" className="text-base font-medium text-text-primary">
              Webhook URL
            </Label>
            <p className="mb-3 text-sm text-text-muted">
              Receive notifications when models complete training.
            </p>
            <div className="flex flex-wrap gap-3">
              <Input
                id="webhook"
                type="url"
                placeholder="https://your-webhook-url.com"
                value={webhookUrl}
                onChange={(event) => setWebhookUrl(event.target.value)}
                className="flex-1"
              />
              <Button onClick={handleSaveWebhook} variant="outline" className="gap-2">
                <Save className="h-4 w-4" />
                Save
              </Button>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Notifications",
      icon: Bell,
      description: "Choose which email alerts you want to receive.",
      content: (
        <div className="space-y-4">
          <Label className="text-base font-medium text-text-primary">Email alerts</Label>
          <div className="space-y-3">
            <NotificationToggle
              id="model-completed"
              label="Model training completed"
              checked={notifications.modelCompleted}
              onChange={(checked) =>
                setNotifications((prev) => ({ ...prev, modelCompleted: checked }))
              }
            />
            <NotificationToggle
              id="weekly-insights"
              label="Weekly data insights"
              checked={notifications.weeklyInsights}
              onChange={(checked) =>
                setNotifications((prev) => ({ ...prev, weeklyInsights: checked }))
              }
            />
            <NotificationToggle
              id="security-alerts"
              label="Security alerts"
              checked={notifications.securityAlerts}
              onChange={(checked) =>
                setNotifications((prev) => ({ ...prev, securityAlerts: checked }))
              }
            />
          </div>
        </div>
      )
    },
    {
      title: "API configuration",
      icon: Key,
      description: "Manage API access and monitor integration status.",
      content: (
        <div className="space-y-6">
          <Alert>
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertDescription className="text-sm text-text-primary">
              API keys are managed through environment variables for security. Contact your system
              administrator to update API configurations.
            </AlertDescription>
          </Alert>

          <div>
            <Label className="text-base font-medium text-text-primary">OpenAI connection</Label>
            <p className="mb-2 text-sm text-text-muted">
              Current status of AI assistant integration.
            </p>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-2 w-2 rounded-full bg-success" />
              <span className="text-sm font-medium text-success">Connected</span>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <PageShell padding="lg" width="wide">
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Manage theme preferences, data retention, and integrations for Mono."
      />

      <PageSection surface="transparent" contentClassName="grid gap-6">
        {sections.map((section) => (
          <Card key={section.title} className="border border-border/60 shadow-sm">
            <CardHeader className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-text-primary">
                <section.icon className="h-5 w-5 text-primary" />
                <CardTitle>{section.title}</CardTitle>
              </div>
              <p className="text-sm text-text-muted">{section.description}</p>
            </CardHeader>
            <CardContent>{section.content}</CardContent>
          </Card>
        ))}
      </PageSection>
    </PageShell>
  );
}

interface NotificationToggleProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function NotificationToggle({
  id,
  label,
  checked,
  onChange
}: NotificationToggleProps) {
  return (
    <div className="flex items-center gap-3">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onChange(Boolean(value))}
      />
      <Label htmlFor={id} className="text-sm font-normal text-text-primary">
        {label}
      </Label>
    </div>
  );
}
