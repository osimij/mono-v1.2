# Segmentation & Filtering Feature

## Overview

The Segmentation & Filtering feature has been added as a **new dedicated page** in the left sidebar navigation, providing users with powerful tools to filter and segment their datasets for better analysis and insights.

## Navigation

The Segmentation & Filtering section is now accessible as a **separate navigation item** in the main sidebar:
- **Location**: Left sidebar navigation (between "Data Factory" and "Analysis")
- **Icon**: Filter icon
- **Route**: `/segmentation`

## Features

### Filtering

Users can define constraints to filter their dataset using various operators:

- **Equals**: Exact match filtering
- **Not equals**: Exclude specific values
- **Contains**: Text-based substring matching
- **Greater than**: Numeric value comparison
- **Less than**: Numeric value comparison
- **Between**: Range-based filtering
- **In list**: Multiple value matching

### Segmentation

Users can segment their data using three different methods:

#### 1. K-Means Clustering
- Automatically groups similar data points into clusters
- Configurable number of clusters (2-10)
- Uses Euclidean distance for similarity measurement
- Ideal for finding natural groupings in numeric data

#### 2. Hierarchical Clustering
- Creates a tree-like structure of data groupings
- Configurable number of groups (2-10)
- Useful for understanding data hierarchies
- Good for both numeric and categorical data

#### 3. Rule-Based Segmentation
- User-defined rules for data segmentation
- Flexible condition-based grouping
- Supports complex logical expressions
- Perfect for business logic implementation

## Page Structure

The Segmentation & Filtering page consists of two main tabs:

### 1. Select Dataset Tab
- **Dataset List**: Browse and select from available datasets
- **Getting Started Guide**: Step-by-step instructions for new users
- **Dataset Information**: Shows row count, column count, and file size

### 2. Segmentation & Filtering Tab
- **Dataset Info Panel**: Shows selected dataset details and export/save options
- **Data Preview**: Real-time table view of processed data
- **Filtering & Segmentation Sidebar**: Tools for applying filters and creating segments

## Usage

### Step 1: Select a Dataset
1. Navigate to the "Segmentation & Filtering" page from the sidebar
2. In the "Select Dataset" tab, choose from your available datasets
3. Click "Select" to proceed to the segmentation interface

### Step 2: Apply Filters
1. In the "Segmentation & Filtering" tab, find the "Filtering" section in the sidebar
2. Click "Add Filter"
3. Choose a column from the dropdown
4. Select an operator
5. Enter the filter value
6. Click "Add Filter" to apply

### Step 3: Create Segmentation
1. In the sidebar, find the "Segmentation" section
2. Click "Add Segmentation"
3. Enter a name for the segmentation
4. Choose a method (K-Means, Hierarchical, or Rule-Based)
5. Select columns to use for segmentation
6. Configure additional parameters (e.g., number of clusters)
7. Click "Add Segmentation" to apply

### Step 4: Export Results
- **Export**: Download processed data as CSV file
- **Save**: Save processed dataset to your collection for future use

## Data Preview

The filtered and segmented data is displayed in the "Data Preview" section with:

- Real-time row count updates
- Column count including segmentation columns
- Visual indicators for active filters and segments
- Special styling for segmentation columns (orange badges)
- Pagination and search functionality

## Technical Implementation

### Components

- **SegmentationPage.tsx**: Main page component with tabbed interface
- **SegmentationFiltering.tsx**: Sidebar component handling both filtering and segmentation
- **DataTable.tsx**: Enhanced to display segmentation columns with special styling

### Key Functions

- `applyFilters()`: Applies filter conditions to dataset
- `applySegmentation()`: Applies segmentation algorithms to filtered data
- `performKMeans()`: Implements K-means clustering algorithm
- `performHierarchicalClustering()`: Implements hierarchical clustering
- `applyRules()`: Applies rule-based segmentation
- `exportData()`: Exports processed data as CSV
- `saveProcessedDataset()`: Saves processed data to user collection

### Data Flow

1. User navigates to `/segmentation` → SegmentationPage loads
2. User selects dataset → Dataset loaded into state
3. User applies filters → Data filtered in real-time
4. User applies segmentation → New columns added to filtered data
5. Processed data displayed in table with visual indicators
6. User can export or save the processed data

## Benefits

- **Dedicated Workspace**: Separate page focused on filtering and segmentation
- **Real-time Processing**: Filters and segments are applied instantly
- **Visual Feedback**: Clear indicators show active filters and segments
- **Flexible Configuration**: Multiple methods and operators available
- **Data Preservation**: Original data remains unchanged
- **Export Ready**: Processed data can be used for downstream analysis
- **Save Functionality**: Processed datasets can be saved to user collection

## Integration

The Segmentation & Filtering page integrates seamlessly with the existing Mono-AI platform:

- **Shared Datasets**: Uses the same dataset collection as other pages
- **Consistent UI**: Follows the same design patterns and components
- **Navigation**: Integrated into the main sidebar navigation
- **Authentication**: Respects user authentication and permissions

## Future Enhancements

- Advanced rule builder for complex segmentation rules
- Visualization of clustering results
- Save and load filter/segmentation configurations
- Performance optimizations for large datasets
- Integration with ML Modeling for automated segmentation
- Batch processing for multiple datasets
