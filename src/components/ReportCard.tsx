import React, { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Download, Eye, Calendar, MapPin, User, Shield, Clock, AlertTriangle, Users, Zap } from "lucide-react";
import { format } from "date-fns";
import { IRReport } from "../types";

interface ReportCardProps {
  report: IRReport;
  onViewDetails: (report: IRReport) => void;
  onDownload: (report: IRReport, type: "pdf") => void;
}

export default function ReportCard({ report, onViewDetails, onDownload }: ReportCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-600 bg-green-50 border-green-200";
      case "processing":
        return "text-orange-600 bg-orange-50 border-orange-200";
      case "error":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <div className="h-2 w-2 bg-green-500 rounded-full" />;
      case "processing":
        return <Clock className="h-4 w-4" />;
      case "error":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <div className="h-2 w-2 bg-gray-500 rounded-full" />;
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ y: -4 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300"
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-primary-50 rounded-lg">
              <FileText className="h-6 w-6 text-primary-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-lg leading-tight">{report.metadata?.name || "Unknown Subject"}</h3>
              <p className="text-sm text-gray-500 mt-1 truncate max-w-xs" title={report.original_filename}>
                {report.original_filename.length > 40 
                  ? `${report.original_filename.substring(0, 40)}...` 
                  : report.original_filename}
              </p>
              <div className="flex items-center space-x-4 mt-2">
                <div className="flex items-center space-x-1 text-sm text-gray-500">
                  <Calendar className="h-4 w-4" />
                  <span>{format(new Date(report.uploaded_at), "MMM dd, yyyy")}</span>
                </div>
                <div className="flex items-center space-x-1 text-sm text-gray-500">
                  <div className="h-1 w-1 bg-gray-400 rounded-full" />
                  <span>{(report.file_size / 1024 / 1024).toFixed(1)} MB</span>
                </div>
              </div>
            </div>
          </div>

          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border text-sm font-medium ${getStatusColor(report.status)}`}>
            {getStatusIcon(report.status)}
            <span className="capitalize">{report.status}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      {report.status === "completed" && report.metadata && (
        <div className="p-6">
          {/* Stats - Only the 3 requested sections */}
          <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900">{report.metadata.criminal_activities?.length || 0}</p>
              <p className="text-xs text-gray-500">Criminal Activities</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900">{report.metadata.police_encounters?.length || 0}</p>
              <p className="text-xs text-gray-500">Police Encounters</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900">{report.metadata.maoists_met?.length || 0}</p>
              <p className="text-xs text-gray-500">Maoists Met</p>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {report.status === "error" && (
        <div className="p-6">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <p className="text-sm font-medium">Processing Failed</p>
          </div>
          {report.error_message && <p className="text-sm text-gray-600 mt-2">{report.error_message}</p>}
        </div>
      )}

      {/* Processing State */}
      {report.status === "processing" && (
        <div className="p-6">
          <div className="flex items-center space-x-2 text-orange-600">
            <Clock className="h-5 w-5" />
            <p className="text-sm font-medium">Processing with AI...</p>
          </div>
          <p className="text-sm text-gray-600 mt-2">Extracting text and analyzing content. This may take a few minutes.</p>
        </div>
      )}

      {/* Actions */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <button
            onClick={() => onViewDetails(report)}
            disabled={report.status !== "completed"}
            className="flex items-center space-x-2 text-sm font-medium text-primary-600 hover:text-primary-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <Eye className="h-4 w-4" />
            <span>View Details</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onDownload(report, "pdf")}
              disabled={report.status !== "completed"}
              className="flex items-center space-x-1 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>PDF</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
