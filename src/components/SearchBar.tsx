import React, { useState } from "react";
import { Search, Filter, X, Calendar, MapPin, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SearchFilters } from "../types";

interface SearchBarProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  suggestions: string[];
  onSearch: (query: string) => void;
}

export default function SearchBar({ filters, onFiltersChange, suggestions, onSearch }: SearchBarProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [query, setQuery] = useState(filters.query || "");

  const handleQueryChange = (value: string) => {
    setQuery(value);
    onSearch(value);
    onFiltersChange({ ...filters, query: value });
    setShowSuggestions(value.length > 0 && suggestions.length > 0);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    onSearch(suggestion);
    onFiltersChange({ ...filters, query: suggestion });
    setShowSuggestions(false);
  };

  const clearFilters = () => {
    setQuery("");
    onFiltersChange({});
    onSearch("");
  };

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="w-full max-w-4xl mx-auto mb-8">
      {/* Main Search Bar */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onFocus={() => setShowSuggestions(query.length > 0 && suggestions.length > 0)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder="Search by name, location, incident, or any keyword..."
            className="w-full pl-10 pr-20 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
          />

          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-1.5 rounded-md transition-colors ${
                showFilters || activeFiltersCount > 0 ? "text-primary-600 bg-primary-50" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <Filter className="h-4 w-4" />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary-500 text-white text-xs rounded-full flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {(query || activeFiltersCount > 0) && (
              <button onClick={clearFilters} className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Suggestions Dropdown */}
        <AnimatePresence>
          {showSuggestions && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 mt-1"
            >
              <div className="py-2">
                {suggestions.slice(0, 8).map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-gray-700">{suggestion}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Advanced Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white border border-gray-200 rounded-lg mt-4 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Advanced Filters</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Suspect Name Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="inline h-4 w-4 mr-1" />
                  Suspect Name
                </label>
                <input
                  type="text"
                  value={filters.suspectName || ""}
                  onChange={(e) => onFiltersChange({ ...filters, suspectName: e.target.value })}
                  placeholder="Enter suspect name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* Location Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="inline h-4 w-4 mr-1" />
                  Location
                </label>
                <input
                  type="text"
                  value={filters.location || ""}
                  onChange={(e) => onFiltersChange({ ...filters, location: e.target.value })}
                  placeholder="Enter location..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* Date Range Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="inline h-4 w-4 mr-1" />
                  Date Range
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={filters.dateRange?.start ? filters.dateRange.start.toISOString().split("T")[0] : ""}
                    onChange={(e) =>
                      onFiltersChange({
                        ...filters,
                        dateRange: {
                          start: new Date(e.target.value),
                          end: filters.dateRange?.end || new Date(),
                        },
                      })
                    }
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  <input
                    type="date"
                    value={filters.dateRange?.end ? filters.dateRange.end.toISOString().split("T")[0] : ""}
                    onChange={(e) =>
                      onFiltersChange({
                        ...filters,
                        dateRange: {
                          start: filters.dateRange?.start || new Date(),
                          end: new Date(e.target.value),
                        },
                      })
                    }
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
            </div>

            {/* Keywords */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Keywords/Tags</label>
              <input
                type="text"
                value={filters.keywords?.join(", ") || ""}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    keywords: e.target.value
                      .split(",")
                      .map((k) => k.trim())
                      .filter((k) => k),
                  })
                }
                placeholder="Enter keywords separated by commas..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
