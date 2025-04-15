# Deployment Guide for Docway 360

This document outlines the steps to deploy Docway 360 on AWS Elastic Beanstalk.

## Prerequisites

Before you start, make sure you have:

1. An AWS account with appropriate permissions
2. AWS CLI installed and configured on your local machine
3. Elastic Beanstalk CLI installed (`npm install -g aws-elastic-beanstalk`)
4. AWS S3 bucket created for document storage
5. AWS credentials (access key and secret key) with permissions for S3

## Option 1: Using the Deployment Script (Recommended)

We've created a deployment script to streamline the process:

1. Make sure you have the AWS CLI and Elastic Beanstalk CLI installed and configured
2. Run the deployment script:
   ```
   ./deploy-eb.sh
   ```
3. Follow the prompts to provide your AWS credentials and S3 bucket information
4. The script will build the application, initialize Elastic Beanstalk, and deploy the application

## Option 2: Manual Deployment

If you prefer to deploy manually, follow these steps:

1. Build the application:
   ```
   npm run build
   ```

2. Initialize Elastic Beanstalk (first time only):
   ```
   eb init
   ```
   - Select the region where you want to deploy
   - Create a new application or select an existing one
   - Choose Node.js as the platform

3. Create a new environment (first time only):
   ```
   eb create docway360-env
   ```

4. Set environment variables:
   ```
   eb setenv AWS_S3_BUCKET_NAME=your-bucket-name AWS_REGION=your-region AWS_ACCESS_KEY_ID=your-access-key AWS_SECRET_ACCESS_KEY=your-secret-key NODE_ENV=production
   ```

5. Deploy the application:
   ```
   eb deploy
   ```

6. Open the application in a browser:
   ```
   eb open
   ```

## Troubleshooting

- If you encounter issues with deployment, check the Elastic Beanstalk logs using:
  ```
  eb logs
  ```

- For permission issues, ensure your AWS credentials have the necessary permissions for S3 and Elastic Beanstalk

- For CORS issues, verify that your S3 bucket has the appropriate CORS configuration

## Alternative Deployment Options

### AWS App Runner

For a simpler deployment that doesn't require as much configuration, you can use AWS App Runner:

1. Push your code to a GitHub repository
2. Set up AWS App Runner to deploy from your repository
3. Configure environment variables for AWS credentials and S3 bucket information

### Docker Deployment

We've included a Dockerfile in the repository that you can use to build and deploy a Docker container:

1. Build the Docker image:
   ```
   docker build -t docway360 .
   ```

2. Run the Docker container:
   ```
   docker run -p 8080:8080 -e AWS_S3_BUCKET_NAME=your-bucket-name -e AWS_REGION=your-region -e AWS_ACCESS_KEY_ID=your-access-key -e AWS_SECRET_ACCESS_KEY=your-secret-key -e NODE_ENV=production docway360
   ```

3. Access the application at http://localhost:8080