# Deployment Instructions for Docway 360

This document outlines options for deploying the Docway 360 document metadata application.

## Option 1: AWS Elastic Beanstalk (Recommended)

AWS Elastic Beanstalk is specifically designed for full-stack applications like ours.

### Prerequisites
1. AWS Account with appropriate permissions
2. AWS Elastic Beanstalk CLI installed (`pip install awsebcli`)
3. The following environment variables needed for the application:
   - AWS_S3_BUCKET_NAME
   - AWS_REGION
   - AWS_ACCESS_KEY_ID
   - AWS_SECRET_ACCESS_KEY

### Deployment Steps

1. **Initialize Elastic Beanstalk**:
   ```bash
   eb init
   ```
   Follow the prompts to configure your application.

2. **Create an environment**:
   ```bash
   eb create docway360-env
   ```

3. **Configure environment variables**:
   ```bash
   eb setenv AWS_S3_BUCKET_NAME=your-bucket-name AWS_REGION=your-region AWS_ACCESS_KEY_ID=your-key AWS_SECRET_ACCESS_KEY=your-secret NODE_ENV=production
   ```

4. **Deploy the application**:
   ```bash
   eb deploy
   ```

5. **Open the application**:
   ```bash
   eb open
   ```

## Option 2: AWS App Runner

AWS App Runner provides a simpler deployment model for containerized applications.

### Deployment Steps

1. Build and package your application
2. Create a Dockerfile in your project root
3. Push your code to a Git repository
4. Go to AWS App Runner console
5. Create a new service
6. Connect to your repository
7. Configure build settings and environment variables
8. Deploy

## Option 3: Split Deployment (Frontend/Backend)

You can split the deployment into separate frontend and backend components:

### Frontend (Static Hosting)
1. Modify the application to point to your backend API
2. Deploy the frontend to a static hosting service (AWS S3, Vercel, Netlify)

### Backend (AWS Lambda + API Gateway)
1. Refactor the server code to work with Lambda functions
2. Deploy the API routes as Lambda functions
3. Set up API Gateway to route requests to your Lambda functions

## Environment Variables

Regardless of the deployment option you choose, you'll need to configure these environment variables:

- AWS_S3_BUCKET_NAME
- AWS_REGION
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY
- NODE_ENV (set to "production")

## Local Testing

Before deploying, test your application locally:

```bash
npm run build
npm start
```

## Cleanup

To avoid incurring charges, remember to delete your resources when they're no longer needed:

- AWS Elastic Beanstalk: `eb terminate your-environment-name`
- AWS App Runner: Delete the service from the console

- Also delete any S3 buckets or other resources you created