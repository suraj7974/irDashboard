import { IRReport, SearchFilters } from '../types';

export interface QueryIntent {
  type: 'person' | 'incident' | 'location' | 'general' | 'area_committee' | 'weapon' | 'date' | 'multiple';
  entities: {
    persons?: string[];
    locations?: string[];
    incidents?: string[];
    area_committees?: string[];
    weapons?: string[];
    dates?: string[];
  };
  filters: SearchFilters;
  confidence: number;
  originalQuery: string;
}

export interface ChatbotResponse {
  response: string;
  sources: {
    reportId: string;
    reportName: string;
    confidence: number;
  }[];
  intent: QueryIntent;
}

export class EnhancedQueryParser {
  // Common keywords for different entity types
  private static readonly PERSON_KEYWORDS = [
    'person', 'name', 'individual', 'suspect', 'who', 'नाम', 'व्यक्ति', 'संदिग्ध'
  ];

  private static readonly LOCATION_KEYWORDS = [
    'location', 'place', 'area', 'region', 'village', 'where', 'स्थान', 'क्षेत्र', 'गांव', 'जगह'
  ];

  private static readonly INCIDENT_KEYWORDS = [
    'incident', 'activity', 'encounter', 'event', 'what', 'crime', 'criminal', 'घटना', 'अपराध', 'मुठभेड़'
  ];

  private static readonly AREA_COMMITTEE_KEYWORDS = [
    'committee', 'ac', 'area committee', 'कमेटी', 'एरिया कमेटी'
  ];

  private static readonly WEAPON_KEYWORDS = [
    'weapon', 'gun', 'rifle', 'bomb', 'explosive', 'arms', 'हथियार', 'बम', 'राइफल'
  ];

  private static readonly DATE_KEYWORDS = [
    'when', 'date', 'year', 'month', 'time', 'कब', 'साल', 'महीना', 'समय'
  ];

  /**
   * Parse natural language query and extract intent and entities
   */
  static parseQuery(query: string): QueryIntent {
    const lowerQuery = query.toLowerCase();
    const entities: QueryIntent['entities'] = {};
    let primaryType: QueryIntent['type'] = 'general';
    let confidence = 0.5;

    // Detect query types based on keywords
    const detectedTypes: QueryIntent['type'][] = [];

    if (this.containsAny(lowerQuery, this.PERSON_KEYWORDS)) {
      detectedTypes.push('person');
      entities.persons = this.extractPersonNames(query);
    }

    if (this.containsAny(lowerQuery, this.LOCATION_KEYWORDS)) {
      detectedTypes.push('location');
      entities.locations = this.extractLocations(query);
    }

    if (this.containsAny(lowerQuery, this.INCIDENT_KEYWORDS)) {
      detectedTypes.push('incident');
      entities.incidents = this.extractIncidents(query);
    }

    if (this.containsAny(lowerQuery, this.AREA_COMMITTEE_KEYWORDS)) {
      detectedTypes.push('area_committee');
      entities.area_committees = this.extractAreaCommittees(query);
    }

    if (this.containsAny(lowerQuery, this.WEAPON_KEYWORDS)) {
      detectedTypes.push('weapon');
      entities.weapons = this.extractWeapons(query);
    }

    if (this.containsAny(lowerQuery, this.DATE_KEYWORDS)) {
      detectedTypes.push('date');
      entities.dates = this.extractDates(query);
    }

    // Determine primary type
    if (detectedTypes.length === 0) {
      primaryType = 'general';
      confidence = 0.3;
    } else if (detectedTypes.length === 1) {
      primaryType = detectedTypes[0];
      confidence = 0.8;
    } else {
      primaryType = 'multiple';
      confidence = 0.7;
    }

    // Build search filters
    const filters: SearchFilters = {};

    if (entities.persons && entities.persons.length > 0) {
      filters.suspectName = entities.persons[0];
    }

    if (entities.locations && entities.locations.length > 0) {
      filters.location = entities.locations[0];
    }

    // Add general query for full-text search
    if (primaryType === 'general' || !this.hasSpecificEntities(entities)) {
      filters.query = query;
    }

    return {
      type: primaryType,
      entities,
      filters,
      confidence,
      originalQuery: query
    };
  }

  private static containsAny(text: string, keywords: string[]): boolean {
    return keywords.some(keyword => text.includes(keyword));
  }

