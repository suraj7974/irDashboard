import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, FileText, Download, Calendar, MapPin, User, Shield, Clock, Zap, Users, Package, Target, Eye, HelpCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { IRReport } from "../types";
import PDFViewer from "./PDFViewer";
import RouteTracker from "./RouteTracker";

interface ReportDetailModalProps {
  report: IRReport;
  isOpen: boolean;
  onClose: () => void;
  onDownload: (report: IRReport, type: "pdf") => void;
}

export default function ReportDetailModal({ report, isOpen, onClose, onDownload }: ReportDetailModalProps) {
  const [imageError, setImageError] = useState(false);
  const [showPDFViewer, setShowPDFViewer] = useState(false);

  if (!isOpen) return null;

  const { metadata } = report;

  // Debug log to see the actual data structure
  //console.log("Report metadata:", metadata);

  // Handle both the expected structure and the actual data structure
  const getData = (key: string, altKey?: string) => {
    if (!metadata) return null;
    // Try the expected structure first
    if (metadata[key as keyof typeof metadata]) {
      return metadata[key as keyof typeof metadata];
    }
    // Try the alternative key (like "Name" instead of "name")
    if (altKey && (metadata as any)[altKey]) {
      return (metadata as any)[altKey];
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            {/* Profile Image or Default Icon */}
            <div className="flex-shrink-0">
              {report.profile_image_url && !imageError ? (
                <img
                  src={report.profile_image_url}
                  alt={getData("name", "Name") || "Profile"}
                  className="h-12 w-12 rounded-full object-cover border-2 border-gray-200"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="p-2 bg-primary-50 rounded-lg">
                  <User className="h-8 w-8 text-primary-600" />
                </div>
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{getData("name", "Name") || "Unknown Subject"}</h2>
              <p className="text-sm text-gray-500">{report.original_filename}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowPDFViewer(true)}
              className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors"
            >
              <Eye className="h-4 w-4" />
              <span>View PDF</span>
            </button>

            <button
              onClick={() => onDownload(report, "pdf")}
              className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Download PDF</span>
            </button>

            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-88px)]">
          <div className="p-6 space-y-8">
            {/* Show message if no metadata */}
            {!metadata ? (
              <div className="text-center py-8">
                <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Processing in Progress</h3>
                <p className="text-gray-500">This report is still being processed. Detailed information will be available once processing is complete.</p>

                {/* Basic file information */}
                <div className="mt-6 bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">File Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Filename:</span>
                      <span className="text-gray-900">{report.original_filename}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Upload Date:</span>
                      <span className="text-gray-900">{format(new Date(report.uploaded_at), "PPP")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Status:</span>
                      <span className="text-gray-900 capitalize">{report.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">File Size:</span>
                      <span className="text-gray-900">{(report.file_size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <User className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Name</p>
                          <p className="text-sm text-gray-600">{getData("name", "Name") || "Unknown"}</p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <Package className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Supply Team/Supply</p>
                          <p className="text-sm text-gray-600">{getData("supply_team_supply", "Supply Team/Supply") || "Unknown"}</p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <Target className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">IED/Bomb</p>
                          <p className="text-sm text-gray-600">{getData("ied_bomb", "IED/Bomb") || "Unknown"}</p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <Users className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Meeting</p>
                          <p className="text-sm text-gray-600">{getData("meeting", "Meeting") || "Unknown"}</p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <Shield className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Platoon</p>
                          <p className="text-sm text-gray-600">{getData("platoon", "Platoon") || "Unknown"}</p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <Shield className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Group/Battalion</p>
                          <p className="text-sm text-gray-600">{getData("group_battalion", "Group/Battalion") || "Unknown"}</p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Area/Region</p>
                          <p className="text-sm text-gray-600">{getData("area_region", "Area/Region") || "Unknown"}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <Zap className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Bounty</p>
                          <p className="text-sm text-gray-600">{getData("bounty", "Bounty") || "Unknown"}</p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Organizational Period</p>
                          <p className="text-sm text-gray-600">{getData("organizational_period", "Organizational Period") || "Unknown"}</p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Upload Date</p>
                          <p className="text-sm text-gray-600">{format(new Date(report.uploaded_at), "PPP")}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Manual Fields - Read Only */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Administrative Information</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <Shield className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Police Station</p>
                          <p className="text-sm text-gray-600">{report.police_station || "Not specified"}</p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Division</p>
                          <p className="text-sm text-gray-600">{report.division || "Not specified"}</p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <Users className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Area Committee</p>
                          <p className="text-sm text-gray-600">{report.area_committee || "Not specified"}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <User className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">UID for Name</p>
                          <p className="text-sm text-gray-600">{report.uid_for_name || "Not specified"}</p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <Shield className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Rank</p>
                          <p className="text-sm text-gray-600">{report.rank || "Not specified"}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Aliases */}
                {(getData("aliases", "Aliases") || getData("aliases", "उपनाम")) && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Aliases</h3>
                    <div className="flex flex-wrap gap-2">
                      {(Array.isArray(getData("aliases", "Aliases"))
                        ? getData("aliases", "Aliases")
                        : typeof getData("aliases", "Aliases") === "string"
                        ? [getData("aliases", "Aliases")]
                        : ([] as string[])
                      ).map((alias: string, index: number) => (
                        <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {alias}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Villages Covered */}
                {(getData("villages_covered", "Villages Covered") || getData("villages_covered", "गांव")) && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Villages Covered</h3>
                    <div className="flex flex-wrap gap-2">
                      {(Array.isArray(getData("villages_covered", "Villages Covered"))
                        ? getData("villages_covered", "Villages Covered")
                        : typeof getData("villages_covered", "Villages Covered") === "string"
                        ? [getData("villages_covered", "Villages Covered")]
                        : ([] as string[])
                      ).map((village: string, index: number) => (
                        <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {village}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Additional Information */}
                <div className="space-y-6">
                  {getData("involvement", "Involvement") && (
                    <div>
                      <h4 className="text-md font-medium text-gray-900 mb-2">Involvement</h4>
                      <p className="text-sm text-gray-600 leading-relaxed">{getData("involvement", "Involvement")}</p>
                    </div>
                  )}

                  {getData("history", "History") && (
                    <div>
                      <h4 className="text-md font-medium text-gray-900 mb-2">History</h4>
                      <p className="text-sm text-gray-600 leading-relaxed">{getData("history", "History")}</p>
                    </div>
                  )}
                </div>

                {/* Criminal Activities */}
                {metadata.criminal_activities && metadata.criminal_activities.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Criminal Activities</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full border border-gray-200 rounded-lg">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sr. No.</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Incident</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {metadata.criminal_activities.map((activity, index) => (
                            <tr key={index}>
                              <td className="px-4 py-3 text-sm text-gray-900">{activity.sr_no}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{activity.incident}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{activity.year}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{activity.location}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Police Encounters */}
                {metadata.police_encounters && metadata.police_encounters.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Police Encounters</h3>
                    <div className="space-y-3">
                      {metadata.police_encounters.map((encounter, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">{encounter.year}</span>
                          </div>
                          <p className="text-sm text-gray-600">{encounter.encounter_details}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hierarchical Role Changes */}
                {metadata.hierarchical_role_changes && metadata.hierarchical_role_changes.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Hierarchical Role Changes</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full border border-gray-200 rounded-lg">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {metadata.hierarchical_role_changes.map((change, index) => (
                            <tr key={index}>
                              <td className="px-4 py-3 text-sm text-gray-900">{change.year}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{change.role}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Maoists Met */}
                {metadata.maoists_met && metadata.maoists_met.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Maoists Met</h3>
                    <div className="space-y-3">
                      {metadata.maoists_met.map((contact, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4 bg-blue-50">
                          <div className="grid grid-cols-2 gap-4">
                            {Object.entries(contact).map(([key, value]) => (
                              <div key={key} className="flex flex-col">
                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{key.replace(/_/g, " ")}</span>
                                <span className="text-sm text-gray-900 mt-1">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Weapons/Assets */}
                {metadata.weapons_assets && metadata.weapons_assets.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Weapons/Assets</h3>
                    <div className="flex flex-wrap gap-2">
                      {metadata.weapons_assets.map((weapon, index) => (
                        <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                          {weapon}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Important Points */}
                {metadata.important_points && metadata.important_points.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Important Points</h3>
                    <div className="space-y-2">
                      {metadata.important_points.map((point, index) => (
                        <div key={index} className="flex items-start space-x-2">
                          <span className="flex-shrink-0 w-2 h-2 bg-yellow-400 rounded-full mt-2"></span>
                          <p className="text-sm text-gray-700">{point}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Movement Routes */}
                {metadata.movement_routes && metadata.movement_routes.length > 0 && (
                  <RouteTracker routes={metadata.movement_routes} />
                )}

                {/* Questions Analysis */}
                {report.questions_analysis && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <HelpCircle className="h-5 w-5 mr-2" />
                      Standard Questions
                    </h3>

                    {report.questions_analysis.success ? (
                      <>
                        {/* Questions and Answers */}
                        {report.questions_analysis.results.length > 0 ? (
                          <div className="space-y-4 max-h-96 overflow-y-auto">
                            {report.questions_analysis.results.map((result, index) => {
                              // Questions 28-40 should display as tables (index 27-39 since array is 0-based)
                              const questionNumber = index + 1;
                              const shouldShowAsTable = questionNumber >= 28 && questionNumber <= 40;

                              // Function to parse tabular data for questions 28-40
                              const parseTabularData = (answer: string) => {
                                const rows = answer.split("\n").filter((row) => row.trim());
                                return rows.map((row) => {
                                  // Split by common delimiters: |, tab, or comma
                                  if (row.includes("|")) {
                                    return row.split("|").map((cell) => cell.trim());
                                  } else if (row.includes("\t")) {
                                    return row.split("\t").map((cell) => cell.trim());
                                  } else if (row.includes(",")) {
                                    return row.split(",").map((cell) => cell.trim());
                                  } else {
                                    return [row.trim()];
                                  }
                                });
                              };

                              const tableData = shouldShowAsTable && result.answer ? parseTabularData(result.answer) : [];

                              return (
                                <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                  <div className="mb-3">
                                    <div className="flex items-center justify-between mb-1">
                                      <h4 className="font-medium text-gray-900 text-sm">Question {questionNumber}:</h4>
                                      {shouldShowAsTable && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Table Format</span>}
                                    </div>
                                    <p className="text-sm text-blue-700 bg-blue-50 p-2 rounded border">{result.standard_question}</p>
                                  </div>

                                  <div>
                                    <span className="text-xs font-medium text-gray-600">Answer:</span>
                                    {result.answer && result.answer.trim() !== "" ? (
                                      shouldShowAsTable ? (
                                        <div className="mt-2 bg-white rounded border border-gray-300 overflow-x-auto">
                                          <table className="min-w-full divide-y divide-gray-200">
                                            <tbody className="bg-white divide-y divide-gray-200">
                                              {tableData.map((row, rowIndex) => (
                                                <tr key={rowIndex} className={rowIndex % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                                                  {row.map((cell, cellIndex) => (
                                                    <td key={cellIndex} className="px-3 py-2 text-sm text-gray-900 border-r border-gray-200 last:border-r-0">
                                                      {cell || "-"}
                                                    </td>
                                                  ))}
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                          <div className="px-3 py-2 bg-gray-100 text-xs text-gray-500 border-t border-gray-200">
                                            {tableData.length} row{tableData.length !== 1 ? "s" : ""} found
                                          </div>
                                        </div>
                                      ) : (
                                        <p className="mt-2 text-sm text-gray-700 bg-white p-3 rounded border border-gray-300 whitespace-pre-wrap">
                                          {result.answer}
                                        </p>
                                      )
                                    ) : (
                                      <p className="mt-2 text-sm text-gray-500 bg-gray-100 p-3 rounded border border-gray-300 italic">
                                        No answer found in the document
                                      </p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <HelpCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                            <p>No questions were processed from this document.</p>
                            <p className="text-xs mt-2">Total questions processed: {report.questions_analysis.summary.total_questions}</p>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-center">
                          <XCircle className="h-5 w-5 text-red-600 mr-2" />
                          <div>
                            <p className="text-sm font-medium text-red-900">Questions analysis failed</p>
                            {report.questions_analysis.error && <p className="text-sm text-red-700 mt-1">{report.questions_analysis.error}</p>}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* PDF Viewer Modal */}
      {showPDFViewer && report.file_url && <PDFViewer fileUrl={report.file_url} onClose={() => setShowPDFViewer(false)} title={report.original_filename} />}
    </motion.div>
  );
}
