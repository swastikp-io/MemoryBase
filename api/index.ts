import { app, setupRoutes } from '../server.ts';

// Initialize the API routes
setupRoutes();

// Disable Vercel's default body parser so Express can handle it
// Also increase maxDuration to 60s for AI streaming
export const config = {
  api: {
    bodyParser: false,
  },
  maxDuration: 60,
};

// Export the Express app for Vercel's serverless environment
export default app;
