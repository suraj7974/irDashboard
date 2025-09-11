import React, { useState } from "react";
import { motion } from "framer-motion";
import { Download, Eye, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import { IRReport } from "../types";

interface ReportCardProps {
  report: IRReport;
  onViewDetails: (report: IRReport) => void;
  onDownload: (report: IRReport, type: "pdf") => void;
}

export default function ReportCard({ report, onViewDetails, onDownload }: ReportCardProps) {
  const [imageError, setImageError] = useState(false);

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
            {/* Profile Image or Default Icon */}
            <div className="flex-shrink-0">
              {report.profile_image_url && !imageError ? (
                <img
                  src={report.profile_image_url}
                  alt={report.metadata?.name || "Profile"}
                  className="h-12 w-12 rounded-full object-cover border-2 border-gray-200"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="p-2 bg-primary-50 rounded-lg">
                  <User className="h-8 w-8 text-primary-600" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-lg leading-tight">{report.metadata?.name || "Unknown Subject"}</h3>
              <p className="text-sm text-gray-500 mt-1 truncate max-w-xs" title={report.original_filename}>
                {report.original_filename.length > 40 ? `${report.original_filename.substring(0, 40)}...` : report.original_filename}
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
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {report.metadata ? (
          <>
            {/* Stats - Only the 3 requested sections */}
            <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-900">{report.metadata.criminal_activities?.length || 0}</p>
                <p className="text-xs text-gray-500">Criminal Activities</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-900">{report.metadata.police_encounters?.length || 0}</p>
                <p className="text-xs text-gray-500">Police Encounters</p>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <User className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Processing report...</p>
            <p className="text-xs text-gray-400 mt-1">Details will be available once processing is complete</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <button
            onClick={() => onViewDetails(report)}
            className="flex items-center space-x-2 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
          >
            <Eye className="h-4 w-4" />
            <span>View Details</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onDownload(report, "pdf")}
              className="flex items-center space-x-1 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-700 transition-colors"
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
