import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateDataInsights(message: string, dataset: any): Promise<{ content: string; metadata?: any }> {
  try {
    if (!dataset || !dataset.data || dataset.data.length === 0) {
      return {
        content: "I'd be happy to help analyze your data, but it looks like no dataset is currently selected. Please upload a dataset first and I'll provide detailed insights about your data patterns, trends, and recommendations."
      };
    }

    // Prepare dataset summary for AI analysis
    const dataPreview = dataset.data.slice(0, 5);
    const columns = Object.keys(dataset.data[0]);
    const rowCount = dataset.data.length;
    
    // Calculate basic statistics
    const numericalColumns = columns.filter(col => {
      const sample = dataset.data.slice(0, 100).map((row: any) => row[col]);
      return sample.every((val: any) => val != null && !isNaN(parseFloat(val)));
    });

    const categoricalColumns = columns.filter(col => !numericalColumns.includes(col));

    const datasetSummary = {
      filename: dataset.originalName || 'dataset',
      rowCount,
      columns: columns.length,
      numericalColumns,
      categoricalColumns,
      sampleData: dataPreview
    };

    const prompt = `You are a data analytics expert helping business users understand their data. 

Dataset Information:
- Filename: ${datasetSummary.filename}
- Rows: ${datasetSummary.rowCount.toLocaleString()}
- Columns: ${datasetSummary.columns}
- Numerical columns: ${datasetSummary.numericalColumns.join(', ') || 'None'}
- Categorical columns: ${datasetSummary.categoricalColumns.join(', ') || 'None'}

Sample data (first 5 rows):
${JSON.stringify(datasetSummary.sampleData, null, 2)}

User question: "${message}"

IMPORTANT FORMATTING REQUIREMENTS:
- Use proper line breaks between sections and bullet points
- Add blank lines between different topics
- Use bullet points (•) for lists instead of asterisks
- Make the text easy to read with clear spacing
- Break up long paragraphs into shorter, readable chunks

Please provide a helpful, business-focused response that:
1. Directly answers their question about the data
2. Provides actionable insights they can understand
3. Suggests specific next steps or analyses
4. Uses simple language (avoid technical jargon)
5. If they ask for analysis, provide specific patterns you can see in the data

Focus on practical business value and keep responses well-formatted and easy to read.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return {
      content: response.text || "I'm having trouble analyzing your data right now. Please try asking again.",
      metadata: {
        datasetInfo: {
          name: datasetSummary.filename,
          rows: datasetSummary.rowCount,
          columns: datasetSummary.columns
        }
      }
    };
  } catch (error) {
    console.error('Gemini API error:', error);
    return {
      content: "I'm experiencing some technical difficulties analyzing your data. Please try again in a moment, or check if there are any issues with the AI service."
    };
  }
}

export async function generateChartRecommendations(dataset: any): Promise<string[]> {
  try {
    if (!dataset || !dataset.data || dataset.data.length === 0) {
      return ["Upload a dataset first to get chart recommendations"];
    }

    const columns = Object.keys(dataset.data[0]);
    const numericalColumns = columns.filter(col => {
      const sample = dataset.data.slice(0, 100).map((row: any) => row[col]);
      return sample.every((val: any) => val != null && !isNaN(parseFloat(val)));
    });

    const categoricalColumns = columns.filter(col => !numericalColumns.includes(col));

    const prompt = `Based on this dataset structure, suggest 3-5 specific chart recommendations:

Columns: ${columns.join(', ')}
Numerical columns: ${numericalColumns.join(', ') || 'None'}
Categorical columns: ${categoricalColumns.join(', ') || 'None'}
Row count: ${dataset.data.length}

Provide specific chart suggestions in this format:
- Chart Type: Column vs Column (reason why this would be valuable)

Focus on charts that would provide business insights.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const suggestions = response.text?.split('\n')
      .filter(line => line.trim().startsWith('-'))
      .map(line => line.trim().substring(1).trim()) || [];

    return suggestions.length > 0 ? suggestions : [
      "Create a bar chart to compare categorical values",
      "Try a line chart to show trends over time",
      "Use a scatter plot to find correlations between numerical columns"
    ];
  } catch (error) {
    console.error('Chart recommendations error:', error);
    return [
      "Bar Chart: Compare categories or groups in your data",
      "Line Chart: Show trends and changes over time",
      "Scatter Plot: Discover relationships between numerical values"
    ];
  }
}

export async function generateModelingAdvice(dataset: any, taskType: string): Promise<string> {
  try {
    if (!dataset || !dataset.data) {
      return "Upload a dataset first to get modeling advice.";
    }

    const columns = Object.keys(dataset.data[0]);
    const numericalColumns = columns.filter(col => {
      const sample = dataset.data.slice(0, 100).map((row: any) => row[col]);
      return sample.every((val: any) => val != null && !isNaN(parseFloat(val)));
    });

    const prompt = `Provide modeling advice for a ${taskType} task with this dataset:

Columns: ${columns.join(', ')}
Numerical columns: ${numericalColumns.join(', ')}
Rows: ${dataset.data.length}

Give specific advice about:
1. Best target column for ${taskType}
2. Which features would be most predictive
3. Expected model performance
4. Business value of this model

Keep it simple and actionable for non-technical users.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text || `For ${taskType}, focus on columns with clear patterns and sufficient data variation.`;
  } catch (error) {
    console.error('Modeling advice error:', error);
    return `For ${taskType} models, choose a target column that represents what you want to predict, and include relevant features that might influence that outcome.`;
  }
}