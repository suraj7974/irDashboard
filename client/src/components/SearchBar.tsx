import React, { useState, useEffect, useRef } from "react";
import { Search, Filter, X, Calendar, MapPin, User, Shield, Users, Zap, Package, Target, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SearchFilters, IRReport } from "../types";

interface SearchBarProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onSearch: (query: string) => void;
  reports: IRReport[];
}

interface SearchSuggestion {
  type: "name" | "area" | "group" | "alias" | "village" | "activity" | "filename" | "supply" | "ied" | "meeting" | "platoon" | "involvement" | "history" | "bounty" | "period" | "weapon" | "point" | "encounter" | "role" | "route" | "question" | "answer";
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

  // Filter input states
  const [policeStationQuery, setPoliceStationQuery] = useState(filters.police_station || "");
  const [divisionQuery, setDivisionQuery] = useState(filters.division || "");
  const [areaCommitteeQuery, setAreaCommitteeQuery] = useState(filters.area_committee || "");

  // Filter suggestions states
  const [policeStationSuggestions, setPoliceStationSuggestions] = useState<string[]>([]);
  const [divisionSuggestions, setDivisionSuggestions] = useState<string[]>([]);
  const [areaCommitteeSuggestions, setAreaCommitteeSuggestions] = useState<string[]>([]);

  // Active suggestion states
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

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

