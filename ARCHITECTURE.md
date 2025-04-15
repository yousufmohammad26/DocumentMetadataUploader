# Docway 360 - System Architecture

## Architecture Overview

![Architecture Diagram](/client/public/architecture_diagram.png)

The architecture follows a simple flow:
1. Browser sends requests to S3
2. Documents are stored in S3
3. Metadata is extracted and saved to S3 Tables
4. User can view and manage document metadata

## Component Details

### Frontend Architecture (React)
- **User Interface Components**: Built with React and Tailwind CSS, with Shadcn UI components
- **State Management**: Uses React Query for remote state management and React hooks for local state
- **Animations**: Implemented using Framer Motion for smooth transitions and filtering animations
- **API Communication**: Uses fetch API wrapped in custom React Query hooks

### Backend Architecture (Express)
- **API Server**: Express.js REST API endpoints
- **Storage**: In-memory storage for document metadata
- **Validation**: Zod schema validation for request/response data
- **Authentication**: Basic authentication for AWS S3 operations
- **File Processing**: Multer middleware for file upload handling

### AWS Integration
- **S3 Storage**: Document files stored in AWS S3 buckets
- **Metadata Management**: Document metadata stored as object metadata in S3
- **Presigned URLs**: Generated for secure downloads and uploads
- **AWS SDK**: Using AWS SDK v3 for Node.js

## Data Flow

1. **Document Upload**:
   - User uploads file through the UI
   - File is processed by the Express server
   - File is uploaded to S3 with metadata
   - Document reference is stored in memory

2. **Document Retrieval**:
   - Application loads document metadata from in-memory storage
   - S3 presigned URLs are generated for downloads when requested
   - Metadata is displayed in the UI with filtering capabilities

3. **Search and Filter**:
   - Client-side filtering of documents based on metadata
   - Real-time animated updates of the document list

## Technology Stack

- **Frontend**: React, Tailwind CSS, Shadcn UI, React Query, Framer Motion
- **Backend**: Express.js, Node.js
- **Storage**: AWS S3, In-memory JavaScript storage