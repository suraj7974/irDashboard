import React from "react";
import { motion } from "framer-motion";
import {
  Navigation,
  MapPin,
  Route as RouteIcon,
  ArrowRight,
  Calendar,
} from "lucide-react";
import { MovementRoute } from "../types";

interface RouteTrackerProps {
  routes: MovementRoute[];
  className?: string;
}

const RouteTracker: React.FC<RouteTrackerProps> = ({ 
  routes, 
  className = "" 
}) => {
  if (!routes || routes.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center space-x-2 mb-4">
        <RouteIcon className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Movement Routes</h3>
      </div>

      {routes.map((route, routeIndex) => (
        <motion.div
          key={routeIndex}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: routeIndex * 0.1 }}
          className="bg-gray-50 rounded-lg p-6 border border-gray-200"
        >
          {/* Route Header */}
          <div className="mb-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  {route.route_name}
                </h4>
                {route.description && (
                  <p className="text-sm text-gray-600 mb-3">{route.description}</p>
                )}
              </div>
              <div className="text-right ml-4">
                {route.frequency && (
                  <div className="flex items-center text-xs text-gray-500 mb-1">
                    <Calendar className="h-3 w-3 mr-1" />
                    <span>{route.frequency}</span>
                  </div>
                )}
              </div>
            </div>
            {route.purpose && (
              <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                <Navigation className="h-3 w-3 mr-1" />
                {route.purpose}
              </div>
            )}
          </div>

          {/* Route Segments */}
          <div className="space-y-3">
            {route.segments
              .sort((a, b) => a.sequence - b.sequence)
              .map((segment, segmentIndex) => (
                <motion.div
                  key={segmentIndex}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: (routeIndex * 0.1) + (segmentIndex * 0.05) }}
                  className="flex items-center space-x-4"
                >
                  {/* Sequence Number */}
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                      {segment.sequence}
                    </div>
                  </div>

                  {/* Route Details */}
                  <div className="flex-1 bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-gray-900">
                            {segment.from}
                          </span>
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-red-600" />
                          <span className="text-sm font-medium text-gray-900">
                            {segment.to}
                          </span>
                        </div>
                      </div>
                    </div>

                    {segment.description && (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-600">{segment.description}</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
          </div>

          {/* Route Summary */}
          {route.segments.length > 1 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  Total segments: <span className="font-medium">{route.segments.length}</span>
                </span>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1 text-green-600">
                    <MapPin className="h-3 w-3" />
                    <span className="text-xs">Start: {route.segments[0]?.from}</span>
                  </div>
                  <div className="flex items-center space-x-1 text-red-600">
                    <MapPin className="h-3 w-3" />
                    <span className="text-xs">
                      End: {route.segments[route.segments.length - 1]?.to}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
};

export default RouteTracker;