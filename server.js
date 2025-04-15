// This is a simple Express server that will serve our built files
// and also handle API requests
import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// ES modules compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Check if we're running the compiled server or the source server
let serverModule;
try {
  // First try to import the compiled server
  if (fs.existsSync('./dist/index.js')) {
    console.log('Loading compiled server module...');
    serverModule = await import('./dist/index.js');
  } else {
    console.log('Loading source server module...');
    serverModule = await import('./server/index.js');
  }
} catch (error) {
  console.error('Failed to import server module:', error);
  process.exit(1);
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