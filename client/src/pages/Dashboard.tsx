import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Upload, Search, BarChart3, Users, Clock, AlertTriangle, TrendingUp } from "lucide-react";
import FileUpload from "../components/FileUpload";
import SearchBar from "../components/SearchBar";
import ReportCard from "../components/ReportCard";
import ReportDetailModal from "../components/ReportDetailModal";
import { IRReport, SearchFilters, UploadProgress } from "../types";
import { IRReportAPI } from "../api/reports";
import { ParserService } from "../services/parser";

export default function Dashboard() {
  const [reports, setReports] = useState<IRReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<IRReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({});
  const [selectedReport, setSelectedReport] = useState<IRReport | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [stats, setStats] = useState({
    totalReports: 0,
    completedReports: 0,
    processingReports: 0,
    errorReports: 0,
  });

  // Load reports on component mount
  useEffect(() => {
    loadReports();
    loadStats();
  }, []);

  // Filter reports when search filters change
  useEffect(() => {
    filterReports();
  }, [reports, searchFilters]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const data = await IRReportAPI.getReports();
      setReports(data);
    } catch (error) {
      console.error("Failed to load reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await IRReportAPI.getStatistics();
      setStats(statsData);
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  const filterReports = () => {
    let filtered = [...reports];

    // Filter out error reports - don't show them in the dashboard
    filtered = filtered.filter((report) => report.status !== "error");

    if (searchFilters.query) {
      const query = searchFilters.query.toLowerCase();
      filtered = filtered.filter((report) => {
        // Helper function to safely check if a string contains the query
        const contains = (text: any): boolean => {
          if (!text) return false;
          return String(text).toLowerCase().includes(query);
        };

        // Helper function to search in arrays
        const searchInArray = (arr: any[] | undefined): boolean => {
          if (!arr || !Array.isArray(arr)) return false;
          return arr.some(item => {
            if (typeof item === 'string') {
              return contains(item);
            } else if (typeof item === 'object' && item !== null) {
              // Search in object properties
              return Object.values(item).some(value => contains(value));
            }
            return false;
          });
        };

        // Search in basic report fields
        if (contains(report.original_filename) ||
            contains(report.summary) ||
            contains(report.police_station) ||
            contains(report.division) ||
            contains(report.area_committee) ||
            contains(report.uid_for_name) ||
            contains(report.rank)) {
          return true;
        }

        // Search in metadata
        if (report.metadata) {
          const metadata = report.metadata;
          
          // Search in basic metadata fields
          if (contains(metadata.name) ||
              contains(metadata.group_battalion) ||
              contains(metadata.area_region) ||
              contains(metadata.supply_team_supply) ||
              contains(metadata.ied_bomb) ||
              contains(metadata.meeting) ||
              contains(metadata.platoon) ||
              contains(metadata.involvement) ||
              contains(metadata.history) ||
              contains(metadata.bounty) ||
              contains(metadata.organizational_period)) {
            return true;
          }

          // Search in array fields
          if (searchInArray(metadata.aliases) ||
              searchInArray(metadata.villages_covered) ||
              searchInArray(metadata.weapons_assets) ||
              searchInArray(metadata.important_points)) {
            return true;
          }

          // Search in criminal activities
          if (metadata.criminal_activities && searchInArray(metadata.criminal_activities)) {
            return true;
          }

          // Search in police encounters
          if (metadata.police_encounters && searchInArray(metadata.police_encounters)) {
            return true;
          }

          // Search in hierarchical role changes
          if (metadata.hierarchical_role_changes && searchInArray(metadata.hierarchical_role_changes)) {
            return true;
          }

          // Search in movement routes
          if (metadata.movement_routes && Array.isArray(metadata.movement_routes)) {
            const routeMatch = metadata.movement_routes.some(route => {
              if (contains(route.route_name) ||
                  contains(route.description) ||
                  contains(route.purpose) ||
                  contains(route.frequency)) {
                return true;
              }
              
              // Search in route segments
              if (route.segments && Array.isArray(route.segments)) {
                return route.segments.some(segment => 
                  contains(segment.from) ||
                  contains(segment.to) ||
                  contains(segment.description)
                );
              }
              
              return false;
            });
            
            if (routeMatch) return true;
          }
        }

        // Search in questions analysis
        if (report.questions_analysis && report.questions_analysis.results) {
          const questionMatch = report.questions_analysis.results.some(result => 
            contains(result.standard_question) ||
            contains(result.found_question) ||
            contains(result.answer)
          );
          
          if (questionMatch) return true;
        }

        return false;
      });
    }

    if (searchFilters.suspectName) {
      const name = searchFilters.suspectName.toLowerCase();
      filtered = filtered.filter((report) => report.metadata?.name?.toLowerCase().includes(name));
    }

    if (searchFilters.location) {
      const location = searchFilters.location.toLowerCase();
      filtered = filtered.filter(
        (report) =>
          report.metadata?.area_region?.toLowerCase().includes(location) ||
          (report.metadata?.villages_covered && Array.isArray(report.metadata.villages_covered) && 
           report.metadata.villages_covered.some((village) => village.toLowerCase().includes(location)))
      );
    }

    if (searchFilters.dateRange?.start) {
      filtered = filtered.filter((report) => new Date(report.uploaded_at) >= searchFilters.dateRange!.start);
    }

    if (searchFilters.dateRange?.end) {
      filtered = filtered.filter((report) => new Date(report.uploaded_at) <= searchFilters.dateRange!.end);
    }

    // Manual field filters
    if (searchFilters.police_station) {
      filtered = filtered.filter((report) => report.police_station === searchFilters.police_station);
    }

    if (searchFilters.division) {
      filtered = filtered.filter((report) => report.division === searchFilters.division);
    }

    if (searchFilters.area_committee) {
      filtered = filtered.filter((report) => report.area_committee === searchFilters.area_committee);
    }

    if (searchFilters.rank) {
      filtered = filtered.filter((report) => report.rank === searchFilters.rank);
    }

    setFilteredReports(filtered);
  };

  const handleFileUpload = async (files: File[]) => {
    setUploading(true);
    const newProgress: UploadProgress[] = files.map((file) => ({
      file,
      progress: 0,
      status: "uploading",
    }));
    setUploadProgress(newProgress);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Update progress for upload start
        setUploadProgress((prev) => prev.map((p, idx) => (idx === i ? { ...p, progress: 10 } : p)));

        // Upload file to Supabase
        const { id, file_url } = await IRReportAPI.uploadFile(file);

        // Update progress for upload complete
        setUploadProgress((prev) => prev.map((p, idx) => (idx === i ? { ...p, progress: 30, id } : p)));

        // Create initial report record (without manual details)
        const reportData = {
          id,
          filename: `${id}/original.pdf`,
          original_filename: file.name,
          uploaded_at: new Date().toISOString(),
          status: "processing" as const,
          file_size: file.size,
          file_url,
        };

        const report = await IRReportAPI.createReport(reportData);

        // Update progress for processing start
        setUploadProgress((prev) => prev.map((p, idx) => (idx === i ? { ...p, progress: 50, status: "processing" } : p)));

        try {
          // Process with parser
          const result = await ParserService.processPDF(file);
          //console.log("Processed result:", result);
          const summary = ParserService.generateSummary(result.metadata);
          //console.log("Generated summary:", summary);

          // Update report with results (no JSON upload needed)
          const updateData = {
            status: "completed" as const,
            metadata: result.metadata,
            questions_analysis: result.questions_analysis,
            summary,
          };
          //console.log("Update data being sent:", updateData);

          const updatedReport = await IRReportAPI.updateReport(id, updateData);
          //console.log("Updated report received:", updatedReport);

          // Update progress for completion
          setUploadProgress((prev) => prev.map((p, idx) => (idx === i ? { ...p, progress: 100, status: "completed" } : p)));

          // Add to reports list
          setReports((prev) => [updatedReport, ...prev]);
        } catch (processingError) {
          console.error("Processing error:", processingError);

          // Update report with error
          await IRReportAPI.updateReport(id, {
            status: "error",
            error_message: processingError instanceof Error ? processingError.message : "Processing failed",
          });

          // Update progress for error
          setUploadProgress((prev) =>
            prev.map((p, idx) =>
              idx === i
                ? {
                    ...p,
                    progress: 100,
                    status: "error",
                    error: processingError instanceof Error ? processingError.message : "Processing failed",
                  }
                : p
            )
          );
        }
      }
    } catch (error) {
      console.error("Upload error:", error);
      // Handle upload errors
      setUploadProgress((prev) =>
        prev.map((p) => ({
          ...p,
          status: "error",
          error: error instanceof Error ? error.message : "Upload failed",
        }))
      );
    } finally {
      setUploading(false);
      loadStats(); // Refresh stats
      loadReports(); // Refresh reports list

      // Clear progress after 5 seconds
      setTimeout(() => {
        setUploadProgress([]);
      }, 5000);
    }
  };

  const handleViewDetails = (report: IRReport) => {
    setSelectedReport(report);
    setShowDetailModal(true);
  };

  const handleDownload = async (report: IRReport, type: "pdf") => {
    try {
      if (type === "pdf" && report.file_url) {
        await IRReportAPI.downloadFile(report.file_url, report.original_filename);
      }
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  const handleReportUpdate = (updatedReport: IRReport) => {
    setReports((prevReports) => prevReports.map((report) => (report.id === updatedReport.id ? updatedReport : report)));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Upload Section */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <FileUpload onUpload={handleFileUpload} uploading={uploading} uploadProgress={uploadProgress} />
      </motion.div>

      {/* Search Section */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-8">
        <SearchBar
          filters={searchFilters}
          onFiltersChange={setSearchFilters}
          onSearch={() => {}} // Search is handled internally in SearchBar
          reports={reports}
        />
      </motion.div>

      {/* Reports Grid */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
                <div className="flex items-start space-x-3 mb-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg" />
                  <div className="flex-1">
                    <div className="w-3/4 h-4 bg-gray-200 rounded mb-2" />
                    <div className="w-1/2 h-3 bg-gray-200 rounded" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="w-full h-3 bg-gray-200 rounded" />
                  <div className="w-2/3 h-3 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredReports.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <AnimatePresence>
              {filteredReports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  onViewDetails={handleViewDetails}
                  onDownload={handleDownload}
                  onReportUpdate={handleReportUpdate}
                />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">{reports.length === 0 ? "No reports yet" : "No reports match your search"}</h3>
            <p className="text-gray-500">{reports.length === 0 ? "Upload your first IR PDF to get started" : "Try adjusting your search criteria"}</p>
          </motion.div>
        )}
      </motion.div>

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedReport && (
          <ReportDetailModal
            report={selectedReport}
            isOpen={showDetailModal}
            onClose={() => setShowDetailModal(false)}
            onDownload={handleDownload}
            onReportUpdate={handleReportUpdate}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
