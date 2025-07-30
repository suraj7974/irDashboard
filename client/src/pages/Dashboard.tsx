import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Search, BarChart3, Users, Clock, AlertTriangle } from "lucide-react";
import SearchBar from "../components/SearchBar";
import ReportCard from "../components/ReportCard";
import ReportDetailModal from "../components/ReportDetailModal";
import { IRReport, SearchFilters } from "../types";
import { IRReportAPI } from "../api/reports";

export default function Dashboard() {
  const [reports, setReports] = useState<IRReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<IRReport[]>([]);
  const [loading, setLoading] = useState(true);
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
      filtered = filtered.filter(
        (report) =>
          report.original_filename.toLowerCase().includes(query) ||
          report.summary?.toLowerCase().includes(query) ||
          report.metadata?.name?.toLowerCase().includes(query) ||
          report.metadata?.area_region?.toLowerCase().includes(query) ||
          report.metadata?.aliases?.some((alias) => alias.toLowerCase().includes(query)) ||
          report.metadata?.villages_covered?.some((village) => village.toLowerCase().includes(query))
      );
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
          report.metadata?.villages_covered?.some((village) => village.toLowerCase().includes(location))
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary-500 rounded-lg">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">IR Dashboard</h1>
                <p className="text-sm text-gray-500">Incident Reports Management System</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {filteredReports.map((report) => (
                  <ReportCard key={report.id} report={report} onViewDetails={handleViewDetails} onDownload={handleDownload} />
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
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedReport && (
          <ReportDetailModal report={selectedReport} isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} onDownload={handleDownload} />
        )}
      </AnimatePresence>
    </div>
  );
}
