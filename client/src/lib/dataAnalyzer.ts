// Utility functions for analyzing CSV data structure and calculating metrics

export interface ColumnInfo {
  name: string;
  type: 'number' | 'string' | 'date' | 'boolean';
  sampleValues: any[];
  uniqueCount: number;
  nullCount: number;
  min?: number;
  max?: number;
  mean?: number;
}

export interface DatasetAnalysis {
  columns: ColumnInfo[];
  totalRows: number;
  numericColumns: string[];
  textColumns: string[];
  dateColumns: string[];
}

/**
 * Analyzes dataset structure and column types
 */
export function analyzeDataset(data: any[]): DatasetAnalysis {
  if (!data || data.length === 0) {
    return {
      columns: [],
      totalRows: 0,
      numericColumns: [],
      textColumns: [],
      dateColumns: []
    };
  }

  const columns: ColumnInfo[] = [];
  const firstRow = data[0];
  const columnNames = Object.keys(firstRow);

  columnNames.forEach(colName => {
    const values = data.map(row => row[colName]).filter(v => v !== null && v !== undefined && v !== '');
    const nonNullValues = values.filter(v => v !== null && v !== undefined);
    
    // Determine column type
    const type = inferColumnType(values);
    
    // Get unique values
    const uniqueValues = new Set(values);
    
    // Calculate stats for numeric columns
    let min, max, mean;
    if (type === 'number') {
      const numericValues = nonNullValues.map(v => Number(v)).filter(v => !isNaN(v));
      if (numericValues.length > 0) {
        min = Math.min(...numericValues);
        max = Math.max(...numericValues);
        mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
      }
    }
    
    columns.push({
      name: colName,
      type,
      sampleValues: values.slice(0, 5),
      uniqueCount: uniqueValues.size,
      nullCount: data.length - values.length,
      min,
      max,
      mean
    });
  });

  return {
    columns,
    totalRows: data.length,
    numericColumns: columns.filter(c => c.type === 'number').map(c => c.name),
    textColumns: columns.filter(c => c.type === 'string').map(c => c.name),
    dateColumns: columns.filter(c => c.type === 'date').map(c => c.name)
  };
}

/**
 * Infers the type of a column based on its values
 */
function inferColumnType(values: any[]): 'number' | 'string' | 'date' | 'boolean' {
  const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
  
  if (nonNullValues.length === 0) return 'string';
  
  // Check if boolean
  const booleanValues = nonNullValues.filter(v => 
    v === true || v === false || 
    (typeof v === 'string' && ['true', 'false', 'yes', 'no', '0', '1'].includes(v.toLowerCase()))
  );
  if (booleanValues.length / nonNullValues.length > 0.8) return 'boolean';
  
  // Check if number
  const numericValues = nonNullValues.filter(v => !isNaN(Number(v)) && typeof v !== 'boolean');
  if (numericValues.length / nonNullValues.length > 0.8) return 'number';
  
  // Check if date
  const dateValues = nonNullValues.filter(v => {
    if (typeof v !== 'string') return false;
    const date = new Date(v);
    return date instanceof Date && !isNaN(date.getTime());
  });
  if (dateValues.length / nonNullValues.length > 0.8) return 'date';
  
  return 'string';
}

/**
 * Calculates metric value based on column and calculation type
 */
export function calculateMetric(
  data: any[],
  column: string,
  calculation: 'sum' | 'average' | 'count' | 'max' | 'min' | 'median' | 'distinct_count'
): number {
  const values = data.map(row => row[column]).filter(v => v !== null && v !== undefined && v !== '');
  
  switch (calculation) {
    case 'count':
      return values.length;
    
    case 'distinct_count':
      return new Set(values).size;
    
    case 'sum': {
      const numValues = values.map(v => Number(v)).filter(v => !isNaN(v));
      return numValues.reduce((a, b) => a + b, 0);
    }
    
    case 'average': {
      const numValues = values.map(v => Number(v)).filter(v => !isNaN(v));
      if (numValues.length === 0) return 0;
      return numValues.reduce((a, b) => a + b, 0) / numValues.length;
    }
    
    case 'max': {
      const numValues = values.map(v => Number(v)).filter(v => !isNaN(v));
      return numValues.length > 0 ? Math.max(...numValues) : 0;
    }
    
    case 'min': {
      const numValues = values.map(v => Number(v)).filter(v => !isNaN(v));
      return numValues.length > 0 ? Math.min(...numValues) : 0;
    }
    
    case 'median': {
      const numValues = values.map(v => Number(v)).filter(v => !isNaN(v)).sort((a, b) => a - b);
      if (numValues.length === 0) return 0;
      const mid = Math.floor(numValues.length / 2);
      return numValues.length % 2 === 0
        ? (numValues[mid - 1] + numValues[mid]) / 2
        : numValues[mid];
    }
    
    default:
      return 0;
  }
}

