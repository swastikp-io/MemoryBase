import { app, setupRoutes } from '../server.ts';

// Initialize the API routes
setupRoutes();

// Export the Express app for Vercel's serverless environment
export default app;
