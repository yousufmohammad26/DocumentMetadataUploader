#!/bin/bash

# If there's an existing application running, stop it
if [ -f /var/app/current/app.pid ]; then
  OLD_PID=$(cat /var/app/current/app.pid)
  if ps -p $OLD_PID > /dev/null; then
    echo "Stopping existing application (PID: $OLD_PID)..."
    kill -15 $OLD_PID
    sleep 5
  fi
  rm -f /var/app/current/app.pid
fi