      // Search in summary
      if (report.summary && report.summary.toLowerCase().includes(queryLower)) {
        allSuggestions.push({
          type: "filename",
          value: report.summary,
          label: report.summary,
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

        // Search in supply team/supply
        if (report.metadata.supply_team_supply && report.metadata.supply_team_supply.toLowerCase().includes(queryLower)) {
          allSuggestions.push({
            type: "supply",
            value: report.metadata.supply_team_supply,
            label: report.metadata.supply_team_supply,
            count: 1,
          });
        }

        // Search in IED/Bomb
        if (report.metadata.ied_bomb && report.metadata.ied_bomb.toLowerCase().includes(queryLower)) {
          allSuggestions.push({
            type: "ied",
            value: report.metadata.ied_bomb,
            label: report.metadata.ied_bomb,
            count: 1,
          });
        }

        // Search in Meeting
        if (report.metadata.meeting && report.metadata.meeting.toLowerCase().includes(queryLower)) {
          allSuggestions.push({
            type: "meeting",
            value: report.metadata.meeting,
            label: report.metadata.meeting,
            count: 1,
          });
        }

        // Search in Platoon
        if (report.metadata.platoon && report.metadata.platoon.toLowerCase().includes(queryLower)) {
          allSuggestions.push({
            type: "platoon",
            value: report.metadata.platoon,
            label: report.metadata.platoon,
            count: 1,
          });
        }

        // Search in involvement
        if (report.metadata.involvement && report.metadata.involvement.toLowerCase().includes(queryLower)) {
          allSuggestions.push({
            type: "involvement",
            value: report.metadata.involvement,
            label: report.metadata.involvement,
            count: 1,
          });
        }

        // Search in history
        if (report.metadata.history && report.metadata.history.toLowerCase().includes(queryLower)) {
          allSuggestions.push({
            type: "history",
            value: report.metadata.history,
            label: report.metadata.history,
            count: 1,
          });
        }

        // Search in bounty
        if (report.metadata.bounty && report.metadata.bounty.toLowerCase().includes(queryLower)) {
          allSuggestions.push({
            type: "bounty",
            value: report.metadata.bounty,
            label: report.metadata.bounty,
            count: 1,
          });
        }

        // Search in organizational period
        if (report.metadata.organizational_period && report.metadata.organizational_period.toLowerCase().includes(queryLower)) {
          allSuggestions.push({
            type: "period",
            value: report.metadata.organizational_period,
            label: report.metadata.organizational_period,
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

        // Search in weapons/assets
        if (report.metadata.weapons_assets && Array.isArray(report.metadata.weapons_assets)) {
          report.metadata.weapons_assets.forEach((weapon) => {
            if (typeof weapon === "string" && weapon.toLowerCase().includes(queryLower)) {
              allSuggestions.push({
                type: "weapon",
                value: weapon,
                label: weapon,
                count: 1,
              });
            }
          });
        }

        // Search in important points
        if (report.metadata.important_points && Array.isArray(report.metadata.important_points)) {
          report.metadata.important_points.forEach((point) => {
            if (typeof point === "string" && point.toLowerCase().includes(queryLower)) {
              allSuggestions.push({
                type: "point",
                value: point,
                label: point,
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

        // Search in police encounters
        if (report.metadata.police_encounters && Array.isArray(report.metadata.police_encounters)) {
          report.metadata.police_encounters.forEach((encounter) => {
            if (typeof encounter === 'object' && encounter !== null) {
              Object.values(encounter).forEach(value => {
                if (typeof value === "string" && value.toLowerCase().includes(queryLower)) {
                  allSuggestions.push({
                    type: "encounter",
                    value: value,
                    label: value,
                    count: 1,
                  });
                }
              });
            }
          });
        }

        // Search in hierarchical role changes
        if (report.metadata.hierarchical_role_changes && Array.isArray(report.metadata.hierarchical_role_changes)) {
          report.metadata.hierarchical_role_changes.forEach((role) => {
            if (typeof role === 'object' && role !== null) {
              Object.values(role).forEach(value => {
                if (typeof value === "string" && value.toLowerCase().includes(queryLower)) {
                  allSuggestions.push({
                    type: "role",
                    value: value,
                    label: value,
                    count: 1,
                  });
                }
              });
            }
          });
        }

        // Search in movement routes
        if (report.metadata.movement_routes && Array.isArray(report.metadata.movement_routes)) {
          report.metadata.movement_routes.forEach((route) => {
            if (route.route_name && route.route_name.toLowerCase().includes(queryLower)) {
              allSuggestions.push({
                type: "route",
                value: route.route_name,
                label: route.route_name,
                count: 1,
              });
            }
            if (route.description && route.description.toLowerCase().includes(queryLower)) {
              allSuggestions.push({
                type: "route",
                value: route.description,
                label: route.description,
                count: 1,
              });
            }
            if (route.purpose && route.purpose.toLowerCase().includes(queryLower)) {
              allSuggestions.push({
                type: "route",
                value: route.purpose,
                label: route.purpose,
                count: 1,
              });
            }
            if (route.frequency && route.frequency.toLowerCase().includes(queryLower)) {
              allSuggestions.push({
                type: "route",
                value: route.frequency,
                label: route.frequency,
                count: 1,
              });
            }
            
            // Search in route segments
            if (route.segments && Array.isArray(route.segments)) {
              route.segments.forEach(segment => {
                if (segment.from && segment.from.toLowerCase().includes(queryLower)) {
                  allSuggestions.push({
                    type: "route",
                    value: segment.from,
                    label: segment.from,
                    count: 1,
                  });
                }
                if (segment.to && segment.to.toLowerCase().includes(queryLower)) {
                  allSuggestions.push({
                    type: "route",
                    value: segment.to,
                    label: segment.to,
                    count: 1,
                  });
                }
                if (segment.description && segment.description.toLowerCase().includes(queryLower)) {
                  allSuggestions.push({
                    type: "route",
                    value: segment.description,
                    label: segment.description,
                    count: 1,
                  });
                }
              });
            }
          });
        }
      }

      // Search in questions analysis
      if (report.questions_analysis && report.questions_analysis.results) {
        report.questions_analysis.results.forEach(result => {
          if (result.standard_question && result.standard_question.toLowerCase().includes(queryLower)) {
            allSuggestions.push({
              type: "question",
              value: result.standard_question,
              label: result.standard_question,
              count: 1,
            });
          }
          if (result.found_question && result.found_question.toLowerCase().includes(queryLower)) {
            allSuggestions.push({
              type: "question",
              value: result.found_question,
              label: result.found_question,
              count: 1,
            });
          }
          if (result.answer && result.answer.toLowerCase().includes(queryLower)) {
            allSuggestions.push({
              type: "answer",
              value: result.answer,
              label: result.answer,
              count: 1,
            });
          }
        });
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

  // Generate filter suggestions for specific fields
  const generateFilterSuggestions = (field: keyof IRReport, searchQuery: string): string[] => {
    if (!searchQuery || searchQuery.length < 1) return [];

    const queryLower = searchQuery.toLowerCase();
    const values = Array.from(new Set(reports.map((report) => report[field] as string).filter((value) => value && value.toLowerCase().includes(queryLower))));

    return values
      .sort((a, b) => {
        // Exact matches first
        const aExact = a.toLowerCase() === queryLower;
        const bExact = b.toLowerCase() === queryLower;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;

        // Then starts with query
        const aStarts = a.toLowerCase().startsWith(queryLower);
        const bStarts = b.toLowerCase().startsWith(queryLower);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;

        // Then alphabetically
        return a.localeCompare(b);
      })
      .slice(0, 8); // Limit to 8 suggestions per field
  };

  // Handle filter input changes
  const handleFilterChange = (field: string, value: string) => {
    switch (field) {
      case "police_station":
        setPoliceStationQuery(value);
        setPoliceStationSuggestions(generateFilterSuggestions("police_station", value));
        setActiveFilter(value ? "police_station" : null);
        onFiltersChange({ ...filters, police_station: value || undefined });
        break;
      case "division":
        setDivisionQuery(value);
        setDivisionSuggestions(generateFilterSuggestions("division", value));
        setActiveFilter(value ? "division" : null);
        onFiltersChange({ ...filters, division: value || undefined });
        break;
      case "area_committee":
        setAreaCommitteeQuery(value);
        setAreaCommitteeSuggestions(generateFilterSuggestions("area_committee", value));
        setActiveFilter(value ? "area_committee" : null);
        onFiltersChange({ ...filters, area_committee: value || undefined });
        break;
    }
  };

  // Handle filter suggestion selection
  const handleFilterSuggestionSelect = (field: string, value: string) => {
    handleFilterChange(field, value);
    setActiveFilter(null);
  };

  // Update suggestions when query changes
  useEffect(() => {
    const newSuggestions = generateSuggestions(query);
    setSuggestions(newSuggestions);
    setSelectedIndex(-1);
  }, [query, reports]);

  // Sync filter inputs with filters prop
  useEffect(() => {
    setPoliceStationQuery(filters.police_station || "");
    setDivisionQuery(filters.division || "");
    setAreaCommitteeQuery(filters.area_committee || "");
  }, [filters.police_station, filters.division, filters.area_committee]);

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
    setPoliceStationQuery("");
    setDivisionQuery("");
    setAreaCommitteeQuery("");
    setActiveFilter(null);
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
      case "supply":
        return <Package className="h-4 w-4 text-blue-500" />;
      case "ied":
        return <Target className="h-4 w-4 text-red-500" />;
      case "meeting":
        return <Users className="h-4 w-4 text-green-500" />;
      case "platoon":
        return <Shield className="h-4 w-4 text-purple-500" />;
      case "involvement":
        return <User className="h-4 w-4 text-indigo-500" />;
      case "history":
        return <Clock className="h-4 w-4 text-amber-500" />;
      case "bounty":
        return <Target className="h-4 w-4 text-yellow-500" />;
      case "period":
        return <Calendar className="h-4 w-4 text-gray-600" />;
      case "weapon":
        return <Zap className="h-4 w-4 text-red-600" />;
      case "point":
        return <Target className="h-4 w-4 text-blue-600" />;
      case "encounter":
        return <Shield className="h-4 w-4 text-red-600" />;
      case "role":
        return <Users className="h-4 w-4 text-purple-600" />;
      case "route":
        return <MapPin className="h-4 w-4 text-green-600" />;
      case "question":
        return <Search className="h-4 w-4 text-blue-600" />;
      case "answer":
        return <X className="h-4 w-4 text-green-600" />;
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
      case "supply":
        return "Supply";
      case "ied":
        return "IED/Bomb";
      case "meeting":
        return "Meeting";
      case "platoon":
        return "Platoon";
      case "involvement":
        return "Involvement";
      case "history":
        return "History";
      case "bounty":
        return "Bounty";
      case "period":
        return "Period";
      case "weapon":
        return "Weapon";
      case "point":
        return "Important Point";
      case "encounter":
        return "Encounter";
      case "role":
        return "Role";
      case "route":
        return "Route";
      case "question":
        return "Question";
      case "answer":
        return "Answer";
      default:
        return "Result";
    }
  };

  // Count active filters (excluding query as it's shown separately)
  const activeFiltersCount = [
    filters.suspectName,
    filters.location,
    filters.dateRange,
    filters.keywords && filters.keywords.length > 0,
    policeStationQuery,
    divisionQuery,
    areaCommitteeQuery,
    filters.rank,
  ].filter(Boolean).length;

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
            placeholder="Search across all fields: names, locations, routes, Q&A, activities, weapons, encounters, and more..."
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

        {/* Administrative Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              className=""
            >
              <div className="bg-gray-50 border border-gray-200 rounded-lg mt-2 p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Police Station Filter */}
                  <div className="relative">
                    <label htmlFor="police-station" className="block text-xs font-medium text-gray-700 mb-1">
                      Police Station
                    </label>
                    <input
                      id="police-station"
                      type="text"
                      value={policeStationQuery}
                      onChange={(e) => handleFilterChange("police_station", e.target.value)}
                      onFocus={() => {
                        const suggestions = generateFilterSuggestions("police_station", policeStationQuery || "");
                        setPoliceStationSuggestions(
                          suggestions.length > 0
                            ? suggestions
                            : Array.from(new Set(reports.filter((r) => r.police_station).map((r) => r.police_station!)))
                                .sort()
                                .slice(0, 8)
                        );
                        setActiveFilter("police_station");
                      }}
                      onBlur={() =>
                        setTimeout(() => {
                          if (activeFilter === "police_station") setActiveFilter(null);
                        }, 500)
                      }
                      placeholder="Type to search..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    {activeFilter === "police_station" && policeStationSuggestions.length > 0 && (
                      <div
                        className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-[9999] mt-1 max-h-40 overflow-y-auto"
                        onMouseDown={(e) => e.preventDefault()}
                        onMouseEnter={() => {
                          // Clear any pending blur timeout when mouse enters dropdown
                        }}
                      >
                        {policeStationSuggestions.map((suggestion, index) => (
                          <button
                            key={suggestion}
                            onClick={() => handleFilterSuggestionSelect("police_station", suggestion)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors border-l-2 border-transparent hover:border-blue-500"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Division Filter */}
                  <div className="relative">
                    <label htmlFor="division" className="block text-xs font-medium text-gray-700 mb-1">
                      Division
                    </label>
                    <input
                      id="division"
                      type="text"
                      value={divisionQuery}
                      onChange={(e) => handleFilterChange("division", e.target.value)}
                      onFocus={() => {
                        const suggestions = generateFilterSuggestions("division", divisionQuery || "");
                        setDivisionSuggestions(
                          suggestions.length > 0
                            ? suggestions
                            : Array.from(new Set(reports.filter((r) => r.division).map((r) => r.division!)))
                                .sort()
                                .slice(0, 8)
                        );
                        setActiveFilter("division");
                      }}
                      onBlur={() =>
                        setTimeout(() => {
                          if (activeFilter === "division") setActiveFilter(null);
                        }, 500)
                      }
                      placeholder="Type to search..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    {activeFilter === "division" && divisionSuggestions.length > 0 && (
                      <div
                        className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-[9999] mt-1 max-h-40 overflow-y-auto"
                        onMouseDown={(e) => e.preventDefault()}
                        onMouseEnter={() => {
                          // Clear any pending blur timeout when mouse enters dropdown
                        }}
                      >
                        {divisionSuggestions.map((suggestion, index) => (
                          <button
                            key={suggestion}
                            onClick={() => handleFilterSuggestionSelect("division", suggestion)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors border-l-2 border-transparent hover:border-blue-500"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Area Committee Filter */}
                  <div className="relative">
                    <label htmlFor="area-committee" className="block text-xs font-medium text-gray-700 mb-1">
                      Area Committee
                    </label>
                    <input
                      id="area-committee"
                      type="text"
                      value={areaCommitteeQuery}
                      onChange={(e) => handleFilterChange("area_committee", e.target.value)}
                      onFocus={() => {
                        const suggestions = generateFilterSuggestions("area_committee", areaCommitteeQuery || "");
                        setAreaCommitteeSuggestions(
                          suggestions.length > 0
                            ? suggestions
                            : Array.from(new Set(reports.filter((r) => r.area_committee).map((r) => r.area_committee!)))
                                .sort()
                                .slice(0, 8)
                        );
                        setActiveFilter("area_committee");
                      }}
                      onBlur={() =>
                        setTimeout(() => {
                          if (activeFilter === "area_committee") setActiveFilter(null);
                        }, 500)
                      }
                      placeholder="Type to search..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    {activeFilter === "area_committee" && areaCommitteeSuggestions.length > 0 && (
                      <div
                        className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-[9999] mt-1 max-h-40 overflow-y-auto"
                        onMouseDown={(e) => e.preventDefault()}
                        onMouseEnter={() => {
                          // Clear any pending blur timeout when mouse enters dropdown
                        }}
                      >
                        {areaCommitteeSuggestions.map((suggestion, index) => (
                          <button
                            key={suggestion}
                            onClick={() => handleFilterSuggestionSelect("area_committee", suggestion)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors border-l-2 border-transparent hover:border-blue-500"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Rank Filter */}
                  <div>
                    <label htmlFor="rank" className="block text-xs font-medium text-gray-700 mb-1">
                      Rank
                    </label>
                    <select
                      id="rank"
                      value={filters.rank || ""}
                      onChange={(e) => onFiltersChange({ ...filters, rank: e.target.value || undefined })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="">All Ranks</option>
                      {Array.from(new Set(reports.filter((r) => r.rank).map((r) => r.rank!)))
                        .sort()
                        .map((rank) => (
                          <option key={rank} value={rank}>
                            {rank}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Clear Filters Button */}
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => {
                      setPoliceStationQuery("");
                      setDivisionQuery("");
                      setAreaCommitteeQuery("");
                      setActiveFilter(null);
                      onFiltersChange({
                        ...filters,
                        police_station: undefined,
                        division: undefined,
                        area_committee: undefined,
                        rank: undefined,
                      });
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Enhanced Suggestions Dropdown */}
        <AnimatePresence>
          {showSuggestions && suggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-[9999] mt-1 max-h-80 overflow-y-auto"
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
              className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-[9999] mt-1"
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
    </div>
  );
}
