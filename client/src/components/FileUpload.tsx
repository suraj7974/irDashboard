import React, { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, Loader2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadProgress } from "../types";

interface FileUploadProps {
  onUpload: (files: File[]) => Promise<void>;
  uploading: boolean;
  uploadProgress: UploadProgress[];
}

export default function FileUpload({ onUpload, uploading, uploadProgress }: FileUploadProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onUpload(acceptedFiles);
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    multiple: true,
    disabled: uploading,
  });

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* File Upload Area */}
      <motion.div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-all duration-200 ease-in-out
          ${isDragActive ? "border-primary-500 bg-primary-50" : "border-gray-300 hover:border-gray-400"}
          ${uploading ? "opacity-50 cursor-not-allowed" : ""}
        `}
        whileHover={!uploading ? { scale: 1.01 } : undefined}
        whileTap={!uploading ? { scale: 0.99 } : undefined}
        {...(getRootProps() as any)}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center justify-center space-y-4">
          <motion.div animate={isDragActive ? { scale: 1.1 } : { scale: 1 }} transition={{ duration: 0.2 }}>
            <Upload className="h-12 w-12 text-gray-400" />
          </motion.div>

          <div>
            <p className="text-xl font-semibold text-gray-700 mb-2">{isDragActive ? "Drop IR Reports here" : "Upload IR Reports"}</p>
            <p className="text-gray-500">Drag & drop PDF files or click to browse</p>
            <p className="text-sm text-gray-400 mt-1">Supports multiple PDF files</p>
          </div>
        </div>
      </motion.div>

      {/* Upload Progress */}
      <AnimatePresence>
        {uploadProgress.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="mt-6 space-y-3">
            {uploadProgress.map((upload, index) => (
              <motion.div
                key={`${upload.file.name}-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-lg border border-gray-200 p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-700">{upload.file.name}</p>
                      <p className="text-sm text-gray-500">{(upload.file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {upload.status === "uploading" && <Loader2 className="h-4 w-4 animate-spin text-primary-500" />}
                    {upload.status === "processing" && <Loader2 className="h-4 w-4 animate-spin text-orange-500" />}
                    {upload.status === "error" && <AlertCircle className="h-4 w-4 text-red-500" />}
                    {upload.status === "completed" && (
                      <div className="h-4 w-4 rounded-full bg-green-500 flex items-center justify-center">
                        <div className="h-2 w-2 bg-white rounded-full" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <motion.div
                    className={`h-2 rounded-full transition-colors duration-200 ${
                      upload.status === "error"
                        ? "bg-red-500"
                        : upload.status === "completed"
                        ? "bg-green-500"
                        : upload.status === "processing"
                        ? "bg-orange-500"
                        : "bg-primary-500"
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${upload.progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>

                {/* Status Text */}
                <div className="mt-2 flex justify-between items-center">
                  <span
                    className={`text-sm font-medium ${
                      upload.status === "error"
                        ? "text-red-600"
                        : upload.status === "completed"
                        ? "text-green-600"
                        : upload.status === "processing"
                        ? "text-orange-600"
                        : "text-primary-600"
                    }`}
                  >
                    {upload.status === "uploading" && "Uploading..."}
                    {upload.status === "processing" && "Processing with AI..."}
                    {upload.status === "completed" && "Completed"}
                    {upload.status === "error" && "Error"}
                  </span>

                  <span className="text-sm text-gray-500">{upload.progress}%</span>
                </div>

                {upload.error && <p className="text-sm text-red-600 mt-1">{upload.error}</p>}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
