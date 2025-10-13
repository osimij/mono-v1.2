import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, PageSection, PageShell } from "@/components/layout/Page";
import { Bot, Database, MessageSquare, Download, Trash2, Eye, Calendar, FileText, Clock } from "lucide-react";
import { api } from "@/lib/api";
import { Model, Dataset, ChatSession } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const MODEL_TYPE_STYLES: Record<
  string,
  {
    label: string;
    className: string;
  }
> = {
  classification: {
    label: "Classification",
    className: "bg-primary/10 text-primary"
  },
  regression: {
    label: "Regression",
    className: "bg-success/10 text-success"
  },
  time_series: {
    label: "Time Series",
    className: "bg-accent/10 text-accent"
  }
};

const ACCURACY_TOKENS = {
  excellent: "text-success",
  good: "text-warning",
  poor: "text-danger",
  neutral: "text-text-subtle"
} as const;

export function ProfilePage() {
  const [activeTab, setActiveTab] = useState("models");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: models = [], isLoading: modelsLoading } = useQuery({
    queryKey: ["/api/models"],
    queryFn: api.models.getAll
  });

  const { data: datasets = [], isLoading: datasetsLoading } = useQuery({
    queryKey: ["/api/datasets"],
    queryFn: api.datasets.getAll
  });

  const { data: chatSessions = [], isLoading: chatLoading } = useQuery({
    queryKey: ["/api/chat-sessions"],
    queryFn: api.chat.getSessions
  });

  const deleteModelMutation = useMutation({
    mutationFn: (id: number) => api.models.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/models"] });
      toast({
        title: "Model deleted",
        description: "The model has been removed."
      });
    },
    onError: () => {
      toast({
        title: "Delete failed",
        description: "Unable to delete the model. Try again shortly.",
        variant: "destructive"
      });
    }
  });

  const deleteDatasetMutation = useMutation({
    mutationFn: (id: number) => api.datasets.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/datasets"] });
      toast({
        title: "Dataset deleted",
        description: "The dataset has been removed."
      });
    },
    onError: () => {
      toast({
        title: "Delete failed",
        description: "Unable to delete the dataset. Try again shortly.",
        variant: "destructive"
      });
    }
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const sizeUnits = ["Bytes", "KB", "MB", "GB"];
    const index = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${parseFloat((bytes / Math.pow(1024, index)).toFixed(2))} ${sizeUnits[index]}`;
  };

  const getModelTypeBadge = (type: string) => {
    const fallback = {
      label: type.replace(/_/g, " "),
      className: "bg-surface-muted text-text-soft"
    };
    return MODEL_TYPE_STYLES[type] ?? fallback;
  };

  const getAccuracyTone = (accuracy?: string) => {
    if (!accuracy) return ACCURACY_TOKENS.neutral;
    const value = parseFloat(accuracy);
    if (Number.isNaN(value)) return ACCURACY_TOKENS.neutral;
    if (value >= 90) return ACCURACY_TOKENS.excellent;
    if (value >= 80) return ACCURACY_TOKENS.good;
    return ACCURACY_TOKENS.poor;
  };

  const renderModelCard = (model: Model) => {
    const typeStyle = getModelTypeBadge(model.type);
    return (
      <Card key={model.id} className="transition-shadow hover:shadow-sm">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-lg text-text-primary">{model.name}</CardTitle>
              <p className="text-sm text-text-subtle">
                {model.createdAt && format(new Date(model.createdAt), "MMM dd, yyyy")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-danger hover:text-danger/80"
                onClick={() => deleteModelMutation.mutate(model.id)}
                disabled={deleteModelMutation.isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <InfoRow label="Type">
            <Badge className={typeStyle.className}>{typeStyle.label}</Badge>
          </InfoRow>
          <InfoRow label="Accuracy">
            <span className={`text-sm font-medium ${getAccuracyTone(model.accuracy)}`}>
              {model.accuracy ? `${parseFloat(model.accuracy).toFixed(1)}%` : "N/A"}
            </span>
          </InfoRow>
          <InfoRow label="Algorithm">
            <span className="text-sm font-medium text-text-primary">
              {model.algorithm.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())}
            </span>
          </InfoRow>
          <InfoRow label="Target">
            <span className="text-sm font-medium text-text-primary">{model.targetColumn}</span>
          </InfoRow>
          <Button className="mt-4 w-full" variant="outline">
            Load model
          </Button>
        </CardContent>
      </Card>
    );
  };

  const renderDatasetCard = (dataset: Dataset) => {
    const isCsv = dataset.originalName.toLowerCase().endsWith(".csv");
    return (
      <Card key={dataset.id}>
        <CardContent className="flex flex-col gap-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {isCsv ? <FileText className="h-6 w-6" /> : <Database className="h-6 w-6" />}
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-text-primary">{dataset.originalName}</h3>
                <p className="text-sm text-text-muted">
                  {dataset.uploadedAt && format(new Date(dataset.uploadedAt), "MMM dd, yyyy")} ·{" "}
                  {dataset.rowCount.toLocaleString()} rows · {dataset.columns.length} columns ·{" "}
                  {formatFileSize(dataset.fileSize)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon">
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-danger hover:text-danger/80"
                onClick={() => deleteDatasetMutation.mutate(dataset.id)}
                disabled={deleteDatasetMutation.isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderChatCard = (session: ChatSession) => (
    <Card key={session.id} className="transition-shadow hover:shadow-sm">
      <CardContent className="flex flex-col gap-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 text-text-primary">
              <MessageSquare className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-text-primary">{session.title}</h3>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-text-muted">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {session.createdAt && format(new Date(session.createdAt), "MMM dd, yyyy")}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {(session.messages?.length || 0).toLocaleString()} messages
              </span>
            </div>
            {session.messages && session.messages.length > 0 ? (
              <p className="text-sm text-text-soft line-clamp-2">
                Last message:{" "}
                {session.messages[session.messages.length - 1]?.content?.slice(0, 120) || ""}…
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation(`/assistant?session=${session.id}`)}
            >
              View chat
            </Button>
            <Button variant="ghost" size="icon" className="text-danger hover:text-danger/80">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <PageShell padding="lg" width="wide">
      <PageHeader
        eyebrow="Account"
        title="Your workspace"
        description="Manage saved models, datasets, and conversations across Mono."
      />

      <PageSection surface="transparent">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-surface-muted">
            <TabsTrigger value="models" className="flex items-center justify-center gap-2">
              <Bot className="h-4 w-4" />
              <span>Models</span>
            </TabsTrigger>
            <TabsTrigger value="datasets" className="flex items-center justify-center gap-2">
              <Database className="h-4 w-4" />
              <span>Datasets</span>
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center justify-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span>Chat history</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="models">
            {modelsLoading ? (
              <LoadingState message="Loading models…" />
            ) : models.length === 0 ? (
              <EmptyState
                icon={Bot}
                title="No models yet"
                description="Train your first model to see it here."
                action={{ label: "Start modeling" }}
              />
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {models.map(renderModelCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="datasets">
            {datasetsLoading ? (
              <LoadingState message="Loading datasets…" />
            ) : datasets.length === 0 ? (
              <EmptyState
                icon={Database}
                title="No datasets uploaded"
                description="Upload your first dataset to get started."
                action={{ label: "Upload data" }}
              />
            ) : (
              <div className="space-y-4">{datasets.map(renderDatasetCard)}</div>
            )}
          </TabsContent>

          <TabsContent value="chat">
            {chatLoading ? (
              <LoadingState message="Loading chat history…" />
            ) : chatSessions.length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                title="No chat history"
                description="Start a conversation with the AI assistant."
                action={{ label: "Open assistant" }}
              />
            ) : (
              <div className="space-y-4">{chatSessions.map(renderChatCard)}</div>
            )}
          </TabsContent>
        </Tabs>
      </PageSection>
    </PageShell>
  );
}

interface InfoRowProps {
  label: string;
  children: React.ReactNode;
}

function InfoRow({ label, children }: InfoRowProps) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-text-muted">{label}</span>
      {children}
    </div>
  );
}

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: { label: string };
}

function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-muted text-primary">
          <Icon className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
          <p className="text-sm text-text-muted">{description}</p>
        </div>
        {action ? (
          <Button variant="outline">
            {action.label}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

interface LoadingStateProps {
  message: string;
}

function LoadingState({ message }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center text-text-muted">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}
