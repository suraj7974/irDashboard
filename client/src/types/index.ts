export interface IRReport {
  id: string;
  filename: string;
  original_filename: string;
  uploaded_at: string;
  status: "uploading" | "processing" | "completed" | "error";
  file_size: number;
  file_url?: string;
  parsed_json_url?: string;
  summary?: string;
  error_message?: string;
  metadata?: IRReportMetadata;
  questions_analysis?: QuestionsAnalysis;
  // Manual details (editable once)
  police_station?: string;
  division?: string;
  area_committee?: string;
  uid_for_name?: string;
  rank?: string;
  manual_details_set?: boolean;
  // Image fields
  profile_image_url?: string;
  additional_images?: string[];
}

export interface IRReportMetadata {
  name?: string;
  aliases?: string[];
  group_battalion?: string;
  area_region?: string;
  supply_team_supply?: string;
  ied_bomb?: string;
  meeting?: string;
  platoon?: string;
  involvement?: string;
  history?: string;
  bounty?: string;
  villages_covered?: string[];
  criminal_activities?: CriminalActivity[];
  hierarchical_role_changes?: RoleChange[];
  police_encounters?: PoliceEncounter[];
  weapons_assets?: string[];
  organizational_period?: string;
  important_points?: string[];
  movement_routes?: MovementRoute[];
}

export interface RouteSegment {
  sequence: number;
  from: string;
  to: string;
  description?: string;
}

export interface MovementRoute {
  route_name: string;
  description?: string;
  purpose?: string;
  frequency?: string;
  segments: RouteSegment[];
}

export interface CriminalActivity {
  sr_no: number;
  incident: string;
  year: string;
  location: string;
}

export interface RoleChange {
  year: string;
  role: string;
}

export interface PoliceEncounter {
  year: string;
  encounter_details: string;
}

export interface QuestionsAnalysis {
  success: boolean;
  processing_time_seconds: number;
  summary: {
    total_questions: number;
    questions_found: number;
    success_rate: number;
  };
  results: QuestionResult[];
  error?: string;
}

export interface QuestionResult {
  standard_question: string;
  found_question: string;
  answer: string;
  found: boolean;
}

export interface SearchFilters {
  query?: string;
  suspectName?: string;
  location?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  keywords?: string[];
  // Manual field filters
  police_station?: string;
  division?: string;
  area_committee?: string;
  rank?: string;
}

export interface UploadProgress {
  file: File;
  progress: number;
  status: "uploading" | "processing" | "completed" | "error";
  id?: string;
  error?: string;
}

// Incident Analytics Types
export interface IncidentData {
  incident_name: string;
  incident_id: string; // Unique identifier for the incident
  people_involved: PersonInvolvement[];
  source_reports: ReportReference[];
  locations: string[];
  years: string[];
  frequency: number; // How many times this incident is mentioned
  incident_type: 'criminal_activity' | 'police_encounter' | 'qa_mention' | 'important_point' | 'movement_route';
  last_mentioned: string; // Date when last mentioned
  description?: string;
}

export interface PersonInvolvement {
  person_name: string;
  person_id: string; // Report ID this person comes from
  aliases: string[];
  role_in_incident?: string;
  involvement_level: 'primary' | 'secondary' | 'mentioned';
  other_incidents: string[]; // Other incident IDs this person is involved in
  report_source: ReportReference;
}

export interface ReportReference {
  report_id: string;
  report_filename: string;
  mention_context: string; // The specific text where incident is mentioned
  mention_type: 'criminal_activity' | 'police_encounter' | 'qa_mention' | 'important_point' | 'movement_route';
  year?: string;
  location?: string;
  uploaded_at: string;
}

export interface IncidentAnalytics {
  total_incidents: number;
  total_people: number;
  most_common_incidents: IncidentData[];
  most_involved_people: PersonInvolvement[];
  incident_timeline: IncidentTimelineEntry[];
  location_hotspots: LocationAnalysis[];
}

export interface IncidentTimelineEntry {
  year: string;
  incident_count: number;
  incidents: IncidentData[];
}

export interface LocationAnalysis {
  location: string;
  incident_count: number;
  people_count: number;
  incidents: IncidentData[];
}

export interface IncidentFilters {
  search_query?: string;
  incident_type?: 'criminal_activity' | 'police_encounter' | 'qa_mention' | 'important_point' | 'movement_route' | 'all';
  year_range?: {
    start: string;
    end: string;
  };
  location?: string;
  person_name?: string;
  min_people_involved?: number;
  sort_by?: 'frequency' | 'date' | 'people_count' | 'alphabetical';
  sort_order?: 'asc' | 'desc';
}
