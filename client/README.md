# IR Dashboard Client

React + TypeScript frontend for the IR Dashboard application.

## Features

- React 19 with TypeScript
- Vite for fast development and building
- Tailwind CSS for styling
- Supabase integration for data storage
- PDF upload and processing interface
- Responsive design with modern UI components

## Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

## Setup

1. Run the setup script:

   ```bash
   ./setup.sh
   ```

2. Update environment variables in `.env`:
   ```bash
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_PARSER_API_URL=your_deployed_server_url
   ```

## Development

Start the development server:

```bash
pnpm dev
```

The application will be available at `http://localhost:5173`

## Building for Production

Build the application:

```bash
pnpm build
```

The built files will be in the `dist` directory.

## Deployment

The client is a static React application that can be deployed to:

- Vercel
- Netlify
- AWS S3 + CloudFront
- Any static hosting provider

Make sure to update the `VITE_PARSER_API_URL` environment variable to point to your deployed server.

## Environment Variables

- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `VITE_PARSER_API_URL`: URL of the deployed server API