  private static hasSpecificEntities(entities: QueryIntent['entities']): boolean {
    return Object.values(entities).some(entityList => entityList && entityList.length > 0);
  }

  /**
   * Extract person names from query using patterns and keywords
   */
  private static extractPersonNames(query: string): string[] {
    const names: string[] = [];
    
    // Pattern: "about [name]", "person [name]", "[name] report"
    const patterns = [
      /about\s+([A-Za-z\u0900-\u097F\s]+?)(?:\s|$|[,.])/gi,
      /person\s+([A-Za-z\u0900-\u097F\s]+?)(?:\s|$|[,.])/gi,
      /name\s+([A-Za-z\u0900-\u097F\s]+?)(?:\s|$|[,.])/gi,
      /([A-Za-z\u0900-\u097F\s]+?)\s+report/gi,
      /reports?\s+(?:of|about|on)\s+([A-Za-z\u0900-\u097F\s]+?)(?:\s|$|[,.])/gi
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(query)) !== null) {
        const name = match[1].trim();
        if (name.length > 2 && name.length < 50) {
          names.push(name);
        }
      }
    });

    return [...new Set(names)]; // Remove duplicates
  }

  /**
   * Extract locations from query
   */
  private static extractLocations(query: string): string[] {
    const locations: string[] = [];
    
    const patterns = [
      /(?:in|at|from|near)\s+([A-Za-z\u0900-\u097F\s]+?)(?:\s|$|[,.])/gi,
      /location\s+([A-Za-z\u0900-\u097F\s]+?)(?:\s|$|[,.])/gi,
      /area\s+([A-Za-z\u0900-\u097F\s]+?)(?:\s|$|[,.])/gi
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(query)) !== null) {
        const location = match[1].trim();
        if (location.length > 2 && location.length < 50) {
          locations.push(location);
        }
      }
    });

    return [...new Set(locations)];
  }

  /**
   * Extract incidents from query
   */
  private static extractIncidents(query: string): string[] {
    const incidents: string[] = [];
    
    const patterns = [
      /incident\s+([A-Za-z\u0900-\u097F\s]+?)(?:\s|$|[,.])/gi,
      /activity\s+([A-Za-z\u0900-\u097F\s]+?)(?:\s|$|[,.])/gi,
      /encounter\s+([A-Za-z\u0900-\u097F\s]+?)(?:\s|$|[,.])/gi
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(query)) !== null) {
        const incident = match[1].trim();
        if (incident.length > 2 && incident.length < 100) {
          incidents.push(incident);
        }
      }
    });

    return [...new Set(incidents)];
  }

  /**
   * Extract area committees from query
   */
  private static extractAreaCommittees(query: string): string[] {
    const committees: string[] = [];
    
    const patterns = [
      /(?:committee|ac)\s+([A-Za-z\u0900-\u097F\s]+?)(?:\s|$|[,.])/gi,
      /area\s+committee\s+([A-Za-z\u0900-\u097F\s]+?)(?:\s|$|[,.])/gi
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(query)) !== null) {
        const committee = match[1].trim();
        if (committee.length > 2 && committee.length < 50) {
          committees.push(committee);
        }
      }
    });

    return [...new Set(committees)];
  }

  /**
   * Extract weapons from query
   */
  private static extractWeapons(query: string): string[] {
    const weapons: string[] = [];
    
    const patterns = [
      /(?:weapon|gun|rifle|bomb)\s+([A-Za-z\u0900-\u097F\s]+?)(?:\s|$|[,.])/gi,
      /weapons?\s+([A-Za-z\u0900-\u097F\s]+?)(?:\s|$|[,.])/gi
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(query)) !== null) {
        const weapon = match[1].trim();
        if (weapon.length > 2 && weapon.length < 50) {
          weapons.push(weapon);
        }
      }
    });

    return [...new Set(weapons)];
  }

  /**
   * Extract dates from query
   */
  private static extractDates(query: string): string[] {
    const dates: string[] = [];
    
    const patterns = [
      /(\d{4})/g, // Years
      /(\d{1,2}\/\d{1,2}\/\d{4})/g, // Dates
      /(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}/gi,
      /(जनवरी|फरवरी|मार्च|अप्रैल|मई|जून|जुलाई|अगस्त|सितंबर|अक्टूबर|नवंबर|दिसंबर)\s+\d{4}/gi
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(query)) !== null) {
        dates.push(match[1] || match[0]);
      }
    });

    return [...new Set(dates)];
  }

  /**
   * Generate contextual suggestions based on query
   */
  static generateSuggestions(query: string): string[] {
    const lowerQuery = query.toLowerCase();
    const suggestions: string[] = [];

    if (lowerQuery.includes('person') || lowerQuery.includes('name')) {
      suggestions.push(
        'Show me all reports about [person name]',
        'What activities is [person name] involved in?',
        'Find incidents related to [person name]'
      );
    }

    if (lowerQuery.includes('location') || lowerQuery.includes('area')) {
      suggestions.push(
        'What incidents happened in [location]?',
        'Show me all reports from [area name]',
        'Which people are active in [location]?'
      );
    }

    if (lowerQuery.includes('incident') || lowerQuery.includes('activity')) {
      suggestions.push(
        'Show me all criminal activities',
        'List recent police encounters',
        'What incidents happened in 2024?'
      );
    }

    // Default suggestions
    if (suggestions.length === 0) {
      suggestions.push(
        'Show me recent reports',
        'What are the most common incidents?',
        'List all area committees',
        'Show me reports with weapons mentioned'
      );
    }

    return suggestions;
  }
}

