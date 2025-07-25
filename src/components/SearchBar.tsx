import React, { useState, useEffect, useRef } from "react";
import { Search, Filter, X, Calendar, MapPin, User, Shield, Users, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SearchFilters, IRReport } from "../types";

interface SearchBarProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onSearch: (query: string) => void;
  reports: IRReport[];
}

interface SearchSuggestion {
  type: "name" | "area" | "group" | "alias" | "village" | "activity" | "filename";
  value: string;
  label: string;
  count: number;
}

export default function SearchBar({ filters, onFiltersChange, onSearch, reports }: SearchBarProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [query, setQuery] = useState(filters.query || "");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // Generate suggestions based on reports data and current query
  const generateSuggestions = (searchQuery: string): SearchSuggestion[] => {
    if (!searchQuery || searchQuery.length < 1) return [];

    const allSuggestions: SearchSuggestion[] = [];
    const queryLower = searchQuery.toLowerCase();

    reports.forEach((report) => {
      // Search in filename
      if (report.original_filename.toLowerCase().includes(queryLower)) {
        allSuggestions.push({
          type: "filename",
          value: report.original_filename,
          label: report.original_filename,
          count: 1,
        });
      }

      if (report.metadata) {
        // Search in names
        if (report.metadata.name && report.metadata.name.toLowerCase().includes(queryLower)) {
          allSuggestions.push({
            type: "name",
            value: report.metadata.name,
            label: report.metadata.name,
            count: 1,
          });
        }

        // Search in areas/regions
        if (report.metadata.area_region && report.metadata.area_region.toLowerCase().includes(queryLower)) {
          allSuggestions.push({
            type: "area",
            value: report.metadata.area_region,
            label: report.metadata.area_region,
            count: 1,
          });
        }

        // Search in groups/battalions
        if (report.metadata.group_battalion && report.metadata.group_battalion.toLowerCase().includes(queryLower)) {
          allSuggestions.push({
            type: "group",
            value: report.metadata.group_battalion,
            label: report.metadata.group_battalion,
            count: 1,
          });
        }

        // Search in aliases
        if (report.metadata.aliases && Array.isArray(report.metadata.aliases)) {
          report.metadata.aliases.forEach((alias) => {
            if (typeof alias === "string" && alias.toLowerCase().includes(queryLower)) {
              allSuggestions.push({
                type: "alias",
                value: alias,
                label: alias,
                count: 1,
              });
            }
          });
        }

        // Search in villages
        if (report.metadata.villages_covered && Array.isArray(report.metadata.villages_covered)) {
          report.metadata.villages_covered.forEach((village) => {
            if (typeof village === "string" && village.toLowerCase().includes(queryLower)) {
              allSuggestions.push({
                type: "village",
                value: village,
                label: village,
                count: 1,
              });
            }
          });
        }

        // Search in criminal activities
        if (report.metadata.criminal_activities && Array.isArray(report.metadata.criminal_activities)) {
          report.metadata.criminal_activities.forEach((activity) => {
            if (activity.incident && activity.incident.toLowerCase().includes(queryLower)) {
              allSuggestions.push({
                type: "activity",
                value: activity.incident,
                label: activity.incident,
                count: 1,
              });
            }
            if (activity.location && activity.location.toLowerCase().includes(queryLower)) {
              allSuggestions.push({
                type: "area",
                value: activity.location,
                label: activity.location,
                count: 1,
              });
            }
          });
        }
      }
    });

    // Remove duplicates and count occurrences
    const uniqueSuggestions = new Map<string, SearchSuggestion>();
    allSuggestions.forEach((suggestion) => {
      const key = `${suggestion.type}:${suggestion.value}`;
      if (uniqueSuggestions.has(key)) {
        uniqueSuggestions.get(key)!.count++;
      } else {
        uniqueSuggestions.set(key, { ...suggestion });
      }
    });

    // Sort by relevance and frequency
    return Array.from(uniqueSuggestions.values())
      .sort((a, b) => {
        // Exact matches first
        const aExact = a.value.toLowerCase() === queryLower;
        const bExact = b.value.toLowerCase() === queryLower;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;

        // Then by frequency
        if (b.count !== a.count) return b.count - a.count;

        // Then alphabetically
        return a.value.localeCompare(b.value);
      })
      .slice(0, 10); // Limit to 10 suggestions
  };

  // Update suggestions when query changes
  useEffect(() => {
    const newSuggestions = generateSuggestions(query);
    setSuggestions(newSuggestions);
    setSelectedIndex(-1);
  }, [query, reports]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    onSearch(value);
    onFiltersChange({ ...filters, query: value });
    setShowSuggestions(value.length > 0);
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.value);
    onSearch(suggestion.value);
    onFiltersChange({ ...filters, query: suggestion.value });
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedIndex]);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const clearFilters = () => {
    setQuery("");
    onFiltersChange({});
    onSearch("");
    setShowSuggestions(false);
  };

  // Get icon for suggestion type
  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case "name":
        return <User className="h-4 w-4 text-blue-500" />;
      case "area":
        return <MapPin className="h-4 w-4 text-green-500" />;
      case "group":
        return <Shield className="h-4 w-4 text-purple-500" />;
      case "alias":
        return <Users className="h-4 w-4 text-orange-500" />;
      case "village":
        return <MapPin className="h-4 w-4 text-teal-500" />;
      case "activity":
        return <Zap className="h-4 w-4 text-red-500" />;
      case "filename":
        return <X className="h-4 w-4 text-gray-500" />;
      default:
        return <Search className="h-4 w-4 text-gray-400" />;
    }
  };

  // Get type label for suggestion
  const getTypeLabel = (type: string) => {
    switch (type) {
      case "name":
        return "Name";
      case "area":
        return "Area";
      case "group":
        return "Group";
      case "alias":
        return "Alias";
      case "village":
        return "Village";
      case "activity":
        return "Activity";
      case "filename":
        return "File";
      default:
        return "Result";
    }
  };

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="w-full max-w-4xl mx-auto mb-8">
      {/* Main Search Bar */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onFocus={() => setShowSuggestions(query.length > 0 && suggestions.length > 0)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            onKeyDown={handleKeyDown}
            placeholder="Search by name, location, incident, aliases, villages, or any keyword..."
            className="w-full pl-10 pr-20 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
          />

          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-1.5 rounded-md transition-colors relative ${
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

        {/* Enhanced Suggestions Dropdown */}
        <AnimatePresence>
          {showSuggestions && suggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 mt-1 max-h-80 overflow-y-auto"
            >
              <div className="py-2">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={`${suggestion.type}:${suggestion.value}`}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center space-x-3 ${
                      index === selectedIndex ? "bg-primary-50 border-r-2 border-primary-500" : ""
                    }`}
                  >
                    <div className="flex-shrink-0">{getSuggestionIcon(suggestion.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{getTypeLabel(suggestion.type)}</span>
                        {suggestion.count > 1 && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{suggestion.count}</span>}
                      </div>
                      <div className="text-sm text-gray-900 truncate mt-1">{suggestion.label}</div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* No Results Message */}
        <AnimatePresence>
          {showSuggestions && query.length > 0 && suggestions.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 mt-1"
            >
              <div className="py-4 px-4 text-center text-gray-500">
                <Search className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No results found for "{query}"</p>
                <p className="text-xs text-gray-400 mt-1">Try searching with different keywords</p>
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
