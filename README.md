
# DocumentIQ

A lightweight document management platform designed for efficient file organization with AWS S3 integration and quick metadata tracking.

## Key Features

- Upload documents to AWS S3 with custom metadata
- Track and search documents by metadata
- Animated search results with smooth filtering
- Display existing documents from S3
- In-memory storage for quick access
- Responsive UI with modern design

## Technologies

- **Frontend**: React, Tailwind CSS, Shadcn UI, React Query, Framer Motion
- **Backend**: Express.js, Node.js
- **Storage**: AWS S3, In-memory JavaScript storage

## Getting Started

### Prerequisites

- Replit account
- AWS account with S3 bucket
- AWS credentials

### Environment Variables

Set the following environment variables in Replit's Secrets tab:

- `AWS_ACCESS_KEY_ID`: Your AWS access key
- `AWS_SECRET_ACCESS_KEY`: Your AWS secret key
- `AWS_REGION`: The AWS region (e.g., us-east-1)
- `AWS_S3_BUCKET_NAME`: Your S3 bucket name

### Development

1. Fork this repl
2. Add your AWS credentials in the Secrets tab
3. Click the Run button to start the development server

The server will run on port 5000 and the client will be available on port 3000.

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed architecture information.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
