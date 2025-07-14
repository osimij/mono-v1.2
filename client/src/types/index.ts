export interface Dataset {
  id: number;
  userId?: number;
  filename: string;
  originalName: string;
  columns: string[];
  rowCount: number;
  fileSize: number;
  uploadedAt?: Date;
  data: any[];
}

export interface Model {
  id: number;
  userId?: number;
  datasetId: number;
  name: string;
  type: 'classification' | 'regression' | 'time_series';
  algorithm: string;
  targetColumn: string;
  accuracy?: string;
  metrics?: ModelMetrics;
  modelData?: any;
  createdAt?: Date;
}

export interface ModelMetrics {
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
  mape?: number;
  rmse?: number;
  r2Score?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    chart?: any;
    insights?: string[];
    suggestions?: string[];
  };
}

export interface ChatSession {
  id: number;
  userId?: number;
  title: string;
  messages: ChatMessage[];
  createdAt?: Date;
}

export interface DataSummary {
  totalRows: number;
  totalColumns: number;
  missingValues: number;
  duplicates: number;
  columnTypes: Record<string, string>;
}

export interface CorrelationData {
  column1: string;
  column2: string;
  correlation: number;
}

export interface AnalysisResult {
  summary: DataSummary;
  correlations: CorrelationData[];
  insights: string[];
}

export interface FeatureImportance {
  feature: string;
  importance: number;
}