export class ResponseFormatter {
  /**
   * Format search results into natural language response
   */
  static formatResponse(reports: IRReport[], intent: QueryIntent): ChatbotResponse {
    const sources = reports.map(report => ({
      reportId: report.id,
      reportName: report.original_filename,
      confidence: this.calculateRelevanceScore(report, intent)
    }));

    let response: string;

    switch (intent.type) {
      case 'person':
        response = this.formatPersonResponse(reports, intent);
        break;
      case 'location':
        response = this.formatLocationResponse(reports, intent);
        break;
      case 'incident':
        response = this.formatIncidentResponse(reports, intent);
        break;
      case 'area_committee':
        response = this.formatAreaCommitteeResponse(reports, intent);
        break;
      case 'weapon':
        response = this.formatWeaponResponse(reports, intent);
        break;
      case 'date':
        response = this.formatDateResponse(reports, intent);
        break;
      case 'multiple':
        response = this.formatMultipleResponse(reports, intent);
        break;
      default:
        response = this.formatGeneralResponse(reports, intent);
    }

    return {
      response,
      sources: sources.slice(0, 5), // Limit to top 5 sources
      intent
    };
  }

  private static formatPersonResponse(reports: IRReport[], intent: QueryIntent): string {
    if (reports.length === 0) {
      const personName = intent.entities.persons?.[0] || 'the specified person';
      return `I couldn't find any reports about "${personName}". Please check the spelling or try a different name.`;
    }

    const personName = intent.entities.persons?.[0] || 'the person';
    const reportCount = reports.length;

    let response = `I found ${reportCount} report${reportCount > 1 ? 's' : ''} about "${personName}":\n\n`;

    reports.slice(0, 3).forEach((report, index) => {
      const metadata = report.metadata;
      response += `${index + 1}. **${report.original_filename}**\n`;
      
      if (metadata?.area_region) {
        response += `   - Area: ${metadata.area_region}\n`;
      }
      
      if (metadata?.criminal_activities && metadata.criminal_activities.length > 0) {
        response += `   - Activities: ${metadata.criminal_activities.slice(0, 2).map(a => a.incident).join(', ')}\n`;
      }
      
      if (metadata?.police_encounters && metadata.police_encounters.length > 0) {
        response += `   - Encounters: ${metadata.police_encounters.length} recorded\n`;
      }
      
      response += '\n';
    });

    if (reportCount > 3) {
      response += `... and ${reportCount - 3} more reports. Click on the sources below to see more details.`;
    }

    return response;
  }

