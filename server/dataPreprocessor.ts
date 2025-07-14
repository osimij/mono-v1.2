import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export interface PreprocessingOptions {
  removeEmptyRows?: boolean;
  removeEmptyColumns?: boolean;
  handleMissingValues?: 'remove' | 'fill' | 'keep';
  fillStrategy?: 'mean' | 'median' | 'mode' | 'zero' | 'forward' | 'backward';
  removeDuplicates?: boolean;
  normalizeText?: boolean;
  detectOutliers?: boolean;
  removeOutliers?: boolean;
  convertTypes?: boolean;
  trimWhitespace?: boolean;
  standardizeFormats?: boolean;
  encodeCategorical?: boolean;
  encodingStrategy?: 'auto' | 'onehot' | 'label' | 'target' | 'frequency';
  handleHighCardinality?: boolean;
  cardinalityThreshold?: number;
  scaleNumerical?: boolean;
  scalingMethod?: 'standard' | 'minmax' | 'robust' | 'none';
  // Advanced preprocessing options
  handleTextData?: boolean;
  textProcessingLevel?: 'basic' | 'advanced' | 'nlp';
  extractDateFeatures?: boolean;
  dateFeatureLevel?: 'basic' | 'detailed' | 'engineering';
  handleSkewness?: boolean;
  skewnessThreshold?: number;
  transformMethod?: 'log' | 'sqrt' | 'boxcox' | 'yeo-johnson' | 'auto';
  binNumerical?: boolean;
  binningStrategy?: 'equal-width' | 'equal-frequency' | 'kmeans' | 'quantile';
  numberOfBins?: number;
  createInteractions?: boolean;
  maxInteractionDegree?: number;
  aggregateTemporalData?: boolean;
  temporalAggregation?: 'hour' | 'day' | 'week' | 'month' | 'quarter';
  handleImbalancedData?: boolean;
  balancingMethod?: 'oversample' | 'undersample' | 'smote' | 'none';
  featureSelection?: boolean;
  selectionMethod?: 'correlation' | 'variance' | 'mutual-info' | 'chi2' | 'auto';
  correlationThreshold?: number;
  varianceThreshold?: number;
}

export interface PreprocessingResult {
  data: any[];
  columns: string[];
  originalRows: number;
  processedRows: number;
  removedRows: number;
  issues: DataIssue[];
  suggestions: string[];
  statistics: DataStatistics;
  encodingMap?: EncodingMap;
  scalingParams?: ScalingParams;
}

export interface EncodingMap {
  [column: string]: {
    type: 'onehot' | 'label' | 'target' | 'frequency';
    mapping?: { [value: string]: number };
    categories?: string[];
    encodedColumns?: string[];
  };
}

export interface ScalingParams {
  [column: string]: {
    method: 'standard' | 'minmax' | 'robust';
    mean?: number;
    std?: number;
    min?: number;
    max?: number;
    median?: number;
    q1?: number;
    q3?: number;
  };
}

export interface DataIssue {
  type: 'missing_values' | 'duplicates' | 'outliers' | 'inconsistent_types' | 'invalid_formats' | 'empty_columns';
  column?: string;
  count: number;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface DataStatistics {
  totalColumns: number;
  numericalColumns: number;
  categoricalColumns: number;
  dateColumns: number;
  missingValuePercentage: number;
  duplicateRowPercentage: number;
  dataQualityScore: number;
}

export class DataPreprocessor {
  
  static async preprocessData(
    buffer: Buffer, 
    filename: string, 
    options: PreprocessingOptions = {}
  ): Promise<PreprocessingResult> {
    
    // Set default options
    const defaultOptions: PreprocessingOptions = {
      removeEmptyRows: true,
      removeEmptyColumns: true,
      handleMissingValues: 'keep',
      fillStrategy: 'mean',
      removeDuplicates: true,
      normalizeText: true,
      detectOutliers: true,
      removeOutliers: false,
      convertTypes: true,
      trimWhitespace: true,
      standardizeFormats: true,
      encodeCategorical: true,
      encodingStrategy: 'auto',
      handleHighCardinality: true,
      cardinalityThreshold: 50,
      scaleNumerical: false,
      scalingMethod: 'standard',
      // Advanced options defaults
      handleTextData: true,
      textProcessingLevel: 'basic',
      extractDateFeatures: true,
      dateFeatureLevel: 'basic',
      handleSkewness: false,
      skewnessThreshold: 2.0,
      transformMethod: 'auto',
      binNumerical: false,
      binningStrategy: 'equal-width',
      numberOfBins: 5,
      createInteractions: false,
      maxInteractionDegree: 2,
      aggregateTemporalData: false,
      temporalAggregation: 'day',
      handleImbalancedData: false,
      balancingMethod: 'none',
      featureSelection: false,
      selectionMethod: 'auto',
      correlationThreshold: 0.95,
      varianceThreshold: 0.01
    };
    
    const config = { ...defaultOptions, ...options };
    
    // Parse the file
    let rawData: any[];
    let columns: string[];
    
    if (filename.endsWith('.csv') || filename.includes('csv')) {
      const result = this.parseCSV(buffer);
      rawData = result.data;
      columns = result.columns;
    } else if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
      const result = this.parseExcel(buffer);
      rawData = result.data;
      columns = result.columns;
    } else {
      throw new Error('Unsupported file format');
    }
    
    const originalRows = rawData.length;
    let processedData = [...rawData];
    const issues: DataIssue[] = [];
    const suggestions: string[] = [];
    
    // 1. Detect and analyze issues
    const detectionResult = this.detectDataIssues(processedData, columns);
    issues.push(...detectionResult.issues);
    
    // 2. Clean whitespace and normalize text
    if (config.trimWhitespace || config.normalizeText) {
      processedData = this.cleanTextData(processedData, config);
    }
    
