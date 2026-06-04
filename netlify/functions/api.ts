import serverless from "serverless-http";
import { app, setupRoutes } from "../../server.ts";

setupRoutes();

// Configure serverless-http to strip the Netlify function path prefix
// so that Express routes like /api/chat still match correctly.
export const handler = serverless(app, {
  basePath: '/.netlify/functions'
});