  private static formatLocationResponse(reports: IRReport[], intent: QueryIntent): string {
    if (reports.length === 0) {
      const location = intent.entities.locations?.[0] || 'the specified location';
      return `I couldn't find any reports from "${location}". Please try a different location name.`;
    }

    const location = intent.entities.locations?.[0] || 'the location';
    const reportCount = reports.length;

    let response = `I found ${reportCount} report${reportCount > 1 ? 's' : ''} from "${location}":\n\n`;

    // Group by person
    const peopleMap = new Map<string, IRReport[]>();
    reports.forEach(report => {
      const personName = report.metadata?.name || 'Unknown';
      if (!peopleMap.has(personName)) {
        peopleMap.set(personName, []);
      }
      peopleMap.get(personName)!.push(report);
    });

    const uniquePeople = Array.from(peopleMap.keys()).slice(0, 5);
    response += `**People active in this area:**\n`;
    uniquePeople.forEach(person => {
      const personReports = peopleMap.get(person)!;
      response += `- ${person} (${personReports.length} report${personReports.length > 1 ? 's' : ''})\n`;
    });

    // Add incident summary
    const allIncidents = reports.flatMap(r => r.metadata?.criminal_activities || []);
    if (allIncidents.length > 0) {
      const incidentCounts = new Map<string, number>();
      allIncidents.forEach(activity => {
        incidentCounts.set(activity.incident, (incidentCounts.get(activity.incident) || 0) + 1);
      });

      response += `\n**Most common incidents:**\n`;
      Array.from(incidentCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .forEach(([incident, count]) => {
          response += `- ${incident} (${count} time${count > 1 ? 's' : ''})\n`;
        });
    }

    return response;
  }

  private static formatIncidentResponse(reports: IRReport[], intent: QueryIntent): string {
    if (reports.length === 0) {
      return `I couldn't find any reports about incidents. Try asking about specific types of activities or encounters.`;
    }

    const reportCount = reports.length;
    let response = `I found ${reportCount} report${reportCount > 1 ? 's' : ''} related to incidents:\n\n`;

    // Group by incident type
    const incidentMap = new Map<string, {reports: IRReport[], people: Set<string>}>();
    
    reports.forEach(report => {
      const activities = report.metadata?.criminal_activities || [];
      const encounters = report.metadata?.police_encounters || [];
      
      activities.forEach(activity => {
        if (!incidentMap.has(activity.incident)) {
          incidentMap.set(activity.incident, {reports: [], people: new Set()});
        }
        const entry = incidentMap.get(activity.incident)!;
        entry.reports.push(report);
        if (report.metadata?.name) entry.people.add(report.metadata.name);
      });

      encounters.forEach(encounter => {
        const key = `Police Encounter: ${encounter.encounter_details}`;
        if (!incidentMap.has(key)) {
          incidentMap.set(key, {reports: [], people: new Set()});
        }
        const entry = incidentMap.get(key)!;
        entry.reports.push(report);
        if (report.metadata?.name) entry.people.add(report.metadata.name);
      });
    });

    const sortedIncidents = Array.from(incidentMap.entries())
      .sort((a, b) => b[1].reports.length - a[1].reports.length)
      .slice(0, 5);

    sortedIncidents.forEach(([incident, data]) => {
      response += `**${incident}**\n`;
      response += `- ${data.reports.length} report${data.reports.length > 1 ? 's' : ''}\n`;
      response += `- ${data.people.size} person${data.people.size > 1 ? 's' : ''} involved\n\n`;
    });

    return response;
  }

  private static formatAreaCommitteeResponse(reports: IRReport[], intent: QueryIntent): string {
    if (reports.length === 0) {
      return `I couldn't find any reports related to area committees. Try asking about specific committee names.`;
    }

    const reportCount = reports.length;
    let response = `I found ${reportCount} report${reportCount > 1 ? 's' : ''} related to area committees:\n\n`;

    // Group by area committee
    const acMap = new Map<string, {reports: IRReport[], people: Set<string>}>();
    
    reports.forEach(report => {
      const ac = report.area_committee || 'Unknown Committee';
      if (!acMap.has(ac)) {
        acMap.set(ac, {reports: [], people: new Set()});
      }
      const entry = acMap.get(ac)!;
      entry.reports.push(report);
      if (report.metadata?.name) entry.people.add(report.metadata.name);
    });

    const sortedACs = Array.from(acMap.entries())
      .sort((a, b) => b[1].reports.length - a[1].reports.length)
      .slice(0, 5);

    sortedACs.forEach(([ac, data]) => {
      response += `**${ac}**\n`;
      response += `- ${data.reports.length} report${data.reports.length > 1 ? 's' : ''}\n`;
      response += `- ${data.people.size} person${data.people.size > 1 ? 's' : ''} associated\n\n`;
    });

    return response;
  }

  private static formatWeaponResponse(reports: IRReport[], intent: QueryIntent): string {
    if (reports.length === 0) {
      return `I couldn't find any reports mentioning weapons. Try asking about specific weapon types.`;
    }

    const reportCount = reports.length;
    let response = `I found ${reportCount} report${reportCount > 1 ? 's' : ''} mentioning weapons:\n\n`;

    // Collect all weapons
    const weaponSet = new Set<string>();
    const peopleWithWeapons = new Set<string>();

    reports.forEach(report => {
      const weapons = report.metadata?.weapons_assets || [];
      weapons.forEach(weapon => weaponSet.add(weapon));
      if (weapons.length > 0 && report.metadata?.name) {
        peopleWithWeapons.add(report.metadata.name);
      }
    });

    response += `**Weapons mentioned:**\n`;
    Array.from(weaponSet).slice(0, 10).forEach(weapon => {
      response += `- ${weapon}\n`;
    });

    response += `\n**People associated with weapons:** ${peopleWithWeapons.size}\n`;
    
    if (peopleWithWeapons.size > 0) {
      response += Array.from(peopleWithWeapons).slice(0, 5).map(person => `- ${person}`).join('\n');
      if (peopleWithWeapons.size > 5) {
        response += `\n... and ${peopleWithWeapons.size - 5} more`;
      }
    }

    return response;
  }

  private static formatDateResponse(reports: IRReport[], intent: QueryIntent): string {
    if (reports.length === 0) {
      return `I couldn't find any reports for the specified date/time period.`;
    }

    const reportCount = reports.length;
    const dateQuery = intent.entities.dates?.[0] || 'the specified period';
    
    let response = `I found ${reportCount} report${reportCount > 1 ? 's' : ''} for ${dateQuery}:\n\n`;

    // Group by year if possible
    const yearMap = new Map<string, IRReport[]>();
    
    reports.forEach(report => {
      const uploadYear = new Date(report.uploaded_at).getFullYear().toString();
      if (!yearMap.has(uploadYear)) {
        yearMap.set(uploadYear, []);
      }
      yearMap.get(uploadYear)!.push(report);
    });

    const sortedYears = Array.from(yearMap.entries()).sort((a, b) => b[0].localeCompare(a[0]));

    sortedYears.forEach(([year, yearReports]) => {
      response += `**${year}:** ${yearReports.length} report${yearReports.length > 1 ? 's' : ''}\n`;
    });

    return response;
  }

  private static formatMultipleResponse(reports: IRReport[], intent: QueryIntent): string {
    if (reports.length === 0) {
      return `I couldn't find any reports matching your criteria. Try being more specific or check your spelling.`;
    }

    const reportCount = reports.length;
    let response = `I found ${reportCount} report${reportCount > 1 ? 's' : ''} matching your search:\n\n`;

    // Provide summary based on available entities
    const entities = intent.entities;
    
    if (entities.persons && entities.persons.length > 0) {
      response += `**People:** ${entities.persons.join(', ')}\n`;
    }
    
    if (entities.locations && entities.locations.length > 0) {
      response += `**Locations:** ${entities.locations.join(', ')}\n`;
    }
    
    if (entities.incidents && entities.incidents.length > 0) {
      response += `**Incidents:** ${entities.incidents.join(', ')}\n`;
    }

    response += `\n**Reports found:** ${reportCount}\n`;
    response += `Click on the sources below to view detailed information.`;

    return response;
  }

  private static formatGeneralResponse(reports: IRReport[], intent: QueryIntent): string {
    if (reports.length === 0) {
      return `I couldn't find any reports matching "${intent.originalQuery}". Try asking about specific people, locations, or incidents.`;
    }

    const reportCount = reports.length;
    let response = `I found ${reportCount} report${reportCount > 1 ? 's' : ''} related to your query:\n\n`;

    // Show top results
    reports.slice(0, 3).forEach((report, index) => {
      response += `${index + 1}. **${report.original_filename}**\n`;
      
      if (report.metadata?.name) {
        response += `   - Person: ${report.metadata.name}\n`;
      }
      
      if (report.metadata?.area_region) {
        response += `   - Area: ${report.metadata.area_region}\n`;
      }
      
      response += '\n';
    });

    if (reportCount > 3) {
      response += `... and ${reportCount - 3} more reports.`;
    }

    return response;
  }

  /**
   * Calculate relevance score for a report based on query intent
   */
  private static calculateRelevanceScore(report: IRReport, intent: QueryIntent): number {
    let score = 0.5; // Base score

    const metadata = report.metadata;
    if (!metadata) return score;

    // Person matching
    if (intent.entities.persons) {
      intent.entities.persons.forEach(person => {
        if (metadata.name?.toLowerCase().includes(person.toLowerCase())) {
          score += 0.3;
        }
        if (metadata.aliases?.some(alias => alias.toLowerCase().includes(person.toLowerCase()))) {
          score += 0.2;
        }
      });
    }

    // Location matching
    if (intent.entities.locations) {
      intent.entities.locations.forEach(location => {
        if (metadata.area_region?.toLowerCase().includes(location.toLowerCase())) {
          score += 0.3;
        }
        if (metadata.villages_covered?.some(village => village.toLowerCase().includes(location.toLowerCase()))) {
          score += 0.2;
        }
      });
    }

    // Incident matching
    if (intent.entities.incidents) {
      intent.entities.incidents.forEach(incident => {
        if (metadata.criminal_activities?.some(activity => 
          activity.incident.toLowerCase().includes(incident.toLowerCase()))) {
          score += 0.3;
        }
        if (metadata.police_encounters?.some(encounter => 
          encounter.encounter_details.toLowerCase().includes(incident.toLowerCase()))) {
          score += 0.3;
        }
      });
    }

    // Weapon matching
    if (intent.entities.weapons) {
      intent.entities.weapons.forEach(weapon => {
        if (metadata.weapons_assets?.some(asset => 
          asset.toLowerCase().includes(weapon.toLowerCase()))) {
          score += 0.2;
        }
      });
    }

    return Math.min(score, 1.0); // Cap at 1.0
  }
}

export class ChatbotService {
  /**
   * Main method to process user queries and return responses
   */
  static async processQuery(query: string): Promise<ChatbotResponse> {
    try {
      // 1. Parse the query to understand intent and extract entities
      const intent = EnhancedQueryParser.parseQuery(query);
      
      // 2. Search for relevant reports using existing API
      const reports = await this.searchReports(intent);
      
      // 3. Format the response
      const response = ResponseFormatter.formatResponse(reports, intent);
      
      return response;
    } catch (error) {
      console.error('Chatbot service error:', error);
      return {
        response: 'Sorry, I encountered an error while processing your request. Please try again.',
        sources: [],
        intent: {
          type: 'general',
          entities: {},
          filters: {},
          confidence: 0,
          originalQuery: query
        }
      };
    }
  }