    // 3. Remove empty rows and columns
    if (config.removeEmptyRows) {
      const beforeRows = processedData.length;
      processedData = this.removeEmptyRows(processedData);
      const removedEmptyRows = beforeRows - processedData.length;
      if (removedEmptyRows > 0) {
        console.log(`DEBUG: Removed ${removedEmptyRows} empty rows out of ${beforeRows}`);
        suggestions.push(`Removed ${removedEmptyRows} empty rows`);
      }
    }
    
    if (config.removeEmptyColumns) {
      const result = this.removeEmptyColumns(processedData, columns);
      processedData = result.data;
      columns = result.columns;
      if (result.removedColumns > 0) {
        suggestions.push(`Removed ${result.removedColumns} empty columns`);
      }
    }
    
    // 4. Handle duplicates
    if (config.removeDuplicates) {
      const beforeRows = processedData.length;
      processedData = this.removeDuplicateRows(processedData);
      const removedDuplicates = beforeRows - processedData.length;
      if (removedDuplicates > 0) {
        console.log(`DEBUG: Removed ${removedDuplicates} duplicate rows out of ${beforeRows}`);
        suggestions.push(`Removed ${removedDuplicates} duplicate rows`);
      }
    }
    
    // 5. Convert data types
    if (config.convertTypes) {
      processedData = this.convertDataTypes(processedData, columns);
      suggestions.push('Automatically detected and converted data types');
    }
    
    // 6. Handle missing values
    if (config.handleMissingValues !== 'keep') {
      const result = this.handleMissingValues(processedData, columns, config);
      processedData = result.data;
      if (result.changes > 0) {
        suggestions.push(`Handled ${result.changes} missing values using ${config.fillStrategy} strategy`);
      }
    }
    
    // 7. Handle outliers
    if (config.detectOutliers) {
      const outlierResult = this.detectOutliers(processedData, columns);
      if (outlierResult.outliers.length > 0) {
        issues.push({
          type: 'outliers',
          count: outlierResult.outliers.length,
          severity: 'medium',
          description: `Found ${outlierResult.outliers.length} potential outliers`
        });
        
        if (config.removeOutliers) {
          processedData = this.removeOutlierRows(processedData, outlierResult.outliers);
          suggestions.push(`Removed ${outlierResult.outliers.length} outlier rows`);
        }
      }
    }
    
    // 8. Standardize formats
    if (config.standardizeFormats) {
      processedData = this.standardizeFormats(processedData, columns);
    }
    
    // 9. Handle categorical encoding
    let encodingMap: EncodingMap = {};
    if (config.encodeCategorical) {
      const encodingResult = this.encodeCategoricalVariables(processedData, columns, config);
      processedData = encodingResult.data;
      columns = encodingResult.columns;
      encodingMap = encodingResult.encodingMap;
      suggestions.push(...encodingResult.suggestions);
    }

    // 10. Scale numerical variables
    let scalingParams: ScalingParams = {};
    if (config.scaleNumerical && config.scalingMethod !== 'none') {
      const scalingResult = this.scaleNumericalVariables(processedData, columns, config);
      processedData = scalingResult.data;
      scalingParams = scalingResult.scalingParams;
      suggestions.push(...scalingResult.suggestions);
    }

    // 11. Advanced text processing
    if (config.handleTextData && config.textProcessingLevel !== 'basic') {
      const textResult = this.processTextData(processedData, columns, config);
      processedData = textResult.data;
      columns = textResult.columns;
      suggestions.push(...textResult.suggestions);
    }

    // 12. Extract date features
    if (config.extractDateFeatures) {
      const dateResult = this.extractDateFeatures(processedData, columns, config);
      processedData = dateResult.data;
      columns = dateResult.columns;
      suggestions.push(...dateResult.suggestions);
    }

    // 13. Handle skewed distributions
    if (config.handleSkewness) {
      const skewnessResult = this.handleSkewedDistributions(processedData, columns, config);
      processedData = skewnessResult.data;
      suggestions.push(...skewnessResult.suggestions);
    }

    // 14. Create numerical bins
    if (config.binNumerical) {
      const binningResult = this.createNumericalBins(processedData, columns, config);
      processedData = binningResult.data;
      columns = binningResult.columns;
      suggestions.push(...binningResult.suggestions);
    }

    // 15. Feature selection
    if (config.featureSelection) {
      const selectionResult = this.performFeatureSelection(processedData, columns, config);
      processedData = selectionResult.data;
      columns = selectionResult.columns;
      suggestions.push(...selectionResult.suggestions);
    }
    
    // Calculate final statistics
    const statistics = this.calculateStatistics(processedData, columns);
    
    return {
      data: processedData,
      columns,
      originalRows,
      processedRows: processedData.length,
      removedRows: originalRows - processedData.length,
      issues,
      suggestions,
      statistics,
      encodingMap,
      scalingParams
    };
  }
  
