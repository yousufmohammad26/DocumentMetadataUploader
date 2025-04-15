# AWS Deployment Instructions

This document outlines the steps to deploy the Docway 360 document metadata application to AWS Elastic Beanstalk.

## Prerequisites

1. AWS Account with appropriate permissions
2. AWS CLI installed and configured
3. EB CLI (Elastic Beanstalk Command Line Interface) installed
4. PostgreSQL database (RDS or external)
5. The following environment variables set in your AWS environment:
   - AWS_S3_BUCKET_NAME
   - AWS_REGION
   - AWS_ACCESS_KEY_ID
   - AWS_SECRET_ACCESS_KEY
   - DATABASE_URL (PostgreSQL connection string)

## Database Setup

### 1. Create a PostgreSQL database

You can use Amazon RDS to create a PostgreSQL database:

1. Go to the AWS RDS Console
2. Click "Create database"
3. Select "PostgreSQL"
4. Configure your database settings
5. Make sure it's accessible from your Elastic Beanstalk environment

### 2. Get your connection string

Your connection string should be in the format:
```
postgresql://username:password@hostname:port/database_name
```

## Deployment Steps

### 1. Initialize EB CLI

```bash
eb init
```

When prompted:
- Select your region
- Enter application name (e.g., "docway-360")
- Select "Node.js" platform
- Choose the latest Node.js version
- Set up SSH for your instances (optional)

### 2. Create an environment

```bash
eb create production-environment
```

When prompted:
- Enter environment name or accept default
- Enter DNS CNAME prefix or accept default
- Select a load balancer type (Application or Classic)

### 3. Configure environment variables

Set the required environment variables:

```bash
eb setenv \
  AWS_S3_BUCKET_NAME=your-bucket-name \
  AWS_REGION=your-region \
  AWS_ACCESS_KEY_ID=your-access-key \
  AWS_SECRET_ACCESS_KEY=your-secret-key \
  DATABASE_URL=your-database-connection-string
```

### 4. Deploy the application

```bash
eb deploy
```

### 5. Open the deployed application

```bash
eb open
```

## Database Migration

The first time your application runs on the server, the database schema will be automatically applied.

## Troubleshooting

1. Check application logs:
   ```bash
   eb logs
   ```

2. SSH into the instance:
   ```bash
   eb ssh
   ```

3. View server logs:
   ```bash
   cd /var/log/eb-docker/containers/eb-current-app/
   cat *-stdouterr.log
   ```

4. Database issues:
   - Verify your DATABASE_URL environment variable
   - Check if your database is accessible from the Elastic Beanstalk environment
   - Review security group settings to ensure proper access

## Cleanup

To terminate the environment and stop incurring charges:

```bash
eb terminate production-environment
```

Don't forget to also delete any RDS instances and S3 buckets you created for this application.