/**
 * Formats a number based on format type
 */
export function formatValue(value: number, format?: 'number' | 'currency' | 'percentage'): string {
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value);
    
    case 'percentage':
      return `${value.toFixed(2)}%`;
    
    case 'number':
    default:
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }).format(value);
  }
}

/**
 * Prepares data for chart visualization based on configuration
 */
export function prepareChartData(
  data: any[],
  xAxis: string,
  yAxis: string,
  aggregation?: 'sum' | 'average' | 'count' | 'max' | 'min'
): any[] {
  if (!aggregation) {
    // No aggregation - return data as is
    return data.map(row => ({
      [xAxis]: row[xAxis],
      [yAxis]: row[yAxis]
    }));
  }

  // Group data by xAxis value
  const groups = new Map<string, any[]>();
  
  data.forEach(row => {
    const key = String(row[xAxis]);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(row);
  });

  // Calculate aggregated values
  const result: any[] = [];
  groups.forEach((rows, key) => {
    const xValue = rows[0][xAxis];
    const yValues = rows.map(r => Number(r[yAxis])).filter(v => !isNaN(v));
    
    let yValue = 0;
    switch (aggregation) {
      case 'sum':
        yValue = yValues.reduce((a, b) => a + b, 0);
        break;
      case 'average':
        yValue = yValues.length > 0 ? yValues.reduce((a, b) => a + b, 0) / yValues.length : 0;
        break;
      case 'count':
        yValue = yValues.length;
        break;
      case 'max':
        yValue = yValues.length > 0 ? Math.max(...yValues) : 0;
        break;
      case 'min':
        yValue = yValues.length > 0 ? Math.min(...yValues) : 0;
        break;
    }
    
    result.push({
      [xAxis]: xValue,
      [yAxis]: yValue
    });
  });

  return result.sort((a, b) => {
    const aVal = a[xAxis];
    const bVal = b[xAxis];
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return aVal - bVal;
    }
    return String(aVal).localeCompare(String(bVal));
  });
}

/**
 * Prepares data for charts with multiple Y-axis columns
 */
export function prepareMultiColumnChartData(
  data: any[],
  xAxis: string,
  yAxisColumns: string[],
  aggregation?: 'sum' | 'average' | 'count' | 'max' | 'min'
): any[] {
  if (!aggregation || yAxisColumns.length === 0) {
    // No aggregation - return data with all Y columns
    return data.map(row => {
      const result: any = { [xAxis]: row[xAxis] };
      yAxisColumns.forEach(col => {
        result[col] = row[col];
      });
      return result;
    });
  }

  // Group data by xAxis value
  const groups = new Map<string, any[]>();
  
  data.forEach(row => {
    const key = String(row[xAxis]);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(row);
  });

  // Calculate aggregated values for each Y column
  const result: any[] = [];
  groups.forEach((rows, key) => {
    const xValue = rows[0][xAxis];
    const dataPoint: any = { [xAxis]: xValue };
    
    yAxisColumns.forEach(yCol => {
      const yValues = rows.map(r => Number(r[yCol])).filter(v => !isNaN(v));
      
      let yValue = 0;
      switch (aggregation) {
        case 'sum':
          yValue = yValues.reduce((a, b) => a + b, 0);
          break;
        case 'average':
          yValue = yValues.length > 0 ? yValues.reduce((a, b) => a + b, 0) / yValues.length : 0;
          break;
        case 'count':
          yValue = yValues.length;
          break;
        case 'max':
          yValue = yValues.length > 0 ? Math.max(...yValues) : 0;
          break;
        case 'min':
          yValue = yValues.length > 0 ? Math.min(...yValues) : 0;
          break;
      }
      
      dataPoint[yCol] = yValue;
    });
    
    result.push(dataPoint);
  });

  return result.sort((a, b) => {
    const aVal = a[xAxis];
    const bVal = b[xAxis];
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return aVal - bVal;
    }
    return String(aVal).localeCompare(String(bVal));
  });
}

