#!/bin/bash
cd $EB_APP_STAGING_DIR
echo "Setting up npm environment..."
npm config set unsafe-perm true