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
  profile_image_url?: string;
  police_station?: string;
  division?: string;
  area_committee?: string;
  uid_for_name?: string;
  rank?: string;
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
  maoists_met?: MaoistContact[];
  movement_routes?: MovementRoute[];
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

export interface MaoistContact {
  sr_no: number;
  name: string;
  group: string;
  year_met: string;
  bounty_rank_importance: string;
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
  police_station?: string;
  division?: string;
  area_committee?: string;
  rank?: string;
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
