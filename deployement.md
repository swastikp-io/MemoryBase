# Paralex Deployment Guide (Netlify)

This guide covers how to deploy the Paralex application to Netlify.

The application has been configured as a full-stack Netlify app:
- **Frontend**: A React Single-Page Application (SPA) built with Vite.
- **Backend**: An Express.js backend wrapped in a Netlify Serverless Function.

## Prerequisites

1. A [Netlify account](https://app.netlify.com/signup)
2. A [GitHub account](https://github.com/) with this repository pushed to it.
3. Your database and API keys ready (e.g., Supabase, OpenRouter API keys).

## Automated Deployment (Recommended)

1. Log into Netlify and click **"Add new site" > "Import an existing project"**.
2. Select **GitHub** and authorize Netlify to access your repositories.
3. Choose the `Paralexai` repository.
4. Netlify will automatically detect the build settings from the provided `netlify.toml` file:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Functions directory**: `netlify/functions`
5. Click **"Show advanced"** and add your environment variables:
   - `OPENROUTER_API_KEY`: Your OpenRouter API key.
   - `SUPABASE_URL`: Your Supabase project URL (if applicable).
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (if applicable).
6. Click **Deploy site**. Netlify will build the frontend and bundle the backend API into a serverless function automatically.

## Manual CLI Deployment

If you prefer to deploy via the command line:

1. Install the Netlify CLI globally:
   ```bash
   npm install -g netlify-cli
   ```
2. Link your project to Netlify:
   ```bash
   netlify link
   ```
3. Set your environment variables via CLI or the Netlify dashboard:
   ```bash
   netlify env:set OPENROUTER_API_KEY your_key_here
   ```
4. Deploy a draft preview to ensure everything works:
   ```bash
   netlify deploy --build
   ```
5. Deploy to production:
   ```bash
   netlify deploy --build --prod
   ```

## How It Works

- The frontend static files are generated in the `dist/` directory during the build step and served statically over Netlify's global edge network.
- The Express backend in `server.ts` has been refactored to export the app configuration natively.
- `netlify/functions/api.ts` imports the Express application and wraps it using `serverless-http` to run seamlessly as a serverless Netlify function.
- `netlify.toml` configures automatic rewrites: `/*` serves your React SPA, and `/api/*` proxies traffic reliably to the serverless function.

## Troubleshooting

- **404 on API Routes**: Ensure that the `netlify.toml` `[[redirects]]` for `/api/*` exists and points to `/.netlify/functions/api/:splat`.
- **Function timeout**: Serverless functions have a 10-second timeout on the free tier. If a streaming response takes longer to start, Netlify might close the connection. If you run into timeouts, consider upgrading to Pro (26s timeout) or reducing the LLM's response generation time.
- **Environment variables missing**: Be sure all variables from your local `.env` file are added to the Netlify Site settings under "Site configuration > Environment variables".
