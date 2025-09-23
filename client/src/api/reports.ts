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
    try {
      // console.log("Updating report:", id, "with updates:", updates);

      // Handle metadata updates properly
      const processedUpdates = { ...updates };

      // If updating metadata, we need to merge with existing metadata
      if (updates.metadata) {
        // Get current report to merge metadata
        const { data: currentReport } = await supabase.from(TABLES.IR_REPORTS).select("metadata").eq("id", id).single();

        if (currentReport) {
          processedUpdates.metadata = {
            ...currentReport.metadata,
            ...updates.metadata,
          };
        }
      }

      const { data, error } = await supabase.from(TABLES.IR_REPORTS).update(processedUpdates).eq("id", id).select().single();

      if (error) {
        console.error("Supabase update error:", error);
        throw error;
      }

      //console.log("Updated report data:", data);
      return data;
    } catch (error) {
      console.error("Failed to update report:", error);
      throw error;
    }
  }

  // Upload profile image to S3 (ir-images bucket)
  static async uploadProfileImage(reportId: string, imageFile: File): Promise<string> {
    const fileExtension = imageFile.name.split(".").pop() || "jpg";
    const fileName = `${reportId}/profile.${fileExtension}`;

    const { data, error } = await supabase.storage.from(STORAGE_BUCKETS.IR_IMAGES).upload(fileName, imageFile, {
      cacheControl: "3600",
      upsert: true, // Allow overwriting existing profile image
    });

    if (error) {
      throw new Error(`Profile image upload failed: ${error.message}`);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(STORAGE_BUCKETS.IR_IMAGES).getPublicUrl(fileName);

    // Update the report with the profile image URL
    await IRReportAPI.updateReport(reportId, { profile_image_url: publicUrl });

    return publicUrl;
  }

  // Upload additional image to S3 (ir-images bucket)
  static async uploadAdditionalImage(reportId: string, imageFile: File): Promise<string> {
    const fileExtension = imageFile.name.split(".").pop() || "jpg";
    const timestamp = Date.now();
    const fileName = `${reportId}/additional_${timestamp}.${fileExtension}`;

    const { data, error } = await supabase.storage.from(STORAGE_BUCKETS.IR_IMAGES).upload(fileName, imageFile, {
      cacheControl: "3600",
      upsert: false,
    });

    if (error) {
      throw new Error(`Additional image upload failed: ${error.message}`);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(STORAGE_BUCKETS.IR_IMAGES).getPublicUrl(fileName);

    // Get current report to update additional images array
    const report = await this.getReport(reportId);
    if (!report) {
      throw new Error("Report not found");
    }

    const currentAdditionalImages = report.additional_images || [];
    const updatedAdditionalImages = [...currentAdditionalImages, publicUrl];

    // Update the report with the new additional images array
    await IRReportAPI.updateReport(reportId, { additional_images: updatedAdditionalImages });

    return publicUrl;
  }

  // Delete image from S3 and update report
  static async deleteImage(reportId: string, imageUrl: string, isProfileImage: boolean = false): Promise<void> {
    // Extract file path from URL
    const urlParts = imageUrl.split("/");
    const fileName = urlParts[urlParts.length - 1];
    const filePath = `${reportId}/${fileName}`;

    const { error } = await supabase.storage.from(STORAGE_BUCKETS.IR_IMAGES).remove([filePath]);

    if (error) {
      console.warn("Image deletion from storage failed:", error.message);
    }

    // Update the report to remove the image URL
    const report = await this.getReport(reportId);
    if (!report) return;

    if (isProfileImage) {
      await IRReportAPI.updateReport(reportId, { profile_image_url: undefined });
    } else {
      const currentAdditionalImages = report.additional_images || [];
      const updatedAdditionalImages = currentAdditionalImages.filter((url) => url !== imageUrl);
      await IRReportAPI.updateReport(reportId, { additional_images: updatedAdditionalImages });
    }
  }

  // Validation functions
  private static validatePoliceStation(value: string): string | null {
    if (!value || !value.trim()) return null; // Empty values are allowed
    const textOnlyRegex = /^[A-Za-z\s\-\.]*$/;
    if (!textOnlyRegex.test(value)) {
      return "Police station must contain only letters, spaces, hyphens, and periods";
    }
    return null;
  }

  private static validateUidForName(value: string): string | null {
    // UID for Name can now contain any characters - no validation needed
    return null;
  }

  // Update manual details for a report with validation
  static async updateManualDetails(
    id: string,
    manualDetails: {
      police_station?: string;
      division?: string;
      area_committee?: string;
      uid_for_name?: string;
      rank?: string;
      rpc?: string;
    }
  ): Promise<IRReport> {
    // Client-side validation
    if (manualDetails.police_station !== undefined) {
      const policeStationError = this.validatePoliceStation(manualDetails.police_station);
      if (policeStationError) {
        throw new Error(policeStationError);
      }
    }

    if (manualDetails.uid_for_name !== undefined) {
      const uidError = this.validateUidForName(manualDetails.uid_for_name);
      if (uidError) {
        throw new Error(uidError);
      }
    }

    const { data, error } = await supabase.from(TABLES.IR_REPORTS).update(manualDetails).eq("id", id).select().single();

    if (error) {
      // Handle specific database constraint errors
      if (error.code === "23505" && error.message.includes("unique_uid_for_name")) {
        throw new Error("This UID for Name is already in use. Please choose a different number.");
      }
      if (error.code === "23514" && error.message.includes("check_police_station_text_only")) {
        throw new Error("Police station must contain only letters, spaces, hyphens, and periods");
      }
      // UID for Name constraint removed - no longer needed

      throw new Error(`Manual details update failed: ${error.message}`);
    }

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
