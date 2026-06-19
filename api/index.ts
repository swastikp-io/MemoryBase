import { app, setupRoutes } from '../server.ts';

// Initialize the API routes
setupRoutes();

// Also increase maxDuration to 60s for AI streaming
export const config = {
  api: {
    bodyParser: false,
  },
  maxDuration: 60,
};

// Export the Express app for Vercel's serverless environment
export default app;