/**
 * Gets recommended chart type based on data types
 */
export function getRecommendedChartType(
  xAxisType: 'number' | 'string' | 'date' | 'boolean',
  yAxisType: 'number' | 'string' | 'date' | 'boolean'
): 'line' | 'bar' | 'pie' | 'area' | 'scatter' {
  if (xAxisType === 'date' && yAxisType === 'number') {
    return 'line';
  }
  if (xAxisType === 'string' && yAxisType === 'number') {
    return 'bar';
  }
  if (xAxisType === 'number' && yAxisType === 'number') {
    return 'scatter';
  }
  return 'bar';
}

export interface SmartInsightInputs {
  rows: Record<string, unknown>[];
  columns: string[];
}

export interface SmartInsightsSummary {
  columnSummaries: {
    name: string;
    nonEmptyCount: number;
    missingCount: number;
    uniqueCount: number;
    isNumeric: boolean;
    isCategorical: boolean;
  }[];
}

export function summarizeDatasetForInsights({ rows, columns }: SmartInsightInputs): SmartInsightsSummary {
  const columnSummaries = columns.map(column => {
    let nonEmptyCount = 0;
    let missingCount = 0;
    const uniqueValues = new Set<string>();
    let numericCandidateCount = 0;

    rows.forEach(row => {
      const raw = row[column];
      if (raw === null || raw === undefined || raw === "") {
        missingCount += 1;
        return;
      }

      nonEmptyCount += 1;
      uniqueValues.add(String(raw));

      if (typeof raw === "number" && Number.isFinite(raw)) {
        numericCandidateCount += 1;
      } else if (typeof raw === "string") {
        const parsed = Number(raw);
        if (!Number.isNaN(parsed)) {
          numericCandidateCount += 1;
        }
      }
    });

    const isNumeric = numericCandidateCount / Math.max(1, nonEmptyCount) >= 0.9;
    const isCategorical = uniqueValues.size > 1 && uniqueValues.size <= Math.max(5, rows.length * 0.5);

    return {
      name: column,
      nonEmptyCount,
      missingCount,
      uniqueCount: uniqueValues.size,
      isNumeric,
      isCategorical,
    };
  });

  return { columnSummaries };
}

export function buildAlignedNumericVectors(
  rows: Record<string, unknown>[],
  columnA: string,
  columnB: string
): Array<{ a: number; b: number }> {
  const aligned: Array<{ a: number; b: number }> = [];

  rows.forEach(row => {
    const rawA = row[columnA];
    const rawB = row[columnB];
    const valueA = Number(rawA);
    const valueB = Number(rawB);

    if (Number.isFinite(valueA) && Number.isFinite(valueB)) {
      aligned.push({ a: valueA, b: valueB });
    }
  });

  return aligned;
}

export function calculatePearsonCorrelation(values: Array<{ a: number; b: number }>): number {
  const n = values.length;
  if (n === 0) return 0;

  let sumA = 0;
  let sumB = 0;
  let sumAB = 0;
  let sumA2 = 0;
  let sumB2 = 0;

  values.forEach(({ a, b }) => {
    sumA += a;
    sumB += b;
    sumAB += a * b;
    sumA2 += a * a;
    sumB2 += b * b;
  });

  const numerator = n * sumAB - sumA * sumB;
  const denominator = Math.sqrt((n * sumA2 - sumA * sumA) * (n * sumB2 - sumB * sumB));

  if (denominator === 0) return 0;
  return numerator / denominator;
}
