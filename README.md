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

## 🚀 Quick Setup

### 1. Frontend Setup

```bash
# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env

# Update .env with your Supabase credentials
```

### 2. Supabase Setup

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

### 3. Python Backend Setup

```bash
# Install Python dependencies
pip install -r requirements.txt

# Update your OpenAI API key in parser/main.py
```

### 4. Environment Configuration

Update `.env` with your credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_PARSER_API_URL=http://localhost:8000
```

## 🏃‍♂️ Running the Application

### Start the Python API Server

```bash
python server.py
```

The API will be available at `http://localhost:8000`

### Start the React Development Server

```bash
pnpm dev
```

The frontend will be available at `http://localhost:5173`

## 📊 How It Works

1. **Upload**: Users drag & drop IR PDF files
2. **Storage**: Files are uploaded to Supabase Storage
3. **Processing**: FastAPI server processes PDFs using your existing parser
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

## 🗄️ Database Schema

### ir_reports table

- `id` (UUID) - Primary key
- `filename` - Storage filename
- `original_filename` - Original upload name
- `uploaded_at` - Upload timestamp
- `status` - Processing status
- `file_size` - File size in bytes
- `file_url` - Supabase storage URL
- `parsed_json_url` - Processed JSON URL
- `summary` - Generated summary
- `metadata` - Structured JSONB data
- `error_message` - Error details if processing fails

## 🎨 UI Components

- **FileUpload**: Drag & drop with progress
- **SearchBar**: Advanced search with filters
- **ReportCard**: Card view of reports
- **ReportDetailModal**: Full report details
- **Dashboard**: Main application layout

## ⚙️ Configuration

### Parser Integration

The system integrates with your existing parser (`parser/main.py`) through:

- FastAPI wrapper (`server.py`)
- Structured data extraction
- Error handling and validation

### Supabase Integration

- File storage for PDFs and JSON
- PostgreSQL database for metadata
- Real-time subscriptions (optional)
- Row Level Security enabled

## 🔐 Security

- Environment variables for API keys
- Supabase Row Level Security
- File type validation
- Error handling and sanitization

## 📈 Performance

- Optimized search with database indexes
- Lazy loading for large datasets
- Image optimization and caching
- Efficient state management

## 🐛 Troubleshooting

### Common Issues

1. **Parser API not connecting**

   - Check if server.py is running on port 8000
   - Verify CORS settings

2. **Supabase errors**

   - Verify database schema matches supabase-setup.sql
   - Check storage bucket exists and is public
   - Validate environment variables

3. **Upload failures**
   - Check file size limits in Supabase
   - Verify OpenAI API key in parser/main.py
   - Check storage permissions

### Development Tips

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
