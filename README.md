# Docway 360

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
- **Deployment**: AWS Amplify

## Getting Started

### Prerequisites

- Node.js
- npm
- AWS account with S3 bucket
- AWS credentials

### Environment Variables

The following environment variables are required:

- `AWS_ACCESS_KEY_ID`: Your AWS access key
- `AWS_SECRET_ACCESS_KEY`: Your AWS secret key
- `AWS_REGION`: The AWS region (e.g., us-east-1)
- `AWS_S3_BUCKET_NAME`: Your S3 bucket name

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/docway-360.git
   cd docway-360
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for AWS Amplify deployment instructions.

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed architecture information.

## License

This project is licensed under the MIT License - see the LICENSE file for details.