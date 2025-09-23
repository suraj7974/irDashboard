import React, { useState, useEffect } from "react";
import { AlertCircle, Users, FileText, Search, Eye, Shield, Building } from "lucide-react";
import { IRReportAPI } from "../api/reports";
import { IRReport } from "../types";
import ReportDetailModal from "./ReportDetailModal";

interface SimpleRPC {
  rpc_name: string;
  people: string[];
  reports: string[];
  source_types: ("administrative" | "basic_info")[];
}

interface RPCDetailsModalProps {
  rpc: SimpleRPC | null;
  isOpen: boolean;
  onClose: () => void;
  onReportClick: (reportName: string) => void;
}

// Modal component for RPC details
function RPCDetailsModal({ rpc, isOpen, onClose, onReportClick }: RPCDetailsModalProps) {
  if (!isOpen || !rpc) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">RPC Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <h3 className="text-2xl font-bold text-gray-900">{rpc.rpc_name}</h3>
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">RPC</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* People Involved */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                <Users className="w-5 h-5 mr-2" />
                People Associated ({rpc.people.length})
              </h4>
              <div className="space-y-2">
                {rpc.people.map((person, index) => (
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
                Source Reports ({rpc.reports.length})
              </h4>
              <div className="space-y-2">
                {rpc.reports.map((report, index) => (
                  <div key={index} className="bg-white rounded px-3 py-2 border">
                    <span
                      onClick={() => onReportClick(report)}
                      className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer underline transition-colors"
                      title="Click to view full IR report"
                    >
                      {report}
                    </span>
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
                <span>Total Reports: {rpc.reports.length}</span>
              </div>
              <div className="flex items-center text-gray-700">
                <Users className="w-4 h-4 mr-2" />
                <span>Associated People: {rpc.people.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RPCAnalytics() {
  const [rpcs, setRpcs] = useState<SimpleRPC[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRPC, setSelectedRPC] = useState<SimpleRPC | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<IRReport | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    loadRPCs();
  }, []);

  const loadRPCs = async () => {
    try {
      setLoading(true);
      const reports = await IRReportAPI.getReports();
      const extractedRPCs = extractRPCsFromReports(reports);
      setRpcs(extractedRPCs);
    } catch (error) {
      console.error("Failed to load RPCs:", error);
    } finally {
      setLoading(false);
    }
  };

  const extractRPCsFromReports = (reports: IRReport[]): SimpleRPC[] => {
    const rpcMap = new Map<string, SimpleRPC>();

    reports.forEach((report) => {
      if (report.status !== "completed" || !report.metadata?.name) return;

      const personName = report.metadata.name;

      // Skip if person name is "Unknown" or "अज्ञात"
      if (personName.toLowerCase() === "unknown" || personName === "अज्ञात") return;

      const reportName = report.original_filename;

      // Extract ONLY from Administrative Details (rpc field)
      if (report.rpc) {
        const rawRPCName = report.rpc.trim();

        // Skip if RPC name is "Unknown", "अज्ञात", empty, or only whitespace
        if (!rawRPCName || rawRPCName === "" || rawRPCName.toLowerCase() === "unknown" || rawRPCName === "अज्ञात") {
          return;
        }

        const cleanedRPCName = rawRPCName.trim();
        if (cleanedRPCName) {
          const key = cleanedRPCName.toLowerCase();
          if (!rpcMap.has(key)) {
            rpcMap.set(key, {
              rpc_name: cleanedRPCName,
              people: [],
              reports: [],
              source_types: [],
            });
          }
          const rpc = rpcMap.get(key)!;
          if (!rpc.people.includes(personName)) {
            rpc.people.push(personName);
          }
          if (!rpc.reports.includes(reportName)) {
            rpc.reports.push(reportName);
          }
          if (!rpc.source_types.includes("administrative")) {
            rpc.source_types.push("administrative");
          }
        }
      }
    });

    return Array.from(rpcMap.values()).sort((a, b) => b.people.length - a.people.length);
  };

  const filteredRPCs = rpcs.filter(
    (rpc) => rpc.rpc_name.toLowerCase().includes(searchQuery.toLowerCase()) || rpc.people.some((person) => person.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleViewDetails = (rpc: SimpleRPC) => {
    setSelectedRPC(rpc);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedRPC(null);
    setIsModalOpen(false);
  };

  const handleReportClick = async (reportName: string) => {
    try {
      setReportLoading(true);
      const reports = await IRReportAPI.getReports();
      const targetReport = reports.find((r) => r.original_filename === reportName);
      if (targetReport) {
        setSelectedReport(targetReport);
        setIsReportModalOpen(true);
        setIsModalOpen(false); // Close the RPC modal
      } else {
        console.warn("Report not found:", reportName);
      }
    } catch (error) {
      console.error("Failed to load report:", error);
    } finally {
      setReportLoading(false);
    }
  };

  const handleCloseReportModal = () => {
    setSelectedReport(null);
    setIsReportModalOpen(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-lg text-gray-600">Loading RPCs...</span>
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
            placeholder="Search RPCs or people..."
            className="pl-10 w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <Shield className="h-8 w-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total RPCs</p>
              <p className="text-2xl font-bold text-gray-900">{filteredRPCs.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total People</p>
              <p className="text-2xl font-bold text-gray-900">{new Set(filteredRPCs.flatMap((rpc) => rpc.people)).size}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-orange-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Reports</p>
              <p className="text-2xl font-bold text-gray-900">{new Set(filteredRPCs.flatMap((rpc) => rpc.reports)).size}</p>
            </div>
          </div>
        </div>
      </div>

      {/* RPCs Grid */}
      {filteredRPCs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRPCs.map((rpc, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">{rpc.rpc_name}</h3>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">RPC</span>
                  </div>
                </div>

                {/* People Count */}
                <div className="flex items-center text-gray-600 mb-2">
                  <Users className="w-4 h-4 mr-2" />
                  <span className="text-sm">
                    {rpc.people.length} {rpc.people.length === 1 ? "Person" : "People"} Associated
                  </span>
                </div>

                {/* Reports Count */}
                <div className="flex items-center text-gray-600 mb-4">
                  <FileText className="w-4 h-4 mr-2" />
                  <span className="text-sm">
                    {rpc.reports.length} Source {rpc.reports.length === 1 ? "Report" : "Reports"}
                  </span>
                </div>

                {/* People Preview */}
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">People:</p>
                  <div className="flex flex-wrap gap-1">
                    {rpc.people.slice(0, 2).map((person, personIndex) => (
                      <span key={personIndex} className="inline-block bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">
                        {person}
                      </span>
                    ))}
                    {rpc.people.length > 2 && (
                      <span className="inline-block bg-gray-200 text-gray-600 px-2 py-1 rounded text-xs">+{rpc.people.length - 2} more</span>
                    )}
                  </div>
                </div>

                {/* View Details Button */}
                <button
                  onClick={() => handleViewDetails(rpc)}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center"
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">No RPCs found</h3>
          <p className="text-gray-500">Try adjusting your search criteria</p>
        </div>
      )}

      {/* Modal */}
      <RPCDetailsModal rpc={selectedRPC} isOpen={isModalOpen} onClose={handleCloseModal} onReportClick={handleReportClick} />

      {/* Report Detail Modal */}
      {selectedReport && (
        <ReportDetailModal
          report={selectedReport}
          isOpen={isReportModalOpen}
          onClose={handleCloseReportModal}
          onDownload={async () => {}} // Empty handler for host branch
        />
      )}
    </div>
  );
}