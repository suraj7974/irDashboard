# Deployment Guide

This guide covers deploying the separated client and server applications to different hosting platforms.

## Server Deployment Options

### 1. Railway (Recommended)

1. Connect your GitHub repository
2. Select the `server` folder as the root
3. Set environment variables in Railway dashboard
4. Railway will auto-detect Python and install dependencies

### 2. Render

1. Create a new Web Service
2. Connect your repository
3. Set root directory to `server`
4. Build command: `pip install -r requirements.txt`
5. Start command: `uvicorn server:app --host 0.0.0.0 --port $PORT`

### 3. Heroku

1. Create `Procfile` in server directory:
   ```
   web: uvicorn server:app --host 0.0.0.0 --port $PORT
   ```
2. Deploy using Heroku CLI or GitHub integration

### 4. DigitalOcean App Platform

1. Create a new app
2. Select your repository and `server` folder
3. Set environment variables
4. Deploy

## Client Deployment Options

### 1. Vercel (Recommended)

1. Connect your GitHub repository
2. Set root directory to `client`
3. Build command: `pnpm build`
4. Output directory: `dist`
5. Set environment variables in Vercel dashboard

### 2. Netlify

1. Connect your repository
2. Set base directory to `client`
3. Build command: `pnpm build`
4. Publish directory: `client/dist`

### 3. AWS S3 + CloudFront

1. Build the client: `cd client && pnpm build`
2. Upload `dist` folder contents to S3 bucket
3. Configure CloudFront distribution
4. Set up custom domain if needed

## Environment Variables

### Server Environment Variables

Set these in your hosting platform:

```
OPENAI_API_KEY=your_openai_api_key
PORT=8000
HOST=0.0.0.0
ALLOWED_ORIGINS=https://your-client-domain.com,https://www.your-client-domain.com
```

### Client Environment Variables

Set these in your hosting platform:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_PARSER_API_URL=https://your-server-domain.com
```

## Important Notes

1. **CORS Configuration**: Make sure to update `ALLOWED_ORIGINS` in server environment to include your deployed client URL
2. **HTTPS**: Use HTTPS for production deployments
3. **Environment Variables**: Never commit sensitive keys to version control
4. **Database**: Ensure your Supabase database is properly configured and accessible
5. **File Storage**: Verify Supabase storage bucket is created and configured

## Testing Deployment

1. Deploy server first and test the health endpoint: `https://your-server.com/health`
2. Update client environment with server URL and deploy
3. Test file upload functionality end-to-end
4. Monitor logs for any errors
