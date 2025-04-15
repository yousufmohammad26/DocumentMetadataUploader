# Docway 360

A simplified document metadata tracker application powered by AWS S3.

## Overview

Docway 360 is a powerful document management platform designed for efficient file organization and metadata tracking. It leverages AWS S3 for file storage and provides a simple interface for managing document metadata.

## Features

- Upload documents to AWS S3
- Track document metadata as customizable key-value pairs
- Search and filter documents by metadata
- Animated search results with smooth filtering animations
- Download documents securely using presigned URLs
- Edit document metadata
- Color-coded document cards based on file type and metadata

## Architecture

![Docway 360 Architecture](/client/public/architecture_diagram.png)

The application follows a simple flow architecture:

1. Browser sends requests to AWS S3
2. Documents are stored in S3
3. Metadata is extracted and saved to S3 Tables
4. User can view and manage document metadata

For more details, see the [ARCHITECTURE.md](ARCHITECTURE.md) file.

## Technologies

- **Frontend**:
  - React for UI components
  - TypeScript for type-safe development
  - Tailwind CSS for responsive styling
  - React Query for data fetching and synchronization
  - Framer Motion for smooth animations

- **Backend**:
  - Express.js for API endpoints
  - AWS SDK for S3 integration
  - In-memory storage for document metadata

## Deployment

For deployment instructions, see the [DEPLOYMENT.md](DEPLOYMENT.md) file.

## Environment Variables

The application requires the following environment variables:

- `AWS_S3_BUCKET_NAME`: The name of your S3 bucket
- `AWS_REGION`: The AWS region (e.g., us-east-1)
- `AWS_ACCESS_KEY_ID`: Your AWS access key ID
- `AWS_SECRET_ACCESS_KEY`: Your AWS secret access key

## Getting Started

1. Clone the repository
2. Install dependencies with `npm install`
3. Set up the required environment variables
4. Start the development server with `npm run dev`
5. Open your browser to the displayed URL

## License

This project is licensed under the MIT License - see the LICENSE file for details.