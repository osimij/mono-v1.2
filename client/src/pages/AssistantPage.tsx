import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ChatInterface } from "@/components/ChatInterface";
import { api } from "@/lib/api";
import { ChatMessage, ChatSession, Dataset } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Bot, Database, Loader2, Menu, Plus, Sparkles } from "lucide-react";
import { PageShell } from "@/components/layout/Page";

const DEFAULT_SESSION_TITLE = "AI Data Assistant";

const formatNumber = (value?: number | null) => {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return "—";
  }
  return new Intl.NumberFormat().format(Number(value));
};

const formatFileSize = (bytes?: number | null) => {
  if (bytes === undefined || bytes === null || Number.isNaN(Number(bytes))) {
    return "—";
  }
  if (bytes === 0) {
    return "0 B";
  }
  const units = ["B", "KB", "MB", "GB", "TB"];
  const magnitude = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const size = bytes / Math.pow(1024, magnitude);
  const precision = size >= 100 ? 0 : size >= 10 ? 1 : 2;
  return `${size.toFixed(precision)} ${units[magnitude]}`;
};

const parseStoredMessages = (raw: unknown): ChatMessage[] => {
  if (!raw) {
    return [];
  }

  if (Array.isArray(raw)) {
    return raw as ChatMessage[];
  }

  if (typeof raw === "string" && raw.trim().length) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed as ChatMessage[];
      }
    } catch {
      return [];
    }
  }

  return [];
};

