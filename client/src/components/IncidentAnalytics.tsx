import React, { useState, useEffect } from "react";
import { AlertCircle, Users, FileText, Search, Eye, Calendar, MapPin, Shield, UserCheck } from "lucide-react";
import { IRReportAPI } from "../api/reports";
import { IRReport } from "../types";

interface SimpleIncident {
  incident_name: string;
  incident_type: 'criminal_activity' | 'police_encounter';
  people: string[];
  reports: string[];
  year?: string;
  location?: string;
}

interface IncidentDetailsModalProps {
  incident: SimpleIncident | null;
  isOpen: boolean;
  onClose: () => void;
}

// Modal component for incident details
function IncidentDetailsModal({ incident, isOpen, onClose }: IncidentDetailsModalProps) {
  if (!isOpen || !incident) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Incident Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <h3 className="text-2xl font-bold text-gray-900">{incident.incident_name}</h3>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              incident.incident_type === 'criminal_activity'
                ? 'bg-red-100 text-red-800'
                : 'bg-blue-100 text-blue-800'
            }`}>
              {incident.incident_type === 'criminal_activity' ? 'Criminal Activity' : 'Police Encounter'}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* People Involved */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                <Users className="w-5 h-5 mr-2" />
                People Involved ({incident.people.length})
              </h4>
              <div className="space-y-2">
                {incident.people.map((person, index) => (
                  <div key={index} className="bg-white rounded px-3 py-2 border">
                    <span className="font-medium text-gray-900">{person}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Source Reports */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Source Reports ({incident.reports.length})
              </h4>
              <div className="space-y-2">
                {incident.reports.map((report, index) => (
                  <div key={index} className="bg-white rounded px-3 py-2 border">
                    <span className="text-sm text-gray-700">{report}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Additional Information */}
          {(incident.year || incident.location) && (
            <div className="mt-6 bg-blue-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Additional Information</h4>
              <div className="flex flex-wrap gap-4">
                {incident.year && (
                  <div className="flex items-center text-gray-700">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>Year: {incident.year}</span>
                  </div>
                )}
                {incident.location && (
                  <div className="flex items-center text-gray-700">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span>Location: {incident.location}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function IncidentAnalytics() {
  const [incidents, setIncidents] = useState<SimpleIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIncident, setSelectedIncident] = useState<SimpleIncident | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadIncidents();
  }, []);

  const loadIncidents = async () => {
    try {
      setLoading(true);
      const reports = await IRReportAPI.getReports();
      const extractedIncidents = extractIncidentsFromReports(reports);
      setIncidents(extractedIncidents);
    } catch (error) {
      console.error("Failed to load incidents:", error);
    } finally {
      setLoading(false);
    }
  };

  const extractIncidentsFromReports = (reports: IRReport[]): SimpleIncident[] => {
    const incidentMap = new Map<string, SimpleIncident>();

    reports.forEach(report => {
      if (report.status !== 'completed' || !report.metadata?.name) return;

      const personName = report.metadata.name;
      
      // Skip if person name is "Unknown" or "अज्ञात"
      if (personName.toLowerCase() === 'unknown' || personName === 'अज्ञात') return;

      const reportName = report.original_filename;

      // Extract from criminal activities
      report.metadata.criminal_activities?.forEach(activity => {
        // Skip if incident name is "Unknown", "अज्ञात", empty, or only whitespace
        if (!activity.incident || 
            activity.incident.trim() === '' || 
            activity.incident.toLowerCase() === 'unknown' || 
            activity.incident === 'अज्ञात') return;
        
        const key = `criminal_${activity.incident.toLowerCase()}`;
        if (!incidentMap.has(key)) {
          incidentMap.set(key, {
            incident_name: activity.incident,
            incident_type: 'criminal_activity',
            people: [],
            reports: [],
            year: activity.year,
            location: activity.location
          });
        }
        const incident = incidentMap.get(key)!;
        if (!incident.people.includes(personName)) {
          incident.people.push(personName);
        }
        if (!incident.reports.includes(reportName)) {
          incident.reports.push(reportName);
        }
      });

      // Extract from police encounters
      report.metadata.police_encounters?.forEach(encounter => {
        // Skip if encounter details is "Unknown", "अज्ञात", empty, or only whitespace
        if (!encounter.encounter_details || 
            encounter.encounter_details.trim() === '' || 
            encounter.encounter_details.toLowerCase() === 'unknown' || 
            encounter.encounter_details === 'अज्ञात') return;
        
        const key = `encounter_${encounter.encounter_details.toLowerCase()}`;
        if (!incidentMap.has(key)) {
          incidentMap.set(key, {
            incident_name: encounter.encounter_details,
            incident_type: 'police_encounter',
            people: [],
            reports: [],
            year: encounter.year
          });
        }
        const incident = incidentMap.get(key)!;
        if (!incident.people.includes(personName)) {
          incident.people.push(personName);
        }
        if (!incident.reports.includes(reportName)) {
          incident.reports.push(reportName);
        }
      });
    });

    return Array.from(incidentMap.values()).sort((a, b) => b.people.length - a.people.length);
  };

  const filteredIncidents = incidents.filter(incident =>
    incident.incident_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    incident.people.some(person => person.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleViewDetails = (incident: SimpleIncident) => {
    setSelectedIncident(incident);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedIncident(null);
    setIsModalOpen(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-lg text-gray-600">Loading incidents...</span>
      </div>
    );
  }

  return (
    <div>
      {/* Search */}
      <div className="mb-8">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search incidents or people..."
            className="pl-10 w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Incidents</p>
              <p className="text-2xl font-bold text-gray-900">{filteredIncidents.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total People</p>
              <p className="text-2xl font-bold text-gray-900">
                {new Set(filteredIncidents.flatMap(i => i.people)).size}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <Shield className="h-8 w-8 text-red-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Criminal Activities</p>
              <p className="text-2xl font-bold text-gray-900">
                {filteredIncidents.filter(i => i.incident_type === 'criminal_activity').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <UserCheck className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Police Encounters</p>
              <p className="text-2xl font-bold text-gray-900">
                {filteredIncidents.filter(i => i.incident_type === 'police_encounter').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Incidents Grid */}
      {filteredIncidents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredIncidents.map((incident, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                      {incident.incident_name}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      incident.incident_type === 'criminal_activity'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {incident.incident_type === 'criminal_activity' ? 'Criminal Activity' : 'Police Encounter'}
                    </span>
                  </div>
                </div>

                {/* People Count */}
                <div className="flex items-center text-gray-600 mb-2">
                  <Users className="w-4 h-4 mr-2" />
                  <span className="text-sm">{incident.people.length} {incident.people.length === 1 ? 'Person' : 'People'} Involved</span>
                </div>

                {/* Reports Count */}
                <div className="flex items-center text-gray-600 mb-4">
                  <FileText className="w-4 h-4 mr-2" />
                  <span className="text-sm">{incident.reports.length} Source {incident.reports.length === 1 ? 'Report' : 'Reports'}</span>
                </div>

                {/* Additional Info */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {incident.year && (
                    <div className="flex items-center text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      <Calendar className="w-3 h-3 mr-1" />
                      {incident.year}
                    </div>
                  )}
                  {incident.location && (
                    <div className="flex items-center text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      <MapPin className="w-3 h-3 mr-1" />
                      {incident.location}
                    </div>
                  )}
                </div>

                {/* People Preview */}
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">People:</p>
                  <div className="flex flex-wrap gap-1">
                    {incident.people.slice(0, 2).map((person, personIndex) => (
                      <span key={personIndex} className="inline-block bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">
                        {person}
                      </span>
                    ))}
                    {incident.people.length > 2 && (
                      <span className="inline-block bg-gray-200 text-gray-600 px-2 py-1 rounded text-xs">
                        +{incident.people.length - 2} more
                      </span>
                    )}
                  </div>
                </div>

                {/* View Details Button */}
                <button
                  onClick={() => handleViewDetails(incident)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Full Details
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No incidents found</h3>
          <p className="text-gray-500">Try adjusting your search criteria</p>
        </div>
      )}

      {/* Modal */}
      <IncidentDetailsModal
        incident={selectedIncident}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}
