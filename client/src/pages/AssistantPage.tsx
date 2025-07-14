import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChatInterface } from "@/components/ChatInterface";
import { api } from "@/lib/api";
import { ChatMessage, ChatSession, Dataset } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

export function AssistantPage() {
  const [selectedDataset, setSelectedDataset] = useState<string>("");
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const searchParams = useSearch();
  
  // Parse session ID from URL
  const sessionIdFromUrl = new URLSearchParams(searchParams).get('session');

  // Fetch datasets
  const { data: datasets = [] } = useQuery({
    queryKey: ["/api/datasets"],
    queryFn: api.datasets.getAll
  });

  // Fetch chat sessions
  const { data: sessions = [] } = useQuery({
    queryKey: ["/api/chat-sessions"],
    queryFn: api.chat.getSessions
  });

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: (title: string) => api.chat.createSession(title),
    onSuccess: async (response) => {
      const session = await response.json();
      setCurrentSession(session);
      setMessages([]);
      queryClient.invalidateQueries({ queryKey: ["/api/chat-sessions"] });
    }
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ message, sessionId, datasetId }: { 
      message: string; 
      sessionId: number; 
      datasetId?: number 
    }) => {
      const response = await api.chat.sendMessage(sessionId, message, datasetId);
      return response.json();
    },
    onSuccess: (data) => {
      setMessages(prev => [...prev, data.message]);
      setCurrentSession(data.session);
    },
    onError: (error) => {
      toast({
        title: "Message failed",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive"
      });
    }
  });

  // Initialize session on mount - handle URL session parameter
  useEffect(() => {
    if (sessionIdFromUrl && sessions.length > 0) {
      // Load specific session from URL
      const sessionFromUrl = sessions.find((s: any) => s.id.toString() === sessionIdFromUrl);
      if (sessionFromUrl) {
        setCurrentSession(sessionFromUrl);
        if (sessionFromUrl.messages) {
          try {
            const parsedMessages = typeof sessionFromUrl.messages === 'string' 
              ? JSON.parse(sessionFromUrl.messages) 
              : sessionFromUrl.messages;
            setMessages(parsedMessages || []);
          } catch (error) {
            setMessages([]);
          }
        } else {
          setMessages([]);
        }
        return;
      }
    }
    
    // Default behavior: load latest session if no specific session requested
    if (sessions.length > 0 && !currentSession && !sessionIdFromUrl) {
      const latestSession = sessions[0];
      setCurrentSession(latestSession);
      if (latestSession.messages) {
        try {
          const parsedMessages = typeof latestSession.messages === 'string' 
            ? JSON.parse(latestSession.messages) 
            : latestSession.messages;
          setMessages(parsedMessages || []);
        } catch (error) {
          setMessages([]);
        }
      } else {
        setMessages([]);
      }
    }
  }, [sessions.length, currentSession?.id, sessionIdFromUrl]);

  const handleSendMessage = async (message: string) => {
    if (!currentSession) {
      // Create a new session first
      try {
        const response = await api.chat.createSession("New Analysis Session");
        const session = await response.json();
        setCurrentSession(session);
        
        // Now send the message
        await sendMessageMutation.mutateAsync({
          message,
          sessionId: session.id,
          datasetId: selectedDataset && selectedDataset !== "none" ? parseInt(selectedDataset) : undefined
        });
      } catch (error) {
        toast({
          title: "Failed to start conversation",
          description: "Could not create chat session",
          variant: "destructive"
        });
      }
      return;
    }

    // Add user message immediately to UI
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      await sendMessageMutation.mutateAsync({
        message,
        sessionId: currentSession.id,
        datasetId: selectedDataset && selectedDataset !== "none" ? parseInt(selectedDataset) : undefined
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedDatasetData = datasets.find((d: Dataset) => d.id.toString() === selectedDataset && selectedDataset !== "none");

  // Generate smart suggestions based on dataset
  const getDatasetSuggestions = (dataset: Dataset | undefined) => {
    if (!dataset) {
      return [
        "What can you help me with?",
        "How do I analyze my data?",
        "Show me visualization options"
      ];
    }

    const columns = dataset.columns.map(col => col.toLowerCase());
    const suggestions = [];

    // E-commerce/Sales suggestions
    if (columns.some(col => ['price', 'order', 'customer', 'product', 'sales', 'revenue'].some(keyword => col.includes(keyword)))) {
      suggestions.push(
        "Analyze customer behavior patterns",
        "Show revenue trends and performance",
        "Identify top performing products"
      );
    }
    // Financial suggestions
    else if (columns.some(col => ['amount', 'balance', 'transaction', 'payment'].some(keyword => col.includes(keyword)))) {
      suggestions.push(
        "Analyze transaction patterns",
        "Identify spending trends",
        "Detect unusual financial activity"
      );
    }
    // HR suggestions
    else if (columns.some(col => ['employee', 'salary', 'department', 'performance'].some(keyword => col.includes(keyword)))) {
      suggestions.push(
        "Analyze employee performance trends",
        "Show department comparisons",
        "Identify retention patterns"
      );
    }
    // Generic suggestions
    else {
      suggestions.push(
        "Analyze data patterns and trends",
        "Show correlation between variables",
        "Identify outliers and anomalies"
      );
    }

    return suggestions;
  };

  const suggestions = getDatasetSuggestions(selectedDatasetData);

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Collapsible Chat Sidebar */}
      <div className={`${sidebarCollapsed ? 'w-16' : 'w-80'} border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex flex-col transition-all duration-300`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
          
          {!sidebarCollapsed && (
            <button
              onClick={async () => {
                try {
                  setIsLoading(true);
                  const response = await api.chat.createSession("AI Data Analysis Chat");
                  const newSession = await response.json();
                  setCurrentSession(newSession);
                  setMessages([]);
                  window.history.pushState({}, '', `/assistant?session=${newSession.id}`);
                  queryClient.invalidateQueries({ queryKey: ["/api/chat-sessions"] });
                } catch (error) {
                  toast({
                    title: "Failed to create new chat",
                    description: "Could not start new conversation",
                    variant: "destructive"
                  });
                } finally {
                  setIsLoading(false);
                }
              }}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Chat
            </button>
          )}
        </div>

        {/* Chat Sessions List */}
        {!sidebarCollapsed && (
          <div className="flex-1 overflow-y-auto p-2">
            {sessions.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p className="text-sm">No conversations yet</p>
                <p className="text-xs mt-1">Start a new chat above</p>
              </div>
            ) : (
              <div className="space-y-1">
                {sessions.map((session: any) => (
                  <button
                    key={session.id}
                    onClick={() => {
                      setCurrentSession(session);
                      try {
                        const parsedMessages = typeof session.messages === 'string' 
                          ? JSON.parse(session.messages) 
                          : session.messages;
                        setMessages(parsedMessages || []);
                      } catch (error) {
                        setMessages([]);
                      }
                      window.history.pushState({}, '', `/assistant?session=${session.id}`);
                    }}
                    className={`w-full p-3 rounded-lg text-left transition-colors ${
                      currentSession?.id === session.id
                        ? 'bg-primary/10 border border-primary/20'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className="font-medium text-sm text-gray-900 dark:text-white truncate">
                      {session.title}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {session.messages && session.messages.length > 0 
                        ? `${typeof session.messages === 'string' 
                            ? JSON.parse(session.messages).length || 0 
                            : session.messages.length} messages`
                        : 'No messages'}
                    </div>
                    {session.createdAt && (
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {new Date(session.createdAt).toLocaleDateString()}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                {currentSession ? currentSession.title : 'AI Assistant'}
              </h1>
              
              {/* Dataset Selection */}
              {datasets.length > 0 && (
                <div className="flex items-center gap-2">
                  <Select value={selectedDataset} onValueChange={setSelectedDataset}>
                    <SelectTrigger className="w-48 h-8 text-sm">
                      <SelectValue placeholder="Select dataset..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No dataset</SelectItem>
                      {datasets.map((dataset: Dataset) => (
                        <SelectItem key={dataset.id} value={dataset.id.toString()}>
                          {dataset.originalName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedDatasetData && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {selectedDatasetData.rowCount.toLocaleString()} rows • {selectedDatasetData.columns.length} cols
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Quick Start Buttons - Always Show When Available */}
          {suggestions.length > 0 && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <span className="text-xs text-gray-500 dark:text-gray-400">Quick start:</span>
              {suggestions.slice(0, 4).map((suggestion, index) => (
                <TooltipProvider key={index} delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => handleSendMessage(suggestion)}
                        variant="outline"
                        size="sm"
                        className="text-xs h-auto py-1 px-2"
                      >
                        {suggestion.split(' ').slice(0, 2).join(' ')}...
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <p className="text-sm">{suggestion}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          )}
        </div>

        {/* Chat Interface */}
        <div className="flex-1 overflow-hidden">
          <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