  /**
   * Search for reports based on parsed intent
   */
  private static async searchReports(intent: QueryIntent): Promise<IRReport[]> {
    // Import here to avoid circular dependencies
    const { IRReportAPI } = await import('../api/reports');
    
    try {
      // Use existing search functionality
      const reports = await IRReportAPI.getReports(intent.filters);
      
      // Additional filtering based on intent type
      let filteredReports = reports;

      // Filter by specific entities if detected
      if (intent.entities.persons && intent.entities.persons.length > 0) {
        filteredReports = this.filterByPersons(filteredReports, intent.entities.persons);
      }

      if (intent.entities.locations && intent.entities.locations.length > 0) {
        filteredReports = this.filterByLocations(filteredReports, intent.entities.locations);
      }

      if (intent.entities.incidents && intent.entities.incidents.length > 0) {
        filteredReports = this.filterByIncidents(filteredReports, intent.entities.incidents);
      }

      if (intent.entities.area_committees && intent.entities.area_committees.length > 0) {
        filteredReports = this.filterByAreaCommittees(filteredReports, intent.entities.area_committees);
      }

      if (intent.entities.weapons && intent.entities.weapons.length > 0) {
        filteredReports = this.filterByWeapons(filteredReports, intent.entities.weapons);
      }

      // Sort by relevance
      return this.rankReports(filteredReports, intent);
    } catch (error) {
      console.error('Error searching reports:', error);
      return [];
    }
  }

