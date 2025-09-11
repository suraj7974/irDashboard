import React from "react";
import { Outlet, useLocation, Link, useNavigate } from "react-router-dom";
import { FileText, Shield, LogOut, BarChart3 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isDashboard = location.pathname === "/dashboard";
  const isAnalytics = location.pathname === "/incidents" || location.pathname === "/area-committees";

  const handleTabChange = (tab: "dashboard" | "analytics") => {
    if (tab === "dashboard") {
      navigate("/dashboard");
    } else {
      navigate("/incidents");
    }
  };

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: FileText, current: location.pathname === "/dashboard" },
    { name: "Analytics", href: "/incidents", icon: Shield, current: location.pathname === "/incidents" || location.pathname === "/area-committees" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Navigation */}
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary-500 rounded-lg">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">IR Dashboard</h1>
                  <p className="text-sm text-gray-500">Incident Reports Management System</p>
                </div>
              </div>

              {/* Tab Toggle - Centered */}
              <div className="flex justify-center">
                <div className="bg-gray-100 rounded-lg p-1 inline-flex">
                  <button
                    onClick={() => handleTabChange("dashboard")}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                      isDashboard ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <FileText className="h-4 w-4 inline mr-2" />
                    Dashboard
                  </button>
                  <button
                    onClick={() => handleTabChange("analytics")}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                      isAnalytics ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <BarChart3 className="h-4 w-4 inline mr-2" />
                    Analytics
                  </button>
                </div>
              </div>
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">{user?.displayName || user?.email}</span>
              </div>
              <button
                onClick={logout}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <Outlet />
    </div>
  );
}
