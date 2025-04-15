#!/bin/bash
# Add logging for debugging
echo "Starting application in postdeploy hook" >> /var/log/eb-hooks.log
cd /var/app/current

# Set environment variables
export NODE_ENV=production

# Start application with node server.js (matching Procfile)
if node server.js > /var/log/app.log 2>&1 & then
  echo "Application started successfully" >> /var/log/eb-hooks.log
else
  echo "Failed to start application, exit code: $?" >> /var/log/eb-hooks.log
fi

# Save PID to file for reference
echo $! > /var/app/current/app.pid