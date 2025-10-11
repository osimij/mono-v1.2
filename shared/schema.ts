import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  password: varchar("password"), // Add password field for local auth
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const datasets = pgTable("datasets", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  columns: text("columns").array().notNull(),
  rowCount: integer("row_count").notNull(),
  fileSize: integer("file_size").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  data: jsonb("data").notNull(),
});

export const models = pgTable("models", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  datasetId: integer("dataset_id").references(() => datasets.id),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'classification', 'regression', 'time_series'
  algorithm: text("algorithm").notNull(),
  targetColumn: text("target_column").notNull(),
  accuracy: text("accuracy"),
  metrics: jsonb("metrics"),
  modelData: jsonb("model_data"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const chatSessions = pgTable("chat_sessions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  title: text("title").notNull(),
  messages: jsonb("messages").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
  password: true,
});

export const upsertUserSchema = createInsertSchema(users).pick({
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
});

export const insertDatasetSchema = createInsertSchema(datasets).omit({
  id: true,
  uploadedAt: true,
});

export const insertModelSchema = createInsertSchema(models).omit({
  id: true,
  createdAt: true,
});

export const insertChatSessionSchema = createInsertSchema(chatSessions).omit({
  id: true,
  createdAt: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = z.infer<typeof upsertUserSchema>;

export type Dataset = typeof datasets.$inferSelect;
export type InsertDataset = z.infer<typeof insertDatasetSchema>;

export type Model = typeof models.$inferSelect;
export type InsertModel = z.infer<typeof insertModelSchema>;

export type ChatSession = typeof chatSessions.$inferSelect;
export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;

// Chat message types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    chart?: any;
    insights?: string[];
  };
}

// Data analysis types
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

// ML model types
export interface ModelMetrics {
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
  mape?: number;
  rmse?: number;
}

export interface FeatureImportance {
  feature: string;
  importance: number;
}

// Dashboard configuration types
export interface DashboardMetricCard {
  id: string;
  title: string;
  column: string;
  calculation: 'sum' | 'average' | 'count' | 'max' | 'min' | 'median' | 'distinct_count';
  format?: 'number' | 'currency' | 'percentage';
  icon?: string;
  color?: string;
  showChange?: boolean;
  comparisonColumn?: string;
  comparisonValue?: number;
}

export interface DashboardChart {
  id: string;
  title: string;
  description?: string;
  chartType: 'line' | 'bar' | 'pie' | 'area' | 'scatter' | 'horizontal_bar';
  size?: 'small' | 'medium' | 'large';
  xAxis: string;
  yAxis: string | string[]; // Support single or multiple Y-axis columns
  aggregation?: 'sum' | 'average' | 'count' | 'max' | 'min';
  groupBy?: string;
  filterColumn?: string;
  filterValue?: string;
}

export interface DashboardConfig {
  id: number;
  userId: string;
  datasetId: number;
  name: string;
  metrics: DashboardMetricCard[];
  charts: DashboardChart[];
  createdAt?: Date;
  updatedAt?: Date;
}

// Dashboard configuration table
export const dashboardConfigs = pgTable("dashboard_configs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  datasetId: integer("dataset_id").references(() => datasets.id),
  name: text("name").notNull().default("My Dashboard"),
  metrics: jsonb("metrics").notNull().default([]),
  charts: jsonb("charts").notNull().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDashboardConfigSchema = createInsertSchema(dashboardConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type DashboardConfigRecord = typeof dashboardConfigs.$inferSelect;
export type InsertDashboardConfig = z.infer<typeof insertDashboardConfigSchema>;
