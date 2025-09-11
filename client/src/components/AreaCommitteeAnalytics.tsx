import React, { useState, useEffect } from "react";
import { AlertCircle, Users, FileText, Search, Eye, MapPin, Shield, Building } from "lucide-react";
import { IRReportAPI } from "../api/reports";
import { IRReport } from "../types";

interface SimpleAreaCommittee {
  ac_name: string;
  people: string[];
  reports: string[];
  source_types: ("administrative" | "basic_info")[];
}

interface ACDetailsModalProps {
  ac: SimpleAreaCommittee | null;
  isOpen: boolean;
  onClose: () => void;
}

// Modal component for AC details
function ACDetailsModal({ ac, isOpen, onClose }: ACDetailsModalProps) {
  if (!isOpen || !ac) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Area Committee Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <h3 className="text-2xl font-bold text-gray-900">{ac.ac_name}</h3>
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">Area Committee</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* People Involved */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                <Users className="w-5 h-5 mr-2" />
                People Associated ({ac.people.length})
              </h4>
              <div className="space-y-2">
                {ac.people.map((person, index) => (
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
                Source Reports ({ac.reports.length})
              </h4>
              <div className="space-y-2">
                {ac.reports.map((report, index) => (
                  <div key={index} className="bg-white rounded px-3 py-2 border">
                    <span className="text-sm text-gray-700">{report}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Data Sources Information */}
          <div className="mt-6 bg-blue-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Data Summary</h4>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center text-gray-700">
                <Building className="w-4 h-4 mr-2" />
                <span>Total Reports: {ac.reports.length}</span>
              </div>
              <div className="flex items-center text-gray-700">
                <Users className="w-4 h-4 mr-2" />
                <span>Associated People: {ac.people.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AreaCommitteeAnalytics() {
  const [acs, setAcs] = useState<SimpleAreaCommittee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAC, setSelectedAC] = useState<SimpleAreaCommittee | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadAreaCommittees();
  }, []);

  const loadAreaCommittees = async () => {
    try {
      setLoading(true);
      const reports = await IRReportAPI.getReports();
      const extractedACs = extractACsFromReports(reports);
      setAcs(extractedACs);
    } catch (error) {
      console.error("Failed to load area committees:", error);
    } finally {
      setLoading(false);
    }
  };

  const cleanACName = (acName: string): string => {
    if (!acName) return "";

    // Remove "एरिया कमेटी" suffix and trim
    return acName
      .replace(/\s*एरिया\s*कमेटी\s*$/i, "")
      .replace(/\s*area\s*committee\s*$/i, "")
      .trim();
  };

  const extractACsFromReports = (reports: IRReport[]): SimpleAreaCommittee[] => {
    const acMap = new Map<string, SimpleAreaCommittee>();

    reports.forEach((report) => {
      if (report.status !== "completed" || !report.metadata?.name) return;

      const personName = report.metadata.name;

      // Skip if person name is "Unknown" or "अज्ञात"
      if (personName.toLowerCase() === "unknown" || personName === "अज्ञात") return;

      const reportName = report.original_filename;

      // Extract ONLY from Administrative Details (area_committee field)
      if (report.area_committee) {
        const rawACName = report.area_committee.trim();

        // Skip if AC name is "Unknown", "अज्ञात", empty, or only whitespace
        if (!rawACName || rawACName === "" || rawACName.toLowerCase() === "unknown" || rawACName === "अज्ञात") {
          return;
        }

        const cleanedACName = cleanACName(rawACName);
        if (cleanedACName) {
          const key = cleanedACName.toLowerCase();
          if (!acMap.has(key)) {
            acMap.set(key, {
              ac_name: cleanedACName,
              people: [],
              reports: [],
              source_types: [],
            });
          }
          const ac = acMap.get(key)!;
          if (!ac.people.includes(personName)) {
            ac.people.push(personName);
          }
          if (!ac.reports.includes(reportName)) {
            ac.reports.push(reportName);
          }
          if (!ac.source_types.includes("administrative")) {
            ac.source_types.push("administrative");
          }
        }
      }
    });

    return Array.from(acMap.values()).sort((a, b) => b.people.length - a.people.length);
  };

  const filteredACs = acs.filter(
    (ac) => ac.ac_name.toLowerCase().includes(searchQuery.toLowerCase()) || ac.people.some((person) => person.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleViewDetails = (ac: SimpleAreaCommittee) => {
    setSelectedAC(ac);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedAC(null);
    setIsModalOpen(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-lg text-gray-600">Loading area committees...</span>
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
            placeholder="Search area committees or people..."
            className="pl-10 w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <MapPin className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Area Committees</p>
              <p className="text-2xl font-bold text-gray-900">{filteredACs.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total People</p>
              <p className="text-2xl font-bold text-gray-900">{new Set(filteredACs.flatMap((ac) => ac.people)).size}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Reports</p>
              <p className="text-2xl font-bold text-gray-900">{new Set(filteredACs.flatMap((ac) => ac.reports)).size}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Area Committees Grid */}
      {filteredACs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredACs.map((ac, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">{ac.ac_name}</h3>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Area Committee</span>
                  </div>
                </div>

                {/* People Count */}
                <div className="flex items-center text-gray-600 mb-2">
                  <Users className="w-4 h-4 mr-2" />
                  <span className="text-sm">
                    {ac.people.length} {ac.people.length === 1 ? "Person" : "People"} Associated
                  </span>
                </div>

                {/* Reports Count */}
                <div className="flex items-center text-gray-600 mb-4">
                  <FileText className="w-4 h-4 mr-2" />
                  <span className="text-sm">
                    {ac.reports.length} Source {ac.reports.length === 1 ? "Report" : "Reports"}
                  </span>
                </div>

                {/* People Preview */}
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">People:</p>
                  <div className="flex flex-wrap gap-1">
                    {ac.people.slice(0, 2).map((person, personIndex) => (
                      <span key={personIndex} className="inline-block bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">
                        {person}
                      </span>
                    ))}
                    {ac.people.length > 2 && (
                      <span className="inline-block bg-gray-200 text-gray-600 px-2 py-1 rounded text-xs">+{ac.people.length - 2} more</span>
                    )}
                  </div>
                </div>

                {/* View Details Button */}
                <button
                  onClick={() => handleViewDetails(ac)}
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">No area committees found</h3>
          <p className="text-gray-500">Try adjusting your search criteria</p>
        </div>
      )}

      {/* Modal */}
      <ACDetailsModal ac={selectedAC} isOpen={isModalOpen} onClose={handleCloseModal} />
    </div>
  );
}