  private static parseCSV(buffer: Buffer): { data: any[]; columns: string[] } {
    const csvText = buffer.toString('utf-8');
    const parseResult = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: false, // We'll handle empty lines ourselves
      dynamicTyping: false, // We'll handle type conversion ourselves
      trimHeaders: true,
      quotes: true,
      escapeChar: '"',
      delimiter: ',',
      transform: (value: string) => {
        // Handle common encoding issues and clean values
        return value?.trim() || '';
      }
    });
    
    // Only throw error if there are critical parsing errors, not minor ones
    const criticalErrors = parseResult.errors.filter(error => 
      error.type === 'Delimiter' || error.type === 'Quotes'
    );
    
    if (criticalErrors.length > 0) {
      console.log('CSV parsing critical errors:', criticalErrors);
      throw new Error(`Critical CSV parsing errors: ${criticalErrors.map(e => e.message).join(', ')}`);
    }
    
    if (parseResult.errors.length > 0) {
      console.log('CSV parsing warnings (non-critical):', parseResult.errors);
    }
    
    return {
      data: parseResult.data as any[],
      columns: parseResult.meta.fields || []
    };
  }
  
  private static parseExcel(buffer: Buffer): { data: any[]; columns: string[] } {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      defval: null,
      blankrows: false
    }) as any[][];
    
    if (jsonData.length === 0) {
      throw new Error('Excel file appears to be empty');
    }
    
    const columns = (jsonData[0] || []).map((col: any) => String(col || '').trim()).filter(Boolean);
    const data = jsonData.slice(1).map(row => {
      const obj: any = {};
      columns.forEach((col, index) => {
        obj[col] = row[index] !== undefined ? row[index] : null;
      });
      return obj;
    });
    
    return { data, columns };
  }
  
  private static detectDataIssues(data: any[], columns: string[]): { issues: DataIssue[] } {
    const issues: DataIssue[] = [];
    
    // Check for missing values
    columns.forEach(column => {
      const missingCount = data.filter(row => 
        row[column] === null || 
        row[column] === undefined || 
        row[column] === '' ||
        (typeof row[column] === 'string' && row[column].trim() === '')
      ).length;
      
      if (missingCount > 0) {
        const percentage = (missingCount / data.length) * 100;
        issues.push({
          type: 'missing_values',
          column,
          count: missingCount,
          severity: percentage > 50 ? 'high' : percentage > 20 ? 'medium' : 'low',
          description: `${missingCount} missing values (${percentage.toFixed(1)}%) in column "${column}"`
        });
      }
    });
    
    // Check for duplicate rows
    const uniqueRows = new Set(data.map(row => JSON.stringify(row)));
    const duplicateCount = data.length - uniqueRows.size;
    if (duplicateCount > 0) {
      issues.push({
        type: 'duplicates',
        count: duplicateCount,
        severity: duplicateCount > data.length * 0.1 ? 'high' : 'medium',
        description: `${duplicateCount} duplicate rows found`
      });
    }
    
    // Check for empty columns
    columns.forEach(column => {
      const nonEmptyCount = data.filter(row => 
        row[column] !== null && 
        row[column] !== undefined && 
        row[column] !== '' &&
        !(typeof row[column] === 'string' && row[column].trim() === '')
      ).length;
      
      if (nonEmptyCount === 0) {
        issues.push({
          type: 'empty_columns',
          column,
          count: 1,
          severity: 'medium',
          description: `Column "${column}" is completely empty`
        });
      }
    });
    
    return { issues };
  }
  
  private static cleanTextData(data: any[], config: PreprocessingOptions): any[] {
    return data.map(row => {
      const cleanRow: any = {};
      Object.keys(row).forEach(key => {
        let value = row[key];
        
        if (typeof value === 'string') {
          if (config.trimWhitespace) {
            value = value.trim();
          }
          
          if (config.normalizeText) {
            // Remove extra whitespace
            value = value.replace(/\s+/g, ' ');
            // Handle common text issues
            value = value.replace(/[""]/g, '"')
                        .replace(/['']/g, "'")
                        .replace(/…/g, '...');
          }
        }
        
        cleanRow[key] = value;
      });
      return cleanRow;
    });
  }
  
  private static removeEmptyRows(data: any[]): any[] {
    return data.filter(row => {
      const values = Object.values(row);
      return values.some(value => 
        value !== null && 
        value !== undefined && 
        value !== '' &&
        !(typeof value === 'string' && value.trim() === '')
      );
    });
  }
  
  private static removeEmptyColumns(data: any[], columns: string[]): { data: any[]; columns: string[]; removedColumns: number } {
    const activeColumns = columns.filter(column => {
      return data.some(row => 
        row[column] !== null && 
        row[column] !== undefined && 
        row[column] !== '' &&
        !(typeof row[column] === 'string' && row[column].trim() === '')
      );
    });
    
    const cleanData = data.map(row => {
      const cleanRow: any = {};
      activeColumns.forEach(col => {
        cleanRow[col] = row[col];
      });
      return cleanRow;
    });
    
    return {
      data: cleanData,
      columns: activeColumns,
      removedColumns: columns.length - activeColumns.length
    };
  }
  
  private static removeDuplicateRows(data: any[]): any[] {
    const seen = new Set();
    return data.filter(row => {
      const key = JSON.stringify(row);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
  
  private static convertDataTypes(data: any[], columns: string[]): any[] {
    // Analyze each column to determine the best data type
    const columnTypes: { [key: string]: 'number' | 'boolean' | 'date' | 'string' } = {};
    
    columns.forEach(column => {
      const values = data.map(row => row[column]).filter(v => v !== null && v !== undefined && v !== '');
      
      if (values.length === 0) {
        columnTypes[column] = 'string';
        return;
      }
      
      // Check for boolean
      const uniqueValues = new Set(values.map(v => String(v).toLowerCase().trim()));
      if (uniqueValues.size <= 2 && 
          Array.from(uniqueValues).every(v => 
            ['true', 'false', 'yes', 'no', '1', '0', 'y', 'n'].includes(v)
          )) {
        columnTypes[column] = 'boolean';
        return;
      }
      
      // Check for numbers
      const numberValues = values.filter(v => {
        const str = String(v).replace(/[$,\s%]/g, '');
        return !isNaN(parseFloat(str)) && isFinite(parseFloat(str));
      });
      
      if (numberValues.length / values.length > 0.8) {
        columnTypes[column] = 'number';
        return;
      }
      
      // Check for dates
      const dateValues = values.filter(v => {
        const date = new Date(v);
        return !isNaN(date.getTime());
      });
      
      if (dateValues.length / values.length > 0.7) {
        columnTypes[column] = 'date';
        return;
      }
      
      columnTypes[column] = 'string';
    });
    
    // Convert the data
    return data.map(row => {
      const convertedRow: any = {};
      columns.forEach(column => {
        let value = row[column];
        
        if (value === null || value === undefined || value === '') {
          convertedRow[column] = null;
          return;
        }
        
        switch (columnTypes[column]) {
          case 'number':
            const cleanNum = String(value).replace(/[$,\s%]/g, '');
            convertedRow[column] = isNaN(parseFloat(cleanNum)) ? null : parseFloat(cleanNum);
            break;
            
          case 'boolean':
            const str = String(value).toLowerCase().trim();
            convertedRow[column] = ['true', 'yes', '1', 'y'].includes(str);
            break;
            
          case 'date':
            const date = new Date(value);
            convertedRow[column] = isNaN(date.getTime()) ? null : date.toISOString();
            break;
            
          default:
            convertedRow[column] = String(value);
        }
      });
      return convertedRow;
    });
  }
  
  private static handleMissingValues(
    data: any[], 
    columns: string[], 
    config: PreprocessingOptions
  ): { data: any[]; changes: number } {
    let changes = 0;
    
    if (config.handleMissingValues === 'remove') {
      const originalLength = data.length;
      const cleanData = data.filter(row => 
        columns.every(col => row[col] !== null && row[col] !== undefined && row[col] !== '')
      );
      changes = originalLength - cleanData.length;
      return { data: cleanData, changes };
    }
    
    if (config.handleMissingValues === 'fill') {
      const filledData = data.map(row => ({ ...row }));
      
      columns.forEach(column => {
        const values = data.map(row => row[column]).filter(v => v !== null && v !== undefined && v !== '');
        
        if (values.length === 0) return;
        
        let fillValue: any;
        const sampleValue = values[0];
        
        if (typeof sampleValue === 'number') {
          switch (config.fillStrategy) {
            case 'mean':
              fillValue = values.reduce((sum, val) => sum + val, 0) / values.length;
              break;
            case 'median':
              const sorted = [...values].sort((a, b) => a - b);
              fillValue = sorted[Math.floor(sorted.length / 2)];
              break;
            case 'zero':
              fillValue = 0;
              break;
            default:
              fillValue = values[0];
          }
        } else {
          // For non-numeric data, use mode or forward fill
          if (config.fillStrategy === 'mode') {
            const counts: { [key: string]: number } = {};
            values.forEach(val => {
              const key = String(val);
              counts[key] = (counts[key] || 0) + 1;
            });
            fillValue = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
          } else {
            fillValue = values[0]; // Forward fill
          }
        }
        
        filledData.forEach(row => {
          if (row[column] === null || row[column] === undefined || row[column] === '') {
            row[column] = fillValue;
            changes++;
          }
        });
      });
      
      return { data: filledData, changes };
    }
    
    return { data, changes: 0 };
  }
  
  private static detectOutliers(data: any[], columns: string[]): { outliers: number[] } {
    const outlierRows = new Set<number>();
    
    columns.forEach(column => {
      const values = data.map(row => row[column])
        .filter(v => typeof v === 'number' && !isNaN(v))
        .map(v => Number(v));
      
      if (values.length < 4) return; // Need enough data for outlier detection
      
      // Use IQR method
      const sorted = [...values].sort((a, b) => a - b);
      const q1 = sorted[Math.floor(sorted.length * 0.25)];
      const q3 = sorted[Math.floor(sorted.length * 0.75)];
      const iqr = q3 - q1;
      const lowerBound = q1 - 1.5 * iqr;
      const upperBound = q3 + 1.5 * iqr;
      
      data.forEach((row, index) => {
        const value = Number(row[column]);
        if (typeof value === 'number' && !isNaN(value)) {
          if (value < lowerBound || value > upperBound) {
            outlierRows.add(index);
          }
        }
      });
    });
    
    return { outliers: Array.from(outlierRows) };
  }
  
  private static removeOutlierRows(data: any[], outlierIndices: number[]): any[] {
    return data.filter((_, index) => !outlierIndices.includes(index));
  }
  
  private static standardizeFormats(data: any[], columns: string[]): any[] {
    return data.map(row => {
      const standardizedRow: any = {};
      columns.forEach(column => {
        let value = row[column];
        
        if (typeof value === 'string') {
          // Standardize phone numbers
          if (/[\d\s\-\(\)\.+]{10,}/.test(value)) {
            value = value.replace(/\D/g, '');
            if (value.length === 10) {
              value = `${value.slice(0, 3)}-${value.slice(3, 6)}-${value.slice(6)}`;
            }
          }
          
          // Standardize email addresses
          if (value.includes('@')) {
            value = value.toLowerCase().trim();
          }
          
          // Standardize currency
          if (/\$[\d,\.]+/.test(value)) {
            const numValue = parseFloat(value.replace(/[$,]/g, ''));
            if (!isNaN(numValue)) {
              value = numValue;
            }
          }
        }
        
        standardizedRow[column] = value;
      });
      return standardizedRow;
    });
  }
  
  private static calculateStatistics(data: any[], columns: string[]): DataStatistics {
    const numericalColumns = columns.filter(col => {
      const values = data.map(row => row[col]).filter(v => v !== null && v !== undefined);
      return values.length > 0 && values.every(v => typeof v === 'number');
    });
    
    const dateColumns = columns.filter(col => {
      const values = data.map(row => row[col]).filter(v => v !== null && v !== undefined);
      return values.length > 0 && values.some(v => typeof v === 'string' && !isNaN(new Date(v).getTime()));
    });
    
    const categoricalColumns = columns.length - numericalColumns.length - dateColumns.length;
    
    const totalCells = data.length * columns.length;
    const missingCells = data.reduce((sum, row) => {
      return sum + columns.filter(col => 
        row[col] === null || row[col] === undefined || row[col] === ''
      ).length;
    }, 0);
    
    const uniqueRows = new Set(data.map(row => JSON.stringify(row))).size;
    const duplicateRowPercentage = ((data.length - uniqueRows) / data.length) * 100;
    
    const missingValuePercentage = (missingCells / totalCells) * 100;
    
    // Calculate data quality score (0-100)
    let qualityScore = 100;
    qualityScore -= missingValuePercentage; // Reduce by missing value percentage
    qualityScore -= duplicateRowPercentage; // Reduce by duplicate percentage
    qualityScore = Math.max(0, Math.min(100, qualityScore));
    
    return {
      totalColumns: columns.length,
      numericalColumns: numericalColumns.length,
      categoricalColumns,
      dateColumns: dateColumns.length,
      missingValuePercentage,
      duplicateRowPercentage,
      dataQualityScore: qualityScore
    };
  }

  // Smart Categorical Encoding Methods
  private static encodeCategoricalVariables(
    data: any[], 
    columns: string[], 
    config: PreprocessingOptions
  ): { data: any[]; columns: string[]; encodingMap: EncodingMap; suggestions: string[] } {
    const encodingMap: EncodingMap = {};
    const suggestions: string[] = [];
    let processedData = [...data];
    let updatedColumns = [...columns];

    // Identify categorical columns
    const categoricalColumns = this.identifyCategoricalColumns(data, columns);
    
    for (const column of categoricalColumns) {
      const uniqueValues = [...new Set(data.map(row => row[column]).filter(v => v != null && v !== ''))];
      const cardinality = uniqueValues.length;
      
      // Skip if no values or all unique (likely ID columns)
      if (cardinality === 0 || cardinality === data.length) continue;
      
      let encodingType: 'onehot' | 'label' | 'target' | 'frequency';
      
      // Smart encoding strategy selection
      if (config.encodingStrategy === 'auto') {
        if (cardinality === 2) {
          // Binary: use label encoding (0/1)
          encodingType = 'label';
        } else if (cardinality <= 10) {
          // Low cardinality: use one-hot encoding
          encodingType = 'onehot';
        } else if (cardinality <= (config.cardinalityThreshold || 50)) {
          // Medium cardinality: use frequency encoding
          encodingType = 'frequency';
        } else {
          // High cardinality: use target encoding or frequency if no target
          encodingType = 'frequency';
        }
      } else {
        encodingType = config.encodingStrategy as any;
      }

      // Apply encoding
      const encodingResult = this.applyEncoding(processedData, column, encodingType, uniqueValues);
      processedData = encodingResult.data;
      
      // Update encoding map
      encodingMap[column] = {
        type: encodingType,
        ...encodingResult.metadata
      };

      // Update columns for one-hot encoding
      if (encodingType === 'onehot') {
        // Remove original column and add encoded columns
        updatedColumns = updatedColumns.filter(col => col !== column);
        updatedColumns.push(...encodingResult.newColumns);
        suggestions.push(`Applied one-hot encoding to '${column}' (${cardinality} categories)`);
      } else {
        suggestions.push(`Applied ${encodingType} encoding to '${column}' (${cardinality} categories)`);
      }
    }

    return {
      data: processedData,
      columns: updatedColumns,
      encodingMap,
      suggestions
    };
  }

  private static identifyCategoricalColumns(data: any[], columns: string[]): string[] {
    return columns.filter(column => {
      const values = data.map(row => row[column]).filter(v => v != null && v !== '');
      
      // Skip if mostly empty
      if (values.length < data.length * 0.1) return false;
      
      // Check if it's numerical
      const numericValues = values.filter(v => !isNaN(Number(v)) && Number(v).toString() === v.toString());
      const numericRatio = numericValues.length / values.length;
      
      // If more than 80% are numeric, treat as numeric
      if (numericRatio > 0.8) return false;
      
      // Check for date patterns
      const dateValues = values.filter(v => !isNaN(new Date(v).getTime()) && typeof v === 'string');
      if (dateValues.length / values.length > 0.5) return false;
      
      // Check uniqueness ratio
      const uniqueValues = new Set(values).size;
      const uniqueRatio = uniqueValues / values.length;
      
      // If too unique (like IDs), skip
      if (uniqueRatio > 0.9) return false;
      
      return true;
    });
  }

  private static applyEncoding(
    data: any[], 
    column: string, 
    encodingType: 'onehot' | 'label' | 'frequency', 
    uniqueValues: any[]
  ): { data: any[]; metadata: any; newColumns: string[] } {
    const processedData = [...data];
    let metadata: any = {};
    let newColumns: string[] = [];

    switch (encodingType) {
      case 'label':
        // Simple label encoding: assign numbers 0, 1, 2...
        const labelMapping: { [key: string]: number } = {};
        uniqueValues.forEach((value, index) => {
          labelMapping[value] = index;
        });
        
        processedData.forEach(row => {
          if (row[column] != null && row[column] !== '') {
            row[column] = labelMapping[row[column]] ?? -1;
          } else {
            row[column] = -1; // Missing values
          }
        });
        
        metadata = { mapping: labelMapping };
        break;

      case 'onehot':
        // One-hot encoding: create binary columns for each category
        newColumns = uniqueValues.map(value => `${column}_${String(value).replace(/[^a-zA-Z0-9]/g, '_')}`);
        
        processedData.forEach(row => {
          const originalValue = row[column];
          
          // Remove original column
          delete row[column];
          
          // Add one-hot columns
          newColumns.forEach(newCol => {
            const categoryValue = newCol.split('_').slice(1).join('_');
            const originalCategory = uniqueValues.find(v => 
              String(v).replace(/[^a-zA-Z0-9]/g, '_') === categoryValue
            );
            row[newCol] = (originalValue === originalCategory) ? 1 : 0;
          });
        });
        
        metadata = { categories: uniqueValues, encodedColumns: newColumns };
        break;

      case 'frequency':
        // Frequency encoding: replace with frequency count
        const frequencyMap: { [key: string]: number } = {};
        uniqueValues.forEach(value => {
          frequencyMap[value] = data.filter(row => row[column] === value).length;
        });
        
        processedData.forEach(row => {
          if (row[column] != null && row[column] !== '') {
            row[column] = frequencyMap[row[column]] ?? 0;
          } else {
            row[column] = 0; // Missing values
          }
        });
        
        metadata = { mapping: frequencyMap };
        break;
    }

    return { data: processedData, metadata, newColumns };
  }

  // Numerical Scaling Methods
  private static scaleNumericalVariables(
    data: any[], 
    columns: string[], 
    config: PreprocessingOptions
  ): { data: any[]; scalingParams: ScalingParams; suggestions: string[] } {
    const scalingParams: ScalingParams = {};
    const suggestions: string[] = [];
    const processedData = [...data];

    // Identify numerical columns
    const numericalColumns = columns.filter(column => {
      const values = data.map(row => row[column]).filter(v => v != null && v !== '');
      const numericValues = values.filter(v => !isNaN(Number(v)));
      return numericValues.length / values.length > 0.8; // 80% numeric
    });

    for (const column of numericalColumns) {
      const values = data.map(row => Number(row[column])).filter(v => !isNaN(v));
      
      if (values.length === 0) continue;

      let scalingMethod = config.scalingMethod || 'standard';
      const params: any = { method: scalingMethod };

      switch (scalingMethod) {
        case 'standard':
          // Z-score normalization: (x - mean) / std
          const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
          const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
          const std = Math.sqrt(variance);
          
          if (std > 0) {
            processedData.forEach(row => {
              const val = Number(row[column]);
              if (!isNaN(val)) {
                row[column] = (val - mean) / std;
              }
            });
            
            params.mean = mean;
            params.std = std;
            suggestions.push(`Applied standard scaling to '${column}' (mean=${mean.toFixed(2)}, std=${std.toFixed(2)})`);
          }
          break;

        case 'minmax':
          // Min-max normalization: (x - min) / (max - min)
          const min = Math.min(...values);
          const max = Math.max(...values);
          const range = max - min;
          
          if (range > 0) {
            processedData.forEach(row => {
              const val = Number(row[column]);
              if (!isNaN(val)) {
                row[column] = (val - min) / range;
              }
            });
            
            params.min = min;
            params.max = max;
            suggestions.push(`Applied min-max scaling to '${column}' (range: ${min.toFixed(2)} to ${max.toFixed(2)})`);
          }
          break;

        case 'robust':
          // Robust scaling: (x - median) / IQR
          const sorted = [...values].sort((a, b) => a - b);
          const median = sorted[Math.floor(sorted.length / 2)];
          const q1 = sorted[Math.floor(sorted.length * 0.25)];
          const q3 = sorted[Math.floor(sorted.length * 0.75)];
          const iqr = q3 - q1;
          
          if (iqr > 0) {
            processedData.forEach(row => {
              const val = Number(row[column]);
              if (!isNaN(val)) {
                row[column] = (val - median) / iqr;
              }
            });
            
            params.median = median;
            params.q1 = q1;
            params.q3 = q3;
            suggestions.push(`Applied robust scaling to '${column}' (median=${median.toFixed(2)}, IQR=${iqr.toFixed(2)})`);
          }
          break;
      }

      scalingParams[column] = params;
    }

    return { data: processedData, scalingParams, suggestions };
  }

  // Advanced Text Processing
  private static processTextData(
    data: any[], 
    columns: string[], 
    config: PreprocessingOptions
  ): { data: any[]; columns: string[]; suggestions: string[] } {
    const suggestions: string[] = [];
    const processedData = [...data];
    let updatedColumns = [...columns];

    const textColumns = this.identifyTextColumns(data, columns);
    
    for (const column of textColumns) {
      if (config.textProcessingLevel === 'advanced') {
        // Extract text features
        const textLength = `${column}_length`;
        const wordCount = `${column}_word_count`;
        const avgWordLength = `${column}_avg_word_length`;
        
        processedData.forEach(row => {
          const text = String(row[column] || '');
          row[textLength] = text.length;
          const words = text.split(/\s+/).filter(w => w.length > 0);
          row[wordCount] = words.length;
          row[avgWordLength] = words.length > 0 ? words.reduce((sum, w) => sum + w.length, 0) / words.length : 0;
        });
        
        updatedColumns.push(textLength, wordCount, avgWordLength);
        suggestions.push(`Extracted text features from '${column}': length, word count, average word length`);
      }
      
      if (config.textProcessingLevel === 'nlp') {
        // Basic NLP features
        const hasNumbers = `${column}_has_numbers`;
        const hasSpecialChars = `${column}_has_special_chars`;
        const isUpperCase = `${column}_is_uppercase`;
        
        processedData.forEach(row => {
          const text = String(row[column] || '');
          row[hasNumbers] = /\d/.test(text) ? 1 : 0;
          row[hasSpecialChars] = /[!@#$%^&*(),.?":{}|<>]/.test(text) ? 1 : 0;
          row[isUpperCase] = text === text.toUpperCase() && text.length > 0 ? 1 : 0;
        });
        
        updatedColumns.push(hasNumbers, hasSpecialChars, isUpperCase);
        suggestions.push(`Applied NLP preprocessing to '${column}': number detection, special characters, case analysis`);
      }
    }

    return { data: processedData, columns: updatedColumns, suggestions };
  }

  private static identifyTextColumns(data: any[], columns: string[]): string[] {
    return columns.filter(column => {
      const values = data.map(row => row[column]).filter(v => v != null && v !== '');
      if (values.length === 0) return false;
      
      // Check if values are long text (average length > 20 characters)
      const avgLength = values.reduce((sum, v) => sum + String(v).length, 0) / values.length;
      return avgLength > 20 && values.some(v => String(v).includes(' '));
    });
  }

  // Date Feature Extraction
  private static extractDateFeatures(
    data: any[], 
    columns: string[], 
    config: PreprocessingOptions
  ): { data: any[]; columns: string[]; suggestions: string[] } {
    const suggestions: string[] = [];
    const processedData = [...data];
    let updatedColumns = [...columns];

    const dateColumns = this.identifyDateColumns(data, columns);
    
    for (const column of dateColumns) {
      const validDates = data.map(row => {
        const dateValue = row[column];
        const date = new Date(dateValue);
        return isNaN(date.getTime()) ? null : date;
      });

      if (validDates.filter(d => d !== null).length === 0) continue;

      // Basic date features
      const year = `${column}_year`;
      const month = `${column}_month`;
      const dayOfWeek = `${column}_day_of_week`;
      
      processedData.forEach((row, index) => {
        const date = validDates[index];
        if (date) {
          row[year] = date.getFullYear();
          row[month] = date.getMonth() + 1;
          row[dayOfWeek] = date.getDay();
        } else {
          row[year] = null;
          row[month] = null;
          row[dayOfWeek] = null;
        }
      });
      
      updatedColumns.push(year, month, dayOfWeek);
      
      if (config.dateFeatureLevel === 'detailed') {
        // Additional features
        const quarter = `${column}_quarter`;
        const weekOfYear = `${column}_week_of_year`;
        const isWeekend = `${column}_is_weekend`;
        
        processedData.forEach((row, index) => {
          const date = validDates[index];
          if (date) {
            row[quarter] = Math.floor((date.getMonth() + 3) / 3);
            row[weekOfYear] = this.getWeekOfYear(date);
            row[isWeekend] = (date.getDay() === 0 || date.getDay() === 6) ? 1 : 0;
          } else {
            row[quarter] = null;
            row[weekOfYear] = null;
            row[isWeekend] = null;
          }
        });
        
        updatedColumns.push(quarter, weekOfYear, isWeekend);
      }
      
      if (config.dateFeatureLevel === 'engineering') {
        // Time-based features
        const hourOfDay = `${column}_hour`;
        const isBusinessHour = `${column}_is_business_hour`;
        
        processedData.forEach((row, index) => {
          const date = validDates[index];
          if (date) {
            row[hourOfDay] = date.getHours();
            row[isBusinessHour] = (date.getHours() >= 9 && date.getHours() <= 17) ? 1 : 0;
          } else {
            row[hourOfDay] = null;
            row[isBusinessHour] = null;
          }
        });
        
        updatedColumns.push(hourOfDay, isBusinessHour);
      }
      
      suggestions.push(`Extracted date features from '${column}': year, month, day of week${config.dateFeatureLevel === 'detailed' ? ', quarter, week of year, weekend indicator' : ''}${config.dateFeatureLevel === 'engineering' ? ', hour, business hour indicator' : ''}`);
    }

    return { data: processedData, columns: updatedColumns, suggestions };
  }

  private static identifyDateColumns(data: any[], columns: string[]): string[] {
    return columns.filter(column => {
      const values = data.map(row => row[column]).filter(v => v != null && v !== '');
      if (values.length === 0) return false;
      
      // Check if values look like actual dates, not just numbers
      const dateValues = values.filter(v => {
        const str = String(v).trim();
        
        // Skip pure numbers (they create valid Date objects but aren't real dates)
        if (/^\d+$/.test(str) || /^\d*\.?\d+$/.test(str)) return false;
        
        // Look for actual date patterns
        const hasDateSeparators = /[-\/\s]/.test(str);
        const hasDateKeywords = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(str);
        
        if (!hasDateSeparators && !hasDateKeywords) return false;
        
        const date = new Date(str);
        return !isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2100;
      });
      
      return dateValues.length / values.length > 0.7; // 70% valid dates
    });
  }

  private static getWeekOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 1);
    const diff = date.getTime() - start.getTime();
    return Math.ceil(diff / (7 * 24 * 60 * 60 * 1000));
  }

  // Handle Skewed Distributions
  private static handleSkewedDistributions(
    data: any[], 
    columns: string[], 
    config: PreprocessingOptions
  ): { data: any[]; suggestions: string[] } {
    const suggestions: string[] = [];
    const processedData = [...data];

    const numericalColumns = this.identifyNumericalColumns(data, columns);
    
    for (const column of numericalColumns) {
      const values = data.map(row => Number(row[column])).filter(v => !isNaN(v) && v > 0);
      if (values.length < 10) continue;

      const skewness = this.calculateSkewness(values);
      
      if (Math.abs(skewness) > (config.skewnessThreshold || 2.0)) {
        let transformMethod = config.transformMethod;
        
        if (transformMethod === 'auto') {
          // Auto-select transformation based on data characteristics
          if (skewness > 0) {
            transformMethod = values.every(v => v > 0) ? 'log' : 'sqrt';
          } else {
            transformMethod = 'sqrt'; // For negative skew
          }
        }
        
        processedData.forEach(row => {
          const value = Number(row[column]);
          if (!isNaN(value) && value > 0) {
            switch (transformMethod) {
              case 'log':
                row[column] = Math.log(value + 1); // log1p to handle zeros
                break;
              case 'sqrt':
                row[column] = Math.sqrt(value);
                break;
              case 'boxcox':
                // Simplified Box-Cox (lambda = 0.5)
                row[column] = Math.sqrt(value);
                break;
              default:
                break;
            }
          }
        });
        
        suggestions.push(`Applied ${transformMethod} transformation to '${column}' (skewness: ${skewness.toFixed(2)})`);
      }
    }

    return { data: processedData, suggestions };
  }

  private static calculateSkewness(values: number[]): number {
    const n = values.length;
    const mean = values.reduce((sum, val) => sum + val, 0) / n;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    
    if (stdDev === 0) return 0;
    
    const skewness = values.reduce((sum, val) => sum + Math.pow((val - mean) / stdDev, 3), 0) / n;
    return skewness;
  }

  // Numerical Binning
  private static createNumericalBins(
    data: any[], 
    columns: string[], 
    config: PreprocessingOptions
  ): { data: any[]; columns: string[]; suggestions: string[] } {
    const suggestions: string[] = [];
    const processedData = [...data];
    let updatedColumns = [...columns];

    const numericalColumns = this.identifyNumericalColumns(data, columns);
    
    for (const column of numericalColumns) {
      const values = data.map(row => Number(row[column])).filter(v => !isNaN(v));
      if (values.length === 0) continue;

      const binColumn = `${column}_bin`;
      const numberOfBins = config.numberOfBins || 5;
      
      let bins: number[] = [];
      
      switch (config.binningStrategy) {
        case 'equal-width':
          const min = Math.min(...values);
          const max = Math.max(...values);
          const width = (max - min) / numberOfBins;
          bins = Array.from({ length: numberOfBins + 1 }, (_, i) => min + i * width);
          break;
          
        case 'equal-frequency':
        case 'quantile':
          const sorted = [...values].sort((a, b) => a - b);
          bins = Array.from({ length: numberOfBins + 1 }, (_, i) => {
            const index = Math.floor((i * sorted.length) / numberOfBins);
            return sorted[Math.min(index, sorted.length - 1)];
          });
          break;
          
        default:
          // Default to equal-width
          const minVal = Math.min(...values);
          const maxVal = Math.max(...values);
          const binWidth = (maxVal - minVal) / numberOfBins;
          bins = Array.from({ length: numberOfBins + 1 }, (_, i) => minVal + i * binWidth);
      }
      
      processedData.forEach(row => {
        const value = Number(row[column]);
        if (!isNaN(value)) {
          // Find which bin the value belongs to
          let binIndex = 0;
          for (let i = 1; i < bins.length; i++) {
            if (value <= bins[i]) {
              binIndex = i - 1;
              break;
            }
          }
          if (value > bins[bins.length - 1]) binIndex = numberOfBins - 1;
          row[binColumn] = binIndex;
        } else {
          row[binColumn] = null;
        }
      });
      
      updatedColumns.push(binColumn);
      suggestions.push(`Created ${numberOfBins} bins for '${column}' using ${config.binningStrategy} strategy`);
    }

    return { data: processedData, columns: updatedColumns, suggestions };
  }

  private static identifyNumericalColumns(data: any[], columns: string[]): string[] {
    return columns.filter(column => {
      const values = data.map(row => row[column]).filter(v => v != null && v !== '');
      const numericValues = values.filter(v => !isNaN(Number(v)));
      return numericValues.length / values.length > 0.8; // 80% numeric
    });
  }

  // Feature Selection
  private static performFeatureSelection(
    data: any[], 
    columns: string[], 
    config: PreprocessingOptions
  ): { data: any[]; columns: string[]; suggestions: string[] } {
    const suggestions: string[] = [];
    let processedData = [...data];
    let selectedColumns = [...columns];

    // Remove low variance features
    if (config.selectionMethod === 'variance' || config.selectionMethod === 'auto') {
      const varianceResult = this.removeLoVarianceFeatures(processedData, selectedColumns, config.varianceThreshold || 0.01);
      processedData = varianceResult.data;
      selectedColumns = varianceResult.columns;
      suggestions.push(...varianceResult.suggestions);
    }

    // Remove highly correlated features
    if (config.selectionMethod === 'correlation' || config.selectionMethod === 'auto') {
      const correlationResult = this.removeHighlyCorrelatedFeatures(processedData, selectedColumns, config.correlationThreshold || 0.95);
      processedData = correlationResult.data;
      selectedColumns = correlationResult.columns;
      suggestions.push(...correlationResult.suggestions);
    }

    return { data: processedData, columns: selectedColumns, suggestions };
  }

  private static removeLoVarianceFeatures(
    data: any[], 
    columns: string[], 
    threshold: number
  ): { data: any[]; columns: string[]; suggestions: string[] } {
    const suggestions: string[] = [];
    const numericalColumns = this.identifyNumericalColumns(data, columns);
    const columnsToRemove: string[] = [];

    for (const column of numericalColumns) {
      const values = data.map(row => Number(row[column])).filter(v => !isNaN(v));
      if (values.length === 0) continue;

      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
      
      if (variance < threshold) {
        columnsToRemove.push(column);
      }
    }

    if (columnsToRemove.length > 0) {
      const filteredColumns = columns.filter(col => !columnsToRemove.includes(col));
      const filteredData = data.map(row => {
        const newRow: any = {};
        filteredColumns.forEach(col => {
          newRow[col] = row[col];
        });
        return newRow;
      });
      
      suggestions.push(`Removed ${columnsToRemove.length} low variance features: ${columnsToRemove.join(', ')}`);
      return { data: filteredData, columns: filteredColumns, suggestions };
    }

    return { data, columns, suggestions };
  }

  private static removeHighlyCorrelatedFeatures(
    data: any[], 
    columns: string[], 
    threshold: number
  ): { data: any[]; columns: string[]; suggestions: string[] } {
    const suggestions: string[] = [];
    const numericalColumns = this.identifyNumericalColumns(data, columns);
    const columnsToRemove: string[] = [];

    // Calculate correlation matrix
    for (let i = 0; i < numericalColumns.length; i++) {
      for (let j = i + 1; j < numericalColumns.length; j++) {
        const col1 = numericalColumns[i];
        const col2 = numericalColumns[j];
        
        const correlation = this.calculatePearsonCorrelation(data, col1, col2);
        
        if (Math.abs(correlation) > threshold) {
          // Remove the second column (arbitrary choice)
          if (!columnsToRemove.includes(col2)) {
            columnsToRemove.push(col2);
          }
        }
      }
    }

    if (columnsToRemove.length > 0) {
      const filteredColumns = columns.filter(col => !columnsToRemove.includes(col));
      const filteredData = data.map(row => {
        const newRow: any = {};
        filteredColumns.forEach(col => {
          newRow[col] = row[col];
        });
        return newRow;
      });
      
      suggestions.push(`Removed ${columnsToRemove.length} highly correlated features (correlation > ${threshold}): ${columnsToRemove.join(', ')}`);
      return { data: filteredData, columns: filteredColumns, suggestions };
    }

    return { data, columns, suggestions };
  }
}