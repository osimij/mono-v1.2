import { 
  users, 
  datasets, 
  models, 
  chatSessions,
  dashboardConfigs,
  analysisConfigs,
  type User, 
  type InsertUser,
  type UpsertUser,
  type Dataset,
  type InsertDataset,
  type Model,
  type InsertModel,
  type ChatSession,
  type InsertChatSession,
  AnalysisConfigRecord,
  InsertAnalysisConfig
} from "@shared/schema";

// Re-export tables for use in routes
export { users, datasets, models, chatSessions, dashboardConfigs, analysisConfigs };
import { db } from "./db";
import { and, eq } from "drizzle-orm";
import * as fs from 'fs';
import * as path from 'path';
import Papa from 'papaparse';

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Dataset methods
  getDatasets(userId: string): Promise<Dataset[]>;
  getDataset(id: number): Promise<Dataset | undefined>;
  createDataset(dataset: InsertDataset): Promise<Dataset>;
  deleteDataset(id: number): Promise<void>;
  
  // Model methods
  getModels(userId: string): Promise<Model[]>;
  getModel(id: number): Promise<Model | undefined>;
  createModel(model: InsertModel): Promise<Model>;
  deleteModel(id: number): Promise<void>;
  
  // Chat session methods
  getChatSessions(userId: string): Promise<ChatSession[]>;
  getChatSession(id: number): Promise<ChatSession | undefined>;
  createChatSession(session: InsertChatSession): Promise<ChatSession>;
  updateChatSession(id: number, messages: any): Promise<ChatSession>;
  deleteChatSession(id: number): Promise<void>;

  // Analysis config methods
  getAnalysisConfig(userId: string, datasetId: number): Promise<AnalysisConfigRecord | undefined>;
  upsertAnalysisConfig(payload: InsertAnalysisConfig): Promise<AnalysisConfigRecord>;
  deleteAnalysisConfig(id: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private datasets: Map<number, Dataset>;
  private models: Map<number, Model>;
  private chatSessions: Map<number, ChatSession>;
  private analysisConfigs: Map<number, AnalysisConfigRecord>;
  private currentUserId: number;
  private currentDatasetId: number;
  private currentModelId: number;
  private currentChatSessionId: number;
  private currentAnalysisConfigId: number;

  constructor() {
    this.users = new Map();
    this.datasets = new Map();
    this.models = new Map();
    this.chatSessions = new Map();
    this.analysisConfigs = new Map();
    this.currentUserId = 1;
    this.currentDatasetId = 1;
    this.currentModelId = 1;
    this.currentChatSessionId = 1;
    this.currentAnalysisConfigId = 1;
    
    // Load demo dataset on startup
    this.initializeDemoData();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = (this.currentUserId++).toString();
    const now = new Date();
    const user: User = {
      id,
      email: insertUser.email ?? null,
      password: insertUser.password ?? null,
      firstName: insertUser.firstName ?? null,
      lastName: insertUser.lastName ?? null,
      profileImageUrl: insertUser.profileImageUrl ?? null,
      isAdmin: false,
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(id, user);
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const existingUser = this.users.get(userData.id);
    if (existingUser) {
      const updatedUser = { ...existingUser, ...userData, updatedAt: new Date() };
      this.users.set(userData.id, updatedUser);
      return updatedUser;
    } else {
      return this.createUser(userData);
    }
  }

  async getDatasets(userId: string): Promise<Dataset[]> {
    return Array.from(this.datasets.values()).filter(
      (dataset) => dataset.userId === userId
    );
  }

  async getDataset(id: number): Promise<Dataset | undefined> {
    return this.datasets.get(id);
  }

  async createDataset(insertDataset: InsertDataset): Promise<Dataset> {
    const id = this.currentDatasetId++;
    const dataset: Dataset = {
      ...insertDataset,
      id,
      uploadedAt: new Date(),
      userId: insertDataset.userId || null,
    };
    this.datasets.set(id, dataset);
    return dataset;
  }

  async deleteDataset(id: number): Promise<void> {
    this.datasets.delete(id);
    this.analysisConfigs.forEach((config, key) => {
      if (config.datasetId === id) {
        this.analysisConfigs.delete(key);
      }
    });
  }

  async getModels(userId: string): Promise<Model[]> {
    return Array.from(this.models.values()).filter(
      (model) => model.userId === userId
    );
  }

  async getModel(id: number): Promise<Model | undefined> {
    return this.models.get(id);
  }

  async createModel(insertModel: InsertModel): Promise<Model> {
    const id = this.currentModelId++;
    const model: Model = {
      ...insertModel,
      id,
      createdAt: new Date(),
      userId: insertModel.userId || null,
      datasetId: insertModel.datasetId || null,
      accuracy: insertModel.accuracy || null,
      metrics: insertModel.metrics || null,
      modelData: insertModel.modelData || null,
    };
    this.models.set(id, model);
    return model;
  }

  async deleteModel(id: number): Promise<void> {
    this.models.delete(id);
  }

  async getChatSessions(userId: string): Promise<ChatSession[]> {
    return Array.from(this.chatSessions.values()).filter(
      (session) => session.userId === userId
    );
  }

  async getChatSession(id: number): Promise<ChatSession | undefined> {
    return this.chatSessions.get(id);
  }

  async createChatSession(insertSession: InsertChatSession): Promise<ChatSession> {
    const id = this.currentChatSessionId++;
    const session: ChatSession = {
      ...insertSession,
      id,
      createdAt: new Date(),
      userId: insertSession.userId || null,
    };
    this.chatSessions.set(id, session);
    return session;
  }

  async updateChatSession(id: number, messages: any): Promise<ChatSession> {
    const session = this.chatSessions.get(id);
    if (!session) {
      throw new Error("Chat session not found");
    }
    
    const updatedSession = { ...session, messages };
    this.chatSessions.set(id, updatedSession);
    return updatedSession;
  }

  async deleteChatSession(id: number): Promise<void> {
    this.chatSessions.delete(id);
  }

  async getAnalysisConfig(userId: string, datasetId: number): Promise<AnalysisConfigRecord | undefined> {
    return Array.from(this.analysisConfigs.values()).find(
      (config) => config.userId === userId && config.datasetId === datasetId
    );
  }

  async upsertAnalysisConfig(payload: InsertAnalysisConfig): Promise<AnalysisConfigRecord> {
    const existing = await this.getAnalysisConfig(payload.userId, payload.datasetId);
    if (existing) {
      const updated = { ...existing, ...payload, updatedAt: new Date() };
      this.analysisConfigs.set(existing.id!, updated as AnalysisConfigRecord);
      return updated as AnalysisConfigRecord;
    }

    const id = this.currentAnalysisConfigId++;
    const created: AnalysisConfigRecord = {
      id,
      userId: payload.userId,
      datasetId: payload.datasetId,
      charts: payload.charts,
      insights: payload.insights,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.analysisConfigs.set(id, created);
    return created;
  }

  async deleteAnalysisConfig(id: number): Promise<void> {
    this.analysisConfigs.delete(id);
  }

  private initializeDemoData(): void {
    try {
      const csvPath = path.join(process.cwd(), 'sample_ecommerce_data.csv');
      if (fs.existsSync(csvPath)) {
        const csvContent = fs.readFileSync(csvPath, 'utf8');
        const parseResult = Papa.parse(csvContent, { 
          header: true, 
          skipEmptyLines: true,
          dynamicTyping: true 
        });

        if (parseResult.data && parseResult.data.length > 0) {
          const data = parseResult.data as any[];
          const columns = Object.keys(data[0]);
          
          const demoDataset: Dataset = {
            id: this.currentDatasetId++,
            userId: "1",
            filename: 'sample_ecommerce_data.csv',
            originalName: 'E-commerce Customer Analytics Demo',
            columns,
            rowCount: data.length,
            fileSize: csvContent.length,
            uploadedAt: new Date(),
            data
          };

          this.datasets.set(demoDataset.id, demoDataset);
          
          // Create demo models
          const classificationModel: Model = {
            id: this.currentModelId++,
            userId: "1",
            datasetId: demoDataset.id,
            name: 'Customer Churn Prediction',
            type: 'classification',
            algorithm: 'Random Forest',
            targetColumn: 'churn_risk',
            accuracy: '94.2%',
            metrics: {
              accuracy: 0.942,
              precision: 0.89,
              recall: 0.91,
              f1Score: 0.90
            },
            modelData: null,
            createdAt: new Date()
          };

          const regressionModel: Model = {
            id: this.currentModelId++,
            userId: "1",
            datasetId: demoDataset.id,
            name: 'Spending Score Prediction',
            type: 'regression',
            algorithm: 'Gradient Boosting',
            targetColumn: 'spending_score',
            accuracy: '87.6%',
            metrics: {
              rmse: 8.4,
              r2Score: 0.876,
              mape: 12.3
            },
            modelData: null,
            createdAt: new Date()
          };

          this.models.set(classificationModel.id, classificationModel);
          this.models.set(regressionModel.id, regressionModel);

          // Create a single empty demo chat session for users to start fresh analysis
          const demoSession: ChatSession = {
            id: this.currentChatSessionId++,
            userId: "1",
            title: 'AI Data Analysis Chat',
            messages: JSON.stringify([]),
            createdAt: new Date()
          };

          this.chatSessions.set(demoSession.id, demoSession);
        }
      }
    } catch (error) {
      console.log('Demo data loading skipped:', (error as Error).message);
    }
  }
}

// Use database storage instead of memory storage for persistence
class DatabaseStorage implements IStorage {
  constructor() {
    // Initialize demo data when DatabaseStorage is created
    this.initializeDemoData().catch(console.error);
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    // This method is no longer used with Replit Auth but kept for interface compatibility
    return undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getDatasets(userId: string): Promise<Dataset[]> {
    // Only select metadata fields, exclude the data field for performance
    const results = await db
      .select({
        id: datasets.id,
        userId: datasets.userId,
        filename: datasets.filename,
        originalName: datasets.originalName,
        columns: datasets.columns,
        rowCount: datasets.rowCount,
        fileSize: datasets.fileSize,
        uploadedAt: datasets.uploadedAt
      })
      .from(datasets)
      .where(eq(datasets.userId, userId));
    
    return results.map((dataset) => ({
      ...dataset,
      data: null as unknown,
    }));
  }

  async getDataset(id: number): Promise<Dataset | undefined> {
    const [dataset] = await db.select().from(datasets).where(eq(datasets.id, id));
    return dataset || undefined;
  }

  async createDataset(insertDataset: InsertDataset): Promise<Dataset> {
    const [dataset] = await db
      .insert(datasets)
      .values(insertDataset)
      .returning();
    return dataset;
  }

  async deleteDataset(id: number): Promise<void> {
    // First delete all models that reference this dataset to avoid foreign key constraint violations
    await db.delete(models).where(eq(models.datasetId, id));
    await db.delete(analysisConfigs).where(eq(analysisConfigs.datasetId, id));
    
    // Then delete the dataset itself
    await db.delete(datasets).where(eq(datasets.id, id));
  }

  async getModels(userId: string): Promise<Model[]> {
    return await db.select().from(models).where(eq(models.userId, userId));
  }

  async getModel(id: number): Promise<Model | undefined> {
    const [model] = await db.select().from(models).where(eq(models.id, id));
    return model || undefined;
  }

  async createModel(insertModel: InsertModel): Promise<Model> {
    const [model] = await db
      .insert(models)
      .values(insertModel)
      .returning();
    return model;
  }

  async deleteModel(id: number): Promise<void> {
    await db.delete(models).where(eq(models.id, id));
  }

  async getChatSessions(userId: string): Promise<ChatSession[]> {
    return await db.select().from(chatSessions).where(eq(chatSessions.userId, userId));
  }

  async getChatSession(id: number): Promise<ChatSession | undefined> {
    const [session] = await db.select().from(chatSessions).where(eq(chatSessions.id, id));
    return session || undefined;
  }

  async createChatSession(insertSession: InsertChatSession): Promise<ChatSession> {
    const [session] = await db
      .insert(chatSessions)
      .values(insertSession)
      .returning();
    return session;
  }

  async updateChatSession(id: number, messages: any): Promise<ChatSession> {
    const [session] = await db
      .update(chatSessions)
      .set({ messages: JSON.stringify(messages) })
      .where(eq(chatSessions.id, id))
      .returning();
    
    if (!session) {
      throw new Error("Chat session not found");
    }
    
    return session;
  }

  async deleteChatSession(id: number): Promise<void> {
    await db.delete(chatSessions).where(eq(chatSessions.id, id));
  }

  async getAnalysisConfig(userId: string, datasetId: number): Promise<AnalysisConfigRecord | undefined> {
    const [record] = await db
      .select()
      .from(analysisConfigs)
      .where(
        and(
          eq(analysisConfigs.userId, userId),
          eq(analysisConfigs.datasetId, datasetId)
        )
      );
    return record;
  }

  async upsertAnalysisConfig(payload: InsertAnalysisConfig): Promise<AnalysisConfigRecord> {
    const [record] = await db
      .insert(analysisConfigs)
      .values(payload)
      .onConflictDoUpdate({
        target: [analysisConfigs.userId, analysisConfigs.datasetId],
        set: {
          charts: payload.charts,
          insights: payload.insights,
          updatedAt: new Date(),
        },
      })
      .returning();
    return record;
  }

  async deleteAnalysisConfig(id: number): Promise<void> {
    await db.delete(analysisConfigs).where(eq(analysisConfigs.id, id));
  }

  private async initializeDemoData(): Promise<void> {
    try {
      // First, ensure demo user exists
      const demoUser = await this.getUser("1");
      if (!demoUser) {
        console.log("Creating demo user...");
        await this.createUser({
          id: "1",
          email: "demo@example.com",
          firstName: "Demo",
          lastName: "User",
          profileImageUrl: null
        });
        console.log("Demo user created successfully");
      }

      // Check if demo dataset already exists
      const existingDatasets = await this.getDatasets("1");
      if (existingDatasets.length > 0) {
        console.log("Demo data already exists, skipping initialization");
        return;
      }

      // Create demo dataset
      const csvPath = path.join(process.cwd(), 'sample_ecommerce_data.csv');
      if (fs.existsSync(csvPath)) {
        console.log("Loading demo dataset...");
        const csvContent = fs.readFileSync(csvPath, 'utf8');
        const parseResult = Papa.parse(csvContent, { 
          header: true, 
          skipEmptyLines: true,
          dynamicTyping: true 
        });

        if (parseResult.data && parseResult.data.length > 0) {
          const data = parseResult.data as any[];
          const columns = Object.keys(data[0]);
          
          const demoDatasetData = {
            userId: "1",
            filename: 'sample_ecommerce_data.csv',
            originalName: 'E-commerce Customer Analytics Demo',
            columns,
            rowCount: data.length,
            fileSize: csvContent.length,
            data
          };

          const demoDataset = await this.createDataset(demoDatasetData);
          console.log("Demo dataset created with ID:", demoDataset.id);

          // Create demo models
          await this.createModel({
            userId: "1",
            datasetId: demoDataset.id,
            name: 'Customer Churn Prediction',
            type: 'classification',
            algorithm: 'Random Forest',
            targetColumn: 'churn_risk',
            accuracy: '94.2%',
            metrics: {
              accuracy: 0.942,
              precision: 0.89,
              recall: 0.91,
              f1Score: 0.90
            },
            modelData: { 
              trained: true,
              features: columns.filter(col => col !== 'churn_risk'),
              trainingDate: new Date().toISOString()
            }
          });

          await this.createModel({
            userId: "1",
            datasetId: demoDataset.id,
            name: 'Spending Score Prediction',
            type: 'regression',
            algorithm: 'Gradient Boosting',
            targetColumn: 'spending_score',
            accuracy: '87.6%',
            metrics: {
              rmse: 8.4,
              r2Score: 0.876,
              mape: 12.3
            },
            modelData: { 
              trained: true,
              features: columns.filter(col => col !== 'spending_score'),
              trainingDate: new Date().toISOString()
            }
          });

          console.log("Demo models created successfully");
        }
      }
    } catch (error) {
      console.log('Demo data initialization failed:', (error as Error).message);
    }
  }
}

export const storage = new DatabaseStorage();
