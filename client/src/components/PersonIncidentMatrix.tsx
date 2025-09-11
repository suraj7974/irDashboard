import React, { useState } from "react";
import { motion } from "framer-motion";
import { User, AlertCircle, FileText, Search, Users, TrendingUp } from "lucide-react";
import { PersonInvolvement } from "../types";

interface PersonIncidentMatrixProps {
  people: PersonInvolvement[];
}

export default function PersonIncidentMatrix({ people }: PersonIncidentMatrixProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPerson, setSelectedPerson] = useState<PersonInvolvement | null>(null);

  const filteredPeople = people.filter(person =>
    person.person_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    person.aliases.some(alias => alias.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getInvolvementColor = (level: string) => {
    switch (level) {
      case 'primary':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'secondary':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'mentioned':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getIncidentCountColor = (count: number) => {
    if (count >= 10) return 'text-red-600 bg-red-50';
    if (count >= 5) return 'text-orange-600 bg-orange-50';
    if (count >= 3) return 'text-yellow-600 bg-yellow-50';
    return 'text-blue-600 bg-blue-50';
  };

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Person-Incident Analysis</h2>
          <p className="text-gray-600">People with the most incident involvement</p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search people or aliases..."
            className="pl-10 w-full border-gray-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-200 rounded-lg">
              <Users className="h-6 w-6 text-blue-700" />
            </div>
            <div>
              <p className="text-sm text-blue-700">Total People</p>
              <p className="text-2xl font-bold text-blue-900">{filteredPeople.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-xl p-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-200 rounded-lg">
              <AlertCircle className="h-6 w-6 text-red-700" />
            </div>
            <div>
              <p className="text-sm text-red-700">High-Risk Individuals</p>
              <p className="text-2xl font-bold text-red-900">
                {filteredPeople.filter(p => p.other_incidents.length >= 5).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-200 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-700" />
            </div>
            <div>
              <p className="text-sm text-green-700">Avg Incidents/Person</p>
              <p className="text-2xl font-bold text-green-900">
                {filteredPeople.length > 0 
                  ? (filteredPeople.reduce((sum, p) => sum + p.other_incidents.length + 1, 0) / filteredPeople.length).toFixed(1)
                  : '0'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* People Matrix */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
          {/* People List */}
          <div className="lg:col-span-2 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">People by Incident Count</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredPeople.length > 0 ? (
                filteredPeople.map((person, index) => (
                  <motion.div
                    key={person.person_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => setSelectedPerson(person)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                      selectedPerson?.person_id === person.person_id
                        ? 'border-primary-300 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <User className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{person.person_name}</h4>
                          {person.aliases.length > 0 && (
                            <p className="text-sm text-gray-600">
                              Aliases: {person.aliases.slice(0, 2).join(', ')}
                              {person.aliases.length > 2 && ` +${person.aliases.length - 2} more`}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getInvolvementColor(person.involvement_level)}`}>
                          {person.involvement_level}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${getIncidentCountColor(person.other_incidents.length + 1)}`}>
                          {person.other_incidents.length + 1} incidents
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-8">
                  <User className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No people found matching your search</p>
                </div>
              )}
            </div>
          </div>

          {/* Person Details */}
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Person Details</h3>
            {selectedPerson ? (
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 text-lg">{selectedPerson.person_name}</h4>
                  {selectedPerson.aliases.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium text-gray-700 mb-1">Known Aliases:</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedPerson.aliases.map((alias, index) => (
                          <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                            {alias}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">Involvement Level</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getInvolvementColor(selectedPerson.involvement_level)}`}>
                      {selectedPerson.involvement_level}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">Total Incidents</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${getIncidentCountColor(selectedPerson.other_incidents.length + 1)}`}>
                      {selectedPerson.other_incidents.length + 1}
                    </span>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Source Report</span>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm font-medium text-gray-900">{selectedPerson.report_source.report_filename}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {selectedPerson.report_source.mention_type.replace('_', ' ')} • 
                      Uploaded: {new Date(selectedPerson.report_source.uploaded_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {selectedPerson.other_incidents.length > 0 && (
                  <div className="border-t border-gray-200 pt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Other Incidents:</p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {selectedPerson.other_incidents.slice(0, 5).map((incidentId, index) => (
                        <div key={index} className="text-xs bg-blue-50 text-blue-800 px-2 py-1 rounded">
                          {incidentId.replace(/_/g, ' ').replace(/^\w+\s/, '')}
                        </div>
                      ))}
                      {selectedPerson.other_incidents.length > 5 && (
                        <p className="text-xs text-gray-500">+{selectedPerson.other_incidents.length - 5} more incidents</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <User className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">Select a person to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
