import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import IncidentAnalytics from "./pages/IncidentAnalytics";
import AppLayout from "./components/AppLayout";
import "./App.css";

function App() {
  return (
    <AuthProvider>
      <Router>
        <ProtectedRoute>
          <Routes>
            <Route path="/" element={<AppLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="incidents" element={<IncidentAnalytics />} />
            </Route>
          </Routes>
        </ProtectedRoute>
      </Router>
    </AuthProvider>
  );
}

export default App;
