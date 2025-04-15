#!/usr/bin/env node

/**
 * Production server for Docway 360 Document Manager
 * This simplified server can be used for production deployments
 */
const express = require('express');
const { createServer } = require('http');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8080;

// Check if we're running the compiled server or the source server
let serverPath;
if (fs.existsSync('./dist/index.js')) {
  console.log('Loading compiled server module...');
  serverPath = './dist/index.js';
} else if (fs.existsSync('./server/index.js')) {
  console.log('Loading source server module...');
  serverPath = './server/index.js';
} else {
  console.error('Could not find server module!');
  process.exit(1);
}

// Load the API routes
try {
  const apiRoutes = require(serverPath);
  if (typeof apiRoutes === 'function') {
    apiRoutes(app);
  }
} catch (error) {
  console.error('Failed to load API routes:', error);
}

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'dist')));

// The catchall handler: for any request that doesn't match the above,
// send back the index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const server = createServer(app);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});