  private static filterByPersons(reports: IRReport[], persons: string[]): IRReport[] {
    return reports.filter(report => {
      const metadata = report.metadata;
      if (!metadata) return false;

      return persons.some(person => {
        const personLower = person.toLowerCase();
        return (
          metadata.name?.toLowerCase().includes(personLower) ||
          metadata.aliases?.some(alias => alias.toLowerCase().includes(personLower))
        );
      });
    });
  }

  private static filterByLocations(reports: IRReport[], locations: string[]): IRReport[] {
    return reports.filter(report => {
      const metadata = report.metadata;
      if (!metadata) return false;

      return locations.some(location => {
        const locationLower = location.toLowerCase();
        return (
          metadata.area_region?.toLowerCase().includes(locationLower) ||
          metadata.villages_covered?.some(village => village.toLowerCase().includes(locationLower)) ||
          report.area_committee?.toLowerCase().includes(locationLower)
        );
      });
    });
  }

  private static filterByIncidents(reports: IRReport[], incidents: string[]): IRReport[] {
    return reports.filter(report => {
      const metadata = report.metadata;
      if (!metadata) return false;

      return incidents.some(incident => {
        const incidentLower = incident.toLowerCase();
        return (
          metadata.criminal_activities?.some(activity => 
            activity.incident.toLowerCase().includes(incidentLower)) ||
          metadata.police_encounters?.some(encounter => 
            encounter.encounter_details.toLowerCase().includes(incidentLower))
        );
      });
    });
  }

