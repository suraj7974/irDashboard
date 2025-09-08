import { supabase, STORAGE_BUCKETS, TABLES } from "../lib/supabase";
import { IRReport, IRReportMetadata, SearchFilters } from "../types";

export class IRReportAPI {
  // Upload file to Supabase Storage
  static async uploadFile(file: File): Promise<{ id: string; file_url: string }> {
    const fileId = crypto.randomUUID();
    const fileName = `${fileId}/original.pdf`;

    const { data, error } = await supabase.storage.from(STORAGE_BUCKETS.IR_REPORTS).upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(STORAGE_BUCKETS.IR_REPORTS).getPublicUrl(fileName);

    return { id: fileId, file_url: publicUrl };
  }

  // Create IR report record in database
  static async createReport(reportData: Partial<IRReport>): Promise<IRReport> {
    const { data, error } = await supabase.from(TABLES.IR_REPORTS).insert([reportData]).select().single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data;
  }

  // Update IR report with parsed data
  static async updateReport(id: string, updates: Partial<IRReport>): Promise<IRReport> {
    //console.log("updateReport called with id:", id);
    //console.log("updateReport called with updates:", updates);

    const { data, error } = await supabase.from(TABLES.IR_REPORTS).update(updates).eq("id", id).select().single();

    if (error) {
      console.error("Supabase update error:", error);
      throw new Error(`Update failed: ${error.message}`);
    }

    console.log("Supabase update successful, returned data:", data);
    return data;
  }

  // Upload parsed JSON to storage
  static async uploadParsedJSON(reportId: string, jsonData: any): Promise<string> {
    const fileName = `${reportId}/parsed.json`;

    const { data, error } = await supabase.storage.from(STORAGE_BUCKETS.IR_REPORTS).upload(fileName, JSON.stringify(jsonData, null, 2), {
      contentType: "application/json",
      cacheControl: "3600",
      upsert: true,
    });

    if (error) {
      throw new Error(`JSON upload failed: ${error.message}`);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(STORAGE_BUCKETS.IR_REPORTS).getPublicUrl(fileName);

    return publicUrl;
  }

  // Get all reports with optional filtering
  static async getReports(filters?: SearchFilters): Promise<IRReport[]> {
    let query = supabase.from(TABLES.IR_REPORTS).select("*").order("uploaded_at", { ascending: false });

    // Apply filters
    if (filters?.query) {
      query = query.or(`
        original_filename.ilike.%${filters.query}%,
        summary.ilike.%${filters.query}%,
        metadata->>name.ilike.%${filters.query}%,
        metadata->>area_region.ilike.%${filters.query}%
      `);
    }

    if (filters?.suspectName) {
      query = query.ilike("metadata->>name", `%${filters.suspectName}%`);
    }

    if (filters?.location) {
      query = query.ilike("metadata->>area_region", `%${filters.location}%`);
    }

    if (filters?.dateRange?.start) {
      query = query.gte("uploaded_at", filters.dateRange.start.toISOString());
    }

    if (filters?.dateRange?.end) {
      query = query.lte("uploaded_at", filters.dateRange.end.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Fetch failed: ${error.message}`);
    }

    return data || [];
  }

  // Get single report by ID
  static async getReport(id: string): Promise<IRReport | null> {
    const { data, error } = await supabase.from(TABLES.IR_REPORTS).select("*").eq("id", id).single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      throw new Error(`Fetch failed: ${error.message}`);
    }

    return data;
  }

  // Delete report and associated files
  static async deleteReport(id: string): Promise<void> {
    // Delete files from storage
    const filesToDelete = [`${id}/original.pdf`, `${id}/parsed.json`];

    const { error: storageError } = await supabase.storage.from(STORAGE_BUCKETS.IR_REPORTS).remove(filesToDelete);

    if (storageError) {
      console.warn("Storage cleanup failed:", storageError.message);
    }

    // Delete from database
    const { error } = await supabase.from(TABLES.IR_REPORTS).delete().eq("id", id);

    if (error) {
      throw new Error(`Delete failed: ${error.message}`);
    }
  }

  // Get search suggestions
  static async getSearchSuggestions(query: string): Promise<string[]> {
    if (!query || query.length < 2) return [];

    const { data, error } = await supabase.from(TABLES.IR_REPORTS).select("metadata").neq("metadata", null).limit(100);

    if (error || !data) return [];

    const suggestions = new Set<string>();

    data.forEach((report) => {
      const metadata = report.metadata as IRReportMetadata;
      if (!metadata) return;

      // Extract searchable terms
      if (metadata.name?.toLowerCase().includes(query.toLowerCase())) {
        suggestions.add(metadata.name);
      }

      metadata.aliases?.forEach((alias) => {
        if (alias.toLowerCase().includes(query.toLowerCase())) {
          suggestions.add(alias);
        }
      });

      if (metadata.area_region?.toLowerCase().includes(query.toLowerCase())) {
        suggestions.add(metadata.area_region);
      }

      metadata.villages_covered?.forEach((village) => {
        if (village.toLowerCase().includes(query.toLowerCase())) {
          suggestions.add(village);
        }
      });
    });

    return Array.from(suggestions).slice(0, 8);
  }

  // Download file from storage
  static async downloadFile(url: string, filename: string): Promise<void> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Download failed");
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    window.URL.revokeObjectURL(downloadUrl);
  }

  // Get dashboard statistics
  static async getStatistics(): Promise<{
    totalReports: number;
    completedReports: number;
    processingReports: number;
    errorReports: number;
  }> {
    const { data, error } = await supabase.from(TABLES.IR_REPORTS).select("status");

    if (error) {
      throw new Error(`Stats fetch failed: ${error.message}`);
    }

    const stats = data.reduce(
      (acc, report) => {
        acc.totalReports++;
        switch (report.status) {
          case "completed":
            acc.completedReports++;
            break;
          case "processing":
            acc.processingReports++;
            break;
          case "error":
            acc.errorReports++;
            break;
        }
        return acc;
      },
      {
        totalReports: 0,
        completedReports: 0,
        processingReports: 0,
        errorReports: 0,
      }
    );

    return stats;
  }
}