const coerceDateValue = (value?: string | Date | null): Date | null => {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getDatasetSuggestions = (dataset?: Dataset | null): string[] => {
  if (!dataset) {
    return [
      "What insights can you surface from my data?",
      "Help me explore patterns worth investigating",
      "Suggest visualizations that clarify my metrics",
    ];
  }

  const columns = (dataset.columns ?? []).map((column) => column.toLowerCase());
  const hasColumns = (...keywords: string[]) =>
    columns.some((column) => keywords.some((keyword) => column.includes(keyword)));

  if (hasColumns("revenue", "sale", "order", "customer", "price", "product")) {
    return [
      "Which customer segments drive the most revenue?",
      "Show month-over-month sales trends with context",
      "Identify underperforming products that need attention",
    ];
  }

  if (hasColumns("transaction", "payment", "balance", "invoice", "ledger")) {
    return [
      "Highlight unusual payment patterns worth reviewing",
      "Break down transactions by category and amount",
      "What recurring cash-flow signals stand out?",
    ];
  }

  if (hasColumns("employee", "salary", "department", "role", "tenure", "performance")) {
    return [
      "Summarize employee performance by department",
      "Spot retention risks across teams",
      "Compare compensation against performance outcomes",
    ];
  }

  if (hasColumns("ticket", "issue", "support", "response", "customer", "csat")) {
    return [
      "Diagnose support response time bottlenecks",
      "Summarize the most common ticket themes",
      "How is customer satisfaction trending over time?",
    ];
  }

  return [
    "Summarize the key signals in this dataset",
    "Which fields correlate the most and why?",
    "Suggest visualizations that reveal outliers",
  ];
};

export function AssistantPage() {
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("none");
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const searchParams = useSearch();

  const sessionIdFromUrl = useMemo(() => {
    try {
      const params = new URLSearchParams(searchParams);
      return params.get("session");
    } catch {
      return null;
    }
  }, [searchParams]);

  const {
    data: datasets = [],
    isLoading: datasetsLoading,
    isError: isDatasetError,
  } = useQuery<Dataset[]>({
    queryKey: ["/api/datasets"],
    queryFn: api.datasets.getAll,
  });

  const {
    data: sessions = [],
    isLoading: sessionsLoading,
    isError: isSessionError,
  } = useQuery<ChatSession[]>({
    queryKey: ["/api/chat-sessions"],
    queryFn: api.chat.getSessions,
  });

  const selectedDataset = useMemo(
    () =>
      selectedDatasetId === "none"
        ? undefined
        : datasets.find((dataset) => dataset.id.toString() === selectedDatasetId),
    [datasets, selectedDatasetId],
  );

  useEffect(() => {
    if (selectedDatasetId === "none") {
      return;
    }

    const stillExists = datasets.some((dataset) => dataset.id.toString() === selectedDatasetId);
    if (!stillExists) {
      setSelectedDatasetId("none");
    }
  }, [datasets, selectedDatasetId]);

  const updateSessionUrl = useCallback((sessionId?: number) => {
    if (typeof window === "undefined") {
      return;
    }
    const basePath = window.location.pathname.split("?")[0];
    const query = sessionId ? `?session=${sessionId}` : "";
    window.history.replaceState({}, "", `${basePath}${query}`);
  }, []);

  const loadSessionState = useCallback(
    (
      session: ChatSession,
      options: { pushHistory?: boolean; overrideMessages?: ChatMessage[] } = {},
    ) => {
      if (!session) {
        return;
      }

      setCurrentSession(session);
      const parsed = options.overrideMessages ?? parseStoredMessages(session.messages);
      setMessages(parsed);

      if (options.pushHistory !== false) {
        updateSessionUrl(session.id);
      }
    },
    [updateSessionUrl],
  );

  const sessionSummaries = useMemo(() => {
    if (!Array.isArray(sessions)) {
      return [];
    }

    return [...sessions]
      .map((session) => {
        const parsedMessages = parseStoredMessages(session.messages);
        const lastMessage = parsedMessages.length
          ? parsedMessages[parsedMessages.length - 1]
          : undefined;
        const lastActivity =
          (lastMessage?.timestamp
            ? coerceDateValue(lastMessage.timestamp)
            : coerceDateValue(session.createdAt)) ?? null;

        return {
          session,
          parsedMessages,
          messageCount: parsedMessages.length,
          lastActivity,
        };
      })
      .sort((a, b) => {
        const aTime =
          a.lastActivity?.getTime() ?? coerceDateValue(a.session.createdAt)?.getTime() ?? 0;
        const bTime =
          b.lastActivity?.getTime() ?? coerceDateValue(b.session.createdAt)?.getTime() ?? 0;

        if (aTime === bTime) {
          return b.session.id - a.session.id;
        }

        return bTime - aTime;
      });
  }, [sessions]);

  const currentSessionId = currentSession?.id;

  useEffect(() => {
    if (!sessionSummaries.length) {
      setCurrentSession(null);
      setMessages([]);
      updateSessionUrl(undefined);
      return;
    }

    const requestedSessionId = sessionIdFromUrl ? Number(sessionIdFromUrl) : undefined;
    const resolvedRequested = requestedSessionId
      ? sessionSummaries.find(({ session }) => session.id === requestedSessionId)
      : undefined;
    const resolvedCurrent = currentSessionId
      ? sessionSummaries.find(({ session }) => session.id === currentSessionId)
      : undefined;

    const nextSession = resolvedRequested ?? resolvedCurrent ?? sessionSummaries[0];

    if (!currentSessionId || currentSessionId !== nextSession.session.id) {
      loadSessionState(nextSession.session, {
        pushHistory: false,
        overrideMessages: nextSession.parsedMessages,
      });
    }
  }, [
    sessionSummaries,
    sessionIdFromUrl,
    currentSessionId,
    loadSessionState,
    updateSessionUrl,
  ]);

  const datasetSuggestions = useMemo(
    () => getDatasetSuggestions(selectedDataset),
    [selectedDataset],
  );

  const createSessionMutation = useMutation({
    mutationFn: async (title: string) => {
      const response = await api.chat.createSession(title);
      return response.json();
    },
    onSuccess: (session: ChatSession) => {
      loadSessionState(session, {
        overrideMessages: parseStoredMessages(session.messages),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/chat-sessions"] });
    },
    onError: (error: unknown) => {
      toast({
        title: "Couldn't start a new chat",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred while creating the session.",
        variant: "destructive",
      });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({
      message,
      sessionId,
      datasetId,
    }: {
      message: string;
      sessionId: number;
      datasetId?: number;
    }) => {
      const response = await api.chat.sendMessage(sessionId, message, datasetId);
      return response.json();
    },
    onSuccess: (data: any) => {
      const normalizedMessages = parseStoredMessages(
        data?.session?.messages ?? data?.messages ?? [],
      );

      if (data?.session) {
        loadSessionState(
          {
            ...data.session,
            messages: data.session.messages ?? normalizedMessages,
          },
          {
            pushHistory: false,
            overrideMessages: normalizedMessages,
          },
        );
      } else if (normalizedMessages.length) {
        setMessages(normalizedMessages);
      } else if (data?.message) {
        setMessages((prev) => [...prev, data.message as ChatMessage]);
      }

      queryClient.invalidateQueries({ queryKey: ["/api/chat-sessions"] });
    },
    onError: (error: unknown) => {
      toast({
        title: "Message failed",
        description:
          error instanceof Error
            ? error.message
            : "We couldn't deliver that message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = useCallback(
    async (rawMessage: string) => {
      const message = rawMessage.trim();
      if (!message) {
        return;
      }

      let session = currentSession;
      if (!session) {
        try {
          session = await createSessionMutation.mutateAsync("New Analysis Session");
        } catch {
          return;
        }
      }

      if (!session) {
        return;
      }

      let pendingUserMessage: ChatMessage | null = null;

      try {
        pendingUserMessage = {
          id: `user-${Date.now()}`,
          role: "user",
          content: message,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, pendingUserMessage as ChatMessage]);
        setIsLoading(true);

        await sendMessageMutation.mutateAsync({
          message,
          sessionId: session.id,
          datasetId: selectedDatasetId !== "none" ? Number(selectedDatasetId) : undefined,
        });
      } catch (error) {
        if (pendingUserMessage) {
          const failedId = pendingUserMessage.id;
          setMessages((prev) => prev.filter((msg) => msg.id !== failedId));
        }

        toast({
          title: "Message failed",
          description:
            error instanceof Error
              ? error.message
              : "We couldn't deliver that message. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [
      currentSession,
      createSessionMutation,
      sendMessageMutation,
      selectedDatasetId,
      toast,
    ],
  );

  const handleCreateNewChat = useCallback(async () => {
    try {
      await createSessionMutation.mutateAsync("AI Data Analysis Chat");
      setIsMobileSidebarOpen(false);
    } catch {
      // Error handling is managed by the mutation's onError.
    }
  }, [createSessionMutation]);

  const handleSelectSession = useCallback(
    (session: ChatSession, overrideMessages?: ChatMessage[]) => {
      loadSessionState(session, { overrideMessages });
      setIsMobileSidebarOpen(false);
    },
    [loadSessionState],
  );

  const renderDatasetSelect = useCallback(
    (id: string) => (
      <div className="space-y-2">
        <label
          htmlFor={id}
          className="text-xs font-semibold uppercase tracking-wide text-text-soft"
        >
          Active dataset
        </label>
        <Select
          value={selectedDatasetId}
          onValueChange={setSelectedDatasetId}
          disabled={datasetsLoading || (!datasetsLoading && datasets.length === 0)}
        >
          <SelectTrigger id={id} className="h-9 w-full text-sm">
            <SelectValue
              placeholder={
                datasetsLoading ? "Loading datasets..." : "Select a dataset to ground answers"
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No dataset</SelectItem>
            {datasets.map((dataset) => (
              <SelectItem key={dataset.id} value={dataset.id.toString()}>
                {dataset.originalName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isDatasetError && (
          <p className="text-xs text-destructive">
            We couldn't load datasets. Refresh the page to try again.
          </p>
        )}
      </div>
    ),
    [datasets, datasetsLoading, isDatasetError, selectedDatasetId],
  );

  const datasetMetrics = useMemo(() => {
    if (!selectedDataset) {
      return [];
    }

    const metrics: { label: string; value: string }[] = [
      { label: "Rows", value: formatNumber(selectedDataset.rowCount) },
      { label: "Columns", value: formatNumber(selectedDataset.columns?.length ?? 0) },
    ];

    if (selectedDataset.fileSize) {
      metrics.push({ label: "Size", value: formatFileSize(selectedDataset.fileSize) });
    }

    return metrics;
  }, [selectedDataset]);

  const columnNames = selectedDataset?.columns ?? [];

  const sidebarContent = (
    <div className="flex h-full flex-col gap-6">
      <section className="space-y-4">
        <div className="flex items-start gap-3">
          <span className="rounded-lg bg-primary/10 p-2 text-primary" aria-hidden="true">
            <Database className="h-5 w-5" />
          </span>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-text-primary">Dataset context</p>
            <p className="text-xs text-text-muted">
              Connect a dataset to ground every response in your own tables.
            </p>
          </div>
        </div>
        {renderDatasetSelect("assistant-dataset-desktop")}
        <div className="rounded-xl border border-border/60 bg-surface-subtle p-4 text-sm">
          {datasetsLoading ? (
            <div className="space-y-3 text-text-muted">
              <div className="h-3 w-2/3 animate-pulse rounded-md bg-border/60" />
              <div className="h-3 w-full animate-pulse rounded-md bg-border/60" />
              <div className="h-3 w-1/2 animate-pulse rounded-md bg-border/60" />
            </div>
          ) : selectedDataset ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-semibold text-text-primary">
                  {selectedDataset.originalName}
                </p>
                <Badge variant="outline" className="text-[11px] uppercase tracking-wide">
                  Connected
                </Badge>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-text-muted">
                {formatNumber(selectedDataset.rowCount)} rows • {formatNumber(columnNames.length)} columns
              </p>
              {datasetMetrics.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                  {datasetMetrics.map((metric) => (
                    <div
                      key={metric.label}
                      className="rounded-lg bg-surface p-2 text-text-soft shadow-sm"
                    >
                      <p className="font-semibold text-text-primary">{metric.value}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-wide">{metric.label}</p>
                    </div>
                  ))}
                </div>
              )}
              {columnNames.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-soft">
                    Columns
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {columnNames.slice(0, 12).map((columnName) => (
                      <Badge
                        key={columnName}
                        variant="outline"
                        className="rounded-md px-2 py-1 text-[11px] uppercase tracking-wide text-text-soft"
                      >
                        {columnName}
                      </Badge>
                    ))}
                    {columnNames.length > 12 && (
                      <Badge variant="secondary" className="rounded-md px-2 py-1 text-[11px]">
                        +{columnNames.length - 12} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-2 text-xs text-text-muted">
              <p>Select a dataset above to tailor the assistant's answers.</p>
              <p>Your uploaded files from the Data Factory will appear here.</p>
            </div>
          )}
        </div>
      </section>

      <section className="flex-1 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-text-soft">
            Conversations
          </h2>
          <Button
            size="sm"
            className="gap-2"
            onClick={handleCreateNewChat}
            disabled={createSessionMutation.isPending}
          >
            {createSessionMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Plus className="h-4 w-4" aria-hidden="true" />
            )}
            <span>New chat</span>
          </Button>
        </div>

        <div className="flex-1 rounded-xl border border-border/60 bg-surface-subtle">
          {sessionsLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <div className="h-3 w-1/2 animate-pulse rounded bg-border/60" />
                  <div className="h-2.5 w-2/3 animate-pulse rounded bg-border/60" />
                </div>
              ))}
            </div>
          ) : isSessionError ? (
            <div className="flex flex-col gap-2 px-4 py-8 text-center text-sm text-destructive">
              <p>We couldn't load your conversations.</p>
              <p className="text-xs text-text-muted">
                Please refresh the page or try again later.
              </p>
            </div>
          ) : sessionSummaries.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center text-sm text-text-muted">
              <div className="rounded-full bg-surface p-4 text-primary" aria-hidden="true">
                <Bot className="h-5 w-5" />
              </div>
              <p className="font-medium text-text-primary">No conversations yet</p>
              <p className="text-xs text-text-muted">
                Start a chat to keep your analysis history tidy and searchable.
              </p>
            </div>
          ) : (
            <ul className="max-h-[calc(100vh-18rem)] overflow-y-auto p-2" role="list">
              {sessionSummaries.map(({ session, parsedMessages, messageCount, lastActivity }) => {
                const isActive = currentSession?.id === session.id;
                const readableDate =
                  lastActivity?.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }) ?? "Just now";
                const lastResponder =
                  parsedMessages.length === 0
                    ? "Not started"
                    : parsedMessages[parsedMessages.length - 1]?.role === "assistant"
                    ? "Assistant replied"
                    : "Awaiting response";

                return (
                  <li key={session.id} className="p-1">
                    <button
                      type="button"
                      onClick={() => handleSelectSession(session, parsedMessages)}
                      className={`w-full rounded-lg border border-transparent px-3 py-2 text-left transition-colors ${
                        isActive
                          ? "border-primary/30 bg-primary/10 ring-1 ring-primary/30"
                          : "hover:bg-surface hover:ring-1 hover:ring-border/60"
                      }`}
                      aria-current={isActive ? "true" : undefined}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium text-text-primary">
                          {session.title || `Session ${session.id}`}
                        </p>
                        <Badge variant="outline" className="text-[11px] uppercase tracking-wide">
                          {messageCount} msg
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-xs text-text-muted">
                        <span>{readableDate}</span>
                        <span className="truncate text-right text-text-subtle">{lastResponder}</span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );

  const chatBusy = isLoading || sendMessageMutation.isPending;

  return (
    <PageShell
      padding="none"
      width="full"
      className="min-h-[calc(100vh-4rem)] bg-surface"
      contentClassName="min-h-[calc(100vh-4rem)] gap-0"
    >
      <TooltipProvider delayDuration={120}>
        <div className="flex h-full flex-col lg:flex-row">
          <aside className="hidden w-full max-w-xs border-b border-border bg-surface-muted p-6 lg:flex lg:min-h-full lg:w-80 lg:flex-col lg:border-b-0 lg:border-r">
            {sidebarContent}
          </aside>

          <main className="flex flex-1 flex-col">
            <header className="border-b border-border bg-surface px-4 py-4 sm:px-6">
              <div className="flex flex-col gap-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-text-soft">
                      Conversation
                    </p>
                    <h1 className="text-lg font-semibold text-text-primary">
                      {currentSession?.title || DEFAULT_SESSION_TITLE}
                    </h1>
                  </div>
                  <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
                    <SheetTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="lg:hidden"
                        aria-label="Open assistant navigation"
                      >
                        <Menu className="h-4 w-4" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-full max-w-xs bg-surface-muted px-0">
                      <SheetHeader className="px-6">
                        <SheetTitle>Assistant navigation</SheetTitle>
                      </SheetHeader>
                      <div className="flex h-full flex-col overflow-y-auto px-6 py-6">
                        {sidebarContent}
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>

                <div className="lg:hidden">{renderDatasetSelect("assistant-dataset-mobile")}</div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
                  <Badge variant="outline" className="border-dashed px-3 py-1 text-[11px] uppercase">
                    {selectedDataset ? `Dataset: ${selectedDataset.originalName}` : "Dataset: none"}
                  </Badge>
                  {selectedDataset && (
                    <span className="text-text-subtle">
                      {formatNumber(selectedDataset.rowCount)} rows,{" "}
                      {formatNumber(selectedDataset.columns?.length ?? 0)} columns
                    </span>
                  )}
                </div>

                {datasetSuggestions.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    {datasetSuggestions.map((suggestion) => (
                      <Tooltip key={suggestion}>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-2 rounded-full border border-border/60 bg-surface-subtle px-3 py-2 text-xs font-medium text-text-primary hover:bg-primary/10"
                            onClick={() => handleSendMessage(suggestion)}
                          >
                            <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                            <span className="truncate">{suggestion}</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs text-xs">
                          Ask: {suggestion}
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                )}
              </div>
            </header>

            <div className="flex-1 overflow-hidden">
              <ChatInterface messages={messages} onSendMessage={handleSendMessage} isLoading={chatBusy} />
            </div>
          </main>
        </div>
      </TooltipProvider>
    </PageShell>
  );
}
