# AWS Deployment Instructions

This document outlines the steps to deploy the Docway 360 document metadata application to AWS Elastic Beanstalk.

## Prerequisites

1. AWS Account with appropriate permissions
2. AWS CLI installed and configured
3. EB CLI (Elastic Beanstalk Command Line Interface) installed
4. The following environment variables set in your AWS environment:
   - AWS_S3_BUCKET_NAME
   - AWS_REGION
   - AWS_ACCESS_KEY_ID
   - AWS_SECRET_ACCESS_KEY

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
  AWS_SECRET_ACCESS_KEY=your-secret-key
```

### 4. Deploy the application

```bash
eb deploy
```

### 5. Open the deployed application

```bash
eb open
```

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

## Cleanup

To terminate the environment and stop incurring charges:

```bash
eb terminate production-environment
```

Don't forget to also delete any S3 buckets you created for this application.