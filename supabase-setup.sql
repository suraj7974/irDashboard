-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ir_reports table
CREATE TABLE public.ir_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT NOT NULL CHECK (status IN ('uploading', 'processing', 'completed', 'error')),
    file_size BIGINT NOT NULL,
    file_url TEXT,
    summary TEXT,
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_ir_reports_status ON public.ir_reports(status);
CREATE INDEX idx_ir_reports_uploaded_at ON public.ir_reports(uploaded_at DESC);
CREATE INDEX idx_ir_reports_metadata_name ON public.ir_reports((metadata->>'name'));
CREATE INDEX idx_ir_reports_metadata_area ON public.ir_reports((metadata->>'area_region'));
CREATE INDEX idx_ir_reports_metadata_search ON public.ir_reports USING GIN (metadata);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_ir_reports_updated_at 
    BEFORE UPDATE ON public.ir_reports 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE public.ir_reports ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for authenticated users
CREATE POLICY "Allow all operations for authenticated users" ON public.ir_reports
    FOR ALL USING (auth.role() = 'authenticated');

-- Create policy to allow all operations for anonymous users (for development)
CREATE POLICY "Allow all operations for anonymous users" ON public.ir_reports
    FOR ALL USING (auth.role() = 'anon');

-- Grant permissions
GRANT ALL ON public.ir_reports TO authenticated;
GRANT ALL ON public.ir_reports TO anon;
