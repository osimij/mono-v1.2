import type { Dataset, DashboardConfig, DashboardChart, DashboardMetricCard } from "@shared/schema";
import { analyzeDataset } from "./dataAnalyzer";

export type DashboardDraft = {
  id: number | null;
  name: string;
  metrics: DashboardMetricCard[];
  charts: DashboardChart[];
};

export interface DatasetDetail {
  dataset: Dataset;
  analysis: ReturnType<typeof analyzeDataset> | null;
}

export const getDatasetLabel = (dataset: Dataset) => dataset.originalName || dataset.filename;

export const generateDashboardName = (existing?: DashboardConfig[]): string => {
  const base = "Untitled dashboard";
  if (!existing || existing.length === 0) {
    return base;
  }

  const existingNames = new Set(existing.map(item => item.name));
  if (!existingNames.has(base)) {
    return base;
  }

  let counter = 2;
  while (existingNames.has(`${base} ${counter}`)) {
    counter += 1;
  }

  return `${base} ${counter}`;
};

