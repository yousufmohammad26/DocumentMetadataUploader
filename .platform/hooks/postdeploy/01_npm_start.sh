#!/bin/bash

# Log deployment progress
echo "[$(date)] Starting application..." > /var/log/app-deploy.log

# Set environment variables
export NODE_ENV=production
export PORT=8080

cd /var/app/current

# Start application
node server.js > /var/log/app.log 2>&1 &
APP_PID=$!

# Check if process started successfully
if ps -p $APP_PID > /dev/null; then
  echo "[$(date)] Application started successfully with PID: $APP_PID" >> /var/log/app-deploy.log
  # Save PID to file
  echo $APP_PID > /var/app/current/app.pid
else
  echo "[$(date)] FAILED TO START APPLICATION" >> /var/log/app-deploy.log
  exit 1
fi