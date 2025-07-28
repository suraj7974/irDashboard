import React, { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Download, Eye, Calendar, Clock, AlertTriangle, Users, Building2, Shield, Edit3, Hash, Award, MapPin } from "lucide-react";
import { format } from "date-fns";
import { IRReport } from "../types";
import { IRReportAPI } from "../api/reports";
import ImageUpload from "./ImageUpload";
import AdditionalImages from "./AdditionalImages";

interface ReportCardProps {
  report: IRReport;
  onViewDetails: (report: IRReport) => void;
  onDownload: (report: IRReport, type: "pdf") => void;
  onReportUpdate?: (updatedReport: IRReport) => void;
}

export default function ReportCard({ report, onViewDetails, onDownload, onReportUpdate }: ReportCardProps) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [uploadingProfileImage, setUploadingProfileImage] = useState(false);
  const [uploadingAdditionalImage, setUploadingAdditionalImage] = useState(false);
  const [fieldValues, setFieldValues] = useState({
    police_station: report.police_station || "",
    division: report.division || "",
    area_committee: report.area_committee || "",
    uid_for_name: report.uid_for_name || "",
    rank: report.rank || "",
  });

  const rankOptions = ["Szc", "Dvc", "Acm /ppcm", "Coy", "BN", "Pm", "Militia", "Rpc", "Others"];

  // Client-side validation functions
  const validatePoliceStation = (value: string): string | null => {
    if (!value || !value.trim()) return null; // Empty values are allowed
    const textOnlyRegex = /^[A-Za-z\s\-\.]*$/;
    if (!textOnlyRegex.test(value)) {
      return "Police station must contain only letters, spaces, hyphens, and periods";
    }
    return null;
  };

  const validateUidForName = (value: string): string | null => {
    // UID for Name can now contain any characters - no validation needed
    return null;
  };

  const validateField = (fieldName: string, value: string): string | null => {
    switch (fieldName) {
      case "police_station":
        return validatePoliceStation(value);
      case "uid_for_name":
        return validateUidForName(value);
      default:
        return null; // No validation for other fields
    }
  };

  const handleSaveField = async (fieldName: string, value: string) => {
    try {
      setSavingField(fieldName);
      setValidationError(null);

      // Client-side validation
      const validationError = validateField(fieldName, value);
      if (validationError) {
        setValidationError(validationError);
        return;
      }

      const updatedReport = await IRReportAPI.updateManualDetails(report.id, {
        [fieldName]: value,
      });
      setEditingField(null);
      if (onReportUpdate) {
        onReportUpdate(updatedReport);
      }
    } catch (error) {
      console.error(`Failed to update ${fieldName}:`, error);
      const errorMessage = error instanceof Error ? error.message : `Failed to update ${fieldName}. Please try again.`;
      setValidationError(errorMessage);
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
    setValidationError(null);
  };

  // Image upload handlers
  const handleProfileImageUpload = async (file: File) => {
    try {
      setUploadingProfileImage(true);
      const imageUrl = await IRReportAPI.uploadProfileImage(report.id, file);
      if (onReportUpdate) {
        const updatedReport = await IRReportAPI.getReport(report.id);
        if (updatedReport) {
          onReportUpdate(updatedReport);
        }
      }
    } catch (error) {
      console.error("Profile image upload failed:", error);
      throw error;
    } finally {
      setUploadingProfileImage(false);
    }
  };

  const handleAdditionalImageUpload = async (file: File) => {
    try {
      setUploadingAdditionalImage(true);
      const imageUrl = await IRReportAPI.uploadAdditionalImage(report.id, file);
      if (onReportUpdate) {
        const updatedReport = await IRReportAPI.getReport(report.id);
        if (updatedReport) {
          onReportUpdate(updatedReport);
        }
      }
    } catch (error) {
      console.error("Additional image upload failed:", error);
      throw error;
    } finally {
      setUploadingAdditionalImage(false);
    }
  };

  const handleAdditionalImageDelete = async (imageUrl: string) => {
    try {
      await IRReportAPI.deleteImage(report.id, imageUrl, false);
      if (onReportUpdate) {
        const updatedReport = await IRReportAPI.getReport(report.id);
        if (updatedReport) {
          onReportUpdate(updatedReport);
        }
      }
    } catch (error) {
      console.error("Additional image deletion failed:", error);
      throw error;
    }
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
              onChange={(e) => {
                setFieldValues((prev) => ({ ...prev, [fieldName]: e.target.value }));
                setValidationError(null); // Clear validation error on change
              }}
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
                onChange={(e) => {
                  const newValue = e.target.value;
                  setFieldValues((prev) => ({ ...prev, [fieldName]: newValue }));
                  // Clear validation error on change
                  setValidationError(null);

                  // Real-time validation feedback for specific fields
                  if (fieldName === "police_station" || fieldName === "uid_for_name") {
                    const error = validateField(fieldName, newValue);
                    if (error) {
                      setValidationError(error);
                    }
                  }
                }}
                className={`w-full px-3 py-2 text-sm border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2 ${
                  validationError ? "border-red-300 focus:border-red-500" : "border-blue-200 focus:border-blue-500"
                }`}
                placeholder={placeholder}
              />
              {/* Validation error message */}
              {validationError && <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">{validationError}</div>}
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
              disabled={isSaving || !!validationError}
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
                setValidationError(null); // Clear any previous validation errors
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
              setValidationError(null); // Clear any previous validation errors
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

          {/* Profile Image Upload */}
          <div className="flex-shrink-0">
            <ImageUpload
              type="profile"
              size="lg"
              currentImageUrl={report.profile_image_url}
              onImageUpload={handleProfileImageUpload}
              isUploading={uploadingProfileImage}
            />
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
                {renderField("police_station", "Police Station", <Building2 className="h-4 w-4 text-blue-600" />, "Enter police station (text only)")}
                {renderField("division", "Division", <MapPin className="h-4 w-4 text-blue-600" />, "Enter division")}
                {renderField("area_committee", "Area Committee", <Users className="h-4 w-4 text-blue-600" />, "Enter area committee")}
                {renderField("uid_for_name", "UID for Name", <Hash className="h-4 w-4 text-blue-600" />, "Enter unique identifier")}
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
          <ImageUpload type="additional" onImageUpload={handleAdditionalImageUpload} isUploading={uploadingAdditionalImage} />
          {/* Additional Images View Button */}
          {report.additional_images && report.additional_images.length > 0 && (
            <AdditionalImages images={report.additional_images} onImageDelete={handleAdditionalImageDelete} />
          )}
        </div>

        <div className="flex items-center space-x-4">
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
      </div>
    </motion.div>
  );
}
