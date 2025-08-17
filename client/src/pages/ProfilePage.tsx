import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { Model, Dataset, ChatSession } from "@/types";
import { 
  Bot, 
  Database, 
  MessageSquare, 
  Download, 
  Trash2, 
  Eye,
  Calendar,
  BarChart3,
  FileText,
  Clock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export function ProfilePage() {
  const [activeTab, setActiveTab] = useState("models");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Fetch data
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

  // Delete mutations
  const deleteModelMutation = useMutation({
    mutationFn: (id: number) => api.models.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/models"] });
      toast({
        title: "Model deleted",
        description: "The model has been successfully removed."
      });
    },
    onError: () => {
      toast({
        title: "Delete failed",
        description: "Failed to delete the model. Please try again.",
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
        description: "The dataset has been successfully removed."
      });
    },
    onError: () => {
      toast({
        title: "Delete failed",
        description: "Failed to delete the dataset. Please try again.",
        variant: "destructive"
      });
    }
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getModelTypeColor = (type: string): string => {
    switch (type) {
      case 'classification':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'regression':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'time_series':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const getAccuracyColor = (accuracy?: string): string => {
    if (!accuracy) return 'text-gray-500';
    const acc = parseFloat(accuracy);
    if (acc >= 90) return 'text-green-600 dark:text-green-400';
    if (acc >= 80) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="models" className="flex items-center space-x-2">
              <Bot className="w-4 h-4" />
              <span>Saved Models</span>
            </TabsTrigger>
            <TabsTrigger value="datasets" className="flex items-center space-x-2">
              <Database className="w-4 h-4" />
              <span>Datasets</span>
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center space-x-2">
              <MessageSquare className="w-4 h-4" />
              <span>Chat History</span>
            </TabsTrigger>
          </TabsList>

          {/* Saved Models Tab */}
          <TabsContent value="models" className="mt-6">
            {modelsLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-gray-500 dark:text-gray-400 mt-4">Loading models...</p>
              </div>
            ) : models.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Bot className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No models yet</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">
                    Train your first model to see it here
                  </p>
                  <Button variant="outline">
                    Start Modeling
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {models.map((model: Model) => (
                  <Card key={model.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{model.name}</CardTitle>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {model.createdAt && format(new Date(model.createdAt), 'MMM dd, yyyy')}
                          </p>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-red-600 hover:text-red-700"
                            onClick={() => deleteModelMutation.mutate(model.id)}
                            disabled={deleteModelMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-300">Type</span>
                          <Badge className={getModelTypeColor(model.type)}>
                            {model.type}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-300">Accuracy</span>
                          <span className={`text-sm font-medium ${getAccuracyColor(model.accuracy)}`}>
                            {model.accuracy ? `${parseFloat(model.accuracy).toFixed(1)}%` : 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-300">Algorithm</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {model.algorithm.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-300">Target</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {model.targetColumn}
                          </span>
                        </div>
                      </div>
                      <Button className="w-full mt-4" variant="outline">
                        Load Model
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Datasets Tab */}
          <TabsContent value="datasets" className="mt-6">
            {datasetsLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-gray-500 dark:text-gray-400 mt-4">Loading datasets...</p>
              </div>
            ) : datasets.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Database className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No datasets uploaded</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">
                    Upload your first dataset to get started
                  </p>
                  <Button variant="outline">
                    Upload Data
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {datasets.map((dataset: Dataset) => (
                  <Card key={dataset.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                            {dataset.originalName.endsWith('.csv') ? (
                              <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            ) : (
                              <BarChart3 className="w-6 h-6 text-green-600 dark:text-green-400" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {dataset.originalName}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {dataset.uploadedAt && format(new Date(dataset.uploadedAt), 'MMM dd, yyyy')} • {' '}
                              {dataset.rowCount.toLocaleString()} rows • {' '}
                              {dataset.columns.length} columns • {' '}
                              {formatFileSize(dataset.fileSize)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="icon">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => deleteDatasetMutation.mutate(dataset.id)}
                            disabled={deleteDatasetMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Chat History Tab */}
          <TabsContent value="chat" className="mt-6">
            {chatLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-gray-500 dark:text-gray-400 mt-4">Loading chat history...</p>
              </div>
            ) : chatSessions.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <MessageSquare className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No chat history</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">
                    Start a conversation with the AI assistant
                  </p>
                  <Button variant="outline">
                    Open AI Assistant
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {chatSessions.map((session: ChatSession) => (
                  <Card key={session.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <MessageSquare className="w-5 h-5 text-primary" />
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {session.title}
                            </h3>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-4 h-4" />
                              <span>
                                {session.createdAt && format(new Date(session.createdAt), 'MMM dd, yyyy')}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="w-4 h-4" />
                              <span>{session.messages?.length || 0} messages</span>
                            </div>
                          </div>
                          {session.messages && session.messages.length > 0 && (
                            <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                              Last message: {session.messages[session.messages.length - 1]?.content?.substring(0, 100) || ''}...
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setLocation(`/assistant?session=${session.id}`)}
                          >
                            View Chat
                          </Button>
                          <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
