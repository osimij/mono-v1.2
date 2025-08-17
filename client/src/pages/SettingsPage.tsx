import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTheme } from "next-themes";
import { 
  Moon, 
  Sun, 
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
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  
  const [autoSaveModels, setAutoSaveModels] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [notifications, setNotifications] = useState({
    modelCompleted: true,
    weeklyInsights: false,
    securityAlerts: true
  });

  const handleClearData = () => {
    if (window.confirm("Are you sure you want to clear all data? This action cannot be undone.")) {
      // In a real app, this would call an API endpoint
      toast({
        title: "Data cleared",
        description: "All datasets and models have been removed.",
        variant: "destructive"
      });
    }
  };

  const handleExportLogs = () => {
    // In a real app, this would generate and download logs
    toast({
      title: "Logs exported",
      description: "Activity logs have been downloaded successfully."
    });
  };

  const handleSaveWebhook = () => {
    // In a real app, this would save to backend
    toast({
      title: "Webhook saved",
      description: "Webhook URL has been updated successfully."
    });
  };

  const handleConnectGoogleSheets = () => {
    // In a real app, this would initiate OAuth flow
    toast({
      title: "Google Sheets integration",
      description: "OAuth flow would be initiated here in a real application."
    });
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
        </div>

        <div className="space-y-6">
          {/* Appearance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <SettingsIcon className="w-5 h-5" />
                <span>Appearance</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">Dark Mode</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Toggle between light and dark themes
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Sun className="h-4 w-4" />
                    <Switch
                      checked={theme === "dark"}
                      onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                    />
                    <Moon className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="w-5 h-5" />
                <span>Data Management</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                  <div>
                    <Label className="text-base font-medium">Auto-save Models</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Automatically save trained models to profile
                    </p>
                  </div>
                  <Switch
                    checked={autoSaveModels}
                    onCheckedChange={setAutoSaveModels}
                  />
                </div>
                
                <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                  <div>
                    <Label className="text-base font-medium">Clear All Data</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Remove all uploaded datasets and models
                    </p>
                  </div>
                  <Button 
                    variant="destructive" 
                    onClick={handleClearData}
                    className="flex items-center space-x-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Clear Data</span>
                  </Button>
                </div>
                
                <div className="flex items-center justify-between py-3">
                  <div>
                    <Label className="text-base font-medium">Export Logs</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Download activity logs for troubleshooting
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={handleExportLogs}
                    className="flex items-center space-x-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Integrations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <LinkIcon className="w-5 h-5" />
                <span>Integrations</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <Label className="text-base font-medium">Google Sheets Integration</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    Connect your Google Sheets for automatic data sync
                  </p>
                  <Button 
                    onClick={handleConnectGoogleSheets}
                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span>Connect Google Sheets</span>
                  </Button>
                </div>
                
                <div>
                  <Label htmlFor="webhook" className="text-base font-medium">Webhook URL</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    Receive notifications when models complete training
                  </p>
                  <div className="flex space-x-3">
                    <Input
                      id="webhook"
                      type="url"
                      placeholder="https://your-webhook-url.com"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={handleSaveWebhook} variant="outline">
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="w-5 h-5" />
                <span>Notifications</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Label className="text-base font-medium">Email Notifications</Label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="model-completed"
                      checked={notifications.modelCompleted}
                      onCheckedChange={(checked) => 
                        setNotifications(prev => ({ ...prev, modelCompleted: checked as boolean }))
                      }
                    />
                    <Label htmlFor="model-completed" className="text-sm font-normal">
                      Model training completed
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="weekly-insights"
                      checked={notifications.weeklyInsights}
                      onCheckedChange={(checked) => 
                        setNotifications(prev => ({ ...prev, weeklyInsights: checked as boolean }))
                      }
                    />
                    <Label htmlFor="weekly-insights" className="text-sm font-normal">
                      Weekly data insights
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="security-alerts"
                      checked={notifications.securityAlerts}
                      onCheckedChange={(checked) => 
                        setNotifications(prev => ({ ...prev, securityAlerts: checked as boolean }))
                      }
                    />
                    <Label htmlFor="security-alerts" className="text-sm font-normal">
                      Security alerts
                    </Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* API Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Key className="w-5 h-5" />
                <span>API Configuration</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  API keys are managed through environment variables for security. 
                  Contact your system administrator to update API configurations.
                </AlertDescription>
              </Alert>
              
              <div className="mt-4">
                <Label className="text-base font-medium">OpenAI API Status</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  Current status of AI assistant integration
                </p>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-green-600 dark:text-green-400">Connected</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
