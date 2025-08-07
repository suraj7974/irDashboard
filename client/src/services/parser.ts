import { IRReportMetadata } from "../types";

export class ParserService {
  private static readonly PARSER_ENDPOINT = import.meta.env.VITE_PARSER_API_URL || "http://localhost:8000";

  // Process PDF with your existing parser
  static async processPDF(file: File): Promise<IRReportMetadata> {
    console.log("ParserService.processPDF called with file:", file.name);
    console.log("Parser endpoint:", this.PARSER_ENDPOINT);

    const formData = new FormData();
    formData.append("file", file);

    try {
      console.log("Making fetch request to:", `${this.PARSER_ENDPOINT}/process-pdf`);

      const response = await fetch(`${this.PARSER_ENDPOINT}/process-pdf`, {
        method: "POST",
        body: formData,
      });

      console.log("Response status:", response.status);
      console.log("Response ok:", response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Parser service error response:", errorText);
        throw new Error(`Parser service error: ${response.statusText}`);
      }

      const result = await response.json();
      console.log("Parser result:", result);

      // Extract the actual data from the response
      const actualData = result.data || result;
      console.log("Actual data to parse:", actualData);

      return this.parseMetadata(actualData);
    } catch (error) {
      console.error("Parser service error:", error);
      throw new Error(`Failed to process PDF: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  // Parse the JSON response from your Python parser
  private static parseMetadata(data: any): IRReportMetadata {
    return {
      name: data.Name || data.name || "",
      aliases: Array.isArray(data.Aliases) ? data.Aliases : Array.isArray(data.aliases) ? data.aliases : [],
      group_battalion: data["Group/Battalion"] || data.group_battalion || "",
      area_region: data["Area/Region"] || data.area_region || "",
      supply_team_supply: data["Supply Team/Supply"] || data.supply_team_supply || "",
      ied_bomb: data["IED/Bomb"] || data.ied_bomb || "",
      meeting: data.Meeting || data.meeting || "",
      platoon: data.Platoon || data.platoon || "",
      involvement: data.Involvement || data.involvement || "",
      history: data.History || data.history || "",
      bounty: data.Bounty || data.bounty || "",
      villages_covered: Array.isArray(data["Villages Covered"]) ? data["Villages Covered"] : Array.isArray(data.villages_covered) ? data.villages_covered : [],
      criminal_activities: this.parseCriminalActivities(data["Criminal Activities"] || data.criminal_activities || []),
      hierarchical_role_changes: this.parseRoleChanges(data["Maoist Hierarchical Role Changes"] || data.hierarchical_role_changes || []),
      police_encounters: this.parsePoliceEncounters(data["Police Encounters Participated"] || data.police_encounters || []),
      weapons_assets: Array.isArray(data["Weapons/Assets Handled"])
        ? data["Weapons/Assets Handled"]
        : Array.isArray(data.weapons_assets)
        ? data.weapons_assets
        : [],
      organizational_period: data["Total Organizational Period"] || data.organizational_period || "",
      important_points: Array.isArray(data["Important Points"]) ? data["Important Points"] : Array.isArray(data.important_points) ? data.important_points : [],
      maoists_met: this.parseMaoistContacts(data["All Maoists Met"] || data.maoists_met || []),
    };
  }

  private static parseCriminalActivities(activities: any[]): Array<{
    sr_no: number;
    incident: string;
    year: string;
    location: string;
  }> {
    if (!Array.isArray(activities)) return [];

    return activities.map((activity) => ({
      sr_no: activity["Sr. No."] || activity.sr_no || 0,
      incident: activity.Incident || activity.incident || "",
      year: activity.Year || activity.year || "",
      location: activity.Location || activity.location || "",
    }));
  }

  private static parseRoleChanges(changes: any[]): Array<{
    year: string;
    role: string;
  }> {
    if (!Array.isArray(changes)) return [];

    return changes.map((change) => ({
      year: change.Year || change.year || "",
      role: change.Role || change.role || "",
    }));
  }

  private static parsePoliceEncounters(encounters: any[]): Array<{
    year: string;
    encounter_details: string;
  }> {
    if (!Array.isArray(encounters)) return [];

    return encounters.map((encounter) => ({
      year: encounter.Year || encounter.year || "",
      encounter_details: encounter["Encounter Details"] || encounter.encounter_details || "",
    }));
  }

  private static parseMaoistContacts(contacts: any[]): Array<{
    sr_no: number;
    name: string;
    group: string;
    year_met: string;
    bounty_rank_importance: string;
  }> {
    if (!Array.isArray(contacts)) return [];

    return contacts.map((contact) => ({
      sr_no: contact["Sr. No."] || contact.sr_no || 0,
      name: contact.Name || contact.name || "",
      group: contact.Group || contact.group || "",
      year_met: contact["Year Met"] || contact.year_met || "",
      bounty_rank_importance: contact["Bounty/Rank/Importance"] || contact.bounty_rank_importance || "",
    }));
  }

  // Generate summary from metadata
  static generateSummary(metadata: IRReportMetadata): string {
    const parts = [];

    if (metadata.name) {
      parts.push(`Subject: ${metadata.name}`);
    }

    if (metadata.group_battalion) {
      parts.push(`Group: ${metadata.group_battalion}`);
    }

    if (metadata.area_region) {
      parts.push(`Region: ${metadata.area_region}`);
    }

    if (metadata.bounty) {
      parts.push(`Bounty: ${metadata.bounty}`);
    }

    if (metadata.criminal_activities && metadata.criminal_activities.length > 0) {
      parts.push(`${metadata.criminal_activities.length} criminal activities recorded`);
    }

    if (metadata.police_encounters && metadata.police_encounters.length > 0) {
      parts.push(`${metadata.police_encounters.length} police encounters`);
    }

    if (metadata.villages_covered && metadata.villages_covered.length > 0) {
      parts.push(`Active in ${metadata.villages_covered.length} villages`);
    }

    return parts.join(" • ");
  }
}
