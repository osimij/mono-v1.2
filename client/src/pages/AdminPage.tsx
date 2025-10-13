import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, Database, Brain, MessageSquare, Download } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, PageSection, PageShell } from "@/components/layout/Page";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

interface AdminAnalytics {
  totalUsers: number;
  totalDatasets: number;
  totalModels: number;
  totalChats: number;
  activeSessions: number;
  userActivity: Array<{ date: string; users: number }>;
  featureUsage: Array<{ name: string; value: number; color: string }>;
}

interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isAdmin: boolean;
  createdAt?: string;
}

interface SystemHealthStats {
  databasePerformance: number;
  apiResponse: number;
  storageUsage: number;
  activeSessionsLoad: number;
}

interface StatCard {
  title: string;
  value: number;
  change: string;
  icon: typeof Users;
  accent: string;
}

interface SystemHealthMetric {
  label: string;
  value: number;
  progress?: number;
  isPercentage?: boolean;
}

export function AdminPage() {
  const [timeRange, setTimeRange] = useState("7d");

  // Fetch admin analytics
  const { data: analytics } = useQuery<AdminAnalytics>({
    queryKey: ["/api/admin/analytics", timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/admin/analytics?range=${timeRange}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch analytics');
      return response.json() as Promise<AdminAnalytics>;
    }
  });

  const { data: users = [] } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const response = await fetch('/api/admin/users', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json() as Promise<AdminUser[]>;
    }
  });

  const { data: systemStats } = useQuery<SystemHealthStats>({
    queryKey: ["/api/admin/system"],
    queryFn: async () => {
      const response = await fetch('/api/admin/system', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch system stats');
      return response.json() as Promise<SystemHealthStats>;
    }
  });

  const statsCards: StatCard[] = [
    {
      title: "Total Users",
      value: analytics?.totalUsers || 0,
      change: "+12.5%",
      icon: Users,
      accent: "bg-primary/10 text-primary"
    },
    {
      title: "Active Datasets",
      value: analytics?.totalDatasets || 0,
      change: "+8.2%",
      icon: Database,
      accent: "bg-success/10 text-success"
    },
    {
      title: "ML Models",
      value: analytics?.totalModels || 0,
      change: "+15.3%",
      icon: Brain,
      accent: "bg-accent/10 text-accent"
    },
    {
      title: "Chat Sessions",
      value: analytics?.totalChats || 0,
      change: "+23.1%",
      icon: MessageSquare,
      accent: "bg-warning/10 text-warning"
    }
  ];

  const userActivityData: AdminAnalytics["userActivity"] = analytics?.userActivity || [
    { date: '2024-01-01', users: 12 },
    { date: '2024-01-02', users: 15 },
    { date: '2024-01-03', users: 8 },
    { date: '2024-01-04', users: 22 },
    { date: '2024-01-05', users: 18 },
    { date: '2024-01-06', users: 25 },
    { date: '2024-01-07', users: 30 }
  ];

  const featureUsageData: AdminAnalytics["featureUsage"] =
    analytics?.featureUsage ||
    [
      { name: 'Data Upload', value: 35, color: '#3b82f6' },
      { name: 'AI Analysis', value: 28, color: '#10b981' },
      { name: 'Model Training', value: 22, color: '#8b5cf6' },
      { name: 'Chat Assistant', value: 15, color: '#f59e0b' }
    ];

  const systemHealthMetrics: SystemHealthMetric[] = [
    {
      label: "Database performance",
      value: systemStats?.databasePerformance ?? 92,
      progress: systemStats?.databasePerformance ?? 92,
      isPercentage: true
    },
    {
      label: "API response time",
      value: systemStats?.apiResponse ?? 85,
      progress: systemStats?.apiResponse ?? 85,
      isPercentage: true
    },
    {
      label: "Storage usage",
      value: systemStats?.storageUsage ?? 67,
      progress: systemStats?.storageUsage ?? 67,
      isPercentage: true
    },
    {
      label: "Active sessions",
      value: analytics?.activeSessions ?? 24,
      progress: systemStats?.activeSessionsLoad ?? 80,
      isPercentage: false
    }
  ];

  const exportAnalytics = () => {
    const data = {
      analytics,
      users: users.map((u) => ({ ...u, id: '[REDACTED]' })), // Anonymize IDs
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mono-ai-analytics-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const timeRanges = [
    { value: "1d", label: "Last 24 hours" },
    { value: "7d", label: "Last 7 days" },
    { value: "30d", label: "Last 30 days" },
    { value: "90d", label: "Last 90 days" }
  ];

  return (
    <PageShell padding="lg" width="wide">
      <PageHeader
        eyebrow="Administration"
        title="Admin console"
        description="Monitor usage, system health, and user activity across Mono."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="h-9 w-[170px]">
                <SelectValue placeholder="Time range" />
              </SelectTrigger>
              <SelectContent>
                {timeRanges.map((range) => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportAnalytics}>
              <Download className="mr-2 h-4 w-4" />
              Export data
            </Button>
          </div>
        }
      />

      <PageSection surface="transparent" contentClassName="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-text-muted">{stat.title}</p>
                    <p className="text-3xl font-semibold text-text-primary">
                      {stat.value.toLocaleString()}
                    </p>
                  </div>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${stat.accent}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-sm">
                  <span className="font-medium text-success">{stat.change}</span>
                  <span className="text-text-subtle">vs last period</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </PageSection>

      <PageSection surface="transparent" contentClassName="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>User activity</CardTitle>
            <CardDescription>Daily active accounts over the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={userActivityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" strokeOpacity={0.6} />
                  <YAxis strokeOpacity={0.6} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="users"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.25}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Feature usage</CardTitle>
            <CardDescription>Share of activity by product area</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={featureUsageData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="value"
                  >
                    {featureUsageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {featureUsageData.map((item, index) => (
                <div key={index} className="flex items-center justify-between text-sm text-text-soft">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex h-3 w-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span>{item.name}</span>
                  </div>
                  <span className="font-medium text-text-primary">{item.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </PageSection>

      <PageSection surface="transparent" contentClassName="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent users</CardTitle>
            <CardDescription>Latest accounts created across the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {users.slice(0, 10).map((user, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-xl border border-border/60 p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Users className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-text-primary">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-sm text-text-subtle">{user.email}</p>
                    </div>
                  </div>
                  <Badge variant={user.isAdmin ? "default" : "secondary"}>
                    {user.isAdmin ? "Admin" : "User"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System health</CardTitle>
            <CardDescription>Operational metrics for core services</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              {systemHealthMetrics.map((metric, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-text-soft">
                    <span className="capitalize">{metric.label}</span>
                    <span className="font-medium text-text-primary">
                      {metric.isPercentage !== false && typeof metric.value === "number"
                        ? `${metric.value}%`
                        : metric.value}
                    </span>
                  </div>
                  <Progress
                    value={
                      metric.progress ??
                      (typeof metric.value === "number" ? metric.value : 0)
                    }
                    className="h-2"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </PageSection>
    </PageShell>
  );
}
