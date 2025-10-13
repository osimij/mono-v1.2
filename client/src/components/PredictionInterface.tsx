import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { 
  Target, 
  Upload, 
  FileText, 
  Lightbulb, 
  CheckCircle,
  ArrowLeft
} from "lucide-react";

interface PredictionInterfaceProps {
  model: any;
  dataset: any;
  mode: 'single' | 'batch' | null;
  onBack: () => void;
  predictionData: any;
  setPredictionData: (data: any) => void;
  predictionResult: any;
  setPredictionResult: (result: any) => void;
  isPredicting: boolean;
  setIsPredicting: (predicting: boolean) => void;
  batchFile: File | null;
  setBatchFile: (file: File | null) => void;
}

export function PredictionInterface({
  model,
  dataset,
  mode,
  onBack,
  predictionData,
  setPredictionData,
  predictionResult,
  setPredictionResult,
  isPredicting,
  setIsPredicting,
  batchFile,
  setBatchFile
}: PredictionInterfaceProps) {
  const { toast } = useToast();

  const handlePrediction = async () => {
    setIsPredicting(true);
    try {
      const response = await api.models.predict(model.id, predictionData, mode || 'single');
      setPredictionResult(response);
      
      toast({
        title: "Prediction complete",
        description: "Your prediction has been generated successfully."
      });
    } catch (error) {
      console.error('Prediction error:', error);
      toast({
        title: "Prediction failed",
        description: "Unable to make prediction. Please check your inputs and try again.",
        variant: "destructive"
      });
    } finally {
      setIsPredicting(false);
    }
  };

  if (!dataset || !dataset.data || !Array.isArray(dataset.data) || dataset.data.length === 0) {
    return <div>Loading dataset columns...</div>;
  }
  
  // Use the model's actual feature list instead of filtering dataset columns
  // This ensures we only ask for columns the model was actually trained on
  const featureColumns = model.modelData?.features?.filter((col: string) => col !== model.targetColumn) || [];

  // Get unique values for categorical columns to create dropdowns
  const getColumnInfo = (column: string) => {
    const sampleValues = dataset.data
      .map((row: any) => row[column])
      .filter((val: any) => val != null && val !== '');
    
    const uniqueValues = Array.from(new Set(sampleValues));
    const isNumeric = sampleValues.every((val: any) => !isNaN(parseFloat(val)));
    const isCategorical = !isNumeric && uniqueValues.length <= 20; // 20 or fewer unique values = categorical
    
    return {
      isNumeric,
      isCategorical,
      uniqueValues: isCategorical ? uniqueValues.slice(0, 20) : [],
      sampleValues: sampleValues.slice(0, 3)
    };
  };

  if (mode === 'single') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Enter Values for Prediction
          </h3>
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Options
          </Button>
        </div>
        
        <Alert className="border-border bg-orange-50 dark:bg-orange-950">
          <Lightbulb className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          <AlertDescription className="text-orange-800 dark:text-orange-200">
            Fill in the values below based on your dataset columns. The model will predict: <strong>{model.targetColumn}</strong>
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {model.type === 'time_series' ? (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Periods to Forecast
              </label>
              <input
                type="number"
                placeholder="e.g., 6"
                value={predictionData.monthsToForecast || ''}
                onChange={(e) => setPredictionData({...predictionData, monthsToForecast: e.target.value})}
                className="w-full border border-border bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                How many time periods ahead do you want to forecast?
              </p>
            </div>
          ) : (
            featureColumns.slice(0, 8).map((column: string) => {
              const columnInfo = getColumnInfo(column);
              const { isNumeric, isCategorical, uniqueValues, sampleValues } = columnInfo;
              
              const placeholder = isNumeric 
                ? `e.g., ${sampleValues[0] || '100'}`
                : `e.g., ${sampleValues[0] || 'value'}`;
              
              return (
                <div key={column}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {column.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    {isCategorical && <span className="text-xs text-orange-600 dark:text-orange-400 ml-1">(select option)</span>}
                  </label>
                  
                  {isCategorical ? (
                    <select
                      value={predictionData[column] || ''}
                      onChange={(e) => setPredictionData({...predictionData, [column]: e.target.value})}
                      className="w-full border border-border bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2"
                      required
                    >
                      <option value="">Select {column.replace(/_/g, ' ')}</option>
                      {uniqueValues.map((value: any) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={isNumeric ? "number" : "text"}
                      placeholder={placeholder}
                      value={predictionData[column] || ''}
                      onChange={(e) => setPredictionData({...predictionData, [column]: e.target.value})}
                      className="w-full border border-border bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2"
                      required
                    />
                  )}
                  
                  {sampleValues.length > 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {isCategorical ? 'Available options' : 'Sample values'}: {sampleValues.slice(0, 3).join(', ')}
                      {sampleValues.length > 3 && '...'}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Prediction Result */}
        {predictionResult && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-border rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              <span className="font-medium text-green-900 dark:text-green-100">
                Prediction Result:
              </span>
            </div>
            <div className="text-lg font-bold text-green-800 dark:text-green-200 mb-1">
              {predictionResult.prediction}
              {predictionResult.confidence && (
                <span className="text-sm font-normal ml-2">
                  ({predictionResult.confidence}% confidence)
                </span>
              )}
            </div>
            {predictionResult.explanation && (
              <div className="text-sm text-green-700 dark:text-green-300">
                {predictionResult.explanation}
              </div>
            )}
          </div>
        )}

        {/* Show validation warning if not enough data provided */}
        {featureColumns.length > 0 && Object.keys(predictionData).length < Math.min(featureColumns.length, 8) && (
          <Alert className="border-border bg-orange-50 dark:bg-orange-950">
            <Lightbulb className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            <AlertDescription className="text-orange-800 dark:text-orange-200">
              Please fill in all required fields above to get an accurate prediction.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex space-x-2">
          <Button
            onClick={handlePrediction}
            disabled={isPredicting || Object.keys(predictionData).length < Math.min(featureColumns.length, 3)}
            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
          >
            <Target className="w-4 h-4 mr-2" />
            {isPredicting ? "Predicting..." : "Get Prediction"}
          </Button>
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => {
              setPredictionData({});
              setPredictionResult(null);
            }}
          >
            Clear Form
          </Button>
        </div>

        {/* Model Usage Examples */}
        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-white mb-2">
            What you can do with this model:
          </h4>
          <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
            {model.type === 'classification' && (
              <>
                <li>• Identify high-value customers for targeted marketing</li>
                <li>• Predict customer churn for retention campaigns</li>
                <li>• Segment customers for personalized experiences</li>
              </>
            )}
            {model.type === 'regression' && (
              <>
                <li>• Estimate pricing for new products or services</li>
                <li>• Forecast revenue based on key factors</li>
                <li>• Plan budgets with predicted values</li>
              </>
            )}
            {model.type === 'time_series' && (
              <>
                <li>• Plan inventory based on demand forecasts</li>
                <li>• Budget for future revenue projections</li>
                <li>• Schedule staff based on predicted workload</li>
                <li>• Set realistic growth targets</li>
              </>
            )}
          </ul>
        </div>
      </div>
    );
  }

  if (mode === 'batch') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Upload CSV for Batch Predictions
          </h3>
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Options
          </Button>
        </div>
        
        <Alert className="border-border bg-blue-50 dark:bg-blue-950">
          <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            <div className="space-y-2">
              <div>Upload a CSV file with the same columns as your training data (excluding the target column: <strong>{model.targetColumn}</strong>)</div>
              <div className="text-sm">
                Required columns: {featureColumns.join(', ')}
              </div>
            </div>
          </AlertDescription>
        </Alert>

        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <div className="space-y-2">
            <p className="text-gray-600 dark:text-gray-300">
              Drop your CSV file here or click to browse
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setBatchFile(e.target.files?.[0] || null)}
              className="hidden"
              id="batch-upload"
            />
            <label
              htmlFor="batch-upload"
              className="inline-flex items-center px-4 py-2 border border-border rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer"
            >
              Choose File
            </label>
          </div>
          {batchFile && (
            <div className="mt-4 text-sm text-green-600 dark:text-green-400">
              Selected: {batchFile.name}
            </div>
          )}
        </div>

        {batchFile && (
          <Button
            onClick={handlePrediction}
            disabled={isPredicting}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white"
          >
            <Target className="w-4 h-4 mr-2" />
            {isPredicting ? "Processing..." : "Generate Batch Predictions"}
          </Button>
        )}

        {/* Batch Results */}
        {predictionResult && predictionResult.predictions && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-border rounded-lg">
            <div className="flex items-center space-x-2 mb-3">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              <span className="font-medium text-green-900 dark:text-green-100">
                Batch Predictions Complete
              </span>
            </div>
            <div className="text-sm text-green-700 dark:text-green-300 mb-3">
              Generated {predictionResult.predictions.length} predictions
            </div>
            <div className="max-h-64 overflow-y-auto bg-white dark:bg-gray-800 rounded border">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-3 py-2 text-left">Row</th>
                    <th className="px-3 py-2 text-left">Prediction</th>
                    <th className="px-3 py-2 text-left">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {predictionResult.predictions.slice(0, 10).map((pred: any, index: number) => (
                    <tr key={index} className="border-t border-border">
                      <td className="px-3 py-2">{index + 1}</td>
                      <td className="px-3 py-2 font-medium">{pred.value}</td>
                      <td className="px-3 py-2">{pred.confidence}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {predictionResult.predictions.length > 10 && (
                <div className="p-2 text-center text-xs text-gray-500 dark:text-gray-400 border-t border-border">
                  Showing first 10 of {predictionResult.predictions.length} predictions
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}