# Deploying Docway 360 to AWS Elastic Beanstalk

This document outlines the steps to deploy the Docway 360 application to AWS Elastic Beanstalk.

## Prerequisites

Before deploying, ensure you have:

1. AWS account with appropriate permissions
2. AWS CLI installed and configured
3. Elastic Beanstalk CLI (eb) installed
4. Node.js and npm installed
5. Git installed

## Deployment Steps

### Option 1: Using the Deployment Scripts

**For Linux/Mac users:**
```bash
./deploy-eb.sh
```

**For Windows users:**
```bash
deploy-eb.bat
```

These scripts will guide you through:
- Building the application
- Initializing Elastic Beanstalk (if needed)
- Creating a new environment (if needed)
- Setting required environment variables
- Deploying the application

### Option 2: Manual Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Initialize Elastic Beanstalk** (only if you haven't done this before)
   ```bash
   eb init
   ```
   Follow the prompts to configure your EB application.

3. **Create an Elastic Beanstalk environment** (only if you don't have one)
   ```bash
   eb create docway360-env
   ```

4. **Set environment variables**
   ```bash
   eb setenv AWS_S3_BUCKET_NAME=your-bucket-name \
             AWS_REGION=your-region \
             AWS_ACCESS_KEY_ID=your-access-key \
             AWS_SECRET_ACCESS_KEY=your-secret-key \
             NODE_ENV=production
   ```

5. **Deploy the application**
   ```bash
   eb deploy
   ```

6. **View the deployed application**
   ```bash
   eb open
   ```

## Troubleshooting

### Common Issues

1. **Deployment fails with option_settings validation error**
   - This is resolved in the latest version. If you're still experiencing this issue, make sure to pull the latest changes from the repository.

2. **Application doesn't start after deployment**
   - Check the logs with `eb logs`
   - Verify that all environment variables are set correctly

3. **CORS issues with S3**
   - Ensure your S3 bucket has the appropriate CORS configuration
   - Make sure the AWS_REGION environment variable matches your S3 bucket's region

4. **Node.js version issues**
   - The application uses Node.js 18+. Make sure your Elastic Beanstalk environment is configured with a compatible Node.js version.

## Notes

- The application uses the Node.js platform on Elastic Beanstalk
- Static files are served from the `/dist` directory
- The application listens on port 8080 by default
- Environment variables are essential for proper functionality

## Updating the Deployment

To update an existing deployment:

1. Make your changes to the code
2. Build the application: `npm run build`
3. Deploy: `eb deploy`

## Cleanup

To delete your Elastic Beanstalk environment:
```bash
eb terminate
```

**Warning**: This will permanently delete your environment and all associated resources.