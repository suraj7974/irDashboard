import React from "react";
import { motion } from "framer-motion";
import { AlertCircle, Users, MapPin, Calendar, FileText, TrendingUp } from "lucide-react";
import { IncidentData } from "../types";

interface IncidentCardProps {
  incident: IncidentData;
  onClick: () => void;
}

export default function IncidentCard({ incident, onClick }: IncidentCardProps) {
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
  const recentYear = incident.years.length > 0 ? Math.max(...incident.years.map(y => parseInt(y))) : null;
  const primaryLocation = incident.locations[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      onClick={onClick}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-all duration-200"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 leading-tight">
              {incident.incident_name.length > 50 
                ? `${incident.incident_name.substring(0, 50)}...` 
                : incident.incident_name}
            </h3>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeInfo.bgColor} ${typeInfo.color}`}>
                {typeInfo.label}
              </span>
              {incident.frequency > 5 && (
                <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium flex items-center space-x-1">
                  <TrendingUp className="h-3 w-3" />
                  <span>High Activity</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center space-x-2">
          <Users className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-600">
            {incident.people_involved.length} {incident.people_involved.length === 1 ? 'person' : 'people'}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <FileText className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-600">
            {incident.frequency} {incident.frequency === 1 ? 'mention' : 'mentions'}
          </span>
        </div>

        {primaryLocation && (
          <div className="flex items-center space-x-2">
            <MapPin className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600 truncate">
              {primaryLocation.length > 15 ? `${primaryLocation.substring(0, 15)}...` : primaryLocation}
            </span>
          </div>
        )}

        {recentYear && (
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">{recentYear}</span>
          </div>
        )}
      </div>

      {/* People Involved Preview */}
      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs font-medium text-gray-500 mb-2">KEY PEOPLE INVOLVED</p>
        <div className="space-y-1">
          {incident.people_involved.slice(0, 3).map((person, index) => (
            <div key={`${person.person_id}-${index}`} className="flex items-center justify-between">
              <span className="text-sm text-gray-900 truncate">
                {person.person_name}
              </span>
              <span className={`text-xs px-2 py-1 rounded-full ${
                person.involvement_level === 'primary' 
                  ? 'bg-red-100 text-red-700' 
                  : person.involvement_level === 'secondary'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {person.involvement_level}
              </span>
            </div>
          ))}
          {incident.people_involved.length > 3 && (
            <p className="text-xs text-gray-500 mt-2">
              +{incident.people_involved.length - 3} more people
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 pt-4 mt-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            Last mentioned: {new Date(incident.last_mentioned).toLocaleDateString()}
          </span>
          <span className="text-xs text-primary-600 font-medium">View Details →</span>
        </div>
      </div>
    </motion.div>
  );
}
