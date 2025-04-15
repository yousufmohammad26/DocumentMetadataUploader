@echo off
REM Deployment script for Docway 360 on Windows

echo Building application for production...
call npm run build

echo.
echo Initializing Elastic Beanstalk (only needed first time)...
echo If you've already initialized EB, you can Ctrl+C here and run 'eb deploy' directly.
pause

REM Initialize Elastic Beanstalk
call eb init

REM Create a new environment (only needed first time)
set /p create_env=Do you want to create a new environment? (y/n): 
if "%create_env%"=="y" (
  echo Creating new Elastic Beanstalk environment...
  call eb create docway360-env
)

REM Set environment variables
echo.
echo Setting up environment variables...
echo You'll need to provide your AWS credentials and S3 bucket name.
echo.

set /p s3_bucket=AWS S3 Bucket Name: 
set /p aws_region=AWS Region: 
set /p aws_access_key=AWS Access Key ID: 
set /p aws_secret_key=AWS Secret Access Key: 

echo.
echo Setting environment variables in Elastic Beanstalk...
call eb setenv AWS_S3_BUCKET_NAME=%s3_bucket% AWS_REGION=%aws_region% AWS_ACCESS_KEY_ID=%aws_access_key% AWS_SECRET_ACCESS_KEY=%aws_secret_key% NODE_ENV=production

REM Deploy
echo.
echo Deploying application to Elastic Beanstalk...
call eb deploy

echo.
echo Deployment complete! Opening application...
call eb open