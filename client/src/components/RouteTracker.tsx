import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Navigation,
  MapPin,
  Route as RouteIcon,
  ArrowRight,
  Calendar,
  Edit2,
  Save,
  X,
  Plus,
} from "lucide-react";

export interface RouteSegment {
  from: string;
  to: string;
  description?: string;
  sequence: number;
}

export interface MovementRoute {
  route_name: string;
  description?: string;
  segments: RouteSegment[];
  frequency?: string;
  purpose?: string;
}

interface RouteTrackerProps {
  routes: MovementRoute[];
  className?: string;
  isEditable?: boolean;
  onRoutesChange?: (routes: MovementRoute[]) => void;
}

const RouteTracker: React.FC<RouteTrackerProps> = ({ 
  routes, 
  className = "", 
  isEditable = false, 
  onRoutesChange 
}) => {
  const [editingRoute, setEditingRoute] = useState<number | null>(null);
  const [editingSegment, setEditingSegment] = useState<{ routeIndex: number; segmentIndex: number } | null>(null);
  const [localRoutes, setLocalRoutes] = useState<MovementRoute[]>(routes);

  React.useEffect(() => {
    setLocalRoutes(routes);
  }, [routes]);

  const handleSaveRoute = (routeIndex: number) => {
    if (onRoutesChange) {
      onRoutesChange(localRoutes);
    }
    setEditingRoute(null);
  };

  const handleSaveSegment = (routeIndex: number, segmentIndex: number) => {
    if (onRoutesChange) {
      onRoutesChange(localRoutes);
    }
    setEditingSegment(null);
  };

  const handleCancelRoute = () => {
    setLocalRoutes(routes);
    setEditingRoute(null);
  };

  const handleCancelSegment = () => {
    setLocalRoutes(routes);
    setEditingSegment(null);
  };

  const updateRoute = (routeIndex: number, field: keyof MovementRoute, value: string) => {
    const newRoutes = [...localRoutes];
    (newRoutes[routeIndex] as any)[field] = value;
    setLocalRoutes(newRoutes);
  };

  const updateSegment = (routeIndex: number, segmentIndex: number, field: keyof RouteSegment, value: string | number) => {
    const newRoutes = [...localRoutes];
    (newRoutes[routeIndex].segments[segmentIndex] as any)[field] = value;
    setLocalRoutes(newRoutes);
  };

  const addSegment = (routeIndex: number) => {
    const newRoutes = [...localRoutes];
    const route = newRoutes[routeIndex];
    const newSegment: RouteSegment = {
      from: "",
      to: "",
      description: "",
      sequence: route.segments.length + 1,
    };
    route.segments.push(newSegment);
    setLocalRoutes(newRoutes);
    // Automatically set the new segment to edit mode
    setEditingSegment({ routeIndex, segmentIndex: route.segments.length - 1 });
  };

  const removeSegment = (routeIndex: number, segmentIndex: number) => {
    const newRoutes = [...localRoutes];
    newRoutes[routeIndex].segments.splice(segmentIndex, 1);
    // Reorder sequence numbers
    newRoutes[routeIndex].segments.forEach((segment, index) => {
      segment.sequence = index + 1;
    });
    setLocalRoutes(newRoutes);
  };

  const addRoute = () => {
    const newRoute: MovementRoute = {
      route_name: "New Route",
      description: "",
      segments: [],
      frequency: "",
      purpose: "",
    };
    setLocalRoutes([...localRoutes, newRoute]);
    // Automatically set the new route to edit mode
    setEditingRoute(localRoutes.length);
  };
  if (!localRoutes || localRoutes.length === 0) {
    if (!isEditable) {
      return null;
    }
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <RouteIcon className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Movement Routes</h3>
          </div>
          <button
            onClick={addRoute}
            className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Add Route</span>
          </button>
        </div>
        <div className="text-center py-8 text-gray-500">
          <RouteIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
          <p>No movement routes found. Click "Add Route" to create one.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <RouteIcon className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Movement Routes</h3>
        </div>
      </div>

      {localRoutes.map((route, routeIndex) => (
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
                {editingRoute === routeIndex ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={route.route_name}
                      onChange={(e) => updateRoute(routeIndex, 'route_name', e.target.value)}
                      className="w-full text-lg font-medium border border-gray-300 rounded-md px-3 py-2"
                      placeholder="Route name..."
                    />
                    <textarea
                      value={route.description || ''}
                      onChange={(e) => updateRoute(routeIndex, 'description', e.target.value)}
                      className="w-full text-sm border border-gray-300 rounded-md px-3 py-2"
                      placeholder="Route description..."
                      rows={2}
                    />
                  </div>
                ) : (
                  <>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">
                      {route.route_name}
                    </h4>
                    {route.description && (
                      <p className="text-sm text-gray-600 mb-3">{route.description}</p>
                    )}
                  </>
                )}
              </div>
              <div className="flex items-center space-x-2 ml-4">
                {editingRoute === routeIndex ? (
                  <div className="flex items-center space-x-3">
                    <input
                      type="text"
                      value={route.frequency || ''}
                      onChange={(e) => updateRoute(routeIndex, 'frequency', e.target.value)}
                      className="text-xs border border-gray-300 rounded-md px-2 py-1 w-24"
                      placeholder="Frequency"
                    />
                    <input
                      type="text"
                      value={route.purpose || ''}
                      onChange={(e) => updateRoute(routeIndex, 'purpose', e.target.value)}
                      className="text-xs border border-gray-300 rounded-md px-2 py-1 w-24"
                      placeholder="Purpose"
                    />
                  </div>
                ) : (
                  <div className="text-right">
                    {route.frequency && (
                      <div className="flex items-center text-xs text-gray-500 mb-1">
                        <Calendar className="h-3 w-3 mr-1" />
                        <span>{route.frequency}</span>
                      </div>
                    )}
                  </div>
                )}
                {isEditable && (
                  <div className="flex items-center space-x-1">
                    {editingRoute === routeIndex ? (
                      <>
                        <button
                          onClick={() => handleSaveRoute(routeIndex)}
                          className="flex items-center space-x-1 px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                        >
                          <Save className="h-3 w-3" />
                          <span>Save</span>
                        </button>
                        <button
                          onClick={handleCancelRoute}
                          className="flex items-center space-x-1 px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                        >
                          <X className="h-3 w-3" />
                          <span>Cancel</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setEditingRoute(routeIndex)}
                        className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            {route.purpose && editingRoute !== routeIndex && (
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
              .map((segment, segmentIndex) => {
                const isEditingSegment = editingSegment?.routeIndex === routeIndex && editingSegment?.segmentIndex === segmentIndex;
                return (
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
                      {isEditingSegment ? (
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={segment.from}
                              onChange={(e) => updateSegment(routeIndex, segmentIndex, 'from', e.target.value)}
                              className="flex-1 text-sm border border-gray-300 rounded-md px-2 py-1"
                              placeholder="From location..."
                            />
                            <ArrowRight className="h-4 w-4 text-gray-400" />
                            <input
                              type="text"
                              value={segment.to}
                              onChange={(e) => updateSegment(routeIndex, segmentIndex, 'to', e.target.value)}
                              className="flex-1 text-sm border border-gray-300 rounded-md px-2 py-1"
                              placeholder="To location..."
                            />
                          </div>
                          <textarea
                            value={segment.description || ''}
                            onChange={(e) => updateSegment(routeIndex, segmentIndex, 'description', e.target.value)}
                            className="w-full text-xs border border-gray-300 rounded-md px-2 py-1"
                            placeholder="Segment description..."
                            rows={2}
                          />
                          {/* Save/Cancel buttons for segment editing */}
                          {isEditable && (
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => handleSaveSegment(routeIndex, segmentIndex)}
                                className="flex items-center space-x-1 px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                              >
                                <Save className="h-3 w-3" />
                                <span>Save</span>
                              </button>
                              <button
                                onClick={handleCancelSegment}
                                className="flex items-center space-x-1 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                              >
                                <X className="h-3 w-3" />
                                <span>Cancel</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <>
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
                            {isEditable && (
                              <button
                                onClick={() => setEditingSegment({ routeIndex, segmentIndex })}
                                className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                              >
                                <Edit2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>

                          {segment.description && (
                            <div className="mt-2 pt-2 border-t border-gray-100">
                              <p className="text-xs text-gray-600">{segment.description}</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            
            {isEditable && (
              <div className="flex justify-center">
                <button
                  onClick={() => addSegment(routeIndex)}
                  className="flex items-center space-x-1 px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Segment</span>
                </button>
              </div>
            )}
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

      {/* Add Route Button at the end */}
      {isEditable && (
        <div className="flex justify-center">
          <button
            onClick={addRoute}
            className="flex items-center space-x-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm border-2 border-dashed border-blue-300 bg-opacity-90"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Route</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default RouteTracker;
