import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Users, FileText, MapPin, Calendar, AlertCircle, ExternalLink, User } from "lucide-react";
import { IncidentData } from "../types";

interface IncidentDetailProps {
  incident: IncidentData;
  isOpen: boolean;
  onClose: () => void;
}

export default function IncidentDetail({ incident, isOpen, onClose }: IncidentDetailProps) {
  const formatIncidentType = (type: string) => {
    const typeMap: Record<string, { label: string; color: string; bgColor: string }> = {
      'criminal_activity': { label: 'Criminal Activity', color: 'text-red-700', bgColor: 'bg-red-100' },
      'police_encounter': { label: 'Police Encounter', color: 'text-blue-700', bgColor: 'bg-blue-100' },
      'qa_mention': { label: 'Q&A Mention', color: 'text-green-700', bgColor: 'bg-green-100' },
      'important_point': { label: 'Important Point', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
      'movement_route': { label: 'Movement Route', color: 'text-purple-700', bgColor: 'bg-purple-100' }
    };
    
    return typeMap[type] || { label: type, color: 'text-gray-700', bgColor: 'bg-gray-100' };
  };

  const typeInfo = formatIncidentType(incident.incident_type);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-red-100 rounded-xl">
                    <AlertCircle className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Incident Details</h2>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${typeInfo.bgColor} ${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                        {incident.frequency} mentions
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                {/* Incident Name & Description */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Incident Description</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-900 leading-relaxed">{incident.incident_name}</p>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <Users className="h-5 w-5 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">People Involved</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-900 mt-1">{incident.people_involved.length}</p>
                  </div>

                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-medium text-green-900">Source Reports</span>
                    </div>
                    <p className="text-2xl font-bold text-green-900 mt-1">{incident.source_reports.length}</p>
                  </div>

                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-5 w-5 text-purple-600" />
                      <span className="text-sm font-medium text-purple-900">Locations</span>
                    </div>
                    <p className="text-2xl font-bold text-purple-900 mt-1">{incident.locations.length}</p>
                  </div>

                  <div className="bg-orange-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-5 w-5 text-orange-600" />
                      <span className="text-sm font-medium text-orange-900">Years Active</span>
                    </div>
                    <p className="text-2xl font-bold text-orange-900 mt-1">{incident.years.length}</p>
                  </div>
                </div>

                {/* People Involved */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">People Involved</h3>
                  <div className="space-y-3">
                    {incident.people_involved.map((person, index) => (
                      <div key={`${person.person_id}-${index}`} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <div className="p-2 bg-gray-100 rounded-lg">
                              <User className="h-5 w-5 text-gray-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">{person.person_name}</h4>
                              {person.aliases.length > 0 && (
                                <p className="text-sm text-gray-600 mt-1">
                                  Aliases: {person.aliases.join(', ')}
                                </p>
                              )}
                              <div className="flex items-center space-x-4 mt-2">
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                  person.involvement_level === 'primary' 
                                    ? 'bg-red-100 text-red-700' 
                                    : person.involvement_level === 'secondary'
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {person.involvement_level} role
                                </span>
                                {person.other_incidents.length > 0 && (
                                  <span className="text-xs text-blue-600 font-medium">
                                    +{person.other_incidents.length} other incidents
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Source Reports */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Source Reports</h3>
                  <div className="space-y-3">
                    {incident.source_reports.map((report, index) => (
                      <div key={`${report.report_id}-${index}`} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <FileText className="h-4 w-4 text-gray-500" />
                              <span className="font-medium text-gray-900">{report.report_filename}</span>
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                report.mention_type === 'criminal_activity' ? 'bg-red-100 text-red-700' :
                                report.mention_type === 'police_encounter' ? 'bg-blue-100 text-blue-700' :
                                report.mention_type === 'qa_mention' ? 'bg-green-100 text-green-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {report.mention_type.replace('_', ' ')}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 mb-2">{report.mention_context}</p>
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span>Uploaded: {new Date(report.uploaded_at).toLocaleDateString()}</span>
                              {report.year && <span>Year: {report.year}</span>}
                              {report.location && <span>Location: {report.location}</span>}
                            </div>
                          </div>
                          <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                            <ExternalLink className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Locations & Timeline */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Locations */}
                  {incident.locations.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Locations</h3>
                      <div className="space-y-2">
                        {incident.locations.map((location, index) => (
                          <div key={index} className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                            <MapPin className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-900">{location}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Timeline */}
                  {incident.years.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h3>
                      <div className="space-y-2">
                        {incident.years.sort((a, b) => parseInt(b) - parseInt(a)).map((year, index) => (
                          <div key={index} className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-900">{year}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
