# AWS Amplify Deployment Instructions

This document outlines the steps to deploy the Docway 360 document metadata application to AWS Amplify.

## Prerequisites

1. AWS Account with appropriate permissions
2. Node.js and npm installed
3. AWS Amplify CLI installed (`npm install -g @aws-amplify/cli`)
4. The following environment variables needed for the application:
   - AWS_S3_BUCKET_NAME
   - AWS_REGION
   - AWS_ACCESS_KEY_ID
   - AWS_SECRET_ACCESS_KEY

## Deployment Steps

### 1. Initialize Amplify

```bash
amplify init
```

When prompted:
- Enter a name for the project (e.g., "docway360")
- Choose your default editor
- Select "JavaScript" as the programming language
- Select "react" as the framework
- Select "node" as the package manager
- Choose default build settings or customize as needed
- Select the AWS profile to use

### 2. Add hosting with Amplify Console

```bash
amplify add hosting
```

Choose "Hosting with Amplify Console" when prompted, then select "Manual deployment".

### 3. Configure environment variables

Set the required environment variables in the Amplify Console:

1. Go to the AWS Amplify Console in your browser
2. Select your app
3. Go to "Environment variables" under "App settings"
4. Add the following environment variables:
   - AWS_S3_BUCKET_NAME
   - AWS_REGION
   - AWS_ACCESS_KEY_ID
   - AWS_SECRET_ACCESS_KEY
   - NODE_ENV (set to "production")

### 4. Deploy the application

```bash
amplify publish
```

This will build the application and deploy it to Amplify hosting.

### 5. Continuous Deployment (Optional)

For continuous deployment from your Git repository:

1. Go to the AWS Amplify Console in your browser
2. Choose "Host a web app"
3. Connect your code repository (GitHub, BitBucket, GitLab, or AWS CodeCommit)
4. Configure build settings
5. Review and save

## Troubleshooting

1. Check Amplify build logs:
   - Go to the AWS Amplify Console
   - Select your app
   - Go to "Hosting environments"
   - Select the environment
   - View build logs

2. Test locally before deploying:
   ```bash
   npm run build
   ```

3. Verify environment variables:
   - Ensure all required environment variables are configured
   - Verify they have the correct values

## Cleanup

To remove the Amplify project and associated resources:

```bash
amplify delete
```

Don't forget to also delete any S3 buckets you created for this application.