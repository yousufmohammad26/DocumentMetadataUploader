#!/bin/bash

# Exit on any error
set -e

echo "Building application for production..."
npm run build

echo "Initializing Elastic Beanstalk (only needed first time)..."
echo "If you've already initialized EB, you can ctrl+C here and run 'eb deploy' directly."
read -p "Press Enter to continue or Ctrl+C to cancel..."

# Initialize Elastic Beanstalk
eb init

# Create a new environment (only needed first time)
read -p "Do you want to create a new environment? (y/n): " create_env
if [ "$create_env" = "y" ]; then
  echo "Creating new Elastic Beanstalk environment..."
  eb create docway360-env
fi

# Set environment variables
echo "Setting up environment variables..."
echo "You'll need to provide your AWS credentials and S3 bucket name."

read -p "AWS S3 Bucket Name: " s3_bucket
read -p "AWS Region: " aws_region
read -p "AWS Access Key ID: " aws_access_key
read -s -p "AWS Secret Access Key: " aws_secret_key
echo ""  # Add a newline after the password input

echo "Setting environment variables in Elastic Beanstalk..."
eb setenv AWS_S3_BUCKET_NAME=$s3_bucket AWS_REGION=$aws_region AWS_ACCESS_KEY_ID=$aws_access_key AWS_SECRET_ACCESS_KEY=$aws_secret_key NODE_ENV=production

# Deploy
echo "Deploying application to Elastic Beanstalk..."
eb deploy

echo "Deployment complete! Opening application..."
eb open