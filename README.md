# IR Dashboard System

A comprehensive web-based dashboard for uploading, processing, and managing Incident Reports (IRs) with AI-powered text extraction and analysis.

## 🎯 Features

- **File Upload**: Drag & drop PDF upload with progress tracking
- **AI Processing**: Automated text extraction and structured data parsing
- **Smart Search**: Advanced search with autocomplete and filters
- **Report Management**: View, download, and manage processed reports
- **Real-time Dashboard**: Live statistics and status updates

## 🧱 Tech Stack

- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Backend**: FastAPI + Python
- **Database & Storage**: Supabase (PostgreSQL + Storage)
- **AI Processing**: OpenAI GPT-4 + OCR (Tesseract)

## 🏗️ Project Structure

The project is now split into separate client and server applications for independent hosting:

```
irDashboard/
├── client/          # React frontend application
│   ├── src/         # React source code
│   ├── public/      # Static assets
│   ├── package.json # Client dependencies
│   ├── setup.sh     # Client setup script
│   └── README.md    # Client documentation
├── server/          # FastAPI backend application
│   ├── server.py    # Main server application
│   ├── parser/      # PDF processing logic
│   ├── requirements.txt # Python dependencies
│   ├── setup.sh     # Server setup script
│   └── README.md    # Server documentation
└── supabase-setup.sql # Database schema
```

## 🚀 Quick Setup

### 1. Database Setup (Required First)

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to Settings > API to get your project URL and anon key
3. Run the SQL script in your Supabase SQL editor:
   ```sql
   -- Copy and paste the contents of supabase-setup.sql
   ```
4. Create a storage bucket named `ir-reports`:
   - Go to Storage in Supabase dashboard
   - Create new bucket: `ir-reports`
   - Make it public for file access

### 2. Server Setup

```bash
cd server/
./setup.sh

# Update .env with your OpenAI API key and configuration
```

### 3. Client Setup

```bash
cd client/
./setup.sh

# Update .env with your Supabase credentials and server URL
```

## 🏃‍♂️ Running the Application

### Development Mode

1. **Start the Server**:

   ```bash
   cd server/
   python server.py
   ```

   The API will be available at `http://localhost:8000`

2. **Start the Client**:
   ```bash
   cd client/
   pnpm dev
   ```
   The frontend will be available at `http://localhost:5173`

### Production Deployment

#### Server Deployment

Deploy the server to platforms like:

- Railway
- Render
- Heroku
- DigitalOcean App Platform
- AWS/GCP/Azure

#### Client Deployment

Deploy the client to static hosting like:

- Vercel
- Netlify
- AWS S3 + CloudFront

Make sure to update environment variables for production URLs.

## 📊 How It Works

1. **Upload**: Users drag & drop IR PDF files
2. **Storage**: Files are uploaded to Supabase Storage
3. **Processing**: FastAPI server processes PDFs using the parser
4. **AI Analysis**: OpenAI extracts structured data from Hindi text
5. **Storage**: Parsed JSON and metadata saved to database
6. **Display**: Real-time dashboard shows processed reports with search/filter

## 🔧 API Endpoints

- `GET /` - API status
- `GET /health` - Health check
- `POST /process-pdf` - Process uploaded PDF file

## 📱 Dashboard Features

### Upload Module

- Drag & drop interface
- Multiple file support
- Real-time progress tracking
- Status indicators (uploading → processing → completed)

### Search & Filter

- Smart search with autocomplete
- Filter by suspect name, location, date range
- Keyword/tag filtering
- Real-time results

### Report Cards

- Summary view with key information
- Status indicators
- Quick actions (view details, download)
- Responsive design

### Detailed View

- Complete parsed data display
- Structured tables for activities, encounters
- Download options (JSON/PDF)
- Modal interface

## � Environment Variables

### Client (.env)

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_PARSER_API_URL=your_deployed_server_url
```

### Server (.env)

```bash
OPENAI_API_KEY=your_openai_api_key_here
PORT=8000
HOST=0.0.0.0
ALLOWED_ORIGINS=http://localhost:5173,your_deployed_client_url
```

## 🐛 Troubleshooting

### Common Issues

1. **Parser API not connecting**

   - Check if server is running on the correct port
   - Verify CORS settings and allowed origins
   - Check network connectivity between client and server

2. **Supabase errors**

   - Verify database schema matches supabase-setup.sql
   - Check storage bucket exists and is public
   - Validate environment variables

3. **Upload failures**

   - Check file size limits in Supabase
   - Verify OpenAI API key in server .env
   - Check storage permissions

4. **Environment Variables**
   - Make sure all required variables are set
   - Check for typos in variable names
   - Restart servers after changing .env files

- Use browser dev tools to monitor network requests
- Check Python console for parser errors
- Verify Supabase logs for database issues
- Test with small PDF files first

## 📋 Next Steps

1. Set up your Supabase project
2. Configure environment variables
3. Start both servers (Python API + React)
4. Upload a test PDF to verify end-to-end flow
5. Customize the UI theme and styling as needed

## 🤝 Support

If you encounter any issues:

1. Check the troubleshooting section
2. Verify all environment variables are set
3. Test the parser independently first
4. Check browser console and network tab for errors
