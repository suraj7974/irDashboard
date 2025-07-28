import React, { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Download, Eye, Calendar, Clock, AlertTriangle, Users, Building2, Shield, Edit3, Hash, Award, MapPin } from "lucide-react";
import { format } from "date-fns";
import { IRReport } from "../types";
import { IRReportAPI } from "../api/reports";

interface ReportCardProps {
  report: IRReport;
  onViewDetails: (report: IRReport) => void;
  onDownload: (report: IRReport, type: "pdf") => void;
  onReportUpdate?: (updatedReport: IRReport) => void;
}

export default function ReportCard({ report, onViewDetails, onDownload, onReportUpdate }: ReportCardProps) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [fieldValues, setFieldValues] = useState({
    police_station: report.police_station || "",
    division: report.division || "",
    area_committee: report.area_committee || "",
    uid_for_name: report.uid_for_name || "",
    rank: report.rank || "",
  });

  const rankOptions = ["Szc", "Dvc", "Acm /ppcm", "Coy", "BN", "Pm", "Militia", "Rpc", "Others"];

  const handleSaveField = async (fieldName: string, value: string) => {
    try {
      setSavingField(fieldName);

      const updatedReport = await IRReportAPI.updateManualDetails(report.id, {
        [fieldName]: value,
      });
      setEditingField(null);
      if (onReportUpdate) {
        onReportUpdate(updatedReport);
      }
    } catch (error) {
      console.error(`Failed to update ${fieldName}:`, error);
      alert(`Failed to update ${fieldName}. Please try again.`);
    } finally {
      setSavingField(null);
    }
  };

  const handleCancelEdit = (fieldName: string) => {
    setFieldValues((prev) => ({
      ...prev,
      [fieldName]: (report[fieldName as keyof IRReport] || "") as string,
    }));
    setEditingField(null);
  };

  // Each field can be edited if it's empty (not set yet)
  const canEditField = (fieldName: keyof typeof fieldValues) => {
    const currentValue = report[fieldName as keyof IRReport] as string;
    return !currentValue; // Can edit if field is empty/undefined
  };

  // Check if any field can be edited
  const canEditAnyField =
    canEditField("police_station") || canEditField("division") || canEditField("area_committee") || canEditField("uid_for_name") || canEditField("rank");

  // Check if any field has data to show the section
  const hasAnyManualDetails = report.police_station || report.division || report.area_committee || report.uid_for_name || report.rank;

  // Render individual field with edit capability
  const renderField = (fieldName: keyof typeof fieldValues, label: string, icon: React.ReactNode, placeholder: string, isDropdown = false) => {
    const currentValue = report[fieldName] as string;
    const fieldCanEdit = canEditField(fieldName); // Per-field edit permission

    const isEditing = editingField === fieldName;
    const isSaving = savingField === fieldName;

    if (isEditing) {
      return (
        <div className="bg-white border-2 border-blue-300 rounded-lg p-4 shadow-md">
          <label className="flex items-center text-sm font-medium text-blue-800 mb-3">
            {icon}
            <span className="ml-2">{label}</span>
          </label>
          {isDropdown ? (
            <select
              value={fieldValues[fieldName]}
              onChange={(e) => setFieldValues((prev) => ({ ...prev, [fieldName]: e.target.value }))}
              className="w-full px-3 py-2 text-sm border-2 border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-3"
            >
              <option value="">Select {label.toLowerCase()}</option>
              {rankOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : (
            <>
              <input
                type="text"
                value={fieldValues[fieldName]}
                onChange={(e) => setFieldValues((prev) => ({ ...prev, [fieldName]: e.target.value }))}
                className="w-full px-3 py-2 text-sm border-2 border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-2"
                placeholder={placeholder}
              />
            </>
          )}
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => handleCancelEdit(fieldName)}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-all duration-200"
            >
              Cancel
            </button>
            <button
              onClick={() => handleSaveField(fieldName, fieldValues[fieldName])}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all duration-200"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      );
    }

    if (currentValue) {
      return (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-100 p-3 rounded-lg">
          <div className="flex items-center space-x-3">
            {icon}
            <div>
              <p className="text-sm font-medium text-blue-700">{label}</p>
              <p className="text-base font-semibold text-gray-900">{currentValue}</p>
            </div>
          </div>
          {fieldCanEdit && (
            <button
              onClick={() => {
                setFieldValues((prev) => ({ ...prev, [fieldName]: currentValue }));
                setEditingField(fieldName);
              }}
              className="text-sm text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-100 transition-all duration-200"
            >
              <Edit3 className="h-4 w-4" />
            </button>
          )}
        </div>
      );
    }

    if (fieldCanEdit) {
      return (
        <div className="flex items-center justify-between bg-gray-50 border-2 border-dashed border-blue-200 p-3 rounded-lg hover:border-blue-300 transition-all duration-200">
          <div className="flex items-center space-x-3">
            {icon}
            <div>
              <p className="text-sm font-medium text-blue-700">{label}</p>
              <p className="text-sm text-gray-400">Not set</p>
            </div>
          </div>
          <button
            onClick={() => {
              setFieldValues((prev) => ({ ...prev, [fieldName]: "" }));
              setEditingField(fieldName);
            }}
            className="text-sm text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-100 transition-all duration-200"
          >
            <Edit3 className="h-4 w-4" />
          </button>
        </div>
      );
    }

    return null;
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

      {/* Manual Details Section - Individual field editing */}
      {(hasAnyManualDetails || canEditAnyField) && (
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
          <div className="bg-white border-2 border-blue-100 rounded-lg p-4 shadow-sm">
            <div className="flex items-center mb-4 pb-2 border-b border-blue-100">
              <h4 className="text-base font-semibold text-blue-800 flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Administrative Details
              </h4>
            </div>

            <div className="space-y-4">
              {/* Grid for all fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderField("police_station", "Police Station", <Building2 className="h-4 w-4 text-blue-600" />, "Enter police station")}
                {renderField("division", "Division", <MapPin className="h-4 w-4 text-blue-600" />, "Enter division")}
                {renderField("area_committee", "Area Committee", <Users className="h-4 w-4 text-blue-600" />, "Enter area committee")}
                {renderField("uid_for_name", "UID for Name", <Hash className="h-4 w-4 text-blue-600" />, "Enter UID for name")}
                {renderField("rank", "Rank", <Award className="h-4 w-4 text-blue-600" />, "Select rank", true)}
              </div>

              {/* Show message if no details and can't edit */}
              {!hasAnyManualDetails && !canEditAnyField && <p className="text-sm text-gray-500 italic text-center py-4">No administrative details available</p>}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="p-6 pt-0 flex justify-between items-center">
        <div className="flex space-x-3">
          <button
            onClick={() => onViewDetails(report)}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-300 transition-all duration-200"
          >
            <Eye className="h-4 w-4" />
            <span>View Details</span>
          </button>
          <button
            onClick={() => onDownload(report, "pdf")}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-all duration-200"
          >
            <Download className="h-4 w-4" />
            <span>Download</span>
          </button>
        </div>

        {report.status === "processing" && (
          <div className="flex items-center space-x-2 text-amber-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-600"></div>
            <span className="text-sm">Processing...</span>
          </div>
        )}

        {report.status === "error" && (
          <div className="flex items-center space-x-2 text-red-600">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">Processing Error</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
