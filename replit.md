# Mono-AI Analytics Platform

## Overview

Mono-AI is a no-code AI analytics platform that enables users to upload data, perform analysis, create visualizations, and build predictive models without requiring programming skills. The platform features a React frontend with TypeScript, an Express.js backend, PostgreSQL database with Drizzle ORM, and integrates with OpenAI for AI-powered insights.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite for development and production builds
- **UI Library**: Shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for client-side routing
- **Theme**: Next-themes for dark/light mode support

### Backend Architecture
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js for REST API
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Database**: PostgreSQL (Neon serverless)
- **Session Management**: Express-session with PostgreSQL store
- **File Processing**: Multer for file uploads, PapaParse for CSV processing

### Authentication Strategy
- Custom session-based authentication system
- In-memory session storage for development
- PostgreSQL session store for production
- Admin role support for privileged operations

## Key Components

### Data Management
- **File Upload**: Supports CSV and Excel files up to 50MB
- **Data Validation**: Automatic file type and size validation
- **Data Storage**: JSON blob storage in PostgreSQL with metadata
- **Data Processing**: Real-time CSV parsing and column analysis

### Analytics Engine
- **Visualization**: Interactive charts using Recharts library
- **Chart Types**: Bar, line, scatter, pie charts with customization
- **Statistical Analysis**: Automated correlation and pattern detection
- **Export Capabilities**: Chart and data export functionality

### AI/ML Integration
- **OpenAI Integration**: GPT-4o for chat-based data insights
- **Model Training**: One-click machine learning model creation
- **Prediction Types**: Classification, regression, and time series forecasting
- **Model Export**: Trained model serialization and deployment support

### Chat Assistant
- **Conversational AI**: Natural language queries about data
- **Session Management**: Persistent chat sessions with history
- **Quick Actions**: Pre-defined analysis prompts
- **Context Awareness**: Dataset-specific recommendations

## Data Flow

1. **Data Ingestion**: Users upload CSV/Excel files through drag-and-drop interface
2. **Processing**: Backend validates, parses, and stores data with metadata
3. **Analysis**: Users create visualizations or trigger automated analysis
4. **AI Insights**: OpenAI integration provides natural language insights
5. **Model Building**: One-click ML model training with automated evaluation
6. **Export/Deploy**: Models and insights can be exported or shared

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **OpenAI**: AI-powered chat and insights (optional)
- **@tanstack/react-query**: Client-side data fetching and caching
- **drizzle-orm**: Type-safe database operations
- **recharts**: Data visualization components

### Development Tools
- **Vite**: Build tool with hot module replacement
- **TypeScript**: Static type checking
- **ESBuild**: Production bundle optimization
- **Tailwind CSS**: Utility-first styling

### File Processing
- **multer**: Multipart file upload handling
- **papaparse**: CSV parsing and validation
- **connect-pg-simple**: PostgreSQL session storage

## Deployment Strategy

### Development Environment
- **Runtime**: Node.js 20 with Replit environment
- **Database**: PostgreSQL 16 module
- **Port Configuration**: Application runs on port 5000
- **Hot Reload**: Vite development server with HMR

### Production Build
- **Build Process**: Vite builds frontend, ESBuild bundles backend
- **Output**: Static assets in `dist/public`, server bundle in `dist/`
- **Deployment Target**: Replit Autoscale with environment variable support
- **Database**: Neon serverless PostgreSQL with connection pooling

### Environment Configuration
- `DATABASE_URL`: PostgreSQL connection string
- `OPENAI_API_KEY`: Optional OpenAI integration
- `SESSION_SECRET`: Session encryption key
- `NODE_ENV`: Environment mode (development/production)

## Changelog
- July 13, 2025: Complete UX flow overhaul - e-commerce dataset now available in Smart Preprocessing, uploaded datasets automatically appear in preprocessing tab, delete functionality restricted to user's own data (not demo), better authentication differentiation, seamless flow from upload to preprocessing with auto-tab switching
- July 13, 2025: Fixed critical preprocessing authentication flow - preprocessed data is now preserved during sign-in, users return to correct tab after authentication, added download option for non-authenticated users, clear indicators show where saved datasets appear
- July 13, 2025: Fixed critical data preprocessing bug that was removing 75% of data - date detection now correctly identifies actual dates vs numbers, preventing incorrect feature generation from numerical columns like age/score
- June 30, 2025: Enhanced AI chat response formatting - fixed cramped text display with proper spacing between bullet points, orange visual hierarchy, and clear separation between insights for much better readability
- June 30, 2025: Comprehensive ML modeling fixes - implemented smart column filtering that excludes unreasonable features (customer_id, timestamps, etc.), added proper dropdown validation for categorical fields preventing free-text errors, fixed API prediction errors, and ensured models only use appropriate features for accurate predictions
- June 30, 2025: Auto-start onboarding tour - tour now appears automatically when users first enter the app (stored in localStorage), guiding new users through actual interface features with orange highlighting and smart navigation
- June 30, 2025: Connected AI chat to Gemini API - chat is now super intelligent and data-aware with business-focused responses in simple language for non-technical users
- June 30, 2025: Created interactive guided onboarding tour - replaces static tour with dynamic navigation through actual interface locations, orange spotlight highlighting, Previous/Next navigation, and quit-anytime functionality that moves users through real features
- June 30, 2025: Enhanced ML modeling for non-technical users - added interactive metric explanations with "What does this mean?" buttons, performance status indicators (Excellent/Good/Needs Improvement), and practical model usage interface with prediction capabilities for single values and batch uploads
- June 30, 2025: Fixed file upload UX flow - files are now preserved during authentication, users redirect to Data page after sign-in instead of home, clear visual indicators show sign-in requirements upfront  
- June 24, 2025: Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.
UX Priority: Seamless workflows without unnecessary steps or interruptions.