  private static filterByAreaCommittees(reports: IRReport[], committees: string[]): IRReport[] {
    return reports.filter(report => {
      return committees.some(committee => {
        const committeeLower = committee.toLowerCase();
        return report.area_committee?.toLowerCase().includes(committeeLower);
      });
    });
  }

  private static filterByWeapons(reports: IRReport[], weapons: string[]): IRReport[] {
    return reports.filter(report => {
      const metadata = report.metadata;
      if (!metadata?.weapons_assets) return false;

      return weapons.some(weapon => {
        const weaponLower = weapon.toLowerCase();
        return metadata.weapons_assets!.some(asset => 
          asset.toLowerCase().includes(weaponLower));
      });
    });
  }

  /**
   * Rank reports by relevance to the query intent
   */
  private static rankReports(reports: IRReport[], intent: QueryIntent): IRReport[] {
    return reports
      .map(report => ({
        report,
        score: this.calculateRelevanceScore(report, intent)
      }))
      .sort((a, b) => b.score - a.score)
      .map(item => item.report)
      .slice(0, 20); // Limit to top 20 results
  }

  private static calculateRelevanceScore(report: IRReport, intent: QueryIntent): number {
    let score = 0.1; // Base score

    const metadata = report.metadata;
    if (!metadata) return score;

    // Exact name matches get highest score
    if (intent.entities.persons) {
      intent.entities.persons.forEach(person => {
        const personLower = person.toLowerCase();
        if (metadata.name?.toLowerCase() === personLower) {
          score += 1.0;
        } else if (metadata.name?.toLowerCase().includes(personLower)) {
          score += 0.6;
        }
        if (metadata.aliases?.some(alias => alias.toLowerCase() === personLower)) {
          score += 0.8;
        } else if (metadata.aliases?.some(alias => alias.toLowerCase().includes(personLower))) {
          score += 0.4;
        }
      });
    }

    // Location matches
    if (intent.entities.locations) {
      intent.entities.locations.forEach(location => {
        const locationLower = location.toLowerCase();
        if (metadata.area_region?.toLowerCase().includes(locationLower)) {
          score += 0.5;
        }
        if (metadata.villages_covered?.some(village => village.toLowerCase().includes(locationLower))) {
          score += 0.4;
        }
      });
    }

    // Incident matches
    if (intent.entities.incidents) {
      intent.entities.incidents.forEach(incident => {
        const incidentLower = incident.toLowerCase();
        if (metadata.criminal_activities?.some(activity => 
          activity.incident.toLowerCase().includes(incidentLower))) {
          score += 0.5;
        }
        if (metadata.police_encounters?.some(encounter => 
          encounter.encounter_details.toLowerCase().includes(incidentLower))) {
          score += 0.5;
        }
      });
    }

    // Recency bonus (newer reports get slightly higher scores)
    const daysSinceUpload = (Date.now() - new Date(report.uploaded_at).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpload < 30) {
      score += 0.1;
    } else if (daysSinceUpload < 90) {
      score += 0.05;
    }

    return score;
  }

  /**
   * Get query suggestions based on available data
   */
  static async getQuerySuggestions(): Promise<string[]> {
    try {
      const { IRReportAPI } = await import('../api/reports');
      const suggestions = await IRReportAPI.getSearchSuggestions('');
      
      return [
        ...suggestions.slice(0, 3),
        'Show me recent reports',
        'What are the most common incidents?',
        'List all area committees',
        'Show reports with weapons mentioned'
      ];
    } catch (error) {
      console.error('Error getting suggestions:', error);
      return [
        'Show me recent reports',
        'What are the most common incidents?',
        'List all area committees',
        'Show reports with weapons mentioned'
      ];
    }
  }
}