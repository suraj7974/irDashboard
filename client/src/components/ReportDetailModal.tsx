import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import {
  X,
  FileText,
  Download,
  Calendar,
  MapPin,
  User,
  Shield,
  Clock,
  Zap,
  Users,
  Building2,
  Hash,
  Award,
  User2,
  Package,
  Target,
  HelpCircle,
  CheckCircle,
  XCircle,
  Edit3,
  Save,
  RotateCcw,
  Activity,
  HardDrive,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { IRReport } from "../types";
import PDFViewer from "./PDFViewer";
import RouteTracker from "./RouteTracker";
import QuestionEditor from "./QuestionEditor";
import { IRReportAPI } from "../api/reports";
import { STANDARD_QUESTIONS } from "../constants/questions";

// Define the interface for question data
interface QuestionData {
  question: string;
  paragraphAnswer: string;  // Separate paragraph content
  tableData?: {
    headers: string[];
    rows: string[][];
  };
  hasTable: boolean;        // Whether this question has table content
  hasParagraph: boolean;    // Whether this question has paragraph content
  questionNumber: number;
}

interface ReportDetailModalProps {
  report: IRReport | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload: (report: IRReport, type: "pdf") => void;
  onReportUpdate?: (report: IRReport) => void;
}

export default function ReportDetailModal({ report, isOpen, onClose, onDownload, onReportUpdate }: ReportDetailModalProps) {
  if (!isOpen || !report) return null;

  const [localReport, setLocalReport] = useState<IRReport>(report);
  const { metadata } = localReport;
  const [showPDFViewer, setShowPDFViewer] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [editingActivityIndex, setEditingActivityIndex] = useState<number | null>(null);
  const [editingEncounterIndex, setEditingEncounterIndex] = useState<number | null>(null);
  const [editingRoleChangeIndex, setEditingRoleChangeIndex] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Questions state for the new editor
  const [questionsData, setQuestionsData] = useState<QuestionData[]>([]);

  // Sync local report state with prop changes
  useEffect(() => {
    if (report) {
      setLocalReport(report);
    }
  }, [report]);

  // Initialize questions data from report
  useEffect(() => {
    if (localReport.questions_analysis?.results) {
      const questions: QuestionData[] = localReport.questions_analysis.results.map((result, index) => {
        const answer = result.answer || '';
        
        // Try to detect if answer contains table data (pipe-separated format)
        const lines = answer.split('\n').filter(line => line.trim());
        let paragraphAnswer = '';
        let tableData = undefined;
        let hasTable = false;
        let hasParagraph = false;
        
        // Check if we have pipe-separated data that looks like a table
        const potentialTableLines = lines.filter(line => line.includes(' | '));
        if (potentialTableLines.length >= 1) {
          // Separate paragraph and table content
          const tableStartIndex = lines.findIndex(line => line.includes(' | '));
          
          // Everything before table is paragraph
          if (tableStartIndex > 0) {
            paragraphAnswer = lines.slice(0, tableStartIndex).join('\n');
            hasParagraph = paragraphAnswer.trim() !== '';
          }
          
          // Convert pipe-separated lines to table structure
          const tableLines = lines.slice(tableStartIndex);
          if (tableLines.length > 0) {
            // First line of table data becomes headers
            const headers = tableLines[0].split(' | ').map(cell => cell.trim());
            
            // Remaining lines become data rows
            const rows = tableLines.length > 1 
              ? tableLines.slice(1).map(line => {
                  const cells = line.split(' | ').map(cell => cell.trim());
                  // Ensure all rows have the same number of columns as headers
                  while (cells.length < headers.length) {
                    cells.push('');
                  }
                  return cells.slice(0, headers.length);
                })
              : [new Array(headers.length).fill('')]; // Create empty row if no data rows
            
            tableData = { headers, rows };
            hasTable = true;
          }
        } else {
          // No table data detected, treat everything as paragraph
          paragraphAnswer = answer;
          hasParagraph = answer.trim() !== '';
        }
        
        return {
          question: result.standard_question || `Question ${index + 1}`,
          paragraphAnswer,
          tableData,
          hasTable,
          hasParagraph,
          questionNumber: index + 1
        };
      });
      setQuestionsData(questions);
    } else {
      // Initialize with default questions if no analysis exists
      const defaultQuestions: QuestionData[] = STANDARD_QUESTIONS.map((question, index) => ({
        questionNumber: index + 1,
        question,
        paragraphAnswer: "",
        tableData: undefined,
        hasTable: false,
        hasParagraph: true
      }));
      setQuestionsData(defaultQuestions);
    }
  }, [localReport.questions_analysis]);

  // Debug log to see the actual data structure
  // console.log("Report metadata:", metadata);

  // Handle both the expected structure and the actual data structure
  const getData = (key: string, altKey?: string) => {
    if (!metadata) return null;
    // Try the expected structure first
    if (metadata[key as keyof typeof metadata]) {
      return metadata[key as keyof typeof metadata];
    }
    // Try the alternative key (like "Name" instead of "name")
    if (altKey && (metadata as any)[altKey]) {
      return (metadata as any)[altKey];
    }
    return null;
  };

  // Helper functions for editing functionality
  const startEditing = useCallback((fieldKey: string, currentValue: any) => {
    setEditingField(fieldKey);
    setEditValues((prev: any) => ({
      ...prev,
      [fieldKey]: currentValue != null ? currentValue : "",
    }));
    // Focus the input after state update
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 0);
  }, []);

  const startEditingQuestion = useCallback((questionIndex: number, currentAnswer: string) => {
    setEditingQuestionIndex(questionIndex);
    setEditingField(`question_${questionIndex}`);
    setEditValues((prev: any) => ({
      ...prev,
      [`question_${questionIndex}`]: currentAnswer != null ? currentAnswer : "",
    }));
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 0);
  }, []);

  const startEditingActivity = useCallback((activityIndex: number, activity: any) => {
    setEditingActivityIndex(activityIndex);
    setEditingField(`activity_${activityIndex}`);
    setEditValues((prev: any) => ({
      ...prev,
      [`activity_${activityIndex}_sr_no`]: activity.sr_no || "",
      [`activity_${activityIndex}_incident`]: activity.incident || "",
      [`activity_${activityIndex}_year`]: activity.year || "",
      [`activity_${activityIndex}_location`]: activity.location || "",
    }));
  }, []);

  const startEditingEncounter = useCallback((encounterIndex: number, encounter: any) => {
    setEditingEncounterIndex(encounterIndex);
    setEditingField(`encounter_${encounterIndex}`);
    setEditValues((prev: any) => ({
      ...prev,
      [`encounter_${encounterIndex}_year`]: encounter.year || "",
      [`encounter_${encounterIndex}_encounter_details`]: encounter.encounter_details || "",
    }));
  }, []);

  const startEditingRoleChange = useCallback((roleChangeIndex: number, roleChange: any) => {
    setEditingRoleChangeIndex(roleChangeIndex);
    setEditingField(`rolechange_${roleChangeIndex}`);
    setEditValues((prev: any) => ({
      ...prev,
      [`rolechange_${roleChangeIndex}_year`]: roleChange.year || "",
      [`rolechange_${roleChangeIndex}_role`]: roleChange.role || "",
    }));
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingField(null);
    setEditingQuestionIndex(null);
    setEditingActivityIndex(null);
    setEditingEncounterIndex(null);
    setEditingRoleChangeIndex(null);
    setEditValues({});
  }, []);

  // Handle movement routes changes
  const handleMovementRoutesChange = useCallback(
    async (routes: any[]) => {
      try {
        setSaving(true);

        // Update local report
        const updatedReport = {
          ...localReport,
          metadata: {
            ...localReport.metadata,
            movement_routes: routes,
          },
        };

        setLocalReport(updatedReport);

        // Save to database
        await IRReportAPI.updateReport(localReport.id, {
          metadata: updatedReport.metadata,
        });

        // Notify parent
        if (onReportUpdate) {
          onReportUpdate(updatedReport);
        }

        console.log("✅ Movement routes updated successfully");
      } catch (error) {
        console.error("❌ Failed to update movement routes:", error);
        // Revert on error
        setLocalReport(localReport);
      } finally {
        setSaving(false);
      }
    },
    [localReport, onReportUpdate]
  );

  // Handle questions changes
  const handleQuestionsChange = useCallback(
    async (questions: QuestionData[]) => {
      try {
        setSaving(true);

        // Convert questions back to the format expected by the report
        const results = questions.map((q, index) => {
          let answer = '';
          
          // Add paragraph content
          if (q.hasParagraph && q.paragraphAnswer.trim()) {
            answer += q.paragraphAnswer.trim();
          }
          
          // Add table content - preserve structure for better display
          if (q.hasTable && q.tableData) {
            if (answer) answer += '\n\n'; // Add spacing between paragraph and table
            
            // Create a more structured table representation
            // Include headers in the first row for better parsing later
            const tableText = [
              q.tableData.headers.join(' | '),
              ...q.tableData.rows.map(row => row.join(' | '))
            ].join('\n');
            
            answer += tableText;
          }

          return {
            standard_question: q.question,
            found_question: q.question, // Using the same question as found_question
            answer: answer,
            found: answer.trim() !== '',
          };
        });

        // Update local report
        const updatedReport = {
          ...localReport,
          questions_analysis: {
            ...localReport.questions_analysis,
            success: true,
            processing_time_seconds: localReport.questions_analysis?.processing_time_seconds || 0,
            results: results,
            summary: {
              ...localReport.questions_analysis?.summary,
              total_questions: results.length,
              questions_found: results.filter(r => r.found).length,
              success_rate: (results.filter(r => r.found).length / results.length) * 100
            }
          },
        };

        setLocalReport(updatedReport);
        setQuestionsData(questions);

        // Save to database
        await IRReportAPI.updateReport(localReport.id, {
          questions_analysis: updatedReport.questions_analysis,
        });

        // Notify parent
        if (onReportUpdate) {
          onReportUpdate(updatedReport);
        }

        console.log("✅ Questions updated successfully");
      } catch (error) {
        console.error("❌ Failed to update questions:", error);
        // Revert on error
        setLocalReport(localReport);
      } finally {
        setSaving(false);
      }
    },
    [localReport, onReportUpdate]
  );

  // Check if currently editing movement routes
  const isEditingMovementRoutes = editingField === "movement_routes";

  const saveField = useCallback(
    async (fieldKey: string) => {
      if (saving) return;

      try {
        setSaving(true);
        const newValue = editValues[fieldKey];

        let updateData: any = {};

        if (fieldKey.startsWith("question_")) {
          // Handle question answer updates
          const questionIndex = parseInt(fieldKey.split("_")[1]);
          const updatedResults = [...(localReport.questions_analysis?.results || [])];
          updatedResults[questionIndex] = {
            ...updatedResults[questionIndex],
            answer: newValue,
          };

          updateData = {
            questions_analysis: {
              ...localReport.questions_analysis,
              results: updatedResults,
            },
          };
        } else if (fieldKey.startsWith("activity_")) {
          // Handle criminal activity updates
          const activityIndex = parseInt(fieldKey.split("_")[1]);
          const updatedActivities = [...(metadata?.criminal_activities || [])];
          updatedActivities[activityIndex] = {
            sr_no: editValues[`activity_${activityIndex}_sr_no`],
            incident: editValues[`activity_${activityIndex}_incident`],
            year: editValues[`activity_${activityIndex}_year`],
            location: editValues[`activity_${activityIndex}_location`],
          };

          updateData = {
            metadata: {
              ...metadata,
              criminal_activities: updatedActivities,
            },
          };
        } else if (fieldKey.startsWith("encounter_")) {
          // Handle police encounter updates
          const encounterIndex = parseInt(fieldKey.split("_")[1]);
          const updatedEncounters = [...(metadata?.police_encounters || [])];
          updatedEncounters[encounterIndex] = {
            year: editValues[`encounter_${encounterIndex}_year`],
            encounter_details: editValues[`encounter_${encounterIndex}_encounter_details`],
          };

          updateData = {
            metadata: {
              ...metadata,
              police_encounters: updatedEncounters,
            },
          };
        } else if (fieldKey.startsWith("rolechange_")) {
          // Handle role change updates
          const roleChangeIndex = parseInt(fieldKey.split("_")[1]);
          const updatedRoleChanges = [...(metadata?.hierarchical_role_changes || [])];
          updatedRoleChanges[roleChangeIndex] = {
            year: editValues[`rolechange_${roleChangeIndex}_year`],
            role: editValues[`rolechange_${roleChangeIndex}_role`],
          };

          updateData = {
            metadata: {
              ...metadata,
              hierarchical_role_changes: updatedRoleChanges,
            },
          };
        } else if (fieldKey.startsWith("metadata.")) {
          // Handle nested metadata field updates
          const metadataKey = fieldKey.replace("metadata.", "");
          let processedValue = newValue;

          // Handle array fields that are stored as comma-separated or newline-separated strings
          if (["aliases", "villages_covered", "weapons_assets"].includes(metadataKey)) {
            processedValue = newValue
              .split(",")
              .map((item: string) => item.trim())
              .filter((item: string) => item.length > 0);
          } else if (metadataKey === "important_points") {
            processedValue = newValue
              .split("\n")
              .map((item: string) => item.trim())
              .filter((item: string) => item.length > 0);
          }

          updateData = {
            metadata: {
              ...metadata,
              [metadataKey]: processedValue,
            },
          };
        } else {
          // Handle direct report field updates (like police_station, division, etc.)
          updateData = {
            [fieldKey]: newValue,
          };
        }

        const updatedReport = await IRReportAPI.updateReport(localReport.id, updateData);

        // Update the local report state immediately
        setLocalReport(updatedReport);

        // Update the parent component's state
        if (onReportUpdate) {
          onReportUpdate(updatedReport);
        }

        cancelEditing();
      } catch (error) {
        console.error("Failed to save field:", error);
        alert("Failed to save changes. Please try again.");
      } finally {
        setSaving(false);
      }
    },
    [editValues, localReport, onReportUpdate, saving]
  );

  // Editable field component
  const EditableField = React.memo(
    ({
      fieldKey,
      label,
      value,
      icon: Icon,
      multiline = false,
      type = "text",
      isTextarea = false,
      hideLabel = false,
      placeholder = "",
    }: {
      fieldKey: string;
      label: string;
      value: any;
      icon: any;
      multiline?: boolean;
      type?: string;
      isTextarea?: boolean;
      hideLabel?: boolean;
      placeholder?: string;
    }) => {
      const isEditing = editingField === fieldKey;
      const editValue = editValues[fieldKey] !== undefined ? editValues[fieldKey] : value || "";

      return (
        <div className="flex items-start space-x-3">
          <Icon className="h-5 w-5 text-gray-400 mt-0.5" />
          <div className="flex-1">
            {!hideLabel && (
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900">{label}</p>
                {!isEditing && (
                  <button onClick={() => startEditing(fieldKey, value)} className="p-1 hover:bg-gray-100 rounded transition-colors" title="Edit field">
                    <Edit3 className="h-3 w-3 text-gray-400" />
                  </button>
                )}
              </div>
            )}

            {hideLabel && !isEditing && (
              <div className="flex items-center justify-between">
                <div></div>
                <button onClick={() => startEditing(fieldKey, value)} className="p-1 hover:bg-gray-100 rounded transition-colors" title="Edit field">
                  <Edit3 className="h-3 w-3 text-gray-400" />
                </button>
              </div>
            )}

            {isEditing ? (
              <div className="mt-1 space-y-2">
                {multiline || isTextarea ? (
                  <textarea
                    ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                    value={editValue}
                    onChange={(e) =>
                      setEditValues((prev: any) => ({
                        ...prev,
                        [fieldKey]: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={isTextarea ? 4 : 3}
                    placeholder={placeholder || `Enter ${label.toLowerCase()}`}
                    autoFocus
                  />
                ) : (
                  <input
                    ref={inputRef as React.RefObject<HTMLInputElement>}
                    type={type}
                    value={editValue}
                    onChange={(e) =>
                      setEditValues((prev: any) => ({
                        ...prev,
                        [fieldKey]: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={placeholder || `Enter ${label.toLowerCase()}`}
                    autoFocus
                  />
                )}

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => saveField(fieldKey)}
                    disabled={saving}
                    className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Save className="h-3 w-3" />
                    <span>{saving ? "Saving..." : "Save"}</span>
                  </button>
                  <button
                    onClick={cancelEditing}
                    disabled={saving}
                    className="flex items-center space-x-1 px-3 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Cancel</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-1">
                {value ? (
                  // Handle different field types for display
                  fieldKey === "metadata.aliases" || fieldKey === "metadata.villages_covered" || fieldKey === "metadata.weapons_assets" ? (
                    <div className="flex flex-wrap gap-2">
                      {(Array.isArray(value) ? value : String(value).split(",")).map((item: string, index: number) => (
                        <span
                          key={index}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            fieldKey === "metadata.aliases"
                              ? "bg-blue-100 text-blue-800"
                              : fieldKey === "metadata.villages_covered"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {item.trim()}
                        </span>
                      ))}
                    </div>
                  ) : fieldKey === "metadata.important_points" ? (
                    <div className="space-y-2">
                      {(Array.isArray(value) ? value : String(value).split("\n")).map((point: string, index: number) => (
                        <div key={index} className="flex items-start space-x-2">
                          <span className="flex-shrink-0 w-2 h-2 bg-yellow-400 rounded-full mt-2"></span>
                          <p className="text-sm text-gray-700">{point.trim()}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={`text-sm text-gray-600 ${isTextarea ? "whitespace-pre-wrap bg-gray-50 p-3 rounded border" : ""}`}>{String(value)}</p>
                  )
                ) : (
                  <p className="text-sm text-gray-500 italic">{hideLabel ? `No ${fieldKey.split(".").pop()?.replace(/_/g, " ")} available` : "Unknown"}</p>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-50 rounded-lg">
              <FileText className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{getData("name", "Name") || "Unknown Subject"}</h2>
              <p className="text-sm text-gray-500">{localReport.original_filename}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowPDFViewer(true)}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" />
              View PDF
            </button>
            <button
              onClick={() => onDownload(localReport, "pdf")}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-88px)]">
          <div className="p-6 space-y-8">
            {/* Show message if no metadata */}
            {!metadata ? (
              <div className="text-center py-8">
                <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Processing in Progress</h3>
                <p className="text-gray-500">This report is still being processed. Detailed information will be available once processing is complete.</p>
              </div>
            ) : (
              <>
                {/* Administrative Details Section */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Administrative Details</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <EditableField fieldKey="police_station" label="Police Station" value={localReport.police_station} icon={Building2} />

                      <EditableField fieldKey="division" label="Division" value={localReport.division} icon={MapPin} />

                      <EditableField fieldKey="area_committee" label="Area Committee" value={localReport.area_committee} icon={Users} />
                    </div>

                    <div className="space-y-4">
                      <EditableField fieldKey="uid_for_name" label="UID for Name" value={localReport.uid_for_name} icon={Hash} />

                      <EditableField fieldKey="rank" label="Rank" value={localReport.rank} icon={Award} />

                      <EditableField fieldKey="rpc" label="RPC" value={localReport.rpc} icon={Shield} />
                    </div>
                  </div>
                </div>

                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <EditableField fieldKey="metadata.name" label="Name" value={getData("name", "Name")} icon={User} />

                      <EditableField
                        fieldKey="metadata.supply_team_supply"
                        label="Supply Team/Supply"
                        value={getData("supply_team_supply", "Supply Team/Supply")}
                        icon={Package}
                      />

                      <EditableField fieldKey="metadata.ied_bomb" label="IED/Bomb" value={getData("ied_bomb", "IED/Bomb")} icon={Target} />

                      <EditableField fieldKey="metadata.meeting" label="Meeting" value={getData("meeting", "Meeting")} icon={Users} />

                      <EditableField fieldKey="metadata.platoon" label="Platoon" value={getData("platoon", "Platoon")} icon={Shield} />

                      <EditableField
                        fieldKey="metadata.group_battalion"
                        label="Group/Battalion"
                        value={getData("group_battalion", "Group/Battalion")}
                        icon={Shield}
                      />

                      <EditableField fieldKey="metadata.area_region" label="Area/Region" value={getData("area_region", "Area/Region")} icon={MapPin} />
                    </div>

                    <div className="space-y-4">
                      <EditableField fieldKey="metadata.bounty" label="Bounty" value={getData("bounty", "Bounty")} icon={Zap} />

                      <EditableField
                        fieldKey="metadata.organizational_period"
                        label="Organizational Period"
                        value={getData("organizational_period", "Organizational Period")}
                        icon={Clock}
                      />

                      <div className="flex items-start space-x-3">
                        <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Upload Date</p>
                          <p className="text-sm text-gray-600">{format(new Date(localReport.uploaded_at), "PPP")}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Summary */}
                {(localReport.summary || editingField === "summary") && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary</h3>
                    <EditableField fieldKey="summary" label="" value={localReport.summary || ""} icon={FileText} isTextarea={true} hideLabel={true} />
                  </div>
                )}

                {/* Aliases */}
                {(getData("aliases", "Aliases") || getData("aliases", "उपनाम") || editingField === "metadata.aliases") && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Aliases</h3>
                    <EditableField
                      fieldKey="metadata.aliases"
                      label=""
                      value={
                        Array.isArray(getData("aliases", "Aliases"))
                          ? (getData("aliases", "Aliases") as string[]).join(", ")
                          : (getData("aliases", "Aliases") as string) || ""
                      }
                      icon={Users}
                      hideLabel={true}
                      placeholder="Enter aliases separated by commas"
                    />
                  </div>
                )}

                {/* Villages Covered */}
                {(getData("villages_covered", "Villages Covered") || getData("villages_covered", "गांव") || editingField === "metadata.villages_covered") && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Villages Covered</h3>
                    <EditableField
                      fieldKey="metadata.villages_covered"
                      label=""
                      value={
                        Array.isArray(getData("villages_covered", "Villages Covered"))
                          ? (getData("villages_covered", "Villages Covered") as string[]).join(", ")
                          : (getData("villages_covered", "Villages Covered") as string) || ""
                      }
                      icon={MapPin}
                      hideLabel={true}
                      placeholder="Enter villages separated by commas"
                    />
                  </div>
                )}

                {/* Additional Information */}
                <div className="space-y-6">
                  {(getData("involvement", "Involvement") || editingField === "metadata.involvement") && (
                    <div>
                      <h4 className="text-md font-medium text-gray-900 mb-2">Involvement</h4>
                      <EditableField
                        fieldKey="metadata.involvement"
                        label=""
                        value={getData("involvement", "Involvement") || ""}
                        icon={User}
                        isTextarea={true}
                        hideLabel={true}
                      />
                    </div>
                  )}

                  {(getData("history", "History") || editingField === "metadata.history") && (
                    <div>
                      <h4 className="text-md font-medium text-gray-900 mb-2">History</h4>
                      <EditableField
                        fieldKey="metadata.history"
                        label=""
                        value={getData("history", "History") || ""}
                        icon={Clock}
                        isTextarea={true}
                        hideLabel={true}
                      />
                    </div>
                  )}
                </div>

                {/* Criminal Activities */}
                {metadata.criminal_activities && metadata.criminal_activities.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Criminal Activities</h3>
                    <div className="space-y-4">
                      {metadata.criminal_activities.map((activity, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                          <div className="flex items-start justify-between mb-3">
                            <h4 className="text-sm font-medium text-gray-900">Activity #{index + 1}</h4>
                            {!(editingActivityIndex === index && editingField === `activity_${index}`) && (
                              <button
                                onClick={() => startEditingActivity(index, activity)}
                                className="p-1 hover:bg-gray-100 rounded transition-colors"
                                title="Edit activity"
                              >
                                <Edit3 className="h-3 w-3 text-gray-400" />
                              </button>
                            )}
                          </div>

                          {editingActivityIndex === index && editingField === `activity_${index}` ? (
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Sr. No.</label>
                                  <input
                                    type="text"
                                    value={editValues[`activity_${index}_sr_no`] !== undefined ? editValues[`activity_${index}_sr_no`] : ""}
                                    onChange={(e) =>
                                      setEditValues((prev: any) => ({
                                        ...prev,
                                        [`activity_${index}_sr_no`]: e.target.value,
                                      }))
                                    }
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Year</label>
                                  <input
                                    type="text"
                                    value={editValues[`activity_${index}_year`] !== undefined ? editValues[`activity_${index}_year`] : ""}
                                    onChange={(e) =>
                                      setEditValues((prev: any) => ({
                                        ...prev,
                                        [`activity_${index}_year`]: e.target.value,
                                      }))
                                    }
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Incident</label>
                                <textarea
                                  value={editValues[`activity_${index}_incident`] !== undefined ? editValues[`activity_${index}_incident`] : ""}
                                  onChange={(e) =>
                                    setEditValues((prev: any) => ({
                                      ...prev,
                                      [`activity_${index}_incident`]: e.target.value,
                                    }))
                                  }
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  rows={2}
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
                                <input
                                  type="text"
                                  value={editValues[`activity_${index}_location`] !== undefined ? editValues[`activity_${index}_location`] : ""}
                                  onChange={(e) =>
                                    setEditValues((prev: any) => ({
                                      ...prev,
                                      [`activity_${index}_location`]: e.target.value,
                                    }))
                                  }
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                              </div>

                              <div className="flex items-center space-x-2 pt-2">
                                <button
                                  onClick={() => saveField(`activity_${index}`)}
                                  disabled={saving}
                                  className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
                                >
                                  <Save className="h-3 w-3" />
                                  <span>{saving ? "Saving..." : "Save"}</span>
                                </button>
                                <button
                                  onClick={cancelEditing}
                                  disabled={saving}
                                  className="flex items-center space-x-1 px-3 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400"
                                >
                                  <RotateCcw className="h-3 w-3" />
                                  <span>Cancel</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="font-medium text-gray-700">Sr. No:</span>
                                <span className="ml-2 text-gray-600">{activity.sr_no}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">Year:</span>
                                <span className="ml-2 text-gray-600">{activity.year}</span>
                              </div>
                              <div className="col-span-2">
                                <span className="font-medium text-gray-700">Incident:</span>
                                <p className="mt-1 text-gray-600">{activity.incident}</p>
                              </div>
                              <div className="col-span-2">
                                <span className="font-medium text-gray-700">Location:</span>
                                <span className="ml-2 text-gray-600">{activity.location}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Police Encounters */}
                {metadata.police_encounters && metadata.police_encounters.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Police Encounters</h3>
                    <div className="space-y-3">
                      {metadata.police_encounters.map((encounter, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                          <div className="flex items-start justify-between mb-3">
                            <h4 className="text-sm font-medium text-gray-900">Encounter #{index + 1}</h4>
                            {!(editingEncounterIndex === index && editingField === `encounter_${index}`) && (
                              <button
                                onClick={() => startEditingEncounter(index, encounter)}
                                className="p-1 hover:bg-gray-100 rounded transition-colors"
                                title="Edit encounter"
                              >
                                <Edit3 className="h-3 w-3 text-gray-400" />
                              </button>
                            )}
                          </div>

                          {editingEncounterIndex === index && editingField === `encounter_${index}` ? (
                            <div className="space-y-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Year</label>
                                <input
                                  type="text"
                                  value={editValues[`encounter_${index}_year`] !== undefined ? editValues[`encounter_${index}_year`] : ""}
                                  onChange={(e) =>
                                    setEditValues((prev: any) => ({
                                      ...prev,
                                      [`encounter_${index}_year`]: e.target.value,
                                    }))
                                  }
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Encounter Details</label>
                                <textarea
                                  value={
                                    editValues[`encounter_${index}_encounter_details`] !== undefined ? editValues[`encounter_${index}_encounter_details`] : ""
                                  }
                                  onChange={(e) =>
                                    setEditValues((prev: any) => ({
                                      ...prev,
                                      [`encounter_${index}_encounter_details`]: e.target.value,
                                    }))
                                  }
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  rows={3}
                                />
                              </div>

                              <div className="flex items-center space-x-2 pt-2">
                                <button
                                  onClick={() => saveField(`encounter_${index}`)}
                                  disabled={saving}
                                  className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
                                >
                                  <Save className="h-3 w-3" />
                                  <span>{saving ? "Saving..." : "Save"}</span>
                                </button>
                                <button
                                  onClick={cancelEditing}
                                  disabled={saving}
                                  className="flex items-center space-x-1 px-3 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400"
                                >
                                  <RotateCcw className="h-3 w-3" />
                                  <span>Cancel</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                  {encounter.year}
                                </span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700 text-sm">Details:</span>
                                <p className="mt-1 text-sm text-gray-600">{encounter.encounter_details}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hierarchical Role Changes */}
                {metadata.hierarchical_role_changes && metadata.hierarchical_role_changes.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Hierarchical Role Changes</h3>
                    <div className="space-y-3">
                      {metadata.hierarchical_role_changes.map((change, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                          <div className="flex items-start justify-between mb-3">
                            <h4 className="text-sm font-medium text-gray-900">Role Change #{index + 1}</h4>
                            {!(editingRoleChangeIndex === index && editingField === `rolechange_${index}`) && (
                              <button
                                onClick={() => startEditingRoleChange(index, change)}
                                className="p-1 hover:bg-gray-100 rounded transition-colors"
                                title="Edit role change"
                              >
                                <Edit3 className="h-3 w-3 text-gray-400" />
                              </button>
                            )}
                          </div>

                          {editingRoleChangeIndex === index && editingField === `rolechange_${index}` ? (
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Year</label>
                                  <input
                                    type="text"
                                    value={editValues[`rolechange_${index}_year`] !== undefined ? editValues[`rolechange_${index}_year`] : ""}
                                    onChange={(e) =>
                                      setEditValues((prev: any) => ({
                                        ...prev,
                                        [`rolechange_${index}_year`]: e.target.value,
                                      }))
                                    }
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
                                  <input
                                    type="text"
                                    value={editValues[`rolechange_${index}_role`] !== undefined ? editValues[`rolechange_${index}_role`] : ""}
                                    onChange={(e) =>
                                      setEditValues((prev: any) => ({
                                        ...prev,
                                        [`rolechange_${index}_role`]: e.target.value,
                                      }))
                                    }
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  />
                                </div>
                              </div>

                              <div className="flex items-center space-x-2 pt-2">
                                <button
                                  onClick={() => saveField(`rolechange_${index}`)}
                                  disabled={saving}
                                  className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
                                >
                                  <Save className="h-3 w-3" />
                                  <span>{saving ? "Saving..." : "Save"}</span>
                                </button>
                                <button
                                  onClick={cancelEditing}
                                  disabled={saving}
                                  className="flex items-center space-x-1 px-3 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400"
                                >
                                  <RotateCcw className="h-3 w-3" />
                                  <span>Cancel</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="font-medium text-gray-700">Year:</span>
                                <span className="ml-2 text-gray-600">{change.year}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">Role:</span>
                                <span className="ml-2 text-gray-600">{change.role}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Weapons/Assets */}
                {((metadata.weapons_assets && metadata.weapons_assets.length > 0) || editingField === "metadata.weapons_assets") && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Weapons/Assets</h3>
                    <EditableField
                      fieldKey="metadata.weapons_assets"
                      label=""
                      value={metadata.weapons_assets ? metadata.weapons_assets.join(", ") : ""}
                      icon={Shield}
                      hideLabel={true}
                      placeholder="Enter weapons/assets separated by commas"
                    />
                  </div>
                )}

                {/* Important Points */}
                {((metadata.important_points && metadata.important_points.length > 0) || editingField === "metadata.important_points") && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Important Points</h3>
                    <EditableField
                      fieldKey="metadata.important_points"
                      label=""
                      value={metadata.important_points ? metadata.important_points.join("\n") : ""}
                      icon={AlertCircle}
                      isTextarea={true}
                      hideLabel={true}
                      placeholder="Enter important points, one per line"
                    />
                  </div>
                )}

                {/* Movement Routes */}
                {metadata.movement_routes && metadata.movement_routes.length > 0 && (
                  <RouteTracker
                    routes={metadata.movement_routes}
                    isEditable={true}
                    onRoutesChange={handleMovementRoutesChange}
                  />
                )}

                {/* Questions Analysis */}
                {questionsData.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <HelpCircle className="h-5 w-5 mr-2" />
                      Standard Questions ({questionsData.length})
                    </h3>

                    <QuestionEditor
                      questions={questionsData}
                      onQuestionsChange={handleQuestionsChange}
                      saving={saving}
                    />
                  </div>
                )}

                {showPDFViewer && localReport.file_url && (
                  <PDFViewer fileUrl={localReport.file_url} onClose={() => setShowPDFViewer(false)} title={localReport.original_filename} />
                )}
              </>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
