import React, { useState } from "react";
import { motion } from "framer-motion";
import { Edit3, Save, RotateCcw, Plus, Trash2, Table, Type } from "lucide-react";

interface TableData {
  headers: string[];
  rows: string[][];
}

interface QuestionData {
  question: string;
  paragraphAnswer: string;
  tableData?: TableData;
  hasTable: boolean;
  hasParagraph: boolean;
  questionNumber: number;
}

interface QuestionEditorProps {
  questions: QuestionData[];
  onQuestionsChange: (questions: QuestionData[]) => void;
  saving?: boolean;
}

export default function QuestionEditor({ questions, onQuestionsChange, saving = false }: QuestionEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingData, setEditingData] = useState<QuestionData | null>(null);

  const startEditing = (index: number) => {
    setEditingIndex(index);
    const question = questions[index];
    setEditingData({
      ...question,
      tableData: question.tableData
        ? {
            headers: [...question.tableData.headers],
            rows: question.tableData.rows.map((row) => [...row]),
          }
        : undefined,
    });
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setEditingData(null);
  };

  const saveQuestion = () => {
    if (editingIndex !== null && editingData) {
      const cleanData = {
        ...editingData,
        paragraphAnswer: editingData.hasParagraph ? editingData.paragraphAnswer : "",
        tableData: editingData.hasTable ? editingData.tableData : undefined,
      };

      const updatedQuestions = [...questions];
      updatedQuestions[editingIndex] = cleanData;
      onQuestionsChange(updatedQuestions);
      setEditingIndex(null);
      setEditingData(null);
    }
  };

  const updateEditingData = (updates: Partial<QuestionData>) => {
    if (editingData) {
      setEditingData({ ...editingData, ...updates });
    }
  };

  const toggleParagraph = () => {
    if (!editingData) return;
    updateEditingData({ hasParagraph: !editingData.hasParagraph });
  };

  const toggleTable = () => {
    if (!editingData) return;
    const newHasTable = !editingData.hasTable;

    if (newHasTable && !editingData.tableData) {
      updateEditingData({
        hasTable: true,
        tableData: {
          headers: ["Column 1", "Column 2"],
          rows: [["", ""]],
        },
      });
    } else {
      updateEditingData({ hasTable: newHasTable });
    }
  };

  // Table editing functions
  const addTableRow = () => {
    if (!editingData?.tableData) return;
    const newRows = [...editingData.tableData.rows];
    newRows.push(new Array(editingData.tableData.headers.length).fill(""));
    updateEditingData({
      tableData: { ...editingData.tableData, rows: newRows },
    });
  };

  const removeTableRow = (rowIndex: number) => {
    if (!editingData?.tableData || editingData.tableData.rows.length <= 1) return;
    const newRows = editingData.tableData.rows.filter((_, index) => index !== rowIndex);
    updateEditingData({
      tableData: { ...editingData.tableData, rows: newRows },
    });
  };

  const addTableColumn = () => {
    if (!editingData?.tableData) return;
    const newHeaders = [...editingData.tableData.headers, `Column ${editingData.tableData.headers.length + 1}`];
    const newRows = editingData.tableData.rows.map((row) => [...row, ""]);
    updateEditingData({
      tableData: { headers: newHeaders, rows: newRows },
    });
  };

  const removeTableColumn = (colIndex: number) => {
    if (!editingData?.tableData || editingData.tableData.headers.length <= 1) return;
    const newHeaders = editingData.tableData.headers.filter((_, index) => index !== colIndex);
    const newRows = editingData.tableData.rows.map((row) => row.filter((_, index) => index !== colIndex));
    updateEditingData({
      tableData: { headers: newHeaders, rows: newRows },
    });
  };

  const updateTableCell = (rowIndex: number, colIndex: number, value: string) => {
    if (!editingData?.tableData) return;
    const newRows = [...editingData.tableData.rows];
    newRows[rowIndex][colIndex] = value;
    updateEditingData({
      tableData: { ...editingData.tableData, rows: newRows },
    });
  };

  const updateTableHeader = (colIndex: number, value: string) => {
    if (!editingData?.tableData) return;
    const newHeaders = [...editingData.tableData.headers];
    newHeaders[colIndex] = value;
    updateEditingData({
      tableData: { ...editingData.tableData, headers: newHeaders },
    });
  };

  // Render table for editing mode
  const renderEditingTable = (tableData: TableData) => {
    return (
      <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
        <div className="bg-gray-100 px-4 py-3 border-b border-gray-300">
          <div className="flex items-center space-x-3">
            <button onClick={addTableRow} className="flex items-center space-x-2 px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
              <Plus className="h-4 w-4" />
              <span>Add Row</span>
            </button>
            <button onClick={addTableColumn} className="flex items-center space-x-2 px-3 py-2 bg-green-500 text-white rounded-md hover:bg-green-600">
              <Plus className="h-4 w-4" />
              <span>Add Column</span>
            </button>
          </div>
        </div>

        <table className="w-full" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr className="bg-gray-200">
              {tableData.headers.map((header, colIndex) => (
                <th key={colIndex} className="p-0 border border-gray-300">
                  <div className="px-4 py-3 flex items-center space-x-2">
                    <input
                      type="text"
                      value={header}
                      onChange={(e) => updateTableHeader(colIndex, e.target.value)}
                      className="flex-1 text-sm font-semibold border-2 border-gray-500 rounded px-2 py-1"
                      placeholder="Column header"
                    />
                    {tableData.headers.length > 1 && (
                      <button onClick={() => removeTableColumn(colIndex)} className="text-red-600 hover:text-red-800 p-1 hover:bg-red-100 rounded">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.rows.map((row, rowIndex) => (
              <tr key={rowIndex} className={rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                {row.map((cell, colIndex) => (
                  <td key={colIndex} className="p-0 border border-gray-300">
                    <div className="px-4 py-3 flex items-center space-x-2">
                      <input
                        type="text"
                        value={cell || ""}
                        onChange={(e) => updateTableCell(rowIndex, colIndex, e.target.value)}
                        className="flex-1 text-sm border-2 border-gray-500 rounded px-2 py-1"
                        placeholder="Enter value"
                      />
                      {colIndex === 0 && tableData.rows.length > 1 && (
                        <button onClick={() => removeTableRow(rowIndex)} className="text-red-600 hover:text-red-800 p-1 hover:bg-red-100 rounded">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Render table for display mode (with borders)
  const renderDisplayTable = (tableData: TableData) => {
    return (
      <div className="border border-gray-300 rounded-lg overflow-hidden bg-white shadow-sm">
        <table className="w-full" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr className="bg-gray-200">
              {tableData.headers.map((header, colIndex) => (
                <th key={colIndex} className="px-4 py-3 text-left text-sm font-bold text-gray-800 border border-gray-300">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.rows.map((row, rowIndex) => (
              <tr key={rowIndex} className={rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                {row.map((cell, colIndex) => (
                  <td key={colIndex} className="px-4 py-3 text-sm text-gray-900 border border-gray-300">
                    <span className={cell ? "text-gray-900 font-medium" : "text-gray-400 italic"}>{cell || "Empty"}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-4 max-h-96 overflow-y-auto">
      {questions.map((question, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="border border-gray-200 rounded-lg p-4 bg-gray-50"
        >
          {/* Question Header */}
          <div className="mb-3">
            <div className="flex items-start justify-between">
              <p className="text-sm text-blue-700 bg-blue-50 p-2 rounded border flex-1 mr-2">
                <span className="font-medium">Q{question.questionNumber}:</span> {question.question}
              </p>
              {editingIndex !== index && (
                <button onClick={() => startEditing(index)} className="p-1 hover:bg-gray-100 rounded transition-colors" title="Edit answer">
                  <Edit3 className="h-4 w-4 text-gray-400" />
                </button>
              )}
            </div>
          </div>

          {/* Content Area */}
          <div>
            <div className="flex items-start justify-between mb-2">
              <span className="text-xs font-medium text-gray-600">Content:</span>
              {editingIndex === index && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={toggleParagraph}
                    className={`flex items-center space-x-1 px-2 py-1 text-xs rounded ${
                      editingData?.hasParagraph ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    <Type className="h-3 w-3" />
                    <span>Paragraph</span>
                  </button>
                  <button
                    onClick={toggleTable}
                    className={`flex items-center space-x-1 px-2 py-1 text-xs rounded ${
                      editingData?.hasTable ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    <Table className="h-3 w-3" />
                    <span>Table</span>
                  </button>
                </div>
              )}
            </div>

            {/* Editing Mode */}
            {editingIndex === index && editingData ? (
              <div className="space-y-4">
                {/* Paragraph Editing */}
                {editingData.hasParagraph && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <Type className="h-4 w-4 text-blue-600" />
                      <label className="text-sm font-medium text-blue-800">Paragraph</label>
                    </div>
                    <textarea
                      value={editingData.paragraphAnswer}
                      onChange={(e) => updateEditingData({ paragraphAnswer: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={4}
                      placeholder="Enter paragraph content..."
                    />
                  </div>
                )}

                {/* Table Editing */}
                {editingData.hasTable && editingData.tableData && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <Table className="h-4 w-4 text-green-600" />
                      <label className="text-sm font-medium text-green-800">Table</label>
                    </div>
                    {renderEditingTable(editingData.tableData)}
                  </div>
                )}

                {/* No Content Selected */}
                {!editingData.hasParagraph && !editingData.hasTable && (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex justify-center space-x-4 mb-4">
                      <Type className="h-8 w-8 text-gray-300" />
                      <Table className="h-8 w-8 text-gray-300" />
                    </div>
                    <p>Select paragraph and/or table to add content for this question</p>
                  </div>
                )}

                {/* Save/Cancel Buttons */}
                <div className="flex items-center space-x-2 pt-2 border-t border-gray-200">
                  <button
                    onClick={saveQuestion}
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
              /* Display Mode */
              <div className="space-y-4">
                {/* Display Paragraph */}
                {question.hasParagraph && question.paragraphAnswer.trim() && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <Type className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">Paragraph Content</span>
                    </div>
                    <div className="bg-white p-3 rounded border border-gray-300 shadow-sm">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{question.paragraphAnswer}</p>
                    </div>
                  </div>
                )}

                {/* Display Table */}
                {question.hasTable && question.tableData && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <Table className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">Table Content</span>
                    </div>
                    <div>{renderDisplayTable(question.tableData)}</div>
                  </div>
                )}

                {/* No Content */}
                {(!question.hasParagraph || !question.paragraphAnswer.trim()) && (!question.hasTable || !question.tableData) && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                    <div className="flex justify-center space-x-2 mb-2 opacity-50">
                      <Type className="h-6 w-6 text-gray-400" />
                      <Table className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500 italic">No content provided yet</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
