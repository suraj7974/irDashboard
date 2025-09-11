import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, MapPin } from "lucide-react";
import IncidentAnalytics from "./IncidentAnalytics";
import AreaCommitteeAnalytics from "./AreaCommitteeAnalytics";

type AnalyticsTab = 'incidents' | 'area-committees';

export default function Analytics() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('incidents');

  // Set active tab based on URL
  useEffect(() => {
    if (location.pathname === '/area-committees') {
      setActiveTab('area-committees');
    } else {
      setActiveTab('incidents');
    }
  }, [location.pathname]);

  const handleTabChange = (tabId: AnalyticsTab) => {
    setActiveTab(tabId);
    if (tabId === 'area-committees') {
      navigate('/area-committees');
    } else {
      navigate('/incidents');
    }
  };

  const tabs = [
    {
      id: 'incidents' as AnalyticsTab,
      name: 'Incidents',
      icon: AlertCircle,
      description: 'Criminal activities and police encounters'
    },
    {
      id: 'area-committees' as AnalyticsTab,
      name: 'Area Committees',
      icon: MapPin,
      description: 'Area committee analytics and associations'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
        <p className="text-gray-600">Comprehensive analysis of IR report data</p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className={`-ml-0.5 mr-2 h-5 w-5 ${
                    activeTab === tab.id ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                  }`} />
                  <div className="text-left">
                    <div>{tab.name}</div>
                    <div className="text-xs text-gray-400 font-normal">{tab.description}</div>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-8">
        {activeTab === 'incidents' && (
          <div>
            <IncidentAnalytics />
          </div>
        )}
        {activeTab === 'area-committees' && (
          <div>
            <AreaCommitteeAnalytics />
          </div>
        )}
      </div>
    </div>
  );
}
