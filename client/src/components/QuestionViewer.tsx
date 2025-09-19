import React from "react";
import { motion } from "framer-motion";
import { Table, Type } from "lucide-react";

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

interface QuestionViewerProps {
  questions: QuestionData[];
}

export default function QuestionViewer({ questions }: QuestionViewerProps) {
  // Render table for display mode (view-only with clean borders)
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
            <p className="text-sm text-blue-700 bg-blue-50 p-2 rounded border">
              <span className="font-medium">Q{question.questionNumber}:</span> {question.question}
            </p>
          </div>

          {/* Content Display */}
          <div>
            <span className="text-xs font-medium text-gray-600">Content:</span>

            <div className="space-y-4 mt-2">
              {/* Display Paragraph */}
              {question.hasParagraph && question.paragraphAnswer.trim() && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <Type className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Paragraph</span>
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
                    <span className="text-sm font-medium text-green-800">Table</span>
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
          </div>
        </motion.div>
      ))}
    </div>
  );
}
